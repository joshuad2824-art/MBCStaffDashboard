-- 0019 — the manual's search, forgiving.
--
-- 0016 searched whole words: "bud" found nothing though "budget" is on every
-- other page, a third word that was not there returned nothing at all, and a
-- citation was found only when typed exactly as it is stored. This is for
-- someone who opens the manual twice a year and types two letters.
--
-- search_manual(q) now answers in tiers, strongest first, and says which tier
-- each row came from so the screen can be honest about it:
--
--   citation   what was typed, with the punctuation ignored, is the start of a
--              citation: "a9" and "A 009" reach A009, "art ii b" reaches
--              Art. II.B. Padded the way policy codes are (A9 → A009).
--   title      every word typed begins a word of a document's code or title.
--              Returns the document's first section, its front door.
--   heading    every word typed begins a word of a section's own heading.
--   exact      0016's reading: whole words, stemmed, with quoted phrases and a
--              leading minus (websearch_to_tsquery).
--   prefix     every word typed is the start of a word: "treas" → treasurer.
--
-- Two things switch the looser tiers off. A query with a quoted phrase or a
-- leading minus keeps its exact meaning, so only citation and exact answer it.
-- And a query that is a citation which found one wants that paragraph: the
-- title, heading and prefix tiers stay quiet, and only the places it is
-- mentioned (exact) follow.
--
-- Only when none of those finds anything does it loosen, and then only once:
--
--   corrected  a word that begins no word in the manual is replaced by the
--              nearest word that does — same first letter, within one or two
--              edits — and the section must contain all of the corrected words.
--              The corrected words come back as `matched_as`, and the screen
--              says "Showing results for …".
--   some       more than one word was typed, no section has them all: sections
--              that have some of them, flagged as such.
--
-- A tier never repeats a section an earlier one found. What a person may read
-- is unchanged: the function is security invoker, so the policies decide, and
-- the vocabulary for corrections is read through the same policies (ts_stat
-- runs its query as the caller). No table gains a policy, none gains a write
-- path; the section table gains one stored column and one index.

create extension if not exists fuzzystrmatch;

-- A citation, or what somebody typed for one, with everything but letters and
-- digits taken out: "Art. II.B §3" → "artiib3".
create or replace function manual_norm(t text) returns text
language sql
immutable
parallel safe
as $$
  select lower(regexp_replace(coalesce(t, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

-- Every word of a section, unstemmed. Not searched — it is the vocabulary a
-- misspelling is corrected against, so a correction is a real word and never
-- a stem ("schedul").
alter table governance_section
  add column words tsvector generated always as (
    to_tsvector('simple', coalesce(citation, '') || ' ' || heading_path_text(heading_path) || ' ' || body)
  ) stored;

create index governance_section_words on governance_section using gin (words);
create index governance_section_citation_norm on governance_section (manual_norm(citation) text_pattern_ops);

-- ---------------------------------------------------------------- search

-- The result gained two columns, so the function is replaced, not altered.
drop function if exists search_manual(text);

create function search_manual(q text)
returns table (
  section_id       uuid,
  document_id      uuid,
  document_slug    text,
  document_kind    text,
  document_code    text,
  document_title   text,
  anchor           text,
  citation         text,
  heading_path     text[],
  section_position integer,
  by_citation      boolean,
  rank             real,
  snippet          text,
  -- 'citation' | 'title' | 'heading' | 'exact' | 'prefix' | 'corrected' | 'some'
  match_kind       text,
  -- For 'corrected': the words actually searched, e.g. "kitchen". Otherwise null.
  matched_as       text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with
  query as (
    select regexp_replace(btrim(coalesce(q, '')), '\s+', ' ', 'g') as raw
  ),
  -- The words typed: letters and digits, a lone character is noise, and a
  -- pasted paragraph is read for its first twelve.
  toks as (
    select t.tok, t.ord
      from query, regexp_split_to_table(lower(query.raw), '[^a-z0-9]+') with ordinality as t(tok, ord)
     where length(t.tok) >= 2
       and t.ord <= 24
     order by t.ord
     limit 12
  ),
  forms as (
    select query.raw,
           -- "a quoted phrase" or -excluded: keep the exact reading, loosen nothing.
           (query.raw ~ '"' or query.raw ~ '(^|\s)-[^\s]') as ops,
           manual_norm(query.raw) as nq,
           websearch_to_tsquery('english', nullif(query.raw, '')) as exact,
           to_tsquery('english', (select string_agg(tok || ':*', ' & ' order by ord) from toks)) as pand,
           to_tsquery('simple',  (select string_agg(tok || ':*', ' & ' order by ord) from toks)) as sand
      from query
  ),
  cite as (
    select f.*,
           -- A9 and A09 are A009: policy codes are a letter and three digits.
           case when f.nq ~ '^[a-z][0-9]{1,2}$' then substr(f.nq, 1, 1) || lpad(substr(f.nq, 2), 3, '0') else f.nq end as cq,
           (f.raw ~* '^(art(icle)?\.?\s*[ivx]+|[a-z]\s*-?\s*[0-9])') as looks_cited
      from forms f
  ),

  -- ------------------------------------------------------ the strong tiers
  hit_citation as (
    select s.id, s.document_id, s.anchor, s.citation, s.heading_path, s.position, s.body,
           (case when manual_norm(s.citation) = c.cq then 2.0 else 1.0 end)::real as rank,
           'citation'::text as kind, 0 as tier
      from governance_section s, cite c
     where c.looks_cited
       and length(c.cq) >= 2
       and s.citation <> ''
       and manual_norm(s.citation) like c.cq || '%'
  ),
  hit_title as (
    select distinct on (d.id)
           s.id, s.document_id, s.anchor, s.citation, s.heading_path, s.position, s.body,
           1.0::real as rank, 'title'::text as kind, 1 as tier
      from governance_document d
      join governance_section s on s.document_id = d.id
      cross join forms f
     where not f.ops
       and not exists (select 1 from hit_citation)
       and f.sand is not null
       and numnode(f.sand) > 0
       and to_tsvector('simple', d.code || ' ' || d.title) @@ f.sand
     order by d.id, s.position
  ),
  hit_heading as (
    select s.id, s.document_id, s.anchor, s.citation, s.heading_path, s.position, s.body,
           1.0::real as rank, 'heading'::text as kind, 2 as tier
      from governance_section s
      cross join forms f
     where not f.ops
       and not exists (select 1 from hit_citation)
       and f.sand is not null
       and numnode(f.sand) > 0
       and to_tsvector('simple', coalesce(s.heading_path[cardinality(s.heading_path)], '')) @@ f.sand
  ),
  hit_exact as (
    select s.id, s.document_id, s.anchor, s.citation, s.heading_path, s.position, s.body,
           ts_rank_cd(s.search, f.exact)::real as rank, 'exact'::text as kind, 3 as tier
      from governance_section s
      cross join forms f
     where numnode(f.exact) > 0
       and s.search @@ f.exact
  ),
  -- Every word typed begins a word of the section — as the stemmer files it
  -- (treas → treasur) or as it is written (itemiz → itemized, which the stemmer
  -- files as "item", so a prefix longer than the stem is only found this way).
  hit_prefix as (
    select s.id, s.document_id, s.anchor, s.citation, s.heading_path, s.position, s.body,
           greatest(ts_rank_cd(s.search, f.pand), ts_rank_cd(s.words, f.sand))::real as rank,
           'prefix'::text as kind, 4 as tier
      from governance_section s
      cross join forms f
     where not f.ops
       and not exists (select 1 from hit_citation)
       and f.pand is not null
       and numnode(f.pand) > 0
       and (s.search @@ f.pand or s.words @@ f.sand)
  ),
  -- A section found by two tiers is shown once, at the strongest.
  strong as (
    select distinct on (u.id) u.*
      from (
        select * from hit_citation
        union all select * from hit_title
        union all select * from hit_heading
        union all select * from hit_exact
        union all select * from hit_prefix
      ) u
     order by u.id, u.tier, u.rank desc
  ),

  -- ----------------------------------------------------- the loose tiers
  -- Run only when nothing above found anything. The vocabulary is read through
  -- the caller's policies and is not touched at all when there is a strong hit.
  vocab as materialized (
    select word, ndoc
      from ts_stat('select words from governance_section')
     where length(word) >= 4
       and word ~ '^[a-z]+$'
  ),
  -- A word that begins no word in the manual, replaced by the nearest word that
  -- does: the same first letter, one edit for a short word and two for a long
  -- one. "Nearest" is measured against the whole word and against its start, since
  -- people type the start of a word and get a letter wrong. The commonest word
  -- wins a tie.
  fixes as (
    select t.ord, t.tok,
           (select v.word
              from vocab v
             where left(v.word, 1) = left(t.tok, 1)
               and (abs(length(v.word) - length(t.tok)) <= 2 or length(v.word) > length(t.tok))
               and least(levenshtein_less_equal(v.word, t.tok, case when length(t.tok) >= 6 then 2 else 1 end),
                         levenshtein_less_equal(left(v.word, length(t.tok)), t.tok, case when length(t.tok) >= 6 then 2 else 1 end))
                   <= case when length(t.tok) >= 6 then 2 else 1 end
             order by least(levenshtein(v.word, t.tok), levenshtein(left(v.word, length(t.tok)), t.tok)),
                      v.ndoc desc, v.word
             limit 1) as fix
      from toks t
     -- The gate comes first, and it is why the vocabulary costs nothing on the
     -- ordinary path: with a strong hit, or an operator, no word is looked at.
     where not (select ops from forms)
       and not exists (select 1 from strong)
       and length(t.tok) >= 4
       and not exists (select 1 from vocab v where v.word like t.tok || '%')
  ),
  fixed as (
    select (select string_agg(coalesce(x.fix, t.tok), ' ' order by t.ord) from toks t left join fixes x on x.ord = t.ord) as words,
           exists (select 1 from fixes where fix is not null) as changed,
           to_tsquery('english', (select string_agg(coalesce(x.fix, t.tok) || ':*', ' & ' order by t.ord) from toks t left join fixes x on x.ord = t.ord)) as pand,
           to_tsquery('english', (select string_agg(coalesce(x.fix, t.tok) || ':*', ' | ' order by t.ord) from toks t left join fixes x on x.ord = t.ord)) as por
  ),
  hit_corrected as (
    select s.id, s.document_id, s.anchor, s.citation, s.heading_path, s.position, s.body,
           ts_rank_cd(s.search, x.pand)::real as rank, 'corrected'::text as kind, 5 as tier
      from governance_section s
      cross join fixed x
     where not (select ops from forms)
       and not exists (select 1 from strong)
       and x.changed
       and x.pand is not null
       and numnode(x.pand) > 0
       and s.search @@ x.pand
  ),
  hit_some as (
    select s.id, s.document_id, s.anchor, s.citation, s.heading_path, s.position, s.body,
           ts_rank_cd(s.search, x.por)::real as rank, 'some'::text as kind, 6 as tier
      from governance_section s
      cross join fixed x
     where not (select ops from forms)
       and not exists (select 1 from strong)
       and not exists (select 1 from hit_corrected)
       and (select count(*) from toks) > 1
       and x.por is not null
       and numnode(x.por) > 0
       and s.search @@ x.por
  ),
  hits as (
    select * from strong
    union all select * from hit_corrected
    union all select * from hit_some
  )
  select h.id, h.document_id, d.slug, d.kind, d.code, d.title,
         h.anchor, h.citation, h.heading_path, h.position,
         (h.kind = 'citation') as by_citation,
         h.rank,
         -- A citation shows the top of the paragraph. Everything else shows the
         -- passage around the words that matched, marked with <mark>, which the
         -- client renders as the match mark and never as HTML.
         coalesce(
           case h.kind
             when 'citation'  then null
             when 'exact'     then ts_headline('english', h.body, f.exact, 'StartSel=<mark>, StopSel=</mark>, MaxWords=45, MinWords=25, MaxFragments=1')
             when 'corrected' then ts_headline('english', h.body, x.pand,  'StartSel=<mark>, StopSel=</mark>, MaxWords=45, MinWords=25, MaxFragments=1')
             when 'some'      then ts_headline('english', h.body, x.por,   'StartSel=<mark>, StopSel=</mark>, MaxWords=45, MinWords=25, MaxFragments=1')
             else                  ts_headline('english', h.body, f.pand,  'StartSel=<mark>, StopSel=</mark>, MaxWords=45, MinWords=25, MaxFragments=1')
           end,
           left(h.body, 240)
         ) as snippet,
         h.kind as match_kind,
         case when h.kind in ('corrected', 'some') and x.changed then x.words end as matched_as
    from hits h
    join governance_document d on d.id = h.document_id
    cross join forms f
    cross join fixed x
   order by h.tier, h.rank desc, d.position, h.position
   limit 80;
$$;

revoke execute on function search_manual(text) from public;
revoke execute on function search_manual(text) from anon;
grant execute on function search_manual(text) to authenticated;

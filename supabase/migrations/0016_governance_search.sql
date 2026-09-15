-- 0016 — the manual, searchable: sections, and search_manual().
--
-- mbc-dashboard-expansion-brief.md §A.3. Search points at a paragraph, not
-- a document. The loader splits each transcribed document at its headings
-- and emits one row per section here — the deepest heading and the text
-- under it, up to the next heading of any level — with the headings above
-- it, the citation as the docket writes it ("Art. II.B §3", "A009 §4"), a
-- stable anchor for the URL, and the markdown verbatim. Concatenated in
-- order, a document's sections reconstruct its body exactly; the loader
-- asserts that and refuses to emit when it does not hold.
--
-- What a person may read is the parent document's decision, inherited: the
-- read policy is an `exists` against governance_document, so the two
-- tables cannot drift. Since 0015 that decision is "anyone signed in".
-- No write policy: the corpus is loaded by SQL, by the administrator, and
-- the sections with it — deleted and reinserted per document inside the
-- loader's transaction, because their only natural key is the anchor.
--
-- search_manual(q) is the one RPC. Security invoker, so RLS filters it like
-- any other read. Two kinds of hit, and the first sits above the second:
--
--   * a citation match — the text typed, as an exact or prefix match on the
--     section's citation ("A009", "Art. II.B", "A009 §4"). A man who types
--     a citation wants that paragraph, not the eleven places it is
--     mentioned, and full-text tokenisation mangles "A009" and "II.B" both.
--     Trigram indexes on citation and on the document code keep it quick.
--   * a text match — websearch_to_tsquery('english', q), which takes what
--     people actually type (quoted phrases, a leading minus), ranked by
--     ts_rank_cd over a weighted vector: citation A, heading path B, body C.
--     The snippet is ts_headline with <mark> around the matched words; the
--     client renders the markers as the match mark and never as HTML.

create extension if not exists pg_trgm;

-- array_to_string() is only stable, and a generated column needs immutable.
-- The headings are text; joining them with a space is as immutable as it gets.
create or replace function heading_path_text(path text[]) returns text
language sql
immutable
parallel safe
as $$
  select array_to_string(coalesce(path, '{}'::text[]), ' ');
$$;

create table governance_section (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references governance_document (id) on delete cascade,
  -- The headings above the section, outermost first, the section's own last.
  heading_path text[] not null default '{}',
  -- Slug of the citation where there is one, else of the heading path. Stable
  -- across re-loads: derived from the text, never from a row number.
  anchor       text not null check (anchor ~ '^[a-z0-9][a-z0-9-]*$'),
  -- As the docket writes them. Empty for forms, the appendix, the quick
  -- reference: those are found by text alone, which is correct.
  citation     text not null default '',
  -- Markdown, verbatim, including the heading line.
  body         text not null default '',
  position     integer not null default 0,
  search       tsvector generated always as (
                 setweight(to_tsvector('english', coalesce(citation, '')), 'A') ||
                 setweight(to_tsvector('english', heading_path_text(heading_path)), 'B') ||
                 setweight(to_tsvector('english', body), 'C')
               ) stored,
  unique (document_id, anchor)
);

comment on table governance_section is 'One row per heading of the transcribed manual. Emitted by supabase/governance/build-seed.mjs; never written through the API. Read policy inherits governance_document''s.';

create index governance_section_document_position on governance_section (document_id, position);
create index governance_section_search on governance_section using gin (search);
create index governance_section_citation_trgm on governance_section using gin (citation gin_trgm_ops);
create index governance_document_code_trgm on governance_document using gin (code gin_trgm_ops);

alter table governance_section enable row level security;

-- Inherited, not restated: a section is readable when its document is.
create policy governance_section_read on governance_section
  for select using (
    exists (select 1 from governance_document d where d.id = governance_section.document_id)
  );

-- ---------------------------------------------------------------- search

create or replace function search_manual(q text)
returns table (
  section_id     uuid,
  document_id    uuid,
  document_slug  text,
  document_kind  text,
  document_code  text,
  document_title text,
  anchor         text,
  citation       text,
  heading_path   text[],
  section_position integer,
  by_citation    boolean,
  rank           real,
  snippet        text
)
language sql
stable
security invoker
set search_path = public
as $$
  with query as (
    select regexp_replace(btrim(coalesce(q, '')), '\s+', ' ', 'g') as raw,
           websearch_to_tsquery('english', nullif(btrim(coalesce(q, '')), '')) as tsq
  ),
  cited as (
    select s.id, s.document_id, s.anchor, s.citation, s.heading_path, s.position, s.body,
           case when lower(s.citation) = lower(query.raw) then 2.0 else 1.0 end::real as rank
      from governance_section s, query
     where query.raw <> ''
       and s.citation <> ''
       and lower(s.citation) like lower(query.raw) || '%'
  ),
  texts as (
    select s.id, s.document_id, s.anchor, s.citation, s.heading_path, s.position, s.body,
           ts_rank_cd(s.search, query.tsq)::real as rank
      from governance_section s, query
     where numnode(query.tsq) > 0
       and s.search @@ query.tsq
       and not exists (select 1 from cited c where c.id = s.id)
  ),
  hits as (
    select *, true as by_citation, 0 as tier from cited
    union all
    select *, false as by_citation, 1 as tier from texts
  )
  select h.id, h.document_id, d.slug, d.kind, d.code, d.title,
         h.anchor, h.citation, h.heading_path, h.position, h.by_citation, h.rank,
         case when h.by_citation or numnode(query.tsq) = 0
              then left(h.body, 240)
              else ts_headline('english', h.body, query.tsq,
                     'StartSel=<mark>, StopSel=</mark>, MaxWords=45, MinWords=25, MaxFragments=1')
         end as snippet
    from hits h
    join governance_document d on d.id = h.document_id
    cross join query
   order by h.tier, h.rank desc, d.position, h.position
   limit 80;
$$;

revoke execute on function search_manual(text) from public;
revoke execute on function search_manual(text) from anon;
grant execute on function search_manual(text) to authenticated;

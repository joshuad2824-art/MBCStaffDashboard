# Hand-off — Robert's Rules guide into the dashboard

For Claude Code, working in the dashboard repo. Read alongside `mbc-dashboard-expansion-brief.md`
(workstream A: the manual on both sides). This is a content drop plus a small seed/UI change,
not a new feature.

## What's here

`articles/` holds 46 markdown files: 42 articles and 4 reference pages (`i-want-to.md`,
`motion-cheat-sheet.md`, `precedence.md`, `glossary.md`). Every file has YAML front matter
(schema in `README.md`) and follows one template: title, **Short answer**, a facts strip for
motions, "What to say," "How it works," "Watch out for," an optional "At MBC" note, and a
source line.

## How it should go in

1. **Same table, new kind.** Load these into `governance_document` with a new kind,
   `parliamentary-guide`, in the next migration. Nothing here is `sensitivity: restricted`.
   The seed's refusal of restricted files stays as is.
2. **Audience: both sides.** Every file is `audience: both`. Staff and deacons alike should
   read it. That depends on the per-document audience from workstream A. If that hasn't
   landed, this kind should still be readable by staff-side users.
3. **Search.** Index `title`, `short_title`, `search_terms`, and the body. `search_terms`
   carries the everyday phrasings ("table it", "call the question", "do we have enough
   people") and should weigh more than body text. Prefer title and short-title matches in
   the ranking.
4. **Links.** Article links are plain relative links (`[Amend](amend.md)`). Resolve
   filename → document id at seed time, or route `*.md` links to the document with that
   slug.
5. **Landing.** The Robert's Rules section opens on `i-want-to.md`, with the search bar
   above it and the eight groups as categories (order in README "Lineup"). The cheat sheet
   and precedence ladder should be one tap away from every article.
6. **Rendering.** The facts strip is a single inline-code line
   (`` `Second: Yes · Debate: No · …` ``). Render it as a row of small labeled chips. The
   "At MBC" heading should be visually distinct, since that's where the bylaws override
   Robert's.
7. **Footer credit**, on every page in this kind: *Adapted in plain language from Robert's
   Rules of Order Revised (1915, public domain), via the Constitution Society,
   constitution.org.*
8. **Status.** Show `status: draft` documents only to admins until Joshua marks them
   `approved`.

## Don't

- Don't reword the articles. The voice is deliberate: plain, spoken, contractions. Every
  claim was checked against the 1915 text and the corpus.
- Don't merge "At MBC" content into the bylaws documents. It cites them; it doesn't
  replace them.

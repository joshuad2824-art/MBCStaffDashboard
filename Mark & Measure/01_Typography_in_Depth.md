# Typography in Depth — Phase 01: A Practitioner's Reference

## TL;DR
- **Master the craft, not the trivia: the large majority of fine typography is "craft consensus"** — well-tested professional judgment (measure, leading, rag, OpenType figures, pairing) rather than lab-proven science. Learn the rules from five canonical sources (Bringhurst, Lupton, Butterick, Spiekermann, Highsmith), apply them rigorously, then break them deliberately.
- **Two areas carry real, non-negotiable stakes for client work:** font licensing (using the wrong license for a logo or website is a genuine legal landmine — desktop ≠ webfont ≠ app, and clients usually need their own license) and accessibility (WCAG-grade rules on size, measure, line-height, and avoiding all-caps/justified body text).
- **Grade the folk claims honestly:** "dyslexia fonts" (OpenDyslexic, Dyslexie) helping is a **MYTH/overstated** — controlled studies show no benefit beyond their generous spacing; the specific **modular-scale ratio mattering** and the **golden ratio in type** are largely **overstated** — consistency and good judgment matter far more than which ratio you pick.

## Key Findings

1. **Vox-ATypI was formally retired in 2021** but remains the de facto teaching vocabulary; what matters for a practitioner is not the taxonomy but what each family *signals*.
2. **The heart of this phase is the craft of setting type** — and almost all of it is craft consensus passed down by master typographers, valuable precisely because it has been tested across centuries of reading, not because it is lab-proven.
3. **Type pairing is a system, not vibes:** contrast on one axis (usually classification) while harmonizing on another (x-height, proportion, mood). The safest professional move is one superfamily done well.
4. **Modern type technology** (OpenType features, variable fonts, web-font delivery) gives a practitioner enormous expressive and performance leverage — and the feature tags and CSS are concrete and learnable.
5. **Licensing and accessibility are where amateurs get hurt** — these deserve the most careful, concrete treatment.

## Details

### 1. Deep type classification and what each family signals

**Vox-ATypI's status.** The Association Typographique Internationale (ATypI) **de-adopted the Vox-ATypI classification on 18 March 2021** (announced April 2021), withdrawing its endorsement and convening a working group toward a new system. The system was devised by Maximilien Vox in 1954 and adopted by ATypI in 1962. The criticisms that killed it: it is **Latin-centric** (it lumps all non-Latin scripts into a catch-all "exotics"/non-Latin bucket, with Gaelic bolted on in 2010), it over-splits the Roman categories while ignoring the explosion of display/graphic types, and it carries cultural baggage (the French "Réales" class was opaque to outsiders). Catherine Dixon's 2002 critique noted it favors roman text faces over display types. As of the most recent reporting, no consensus replacement has emerged, so Vox remains the lingua franca even in retirement.

The original nine Vox classes: Humanes, Garaldes, Réales, Didones, Mécanes, Linéales, Incises, Manuaires, Scriptes (plus later Gothiques/blackletter and non-Latines).

**The practical move** — collapse Vox into the modern five-ish buckets used by most foundries and tools (Script, Serif, Sans, Mono, Display/Graphic), then drill into the historical sub-families and **what each one connotes**:

| Family | Archetype faces | What it signals |
|---|---|---|
| **Humanist / old-style serif** | Garamond, Bembo, Caslon, Minion | Warm, classical, literary, trustworthy, "the book." Low stroke contrast, oblique (pen-angle) axis. The default for long-form reading. |
| **Transitional serif** | Baskerville, Times New Roman, Plantin | Authoritative, professional, balanced, "establishment." Taller x-height, sharper, more vertical axis, ball terminals. |
| **Modern / Didone serif** | Bodoni, Didot, Walbaum | Elegant, luxurious, high-fashion, dramatic. Extreme thick/thin contrast, hairline serifs, vertical stress. Fragile at small sizes — a display look. |
| **Slab serif** | Rockwell, Archer, Clarendon | Sturdy, confident, friendly-but-strong, contemporary. Thick block serifs. Archer reads warm; Rockwell reads industrial. |
| **Grotesque / neo-grotesque sans** | Akzidenz-Grotesk, Helvetica, Univers | Neutral, modern, no-nonsense, corporate/Swiss. Closed apertures; great for short text and identity, less comfortable in long reads. |
| **Geometric sans** | Futura, Avenir, Century Gothic | Precise, forward-looking, minimal, "designed." Circle-based forms. Striking in headlines, tiring in long body text. |
| **Humanist sans** | Gill Sans, Frutiger, Myriad, Lato, Open Sans | Approachable, clear, human, accessible. Calligraphic proportions and open apertures — the best sans choice for long reading, UI and wayfinding. |
| **Glyphic** | Trajan, Albertus, Optima | Carved/inscriptional, formal, monumental, classical. (Optima is a "sans" that reads glyphic.) Trajan = movies and law firms. |
| **Script** | Snell Roundhand, brush scripts | Personal, elegant, or whimsical depending on execution. Never set in all caps; use sparingly. |
| **Display** | (Open-ended) | Loud, characterful, single-purpose. Designed to be seen at large sizes only. |

The evidence grade here is **craft consensus with a thin layer of weak empirical support.** Monotype's 2022 study with the neuroscience firm Neurons (released May 24, 2022) found typeface choice "boosts positive response by up to 13%": setting the word "quality" in Cotford Display "sparked a 13% increase in people's judgement of relevance, a 10% increase in how memorable it was and a 9% increase in trustworthiness." That same implicit-association study had respondents "rate the combinations using a range of emotional metrics — such as how sincere, memorable, trustworthy or confident they felt" across FS Jack (humanist sans), Gilroy (geometric sans) and Cotford (serif), which is the basis for the common claim that sans faces read as "competence/authority" and scripts as "warmth/friendliness." Treat connotations as **culturally contingent conventions** (they differ by region and era), not laws — but they are reliable enough to design with.

**Choosing for brand/purpose.** Work backward from the brief: define the brand adjectives (e.g., "trustworthy, established" → transitional serif; "innovative, clean" → geometric/neo-grotesque sans; "luxury, editorial" → Didone display + humanist serif text), then constrain by *function* — legibility at the required size, language coverage, available weights, optical sizes, and licensing/budget (Google Fonts' "checklist for choosing type" is a good practical filter).

### 2. The craft of setting type (the heart of this phase)

**Measure (line length).** The canonical target comes from **Robert Bringhurst's *The Elements of Typographic Style*** (the "typographer's bible," 1992, currently v4.0), verbatim: *"Anything from 45 to 75 characters is widely regarded as a satisfactory length of line for a single-column page set in a serifed text face… The 66-character line (counting both letters and spaces) is widely regarded as ideal. For multiple column work, a better average is 40 to 50 characters."* This maps to WCAG SC 1.4.8's ceiling of 80 characters. On the web, enforce it with `max-width: 66ch` (or ~34em). Evidence grade: **strong-ish craft consensus** — it's rooted in saccadic eye-movement behavior (too long and the eye loses the line return; too short and rhythm breaks), and eye-tracking work broadly supports the band, though "66 is ideal" is convention, not a proven optimum.

**Leading (line-height) and its relationships.** Leading is coupled to *both* measure and size: **longer measures need more leading** (so the eye finds the next line), shorter measures can take less. A reliable web starting point is **line-height 1.4–1.6 for body** (1.5 is the WCAG-friendly default), tightening as type grows: display heads can run 1.0–1.1, while small text wants looser leading. Bringhurst notes sans and monospace generally want *more* leading than serifs, and small-x-height faces need less than large-x-height faces. As size increases, leading (as a multiplier) decreases. Evidence grade: **craft consensus.**

**Tracking / letterspacing discipline.** The iron rule, attributed to Frederic Goudy ("anyone who would letterspace lowercase would steal sheep") and echoed by everyone since: **don't letterspace lowercase** — it destroys word-shape recognition and readability. Where tracking *is* correct:
- **All-caps and small caps:** add **5–12% extra letterspacing** (Butterick) — caps are drawn to sit next to each other tightly, and need opening up.
- **Small text / reversed (light-on-dark) / busy backgrounds:** open the tracking slightly (type appears tighter in these conditions).
- **Large display type:** *tighten* tracking — spacing looks optically looser as size grows. This is the core craft logic: a font is spaced for one size range, and you compensate with tracking outside it.
Evidence grade: **craft consensus**, very stable.

**Ligatures.** **Standard ligatures** (`liga` — fi, ffi, ffl, etc.) fix collisions between letters like f and i and should be **on by default** for text. **Discretionary ligatures** (`dlig` — ct, st, decorative) are off by default and for display/special effect only; never leave them on in running text.

**True small caps vs. faked.** Real small caps are drawn at a weight and proportion that matches the lowercase; software "fake" small caps simply scale capitals down, producing spindly, too-light letters. Butterick's rule: **"If you don't have real small caps, don't use them at all."** Access true ones via the `smcp` (lowercase→small caps) and `c2sc` (caps→small caps) OpenType features, or CSS `font-variant-caps: small-caps / all-small-caps` (use this, *not* `font-feature-settings`, for small caps).

**Figures (numerals) — four styles, four uses:**
- **Proportional oldstyle** (`onum` + `pnum`): figures with ascenders/descenders that blend into lowercase running text — use in body copy. (Georgia uses these by default.)
- **Lining figures** (`lnum`): all cap-height; use in **all-caps settings** and where numbers should stand out.
- **Tabular figures** (`tnum`): every figure on identical width so columns align vertically — use in **tables, price lists, financial statements**. (The default in most fonts is tabular lining.)
- **Proportional** for running text/headlines, **tabular** only when numbers must stack. Combine freely: proportional oldstyle in a paragraph, tabular lining in the table below it.

**Widows and orphans.** A **widow** is a lone word/short last line stranded at the top of a column; an **orphan** is a single line of a paragraph stranded at the bottom of a page. Eliminate by editing the rag, adjusting tracking minutely, or forcing breaks — never leave a single word alone on a line.

**Rag quality.** In flush-left/ragged-right setting, the right edge should make a **"good rag"**: a soft, irregular but balanced edge with no distracting shapes. A **"bad rag"** has hard zig-zags, successive lines of near-equal length, deep notches, or words/hyphens making accidental patterns. You fix a rag manually with discretionary line breaks (and tracking) — this is one of the most hand-crafted skills, championed in **Cyrus Highsmith's *Inside Paragraphs***.

**Justification vs. flush-left, and hyphenation.** Flush-left/ragged-right is the safer default (even word spacing, no rivers). **Justified text requires hyphenation on** to avoid loose, gappy lines and "rivers" of white space; never set justified type without it, and never below ~40 characters/line. Bringhurst: avoid consecutive hyphenated line-ends, but a hyphen beats sloppy spacing, and a good rag beats both. On the web and for accessibility, **avoid full justification** (it creates uneven spacing that hurts dyslexic and low-vision readers — see §8).

**Hanging punctuation / optical margin alignment.** Because punctuation and some letters (quotes, hyphens, periods, commas; protruding A/T/V/W/Y/1) carry little visual mass, a mechanically straight margin *looks* indented where they fall. Setting them slightly **outside** the margin makes the edge look optically straight. This dates to the **Gutenberg Bible (c. 1455)** and is championed in Bringhurst. To do it: **InDesign → Story panel → "Optical Margin Alignment"** (set the size to roughly your type size); in CSS, the **`hanging-punctuation`** property (values `first | last | force-end | allow-end`) — but note it is **WebKit/Safari-only** as of 2025 (not supported in Chrome or Firefox), so use a negative-`text-indent` fallback behind an `@supports` query.

**Paragraph spacing vs. indents; vertical rhythm.** Butterick's rule: signal a new paragraph with **either a first-line indent (1–4× the point size) OR space between paragraphs (4–10pt) — never both.** Indents suit long-form prose (set the *first* paragraph flush, indent subsequent ones); space-between suits business/web. A **baseline grid** (vertical rhythm) keeps line bottoms aligning across columns — set leading and paragraph spacing to multiples of a base unit. Evidence grade: **craft consensus.**

**Punctuation craft (the fastest "tell" of amateur vs. pro):**
- **Curly ("smart") quotes and apostrophes, never straight ("dumb") quotes.** Straight quotes ( ' " ) are a typewriter holdover; good typography uses ' ' " ". The apostrophe is always the *closing* single quote (’) and always points down.
- **Three dashes, three jobs:** **hyphen** (-) for compound words and line-break hyphenation; **en dash** (–) for ranges ("July 5–9", "Boston–London"); **em dash** (—) for breaks in a sentence. Don't substitute multiple hyphens for a dash. (Bringhurst prefers a *spaced en dash* over the em dash as a sentence break — a legitimate stylistic option.)
- **One space between sentences**, not two (a typewriter habit).
- Use a real **ellipsis** (…), proper **multiplication/minus** signs, and **prime/double-prime** marks (′ ″) for feet/inches — not straight quotes.

**The single best practitioner reference for these micro-rules is Matthew Butterick's *Practical Typography* (practicaltypography.com)**, free online; his "Summary of key rules" and "Typewriter habits" pages are a checklist you can apply in an afternoon.

### 3. Type pairing as a system

The professional framework (from Google Fonts Knowledge, TypeEd, 99designs, Pangram Pangram) is **concordance / contrast / conflict** — aim for either harmony or clear contrast, and avoid the **"muddy middle"** where two faces are *similar but not identical* (e.g., two different humanist sans), which reads like a mistake rather than a choice.

**Principled strategies:**
- **Contrast on classification, harmonize on proportion.** The classic move: pair a **serif with a sans**. The inherent serif/no-serif difference gives contrast without fighting; then ensure they share **x-height, cap-height, and overall proportion/mood** so they sit together.
- **Use a superfamily** (the safest approach): families designed across categories — **Source Serif / Source Sans / Source Code**, **Roboto / Roboto Slab / Roboto Mono**, IBM Plex, Lato, Museo. They share skeleton, metrics, spacing and motifs, so harmony is guaranteed by the type designer. You get contrast from weight/width/style instead of risking a mismatch.
- **Contrast must be decisive on at least one axis** — classification, weight, width, or scale. Faint contrast = muddy.

**How many typefaces?** **Two is the reliable rule; three is a stretch; beyond that you're building "a sampler platter"** (Pangram Pangram). A common beginner error is reaching for a new font every time something needs emphasis — instead, **exploit the weights and styles of the families you already have.** The **"one family done well"** approach — a single superfamily with a full range of weights/widths/optical sizes — is often the most sophisticated and cohesive choice, especially for small-business and brand work.

Evidence grade: **craft consensus**, highly reliable.

### 4. Type scales and hierarchy systems

A **modular (type) scale** is a sequence where each step = base × ratio^n, popularized for the web by **Tim Brown** (Adobe; *Flexible Typesetting*, A Book Apart) and Scott Kellum via **modularscale.com (2010)**, building on Bringhurst's "a modular scale, like a musical scale, is a prearranged set of harmonious proportions." Common ratios: minor second 1.067, major second 1.125, minor third 1.2, **major third 1.25**, **perfect fourth 1.333** (the most-used web ratio), augmented fourth 1.414, perfect fifth 1.5, **golden ratio 1.618**, octave 2.0.

**Does the ratio actually matter? Honest grade: largely OVERSTATED.** The "musical/historical/natural" justification (golden ratio appears in nature, musical-interval ratios are "harmonious") is **post-hoc mysticism, not evidence.** What actually matters:
- **Consistency** — picking *a* scale and applying it everywhere beats arbitrary sizes. This is the real, defensible benefit.
- **Fitness to context** — a large ratio (golden ratio, perfect fifth) gives dramatic heading/body contrast good for posters/landing pages but **breaks on small screens** (the golden ratio "looks incredible at 1440px and completely falls apart on a 375px phone"); a small ratio (major third 1.25, perfect fourth 1.333) is safer for UI and dense content.
- Developers and writers (e.g., Robin Rendle) openly call the obsession with the "perfect ratio" **"mathematical fetishism."** The ratio is a starting convenience, not a source of correctness.

**Building a 4–6 level hierarchy.** A practical ramp from a 16px base (the sensible default — browser default, WCAG-friendly): body 16, then h-levels via your ratio (e.g., perfect fourth: ~21, 28, 37, 50px) plus a small/caption step below base. Apply the same 5–6 sizes everywhere; pair each level with appropriate leading (tighter as size grows). **Responsive type:** either switch ratios at breakpoints (smaller ratio on mobile, larger on desktop) or — the modern approach — use **CSS `clamp()`** for fluid type that interpolates between min and max across the viewport (the **Utopia.fyi** method). Keep *body* size roughly constant across breakpoints (the readable size is the readable size); let *headings* scale most.

### 5. Display and expressive typography

**Display type differs from text type by design, not just size.** Historically every metal size was cut separately; **optical sizing** revives this. Text/caption cuts have **sturdier stems, more open counters, looser spacing, higher x-height, and ink traps** for legibility at small sizes; display cuts have **finer detail, higher contrast, tighter spacing, more personality.** A high-contrast Didone that's elegant on a book cover becomes fragile as a caption; a robust text face looks muted blown up to billboard scale. This is why "Display" faces (Playfair Display) and optical-size families (Helvetica Now's Micro/Text/Display; Degular Display/Text; Freight's many sizes) exist.

**In practice:** use a font's `opsz` axis or the named optical cut that matches your size. InDesign and Figma map font size → optical size automatically; on the web `font-optical-sizing: auto` does it (and Safari does it whenever a font has an `opsz` axis).

**Breaking the rules expressively — type as image/voice.** Once you can set clean text, display work is where you deliberately violate the body rules: extreme scale, tight (even overlapping) tracking, cropping, type-as-image, mixing weights for tension. The discipline: **break rules for headlines and identity, where reader effort is brief and impact is the goal — never in body copy**, where the rules protect reading comfort. The craft maxim (Bringhurst): typography must sometimes draw attention to itself before it will be read, yet in order to be read it must relinquish the attention it has drawn.

### 6. Modern type technology

**OpenType features — the practical tag set** (verified against Microsoft's OpenType Layout tag registry, Adobe Fonts, and MDN):

| Feature | Tag | On by default? | Use |
|---|---|---|---|
| Standard ligatures | `liga` | Yes | Always on for text |
| Discretionary ligatures | `dlig` | No | Display only |
| Contextual alternates | `calt` | Yes (off in Illustrator) | Better joining/harmonizing |
| Stylistic alternates | `salt` | No | Alternate glyph shapes (indexed) |
| Stylistic sets | `ss01`–`ss20` | No | Coordinated alternate-glyph sets |
| Small caps | `smcp` | No | lowercase → small caps |
| Caps → small caps | `c2sc` | No | UPPERCASE → small caps |
| Oldstyle figures | `onum` | No | Numerals in body text |
| Lining figures | `lnum` | No | Numerals in caps/standout |
| Tabular figures | `tnum` | No | Columns of numbers |
| Proportional figures | `pnum` | No | Numerals in running text |
| Fractions | `frac` | No | Diagonal fractions |
| Superscript / subscript | `sups` / `subs` | No | Ordinals, footnotes |
| Swashes | `swsh` | No | Decorative (indexed) |
| Kerning | `kern` | Usually | Pair spacing — keep on |

**How to access them:**
- **InDesign:** Character panel flyout → OpenType submenu (bracketed items = unavailable in that font); Glyphs panel to browse/insert specific alternates.
- **Illustrator:** dedicated OpenType panel (Window → Type → OpenType) + Glyphs panel. Note `calt` is **off by default** in Illustrator.
- **CSS — prefer the high-level properties** (MDN and Adobe explicitly recommend these over the low-level escape hatch, especially for small caps): `font-variant-ligatures` (common-ligatures, discretionary-ligatures, contextual), `font-variant-numeric` (oldstyle-nums, lining-nums, tabular-nums, proportional-nums, diagonal-fractions, ordinal), `font-variant-caps` (small-caps, all-small-caps), `font-variant-position` (super, sub), `font-kerning`. Use the **low-level `font-feature-settings`** only for tags without a high-level property (stylistic sets, swashes, stylistic alternates), e.g. `font-feature-settings: "ss01" 1, "swsh" 2;`. **Gotcha:** `font-feature-settings` does not cascade — redefining it on a child element resets all other tags, so re-specify them all or use CSS custom properties.

```css
.body  { font-variant-ligatures: common-ligatures contextual; }
.table { font-variant-numeric: lining-nums tabular-nums; }
.label { font-variant-caps: all-small-caps; }
.fancy { font-feature-settings: "dlig" 1, "ss02" 1, "swsh" 1; }
```

**Variable fonts.** An evolution of OpenType (**OpenType Font Variations, OpenType 1.8, 2016, jointly developed by Microsoft, Adobe, Apple, and Google**) that packs a whole family's design space into one file via **axes** stored in the `fvar` table. **Five registered axes (lowercase tags):** `wght` (weight, ~1–1000 → maps to `font-weight`), `wdth` (width % → `font-stretch`), `slnt` (slant in degrees → `font-style: oblique`), `ital` (italic 0/1 → `font-style`), `opsz` (optical size → `font-optical-sizing`). **Custom axes use UPPERCASE tags** (e.g., `GRAD` grade, `CASL` casual, `MONO`, `SOFT`, `WONK`) and must be set via `font-variation-settings`. *Slant* applies a mechanical tilt; *italic* swaps to truly redrawn glyphs (the lowercase a/g often differ).

Why they matter: **one file replaces dozens.** A developer case study (R. Moreno, 2024) measured Inter's variable build at **328KB**, replacing seven static Inter files totaling 724KB — a 55% reduction — and similar swaps commonly cut total payload by ~77% (e.g., six static weights at 348KB → one 78KB WOFF2 variable file). That unlocks using many weights, smooth weight transitions/animation, and automatic optical sizing without extra HTTP requests. **Support: all modern browsers** (Chrome 66+, Safari 11+ — Safari shipped them first, Firefox, Edge, Opera; ~97%+); only IE never supported them. Provide a static fallback for ancient browsers via the `@font-face` `src` list or `@supports`.

**Web-font delivery and performance:**
- **Format: WOFF2 only.** Per Google's web.dev, "WOFF 2.0's internal compression uses Brotli, and offers up to 30% better compression than WOFF" (and ~60–70% smaller than raw TTF); it recommends that "using WOFF 2.0 only is the simplest and most performant option." It is supported in all modern browsers.
- **FOIT vs. FOUT.** During loading a font passes through a *block* period (text invisible) and a *swap* period (fallback shown). **FOIT** = Flash of Invisible Text (block too long); **FOUT** = Flash of Unstyled Text (fallback then swap). **FOUT is almost always preferable** — visible content beats invisible content.
- **`font-display`:** `swap` (show fallback immediately, swap when loaded — recommended default for body); `optional` (≤100ms window, else fallback for the whole visit — near-zero layout shift, best for performance-critical pages); `fallback` (compromise); `block` (FOIT — only for icon fonts); `auto` (browser decides, usually block — avoid). Cut layout shift further with metric-matched fallbacks (`size-adjust`, `ascent-override`).
- **Subsetting:** strip unused glyphs via `unicode-range` or tools (pyftsubset/fonttools, Font Squirrel). A Latin-only subset can take a 90KB+ font to ~15–40KB (Google Fonts subsets automatically).
- **Self-hosting vs. services:** self-hosting WOFF2 typically saves 200–500ms vs. a third-party CDN (extra DNS/TCP/TLS), gives caching control, and resolves the **GDPR concern** that Google Fonts' CDN exposes user IPs. Modern browsers no longer share font cache across domains, so there's no caching upside to a shared CDN. Next.js (`@next/font`) and Nuxt auto-self-host and optimize. The exception: a license that *prohibits* self-hosting (then use the foundry's hosted service).
- **Performance budget:** target **under ~100KB total font payload and 2–4 files**; preload only the 1–2 above-the-fold fonts (`<link rel="preload" as="font" type="font/woff2" crossorigin>` — the `crossorigin` is mandatory or the font is fetched twice); cache with a 1-year immutable header on versioned filenames.

**FONT LICENSING — the real legal landmine for client work.** A font is **software**; "buying" it buys a **license (EULA)**, not ownership, and licenses are segmented by *medium*:
- **Desktop license:** install on a set number of machines to create static artwork (print, logos, rasterized images, PDFs). This is the **minimum needed to make a logo** — but check the EULA, as some foundries' desktop EULAs *specifically prohibit logo/trademark use*. Convert final logo text to **outlines** on delivery so the client doesn't need the font software. Desktop licenses are usually perpetual.
- **Webfont license:** embed via `@font-face`/CSS; usually priced by **monthly pageviews**; a separate purchase from desktop. A *static image* of type on a website needs only a desktop license, but actual web-embedded text needs this.
- **App license:** embed in a mobile/desktop app's software (per-app, scales with users).
- **ePub/ebook license:** embed in commercial digital publications.
- **Server license:** for dynamic/server-side generation (e.g., on-the-fly PDFs, print-on-demand).
- **"You can't just use any font for a client logo"** means three things concretely: (1) you need at least a desktop license that *permits logo use*; (2) the **client almost always needs their own license** — desktop licenses generally **forbid transferring/sublicensing the font files to the client**; deliver outlined artwork, or have the client buy the license in their own name; (3) free-for-*personal*-use ≠ free for commercial use — many "free" fonts are personal-use-only and require a paid commercial license for any client/business work. Real consequences exist: foundries' web-tracking has billed agencies for back-dated web-tier fees plus penalties; sharing raw files with a client that then runs a campaign has produced demand letters to *both* parties. (Notably, *House Industries v. Shake Shack* established that imitating a typeface's *look* without using the font software is not an EULA breach — letterform designs themselves aren't copyrightable in the US — but this is a narrow defense, not a license to use the software.)
- **SIL Open Font License (OFL):** the dominant open-source font license (Google Fonts, Inter, Source family, etc.). Created by SIL (Victor Gaultney & Nicolas Spalinger), v1.1 published Feb 2007. You may **use, study, modify, embed, redistribute, and even sell** OFL fonts — including in logos and commercial products, **no acknowledgment required** — subject to: (1) you **cannot sell the font by itself** (only bundled with other software/products); (2) modified versions **must not use a Reserved Font Name** (you must rename your derivative — and per the FAQ, even **subsetting for web counts as modification**, so technically rename, though common practice is lenient); (3) derivatives stay under the OFL. Documents made *with* the font are unrestricted.
- **Google Fonts:** the vast majority are OFL (a few Apache 2.0). Free for commercial use; you can self-host the files. The OFL terms above still apply (don't resell the raw font; rename derivatives).
- **Adobe Fonts:** covered by your Creative Cloud subscription for both desktop and web use, commercial work included — but you **cannot transfer the font files to a client** (they need their own CC subscription or a desktop license) and **cannot self-host/server-install** them. Outlined/rasterized/PDF-embedded output is fine for clients.

**Practical rule of thumb:** for client logos and brand work, prefer fonts with **clear, broad commercial EULAs or the OFL**, outline logo artwork on delivery, and make sure the *client* holds licenses for any ongoing text use (web, app, documents). When in doubt, read the EULA's "logo/trademark" and "transfer" clauses, or commission a bespoke logotype.

### 7. Screen vs. print typography

The core difference is **resolution and the pixel grid.** Print has effectively continuous resolution; screens render glyphs onto a coarse grid of pixels (and historically ~72–100 ppi).
- **Hinting** = instructions embedded in the font telling the rasterizer how to snap outlines to the pixel grid at small sizes. **Grid-fitting** (black-and-white hinting) significantly distorts outlines to fit whole pixels; manual hinting is laborious (≥80 hours for a basic character set).
- **Anti-aliasing** softens edges with gray pixels; **sub-pixel rendering** (e.g., Microsoft's ClearType) exploits the R-G-B sub-pixel stripes of an LCD to roughly triple horizontal resolution. Apple and Microsoft historically disagreed: Microsoft prioritized snapping to the grid for crisp small text (sometimes distorting the design); Apple prioritized faithful letterforms (heavier, fuzzier).
- **Fonts made for the screen.** **Matthew Carter's Georgia and Verdana** (Microsoft, mid-1990s, hand-hinted by Tom Rickner) were among the first faces *designed around the pixel grid* — large x-heights, open apertures/counters, sturdy serifs (Georgia), generous spacing — to stay legible at 9–12px on low-res CRTs. They're superb on screen but "don't have much character in print." This is why for screen body text a screen-optimized face beats a print classic like Times New Roman.
- **Today:** high-DPI ("Retina") displays make hinting far less critical and let delicate print faces render well, but you still **design for the eye and the device**, not the nominal size — a phone at arm's length, a monitor at desk distance, and a TV across the room can present the same *perceived* size at wildly different pixel sizes.
- **Responsive typography:** body size ~16px+ minimum, fluid headings via `clamp()`, optical sizing via `opsz`, and width axes (`wdth`) to fit more or fewer characters per line on different screens.

### 8. Type accessibility (honest evidence grading)

**WCAG-relevant layout guidance (these are concrete and authoritative):**
- **Line length:** SC 1.4.8 (Visual Presentation, AAA) — **≤80 characters per line** (≤40 for CJK). Enforce with `max-width: ~66–70ch`.
- **Line height & paragraph spacing:** SC 1.4.8 wants **line-height ≥ 1.5** within paragraphs and **paragraph spacing ≥ 1.5× the line spacing**, body text **not justified**, and user-selectable colors.
- **Text Spacing override:** SC 1.4.12 (AA) — content must not break when users force **line-height 1.5×, letter-spacing 0.12em, word-spacing 0.16em, paragraph-spacing 2× font-size.** This is one of the **most-failed** WCAG criteria; build with relative units (`em`/`rem`) and avoid fixed-height containers.
- **Resize:** SC 1.4.4 — text must scale to **200%** without loss of content or horizontal scrolling.
- **Minimum body size:** WCAG doesn't mandate a size, but **16px** is the universally recommended accessible body default (≥16px avoids reading friction for everyone).

**"Dyslexia-friendly" fonts — honest grade: the specific claim that bespoke dyslexia fonts help is a MYTH / not supported by controlled evidence.**
- **OpenDyslexic:** Rello & Baeza-Yates, *"Good Fonts for Dyslexia"* (Proc. ASSETS'13, DOI 10.1145/2513383.2513447) eye-tracked **48 readers with confirmed dyslexia** across 12 texts in 12 fonts; OpenDyslexic *"did not significantly improve reading time nor shorten eye fixation,"* while readers performed best with Helvetica, Arial, Verdana, Courier and CMU (and preferred Verdana and Helvetica). Wery & Diliberto (2016/17, *Annals of Dyslexia*, PMC5629233): *"Results from this alternating treatment experiment show no improvement in reading rate or accuracy for individual students with dyslexia, as well as the group as a whole… none of the participants reported preferring to read material presented in that font."* Zikl et al. (2015) found no difference vs. Arial.
- **Dyslexie:** Kuster et al. (2018, *Annals of Dyslexia*, 170+ Dutch children) found **no benefit** to reading speed/accuracy vs. Arial/Times; de Leeuw's 2010 thesis found readers were marginally *faster* in Arial than Dyslexie.
- **The crucial nuance:** where any benefit appears, it traces to **letter spacing, not the redrawn letterforms.** Marinus et al. (2016) found a ~7% gain with Dyslexie that **disappeared once Arial's spacing was matched** to Dyslexie's. So **increased spacing helps (and helps non-dyslexic readers too) — the special glyph shapes do not.**
- **What the evidence DOES support:** clean, plain **sans-serif faces with open counters and generous, even spacing** (Arial, Helvetica, Verdana, Tahoma, Trebuchet, Open Sans; also Atkinson Hyperlegible, Lexend). The **British Dyslexia Association Style Guide (2023)** recommends sans-serif, **12–14pt+**, **1.5 line spacing**, **left-aligned (not justified)**, **60–70 characters per line**, inter-word spacing ≥3.5× inter-letter spacing, and avoiding all-caps mid-line. Notably the BDA still *lists* OpenDyslexic/Dyslexie as options because they happen to embody these spacing/shape principles — not because the bespoke shapes are proven. **Bottom line: spend your effort on size, spacing, measure, and a clean sans — not on a "magic" dyslexia font.**

**All-caps — accessibility case is largely AGAINST for anything beyond a few words:**
- Reduces reading speed for everyone (uniform rectangular word shapes defeat word-shape recognition); harder for dyslexic/cognitive-impaired readers.
- **Screen readers may spell out all-caps words letter-by-letter** (interpreting them as acronyms). The fix: **type normal case and apply visual uppercase via CSS `text-transform: uppercase`** (the accessible name stays correct) — but the *readability* cost remains, so keep it to short headings/labels. Butterick: all caps are fine for **less than one line**, with added letterspacing.

**Justified body text — case AGAINST:** full justification creates uneven word spacing and "rivers," which slows reading and particularly hurts dyslexic and low-vision readers. WCAG SC 1.4.8 explicitly requires body text **not be justified** to pass. **Use flush-left/ragged-right.**

**Low-contrast type — AGAINST:** WCAG SC 1.4.3 requires **≥4.5:1** contrast for normal text (3:1 for large text) as the legal floor; for fluent reading, aim higher (some practitioners target APCA Lc ≥ 75). Light-gray-on-white body text is a common, harmful anti-pattern.

## Recommendations

**Stage 1 — Read the canon (build the mental model).** In priority order for a practitioner:
1. **Butterick's *Practical Typography*** (free at practicaltypography.com) — start with "Typography in ten minutes" and "Summary of key rules." Immediately actionable.
2. **Ellen Lupton, *Thinking with Type*** — the clearest conceptual on-ramp (anatomy → text → grid).
3. **Cyrus Highsmith, *Inside Paragraphs*** — trains your eye for spacing and rag at the paragraph level.
4. **Erik Spiekermann, *Stop Stealing Sheep & Find Out How Type Works*** — type's voice and behavior, accessibly.
5. **Robert Bringhurst, *The Elements of Typographic Style*** — the deep reference to grow into; pair with Richard Rutter's *The Elements of Typographic Style Applied to the Web* (webtypography.net) for screen translation.
6. **Tim Brown, *Flexible Typesetting*** (A Book Apart) — modular scales and responsive systems.

**Stage 2 — Build reusable assets for your brand work.**
- Standardize on **one superfamily with a wide range** (e.g., Source Serif/Sans/Code, IBM Plex, or a quality variable face) as your default — it solves pairing and performance at once.
- Create a **type-scale token set**: 16px base, one ratio (start with **major third 1.25 for UI / perfect fourth 1.333 for editorial**), 5–6 levels, each with a leading value. Generate with modularscale.com or Utopia (for fluid `clamp()` scales). Don't agonize over the ratio.
- Make a **personal "micro-typography checklist"** from Butterick's key rules (curly quotes; correct dashes; one space; `liga` on; real small caps or none; oldstyle figures in text / tabular in tables; indent *or* space, not both; good rag; hyphenation on if justified).

**Stage 3 — Lock down the professional risk areas before you take money.**
- **Licensing SOP:** for every client font, confirm desktop + (web/app/ebook as needed) coverage; check the EULA's logo and transfer clauses; outline logo artwork on delivery; ensure the *client* holds licenses for ongoing text use. Default to **OFL/Google Fonts** for low-friction commercial work; verify "personal use only" fonts are *not* used commercially.
- **Accessibility floor on every project:** ≥16px body, ≤~70ch measure, line-height ≥1.5, left-aligned body, ≥4.5:1 contrast, all-caps only for short labels (via `text-transform`), and test the WCAG 1.4.12 spacing overrides.
- **Web performance SOP:** WOFF2 only; self-host; subset to needed glyphs; `font-display: swap` (or `optional` for speed); preload 1–2 fonts with `crossorigin`; prefer one variable font; keep total under ~100KB.

**Benchmarks that would change these recommendations:**
- If a **large, well-controlled study** showed a bespoke dyslexia font outperforming a spacing-matched standard sans, revisit the dyslexia-font grade. (None exists yet.)
- If a client's traffic/usage scales past a webfont tier or into an app, **re-license** before shipping.
- If you're designing for **high-DPI-only** audiences, you can relax screen-font constraints and use more delicate/print-oriented faces.
- If a project genuinely needs three+ voices (e.g., complex editorial), a third typeface is justified — but prove the contrast is decisive on a clear axis first.

## Caveats
- **Evidence grading summary:** Most of fine typesetting (measure, leading, tracking, rag, pairing, hierarchy) is **craft consensus** — extremely reliable professional judgment, but not lab-proven, and that's appropriate. **Strong (perceptual/controlled) evidence** exists mainly for: line-length/spacing effects on reading, the *failure* of bespoke dyslexia fonts, and spacing benefits for dyslexic readers. **Overstated/myth:** the mystical importance of a *specific* modular-scale ratio, the golden ratio's special power in type, and "dyslexia fonts" helping via their letterforms.
- **Connotations are conventions, not laws** — typeface "personality" is culturally and historically contingent and varies by audience; test with your actual users where stakes are high.
- **Tooling and support move fast:** `hanging-punctuation` is essentially Safari-only as of 2025; variable-font axis support and CSS font-feature handling have browser quirks (e.g., Illustrator's `calt` default, the `font-feature-settings` non-cascade gotcha, Safari's automatic `opsz`). Verify current support (caniuse, MDN) before relying on edge features.
- **Licensing is contract law, and EULAs vary by foundry** — the categories above are the industry norm, but the controlling document is always the specific font's EULA. This report is not legal advice; for high-value brand/logo work, read the EULA or consult the foundry/an attorney.
- A few sourced specifics (e.g., exact Safari version for `hanging-punctuation`, the precise edition/page of Bringhurst on hanging punctuation) rest partly on secondary aggregators and should be verified against primary sources before being quoted.

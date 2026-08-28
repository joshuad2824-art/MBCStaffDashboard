# Phase 10 — Tools, Files & Production: The Technical Floor of Design Deliverables

**Scope & date stamp:** This report covers the technical production side of graphic/logo/brand design as of **June 28, 2026**. Several items are TIME-SENSITIVE and flagged accordingly: tool pricing, the Affinity-becomes-free change (Oct 2025), the Pantone/Adobe licensing split, software version numbers, and social-media dimensions. Durable principles (vector for logos, CMYK for print, bleed conventions, RGB vs CMYK gamut) will outlast the surface details. Font licensing (Phase 01), sketch-to-vector workflow (Phase 02), the logo suite/deliverable at process level (Phase 04), brand guidelines as a deliverable (Phase 05), and the legal/liability side of licensing (Phase 09) are referenced but not re-explained.

## TL;DR
- **Logos must be built and mastered as vector** (infinitely scalable math/paths), delivered in a multi-format kit (SVG/PDF/EPS/AI for masters and print; PNG/JPG for screen); **design in RGB for screens, CMYK for print**, and remember the two color spaces don't fully overlap so colors shift.
- **The single biggest 2025-26 shift: Affinity (now "Affinity by Canva") became permanently free on October 30, 2025** as a unified vector+raster+layout app — the strongest free alternative to Adobe ever, and notably it still includes Pantone support that Adobe stripped out; Adobe Illustrator remains the industry standard but is subscription-only.
- **The Adobe–Pantone split is still in force in 2026**: Pantone color books remain removed from Illustrator/Photoshop/InDesign, and full access requires the paid Pantone Connect plugin — date-stamp this and expect it to keep evolving.

## Key Findings

1. **Vector vs raster is the foundational decision, and logos are non-negotiably vector.** Vector files (SVG, EPS, AI, vector PDF) store images as mathematical paths and scale from favicon to billboard with zero quality loss; raster files (PNG, JPG, etc.) store a fixed grid of pixels and degrade when enlarged. A logo delivered only as a raster file is a liability.
2. **The "72 DPI for web / 300 DPI for print" rules are useful defaults built on shaky technical ground.** DPI and PPI are routinely confused; the "72 PPI" figure is essentially an obsolete myth on modern high-density screens; what actually matters on screen is pixel dimensions, and for print it's having enough pixels at the final printed size (~300 PPI for things viewed up close).
3. **Tool choice should follow the job and budget.** Illustrator for professional vector/logo work; the now-free Affinity as the serious budget alternative; Inkscape as the free open-source option; Figma for UI/web and collaboration; Canva for quick marketing collateral by non-designers but NOT for true logo/identity work; Photoshop for raster/photography only.
4. **Color management causes more production errors than almost anything else.** RGB (additive light) vs CMYK (subtractive ink), gamut mismatch, rich vs plain black, spot/Pantone colors, and the Pantone licensing mess all need to be handled deliberately.
5. **Print has its own non-negotiable mechanics**: bleed (~3 mm / 0.125"), trim, safe zone, 300 DPI imagery, CMYK, a press-ready PDF/X file, and always a proof.
6. **A professional deliverable package is foolproof by design**: every lockup × every format × every color mode (full-color, black, white/reversed), organized into plainly labeled folders ("FOR PRINT," "FOR WEB," "FULL COLOR," "BLACK," "WHITE") with a README so a non-designer client can't misuse it.

## Details

### 1. Vector vs. Raster — the foundational distinction

**Vector** graphics are defined by mathematical paths — points, lines, and Bézier curves (see Phase 02 for pen-tool/Bézier craft). Because the shapes are equations, they are **resolution-independent**: the same file renders crisply at any size, from a 16-pixel favicon to a stadium banner. Native vector formats: SVG, EPS, AI, and (usually) PDF.

**Raster** (bitmap) graphics are a fixed grid of colored pixels. They have a finite resolution baked in. Enlarge a raster beyond its native pixel count and the software has to invent pixels (interpolate), producing the familiar blur/pixelation. Formats: JPG, PNG, GIF, TIFF, WebP, HEIC.

**Why logos MUST be vector.** A logo has to work at every size and on every surface — business card, website header, embroidered shirt, vehicle wrap, billboard. Only a vector master guarantees a clean edge at all of them. A raster logo (e.g., a JPG pulled from a website) can only be used at or below its native size and will look fuzzy when scaled up or printed large. Vector also keeps the logo editable (recolor, adjust, separate elements) and is what sign shops, embroiderers, and screen printers require. The most common "logo emergency" is a business that only has a low-res JPG and now needs a banner — the fix is paying a designer to redraw it in vector.

**When raster is the right tool:** photographs and photorealistic, continuous-tone imagery with subtle gradients and texture — things vector can't represent efficiently. A vectorized photo looks flat and posterized; a raster photo looks natural. So: **logos, icons, type, and flat illustration → vector; photography and complex imagery → raster.**

**DPI vs PPI — clearing up the confusion (common-practice nuance, not pure fact):**
- **PPI (pixels per inch)** describes pixel density of a digital image or screen.
- **DPI (dots per inch)** describes the density of physical ink dots a printer lays down. DPI is set by the printer/press, not something you "put into" an image. The two are used interchangeably in everyday speech, which is usually harmless but technically wrong.
- **The "72 PPI" web myth:** 72 PPI traces to old Mac displays and is essentially meaningless today — modern screens range from ~96 PPI to Retina/"high-DPI" displays well over 200 PPI. **For screen work, what matters is the pixel dimensions of the image, not its PPI tag.** A 1080-px-wide image is what it is regardless of whether its metadata says 72 or 300.
- **The "300 DPI" print rule, with nuance:** 300 PPI at final printed size is the sensible standard for material viewed up close (business cards, brochures, magazines). But it scales with viewing distance: large posters can be fine at ~150 PPI, and billboards intentionally print at very low resolutions (e.g., ~20 PPI or less) because nobody views them from inches away. The real rule is: **enough pixels for the size and viewing distance.** For a 300-PPI print, image pixels needed = inches × 300 (a 6"×4" photo needs 1800×1200 px).
- **Misconception to correct:** "vector files are always smaller." Not true — a complex vector with many gradients/effects can be larger and slower to render than an optimized raster. Vector wins on scalability and editability, not automatically on file size.

### 2. The Tools — honest, dated assessment (June 2026)

**Adobe Illustrator — the industry standard for vector/logo work.** It is what professional studios use and what most printers/vendors expect. Subscription-only (Adobe ended perpetual licenses in 2013). As of June 2026, Adobe restructured its plans — confirmed by Adobe's own help pages: "On August 1, 2025, the Creative Cloud All Apps plan name will change to Creative Cloud Pro." The old single "All Apps" tier split into **Creative Cloud Standard (~$54.99/mo) and Creative Cloud Pro (~$69.99/mo)** for 20+ apps, with the Pro tier unlocking the full Firefly generative-AI feature set; a **single-app Illustrator subscription runs ~$22.99/month** (annual billed monthly), with student/teacher and annual-prepay discounts available. ⚠️ *Pricing changes frequently and varies by region/promotion — verify on Adobe's site before quoting.* Strengths: deepest vector toolset, precision, Pantone-via-plugin support, universal file compatibility, integration with the rest of Creative Cloud. Weaknesses: cost, subscription lock-in, increasing AI feature push.

**Affinity ("Affinity by Canva") — the headline change of 2025.** Originally a one-time-purchase suite (Designer/Photo/Publisher) from Serif. **Canva acquired Serif on March 26, 2024 for a reported $380 million** (TechCrunch, Mar 26, 2024: Bloomberg "reported that the deal was worth several hundred million pounds (approximately $380 million U.S.), and the company confirmed to TechCrunch that the number was accurate"). On **October 30, 2025, Canva relaunched the product as a single unified app called simply "Affinity" — now permanently free for Windows and macOS, with an iPad version in development.** It combines vector (Designer-equivalent), raster (Photo-equivalent), and layout (Publisher-equivalent) into one app with switchable Vector/Pixel/Layout "Studios." Canva describes it as "the full professional-grade Affinity experience" with "no catch, no stripped-back version, and no gotchas."

⚠️ **The catch/controversy to flag:** The core app is free and works offline (after a one-time activation requiring a free Canva account), but **generative-AI features (Generative Fill/Expand, text-to-image, etc.) sit in a separate "Canva AI Studio" that requires a paid Canva subscription (Pro/Business)**. The community has raised concerns about Canva diluting Affinity's pro identity, data/privacy, and whether more features get paywalled later. The old standalone Affinity v1/v2 apps are no longer sold or updated (activation servers remain up); the new app uses a new `.af` file format and can open old files but not vice versa. **Notably for this phase: Affinity includes Pantone support free — the very thing Adobe removed.** Per Canva's own newsroom post ("Why we made Affinity free"): "In just four days, more than one million people have signed up to Affinity – the equivalent of filling Wembley Stadium 11 times over."

**Inkscape — free and open-source vector editor.** SVG-native (it's its default format), cross-platform (Windows/macOS/Linux), genuinely capable for logos, icons, and illustration. Strengths: free, powerful node/path editing, strong SVG support. Weaknesses: steeper/less-polished UI, can be slow on very large files, occasional stability issues, weaker CMYK/print color management historically, and its SVG includes Inkscape-specific extensions that can trip up other apps. A legitimate choice for a budget-conscious hobbyist or someone helping friends.

**Figma — browser-based UI/product design with real-time collaboration.** Excellent vector pen/path tools and the gold standard for UI/UX, web design, and team collaboration; runs in-browser on any OS. Where it fits brand work: building digital design systems, web assets, and exporting SVG/PNG; great for collaborative review. Where it doesn't: it's screen/RGB-oriented, has **no CMYK or print-production support**, exports somewhat bloated SVG, and is not the natural home for print-bound logo/identity deliverables. Good complement, not a replacement for Illustrator/Affinity in a print pipeline.

**Canva — great for non-designers and marketing collateral, wrong for real logo/identity work.** Canva excels at quick social posts, flyers, presentations, and templated marketing material for people who aren't designers. **Its limits for professional logo/identity work are real and important:**
- It is template- and stock-element-based, so "your" logo can closely resemble countless others using the same elements.
- **Canva itself states you cannot trademark a logo built from its templates or stock content** (only your own uploaded original art, or basic shapes/lines/fonts, can be part of a trademark) — because the content is licensed non-exclusively to everyone. (This is the legal angle covered in Phase 09; here the point is technical/ownership limitation.)
- True vector export is limited (SVG export requires a paid plan and the design wasn't built with professional vector rigor), so scaling/print fidelity suffers.
- It leans raster and screen-oriented. **Verdict: fine for collateral and DIY, not for a logo you intend to own, trademark, and scale professionally.**

**Photoshop — raster king, not for logos.** Use it for photography, photo retouching, raster effects, and compositing. It is pixel-based; building a logo in Photoshop produces a resolution-locked raster that can't scale. You'll often use Photoshop *alongside* a vector tool (e.g., prepping a photo that sits behind a vector logo), but the logo itself belongs in vector software.

**Others worth knowing:** **CorelDRAW** (long-standing vector suite, popular in signage/apparel, available as one-time purchase or subscription); **Sketch** (Mac-only UI design, historically big before Figma); **Gravit/others** and web-based tools exist but are niche for this use case.

**Practical recommendation framework (for helping friends/small businesses or a future side-business):**
- **Serious/professional, print-bound logo & identity work, expect to do it regularly:** Adobe Illustrator (industry expectation, vendor compatibility).
- **Want pro capability without a subscription:** **Affinity (free as of Oct 2025)** — now the obvious first recommendation for budget-conscious serious work, including Pantone support.
- **Zero budget / open-source preference:** Inkscape.
- **Web/UI/app work and collaboration:** Figma.
- **Client's own ongoing marketing collateral (after you hand off a proper logo):** Canva is a reasonable place for *them* to make social posts — give them brand assets to drop in, not the keys to redesign the logo.
- **Photo work:** Photoshop (or Affinity's Pixel studio / free GIMP).

### 3. File Formats Decoded

**Vector formats:**
- **SVG (Scalable Vector Graphics):** XML-based, web-native, infinitely scalable, tiny for simple marks, stylable/animatable with CSS/JS, sharp on Retina. **Use for:** website/app logos and icons. Not for print handoff to vendors who can't open it.
- **EPS (Encapsulated PostScript):** the legacy universal vector exchange format. Older but still requested by many printers, sign shops, embroiderers, promo-product vendors. **Use for:** print/vendor production handoff. Most non-designers can't open it on their own — not for everyday sharing. Deliver with fonts outlined.
- **AI (Adobe Illustrator native):** the editable master/source file. **Use for:** archiving the master and future edits. Keep it; clients may need it if they brief another designer later.
- **PDF:** versatile — can hold vector and/or raster, is widely openable by anyone, and a **vector PDF** is increasingly the preferred print-handoff format (and a great "universal" file for clients). **Use for:** sharing, approvals, and print delivery. Note a PDF isn't *automatically* vector — it depends how it was made.

**Raster formats:**
- **PNG:** lossless, supports transparency. **Use for:** digital logos with transparent background, screenshots, graphics with sharp edges/text, social profile images. Best everyday transparent digital logo file.
- **JPG/JPEG:** lossy compression, no transparency, great for photographs. **Use for:** photos and simple previews; **avoid for logos** (lossy artifacts around hard edges, and the white box where you wanted transparency).
- **WebP:** modern web format. Per Google for Developers (developers.google.com/speed/webp): "WebP lossless images are 26% smaller than PNGs and lossy images are 25-34% smaller than comparable JPEGs at equivalent quality." Supports transparency and animation; now universally supported in current browsers. **Use for:** most web images in 2026 as the sensible default.
- **AVIF:** newest, best compression (~50% smaller than JPEG), supports transparency/HDR; browser support is broad but slightly behind WebP and encoding is slower. **Use for:** large hero/product images where the extra savings matter, ideally with a WebP/JPEG fallback via `<picture>`.
- **GIF:** legacy; only 256 colors. For animation in 2026, use video (MP4/WebM) or animated WebP instead. Largely obsolete.
- **TIFF:** large, high-quality, often uncompressed raster for professional print/photography workflows. Not for web.
- **HEIC:** Apple's efficient photo format from iPhones; good compression but limited cross-platform/web support — typically convert to JPG/PNG/WebP for delivery.

**The practical question — WHICH FORMAT FOR WHICH USE (file-format-for-use matrix):**

| Use case | Best | Acceptable | Avoid |
|---|---|---|---|
| Website / app logo | SVG | High-res transparent PNG | JPG |
| Social media profile/post | High-res PNG (transparent) | JPG (photos) | tiny/low-res anything |
| Email signature / docs | PNG | JPG | EPS/AI (can't embed) |
| Business cards / flyers (print) | Vector PDF or EPS | AI | JPG/PNG |
| Large-format / signage / banners | Vector (AI/EPS/PDF) | — | any raster |
| Screen-print / embroidery | Vector EPS | AI | raster |
| Master / future editing | AI (+ EPS backup) | layered source | flattened raster |
| Web photos / hero images | WebP (AVIF for big) | JPEG | uncompressed TIFF/PNG |

**Why deliver multiple formats:** no single format works everywhere. The professional model is a **master vector file** (AI) from which you derive everything else: vector exchange formats (EPS, SVG, vector PDF) for print/web vector use, and raster exports (PNG/JPG/WebP) at appropriate sizes for screen. Transparency (PNG/SVG/WebP, not JPG), lossy vs lossless (JPG/WebP-lossy lose data; PNG/SVG don't), and file-size/page-speed considerations drive the choices.

### 4. Color for Production

**RGB vs CMYK — the core of most color errors:**
- **RGB (Red/Green/Blue) is additive** — it mixes light; more light → toward white. It's how screens, cameras, and digital displays work. Wide gamut (~16.7 million colors).
- **CMYK (Cyan/Magenta/Yellow/Key-black) is subtractive** — inks absorb/subtract light reflected off paper; more ink → toward black. It's how commercial printing works. Narrower gamut (~16,000 effective colors).
- **Why screen ≠ print:** the RGB gamut is much larger than CMYK, and the two don't fully overlap. Bright, saturated, neon RGB colors (electric blues, fluorescent greens) simply can't be reproduced in ink and will **shift duller/muddier** when converted. This is physics, not a mistake.
- **Practical rule:** design in the color mode of your output. **CMYK for anything printed; RGB (sRGB) for anything on screen.** If you send an RGB file to a printer, their RIP will auto-convert it to CMYK — often with unwelcome surprises. Convert and check yourself first. Use soft-proofing (View > Proof Setup) and the gamut-warning tool to preview shifts. A brand should define its colors in all relevant systems — Pantone, CMYK, RGB, and HEX (see Phase 05 for the brand color system itself).

**Spot color / Pantone (PMS):**
- A **spot color** is a single pre-mixed ink applied in its own press run, rather than being simulated from CMYK dots. The **Pantone Matching System (PMS)** is the dominant standardized spot-color language: specify "Pantone 300 C" and any printer worldwide mixes the identical ink.
- **When/why used:** exact brand-color consistency (logos), colors outside the CMYK gamut, and special inks (metallics, fluorescents). Spot colors guarantee consistency that CMYK process can't. A two-color job using spot inks can also be cheaper than full CMYK.
- ⚠️ If you leave a spot color in a file destined for CMYK process printing, it gets converted to its nearest CMYK equivalent — and a metallic Pantone can come out an ugly brown. Decide deliberately.

**THE PANTONE LICENSING SITUATION (time-sensitive — date-stamped June 2026):**
- A licensing dispute between Adobe and Pantone led Adobe to **phase out the pre-loaded Pantone color books from Illustrator, InDesign, and Photoshop starting with updates after August 16, 2022**; with the **October 2023 release, all remaining Pantone books were removed** from Illustrator. The three previously-retained books (Pantone+ CMYK Coated, CMYK Uncoated, Metallic Coated) are also gone from the 2024/2025/2026 app versions.
- **Current state (mid-2026): the removal has NOT been reversed.** Adobe's own help pages confirm that accessing Pantone colors requires a **Pantone Connect** license via the plugin on Adobe Exchange.
- **Pantone Connect pricing (as of ~April 2026):** there is a **free "Basic" tier** (per Pantone support: "Pantone Connect Basic is FREE when you create an account… access to over 15,000 market relevant Pantone Colors, Search, Pick, and Measure Tools… and the ability to save and share up to 10 palettes"). **Premium** (unlimited palettes + a dozen advanced tools like Extract, Convert, Harmonies) costs **$89.99/year** per Pantone's official support. ⚠️ *Sources disagree on the monthly figure: Pantone's own support page states "$89.99 USD and monthly is $29.99 USD," while WhatTheyThink/Printing Industries Alliance and Printweek cite consumer pricing of "$14.99 monthly or $89.99 annually." The annual ($89.99) is consistent; treat the monthly as $14.99–$29.99 and verify on Pantone's site. Older articles citing ~$7.99/mo or $59.99/yr are outdated — Pantone raised prices sharply (Printweek: "a huge hike of 109%," with a Pantone spokesperson citing "added features to our application").*
- **Controversy:** widely criticized. Opening older files that used now-unlicensed Pantone colors can pop a warning and even **replace those colors with black**; the Pantone Connect plugin has been heavily panned (predominantly low/1-star reviews on Adobe Exchange).
- **Workarounds (commonly used in 2025-26):** copy legacy `.ACB` Pantone color-book files from a pre-2023 Adobe version into the newer version's Color Books folder; use free alternatives like Stuart Semple's **FreeTone** (per culturehustle.com: "FREETONE by Stuart Semple contains 1280 colours… extremely Pantoneish and reminiscent of those found in the most iconic colour book of all time") or other libraries (TruMatch, Toyo, HKS, Focoltone remain in Adobe unaffected); or **use Affinity, which retained free Pantone support.** ⚠️ This whole area is actively evolving — re-verify before relying on it.

**Color management / ICC profiles (brief):**
- An **ICC profile** describes how a specific device (monitor, printer, color space) reproduces color, letting a color-managed pipeline translate colors consistently across devices.
- **sRGB** is the safe, universal default for web and general sharing — most browsers and apps assume it, and an untagged image is treated as sRGB. **Always export web images as sRGB with the profile embedded.**
- **Adobe RGB** (and Display P3, ProPhoto RGB) have wider gamuts useful for high-end editing/print pipelines on calibrated wide-gamut displays — but uploading Adobe RGB to the web without converting often makes colors look dull/desaturated. Match the profile to the output; calibrate your monitor for any serious color decisions.

**HEX/RGB/CMYK conversion pitfalls & black:**
- HEX and RGB are the same thing expressed differently (both screen/additive); CMYK is a separate ink space. A HEX value won't translate to an exact CMYK match — which is why a brand needs values defined in each system rather than auto-converted on the fly (Phase 05).
- **Rich black vs plain black (a classic print error):** "Plain"/pure black is 100% K only (0/0/0/100). On large areas it can look weak/washed-out. **Rich black** adds other inks (a common recipe is ~60C/40M/40K/100K, or your printer's formula) for a deep, dense black on big fills/backgrounds. **But:** small/body **black text should stay 100% K only** (single ink) so it prints sharp — building small text from all four inks causes misregistration blur. **Never use "registration black" (100/100/100/100)** for content; it's only for printer's marks and floods the page with too much ink.
- RGB black (0,0,0) converts to a muddy four-ink build, so set true blacks deliberately in CMYK.

### 5. Print Production

**Bleed, trim, safe zone (well-established standard):**
- **Trim** = the final cut size of the piece (e.g., a business card trims to 3.5"×2").
- **Bleed** = artwork extended *beyond* the trim edge so that slight cutting variance doesn't leave white slivers. **Standard bleed is 1/8 inch (0.125") / 3 mm per edge** for small-format work (cards, flyers, brochures); large-format (banners, big posters) often wants more (commonly ~5 mm or more — the printer specifies). So an 8.5"×11" flyer is built at 8.75"×11.25" with bleed. Only extend backgrounds/photos into the bleed — never text or logos.
- **Safe zone (margin/live area)** = keep all critical content (text, logos, anything that must remain fully visible) at least **0.125" / 3 mm *inside* the trim line** (some use a more conservative 5 mm/0.25"). Cutting machines can shift a millimeter or two; the safe zone protects against losing content.
- **Crop/registration marks** indicate where to cut and how to align color plates; most pro apps add them automatically on PDF export. ⚠️ Always confirm exact bleed/safe specs with the specific printer — they vary.

**Resolution for print:** raster imagery should be **300 PPI at final printed size** for close-viewed work (with the viewing-distance nuance from Section 1 for large format). Line art can be higher. Low-res images are the single most common reason print jobs fail.

**Paper basics:**
- **Weight:** measured in **GSM (grams/m², metric, unambiguous)** or **lb (US pounds, confusing because it depends on category — an 80 lb text ≠ 80 lb cover).** Rough guide: 80-120 GSM office/letterhead; 130-170 GSM quality flyers/leaflets; 200-300 GSM premium brochure covers/menus; 300-400 GSM business cards/invitations. **GSM measures weight, not thickness** — coated paper feels thinner/denser than uncoated at the same GSM; thickness is separately measured in microns/points.
- **Coated vs uncoated (affects color!):** **Coated** stock (gloss/silk/matte coating) seals the surface so ink sits on top ("ink holdout") → sharper detail, richer, more saturated color, better for photos. **Uncoated** stock absorbs ink into the fibers → softer, slightly muted/darker color (higher dot gain), but natural feel and easy to write on. ⚠️ This is a real production trap: the same file prints duller on uncoated — pros use an **uncoated CMYK profile** to compensate.
- **Finishes (brief):** gloss (max vibrancy, shows fingerprints), matte/silk (premium, low glare, most common for corporate), plus post-print finishes like soft-touch lamination, spot UV, and metallic foiling.

**Working with a printer:**
- Deliver a **press-ready / print-ready PDF**, ideally to an industry standard: **PDF/X-1a** (CMYK/spot only, transparency flattened, fonts embedded — safe and restrictive), **PDF/X-3** (allows color-managed RGB), or **PDF/X-4** (the modern standard — supports live transparency, layers, color management; needs a modern RIP). Confirm which your printer wants.
- **Preflight** = the QC step that verifies the file is complete and correct before it goes to press: CMYK color, 300 DPI images, fonts embedded (or text outlined), bleed present, transparency handled, overprint correct, total ink coverage within limits (commonly ≤300-340% on coated sheetfed). Tools: Acrobat Pro's Preflight, InDesign's live preflight, Enfocus PitStop. Many shops run their own preflight and will bounce non-compliant files.
- **Package files** so nothing's missing (InDesign's "Package" collects fonts + linked images), or just send a properly exported PDF/X.
- **Always proof.** A **soft proof** is an on-screen simulation on a calibrated monitor (cheap, imperfect — your monitor is still RGB). A **hard proof** is a physical print from the actual production method (the real test for color-critical work). For anything where color matters, get a hard proof and sign off before the full run.
- **Common print mistakes:** RGB left in the file, no bleed, text in the safe-zone/too close to trim, low-res images, unintended spot colors, wrong overprint settings (e.g., white set to overprint disappears), pure black on large fills, rich/registration-black misuse, fonts not embedded.

### 6. Digital / Export

**Web & social export at the right sizes (time-sensitive — these change):**
- ⚠️ **Social dimensions shift regularly; verify before a campaign.** As of mid-2026 the durable patterns are: **1080 px wide is the baseline**; vertical/mobile-first ratios (4:5 portrait = 1080×1350; 9:16 full-screen = 1080×1920) now outperform squares (1080×1080). Instagram moved its profile grid to a 3:4 preview in early 2026 and prioritizes 4:5 portrait feed posts. Link-preview/Open Graph cards are ~1200×630 (1.91:1). Profile photos: upload ≥320×320 (often cropped to a circle). Export in **sRGB** (platforms re-compress, so export at target size or 2× and high quality to survive the second compression).
- Optimize for web: choose the right format (WebP default, AVIF for big images, PNG/SVG for logos/icons), compress sensibly (JPEG ~85-92% quality), strip unneeded metadata, and use responsive `srcset`/`<picture>`.

**Favicons (date-stamped 2026 best practice):** A favicon is the tiny site icon in browser tabs/bookmarks. The minimal modern set most experts recommend is just a few files: a **`favicon.ico`** (legacy fallback, typically containing 16×16/32×32/48×48), an **SVG favicon** (`icon.svg`, scales perfectly and supports dark-mode via CSS), and a **180×180 `apple-touch-icon.png`** for iOS home screens — plus 192×192 and 512×512 PNGs and a web manifest for PWAs/Android. Design a bold, simple mark (fine detail vanishes at 16×16), use transparency, and keep key content within the inner ~80% for maskable icons.

**Responsive / high-density assets (@2x, @3x):** High-density ("Retina") screens pack 2× or 3× the pixels, so a raster asset must be exported at 2× or 3× its display size or it looks blurry. Conventions: **iOS uses `@2x`/`@3x` suffixes; Android uses density buckets (mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi); web uses `srcset` with `1x/2x` descriptors.** Best practice: design at 1× (in points/dp) and export the multiples; **3× has diminishing returns** (hard to distinguish from 2× by eye, much bigger files). **Vector (SVG/PDF) sidesteps the whole problem** — a single SVG is sharp at every density and often smaller than a 3× PNG, which is why SVG is preferred for icons/logos on the web. Provide developers the assets they ask for in the form their platform expects.

**The logo export "kit" & app icons:** For a website/app handoff, give developers SVG (primary) plus PNG fallbacks at the sizes they need, in full-color/black/white variants, transparent background. App icons are typically square master art (e.g., 1024×1024) the platform then renders down to its many required sizes.

### 7. The Deliverable Package (technical assembly)

The goal: hand a **non-designer** a package they cannot misuse. (The business/process framing is Phase 04/05; this is the technical assembly.)

**What a complete professional logo handoff contains technically — every combination of:**
- **Lockups/variations:** primary (horizontal), stacked (vertical), brandmark/icon only, and any submark — see Phase 04 for building the suite.
- **Color modes:** full color, all-black (single-color), and white/reversed (for dark backgrounds).
- **File formats per use:** vector masters and print (AI, EPS, vector PDF, SVG) in **CMYK/Pantone for print** and **RGB for web**; raster exports (transparent PNG, plus JPG where transparency isn't needed) at a few sizes.
- **Extras:** favicon/app-icon set, the source/master AI file, and the brand sheet/guidelines (Phase 05) defining color values (Pantone/CMYK/RGB/HEX), clear space, minimum sizes, and misuse rules.

**Foolproof folder structure (organize by variation → color space → color version → format):**

```
BrandName_Logo_Package/
├── 00_START_HERE_README.pdf        (what's inside + which file to use when)
├── 01_FOR_PRINT (CMYK / Pantone)/
│   ├── Full-Color/   (AI, EPS, vector PDF)
│   ├── Black/        (AI, EPS, PDF)
│   └── White/        (AI, EPS, PDF)
├── 02_FOR_WEB (RGB)/
│   ├── Full-Color/   (SVG, transparent PNG @ 1x/2x, JPG)
│   ├── Black/        (SVG, PNG)
│   └── White/        (SVG, PNG)
├── 03_Favicon_App-Icons/
├── 04_Source-Master-Files/         (editable AI; keep safe)
└── 05_Brand-Guidelines/            (PDF brand sheet)
```

**Naming conventions:** consistent, lowercase, machine-friendly (underscores/hyphens, no spaces), descriptive: `brandname_horizontal_fullcolor_cmyk.pdf`, `brandname_icon_white_rgb.png`. Pre-pad numbers (01, 02…) so folders sort correctly.

**Making it foolproof:**
- Plain-language folder names ("FOR PRINT," "FOR WEB," "FULL COLOR," "BLACK," "WHITE") so a non-designer self-serves the right file.
- **A README/usage note** is the single highest-leverage item: a one-page "use SVG/PNG on the web, send the print folder to your printer, here's your transparent file, don't stretch the PNG for a banner" guide. Clients aren't fluent in file formats — this prevents the misuse that makes your work look bad.
- Deliver via cloud (Dropbox/Drive) as a link, not email attachments; back the master up in at least two places (losing source files means paying to recreate the logo).
- **Don't hand a client files they'll misuse** — e.g., don't bury a raw EPS in the web folder where they'll try (and fail) to upload it; give them the format that matches the job.

## Recommendations

**Stage 1 — Set up a capable toolkit cheaply (do now):**
- If budget is the constraint, **install Affinity (free as of Oct 2025)** as your primary vector+raster+layout tool; it covers logo design, print layout, and photo work and retains Pantone support. Add **Inkscape** if you want a pure open-source vector backup, and **GIMP** for free raster.
- If you intend to work with print vendors and other designers regularly, budget for **Adobe Illustrator single-app (~$23/mo)** — it's the compatibility standard. Re-verify pricing on Adobe's site (changes often).
- Use **Figma** for any web/UI/collaborative work; treat **Canva** as something you set up for *clients* to make their own social collateral after you deliver proper assets.

**Stage 2 — Build every deliverable to the durable standards (every project):**
- Master logos in **vector**, design in the **correct color mode for the output** (CMYK/print, sRGB/web), and always deliver a **multi-format kit** organized in the foolproof folder structure with a README.
- For print: set up **bleed (3 mm/0.125"), safe zone, 300 PPI imagery, CMYK**, export **PDF/X**, preflight, and **always proof** (hard proof for color-critical jobs).
- For web/social: export **sRGB**, use **WebP** as default (PNG/SVG for logos), provide **@2x/SVG** for high-density screens, and verify current social dimensions per platform.

**Stage 3 — Handle the time-sensitive landmines deliberately:**
- **Pantone:** if a client's brand uses Pantone spot colors and you're on current Adobe, you'll hit the missing-books problem — either keep a pre-2023 `.ACB` workaround, use Affinity, or budget for Pantone Connect Premium ($89.99/yr; monthly $14.99–$29.99 depending on source — verify). Define brand colors in Pantone+CMYK+RGB+HEX so you're never dependent on a live lookup.
- **Re-verify anything dated** in this report before relying on it: tool pricing, the Affinity model, Pantone Connect pricing, social dimensions, and software versions.

**Thresholds that change the recommendation:**
- If you start doing **regular paid client work / a side-business** → move to Illustrator for vendor compatibility and get comfortable with PDF/X + preflight + hard proofs.
- If a project is **color-critical** (packaging, a brand launch) → spot/Pantone + hard proof are non-negotiable; don't trust soft proofs.
- If Affinity later **paywalls core features** (watch for this) → reassess the free-tool recommendation.

## Caveats
- **Time-sensitivity is the dominant risk in this phase.** Tool pricing (Adobe, Pantone Connect), the Affinity-free model and its AI paywall, Pantone Connect's exact tiers/prices, social-media dimensions, and software version numbers all drift — every dated figure here is stamped to ~June 2026 and should be re-checked.
- **Pantone pricing specifically:** sources conflict because Pantone raised prices over time. The annual Premium figure ($89.99/yr) is consistent across Pantone's official support and industry press; the monthly figure is reported as $29.99 (Pantone support) or $14.99 (WhatTheyThink/Printweek). Regional pricing differs. Older articles citing ~$7.99/mo or $59.99/yr are out of date.
- **Printer-specific variance:** bleed amounts, preferred PDF/X flavor, ink-coverage limits, and accepted formats vary by shop — the conventions here are standard defaults, but the printer's own spec sheet always wins.
- **Evidence grading:** Vector-for-logos, RGB-vs-CMYK gamut, 300-DPI-for-close-print, bleed conventions, and format characteristics are well-established technical facts/industry standards. The "72 PPI" and "300 DPI" rules are useful defaults *with the nuances noted*. Tool pricing, the Affinity/Canva and Adobe/Pantone situations, and social dimensions are the time-sensitive, change-prone items.
- Some sourcing (social dimensions, favicon best practice) comes from vendor/tool blogs rather than primary platform docs; the underlying patterns are consistent across many such sources, but exact pixel specs should be confirmed against the platform's own current guidance.

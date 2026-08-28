# Phase 12 — Information Design & Data Visualization

**Part:** V — Visual & Information Design
**Applies to:** [Clinical/Training] [Creative/Content] [Universal]
**Type:** Research
**Status:** Researched — June 2026

---

## Bottom Line

Data visualization rests on a genuine empirical science of graphical perception — Cleveland & McGill's (1984) hierarchy showing position judgments beat length, angle, area, and color is real, replicated experimental evidence; this is why bar charts and dot plots beat pie and bubble charts for accuracy. By contrast, Edward Tufte's celebrated principles (data-ink ratio, chartjunk, lie factor) are largely expert craft prescription, parts of which (extreme minimalism) are contested by memorability research (Bateman 2010, Borkin 2013). Honesty in charts is an ethical discipline, not a stylistic one — truncated baselines, distorted aspect ratios, dual axes, 3-D effects, and un-normalized choropleth maps mislead as powerfully as any rhetorical trick — but the rules are task-dependent (bar charts must start at zero; line charts need not), and the "label the axis" defense fails because readers misread truncated charts even when labeled.

---

## Core Principles

- **Encode the most important quantity using position or length,** not angle (pie), area (bubble), or color — the Cleveland-McGill hierarchy.
- **Honesty is an ethical discipline:** keep the lie factor ≈ 1; bar/area charts start at zero; normalize maps to rates.
- **Chart type follows the data relationship and the message** — then "whatever is easiest for the audience to read."
- **Every metric needs context** (target, history, benchmark) — a number alone is not a dashboard.
- **Match embellishment to purpose** — minimal for clinical/scientific accuracy; tasteful embellishment can aid recall in content, never distorting the data.

---

## Key Thinkers & Seminal Sources

- **Cleveland & McGill** (1984, *JASA* — graphical-perception hierarchy); **Heer & Bostock** (2010, replication); **Mackinlay** (1986, expressiveness/effectiveness).
- **Edward Tufte** (*The Visual Display of Quantitative Information*, 1983/2001; *Envisioning Information*, 1990; *Visual Explanations*, 1997; *Beautiful Evidence*, 2006).
- **Critics:** Inbar, Tractinsky & Meyer (2007); **Bateman et al.** (2010, "Useful Junk?"); **Borkin et al.** (2013, "What Makes a Visualization Memorable?"); Gillan & Richman (1994).
- **Stephen Few** (*Show Me the Numbers*, 2004; *Information Dashboard Design*, 2006); **Alberto Cairo** (*The Functional Art*, 2012; *The Truthful Art*, 2016; *How Charts Lie*, 2019); **Jon Schwabish** (*Better Data Visualizations*, 2021); **Andrew Abela** (Chart Chooser); **FT Visual Vocabulary** (2016); **Naomi Robbins** (2005).
- **Darrell Huff** (*How to Lie with Statistics*, 1954); **Correll, Bertini & Franconeri** (2020, y-axis truncation); **Richard Saul Wurman** (LATCH/"Five Hat Racks," *Information Anxiety*, 1989).
- **Clinical:** Michels et al. (1997); Drews & Westenskow (2006); Zikmund-Fisher et al. (2015, *JAMIA*); Gigerenzer et al. (2007); Galesic, Garcia-Retamero & Gigerenzer (2009).

---

## Deep Dive

### Foundations / Edward Tufte

Tufte self-published *The Visual Display of Quantitative Information* (1983/2001) and three sequels. Core constructs: **graphical excellence and integrity** (the most ideas in the shortest time with the least ink, while telling the truth); the **data-ink ratio** ("maximize the data-ink ratio," "erase non-data-ink," "within reason"); **chartjunk** (moiré vibration, the grid, and the "duck"); the **lie factor** (effect shown ÷ effect in data — his famous *NYT* fuel-economy graphic: a 53% data increase drawn as a 783% graphical increase = lie factor 14.8); and **data density, small multiples, and sparklines**. Classic exemplars: **Minard's 1869 Napoleon flow map** (six variables in one image, "the best statistical graphic ever drawn"); **John Snow's 1854 cholera map**; the **Challenger O-ring** analysis.

**Critiques of Tufte (the minimalism doctrine is empirically contested):**
- **Inbar, Tractinsky & Meyer (2007):** 87 students preferred the non-minimalist "chartjunk" bar graph over Tufte's minimalist one.
- **Bateman et al. (2010), "Useful Junk?" (CHI):** embellished (Holmes-style) charts were no worse for interpretation accuracy and *significantly better* for recall after 2–3 weeks.
- **Borkin et al. (2013), "What Makes a Visualization Memorable?" (IEEE TVCG; 2,070 visualizations):** color, human-recognizable objects/pictograms, and unique chart types boosted memorability — but "a memorable visualization is not necessarily a good visualization."
- **Gillan & Richman (1994):** the data-ink/excellence relationship is non-linear — some "chartjunk" (axis lines) can *improve* performance.

Honest assessment: Tufte's anti-deception principles (integrity, the lie factor) are widely accepted; his aesthetic minimalism is a defensible style, not a proven law. Crucially, **memorability ≠ comprehension ≠ accuracy** — the debate partly reflects different outcome measures.

### Graphical Perception Science

**Cleveland & McGill (1984)** ranked elementary perceptual tasks by accuracy: (1) position along a common scale, (2) position on non-aligned scales, (3) length/direction/angle, (4) area, (5) volume/curvature, (6) shading/color saturation. **Heer & Bostock (2010)** replicated this via Mechanical Turk. Implication: pie charts force angle/area judgments (rank 3–4) and lose to bar charts (rank 1–3); donuts are worse (only arc/angle); pies are tolerable only for a few categories showing a rough split. Few's rule: if you must read the numbers on a pie, use a table or bar chart. **Mackinlay (1986)** formalized *expressiveness* and *effectiveness* plus a "Principle of Importance Ordering" — the conceptual ancestor of Tableau's "Show Me." **Preattentive attributes** (color, size, orientation, position) enable "pop-out"; Gestalt grouping (Phase 11) explains how chart elements read.

### Chart Selection

**Chart type follows the data relationship and the message,** then "whatever is easiest for the audience to read" (Knaflic). Frameworks: **Abela's Chart Chooser** (Comparison/Composition/Distribution/Relationship — Few critiques the overlap); the **FT Visual Vocabulary** (2016 — nine relationships: deviation, correlation, ranking, distribution, change over time, magnitude, part-to-whole, spatial, flow); **Schwabish** (2021, ~80 chart types); **Few** (*Show Me the Numbers*); **Robbins** (2005). **Tables vs. graphs:** table for precise lookup, few data, or differing units; graph when the pattern carries the message. **Dual-axis charts** are controversial — they can manufacture false correlation; many prefer two aligned panels.

### Honesty and Deception

- **Truncated/non-zero baselines.** Bars encode by length/area and *must* start at zero; line charts encode by position/slope and need not. **Nuance:** Correll, Bertini & Franconeri (2020), "Truncating the Y-Axis: Threat or Menace?" found truncation strongly exaggerated perceived effect in *both* bar and line charts, and "broken axis" markers did *not* reliably fix it — undercutting the "it's fine if labeled" defense.
- **Manipulated aspect ratio.** Cleveland's "banking to 45°": slope judgments are most accurate when segments average ~45°; stretching/squashing distorts perceived rate of change.
- **Dual axes** (false correlation); **cherry-picked scales**; **inappropriate chart types**; **area/3-D distortions**.
- **Misleading maps:** choropleths must map **rates/densities, not raw counts**. During the pandemic, 31 of 50 US states (62.0%) incorrectly used un-normalized data in choropleth maps vs. only 16 (32.0%) normalized (Aliaga et al., "Normalizing the pandemic," *Journal of Maps*, 2023).

Key thinkers: **Huff, *How to Lie with Statistics* (1954)** — the "Gee-Whiz Graph" and "One-Dimensional Picture"; the best-selling statistics book of the late 20th century (>1.5 million English copies). **Cairo** — five qualities: **truthful, functional, beautiful, insightful, enlightening** (truthfulness first).

### Information Design Beyond Charts

**Wurman** coined "information architect" (1976) and his **LATCH / "Five Hat Racks"**: information can be organized only five ways — **Location, Alphabet, Time, Category, Hierarchy**. **Information architecture** (Rosenfeld & Morville, 1998) is the structural counterpart of instructional design (Phase 07). **Table design** (Few; Schwabish's "Ten Guidelines"): right-align/decimal-align numbers, minimal rules, whitespace/banding to group, limited precision, summary rows where the eye expects them. **Diagrams, flowcharts, wayfinding, forms** structure relationships and sequences. **Document/report layout:** lead with an executive summary (BLUF), scannable heading hierarchy, callouts, small multiples (connects to Phase 11). **Infographics:** explanatory (data + annotation) are valuable; decorative low-density "infoposters" are the failure mode.

### Dashboards and Displays

**Few, *Information Dashboard Design* (2006/2013):** a single-screen, at-a-glance display of the most important information. His **13 common mistakes** include exceeding one screen, inadequate context, excessive precision, deficient measures, poor display media, meaningless variety, inaccurate encoding, clutter, ineffective highlighting, useless decoration, and misused color. He condemns space-wasting gauges/meters/traffic lights, recommending compact **bullet graphs** (his invention) and **sparklines**. Central principle: a metric means nothing without **context** — "$736,502 quarter-to-date" is meaningless without "compared to what?" Glanceable KPI/event screens apply the same logic.

---

## Evidence Base & Open Debates

- **Strongest:** graphical perception (Cleveland & McGill 1984; Heer & Bostock 2010 replication) — the field's empirical cornerstone, though derived largely from value-estimation tasks (rankings shift somewhat for comparison/trend/search).
- **Contested:** the **data-ink/chartjunk minimalism debate** is unresolved — minimalism is a style; embellishment can aid memory (Bateman, Borkin); the "right" answer depends on the goal (accuracy vs. recall vs. engagement).
- **Craft prescription, not controlled evidence:** much of the Tufte/Few tradition — treat as informed craft.
- **Context-dependence:** the best chart depends on the task (lookup vs. comparison vs. trend), so universal rankings have limits.
- **Memorability ≠ comprehension ≠ accuracy** — a design optimal for one may be suboptimal for another.
- **Accessibility (Phase 13):** CVD affects up to ~8% of males / 0.5% of females (Northern European; Simunovic, *Eye*, 2010) — never encode by red/green alone.

---

## Application by Context

### Clinical / Training
Where the perceptual science pays off in seconds. **Integrated graphical displays speed detection of deterioration:** Michels, Gravenstein & Westenskow (1997) found anesthesiologists detected inadequate paralysis **2.4 minutes sooner** and a cuff leak **3.1 minutes sooner** with an integrated graphic display; Drews & Westenskow (2006, *Human Factors*) is the anchor review. *Nuance:* a 2009 *BJA* study found a *mixed* numerical–graphical display best — graphics are an aid, not a panacea. **EHR displays often violate basic rules:** Zikmund-Fisher et al. (2015, *JAMIA*) found none of 8 EHRs met all 11 criteria, and some plotted unequal time points at equal spacing (distorting slope); Thayer et al. (2021, *JAMIA*) found a purpose-built asthma timeline significantly reduced time, screens, and cognitive load (all P < .001). **Honest risk communication:** Gigerenzer et al. (2007) showed **natural frequencies** turned physician confusion into correct interpretation (the mammogram task: ~95 of 100 doctors estimated ~75% when the true PPV was ~9%); Galesic, Garcia-Retamero & Gigerenzer (2009) found **icon arrays** improved accuracy across numeracy levels and reduced denominator neglect. Avoid 3-D, zero baselines for counts, and un-normalized disease maps.

### Ministry / Teaching
Use the **perceptual hierarchy** in lesson charts (bar/dot plots over pies; one message per chart; large fonts; high contrast for projection). **Organize handouts with LATCH** (a reference by Category, a church-history timeline by Time). **Glanceable event screens** (camps, services) follow dashboard logic — single screen, high contrast, position/size encoding, minimal decoration, readable at distance. Apply cognitive-load principles (Phase 05): signal the key number, strip chartjunk, let one idea land.

### Creative / Content
**Embellishment is a legitimate tool here** — Bateman and Borkin show it aids recall and engagement — provided it never distorts the encoding (lie factor ≈ 1); this is where Holmes-style charts earn their keep. **Data storytelling:** annotate directly, highlight the key series, use small multiples and scrollytelling (FT Visual Vocabulary as reference). Titles and text drive recall (Borkin), so write a strong, honest takeaway title; use a human-recognizable hook; keep the axis honest.

---

## Quick-Reference Heuristics

- **Default to position/length encodings** (bar, dot, line); reserve pies for a few categories; avoid 3-D, donuts, bubble comparisons when accuracy matters; switch to a table for precise lookup.
- **Bar/area charts start at zero, always;** line charts may use a meaningful range but disclose it. If a non-zero baseline is doing the persuasive work, you're deceiving.
- **Give every metric context** (target, history, benchmark).
- **Run Cairo's honesty checklist:** truthful → functional → beautiful → insightful → enlightening; compute a rough lie factor; normalize maps; question dual axes.
- **Match embellishment to purpose** — minimal for clinical/scientific; tasteful for content, never distorting.
- **For clinical risk:** use natural frequencies + icon arrays. **For teaching/ministry:** organize with LATCH; test slides at projection distance.
- **Build a style guide** (Schwabish) so honesty and clarity are the path of least resistance.

---

## When to Reach for This

Reach for Phase 12 whenever you're *presenting numbers or structuring complex information* — a clinical data display, an EHR chart, a report, a dashboard, a camp schedule screen, a patient risk explanation, or a data-driven blog post. Pair with Phase 11 (it sits on the same perceptual grammar), Phase 05 (glanceability reduces load), Phase 09/13 (honest charts are an ethical extension of persuasion-vs-manipulation and clarity).

---

## Connections to Other Phases

- **← 11 (Visual Design):** data viz is applied graphical perception — same Gestalt grouping and preattentive features; the "glance test" carries over.
- **← 05 (Cognitive Load):** glanceability and signaling reduce extraneous load.
- **↔ 09 (Narrative) & 13 (Clarity):** honest visualization is the ethical extension of persuasion-vs-manipulation and clarity-as-duty — a chart can mislead as powerfully as a story.
- **← 07 (Instructional Design):** information architecture is the structural counterpart of instructional design.

---

## Sources & Further Reading

- Cleveland & McGill (1984, *JASA*); Heer & Bostock (2010); Mackinlay (1986).
- Tufte (1983/2001; 1990; 1997; 2006).
- Inbar, Tractinsky & Meyer (2007); Bateman et al. (2010, CHI, "Useful Junk?"); Borkin et al. (2013, IEEE TVCG); Gillan & Richman (1994).
- Few (*Show Me the Numbers*, 2004; *Information Dashboard Design*, 2006/2013; *Now You See It*, 2009); Cairo (2012; 2016; 2019); Schwabish (*Better Data Visualizations*, 2021); Abela; FT Visual Vocabulary (2016); Robbins (2005).
- Huff (*How to Lie with Statistics*, 1954); Correll, Bertini & Franconeri (2020); Aliaga et al. (2023, *Journal of Maps*); Wurman (*Information Anxiety*, 1989); Rosenfeld & Morville (1998).
- Clinical: Michels et al. (1997); Drews & Westenskow (2006, *Human Factors*); Zikmund-Fisher et al. (2015, *JAMIA*); Thayer et al. (2021, *JAMIA*); Gigerenzer et al. (2007); Galesic, Garcia-Retamero & Gigerenzer (2009); Simunovic (2010, *Eye*).

*Evidence note: graphical perception is the field's strongest evidence base (but derived largely from value-estimation tasks). The data-ink/chartjunk minimalism debate is genuinely two-sided and unresolved. Much of the Tufte/Few tradition is expert craft, not controlled science. Memorability, comprehension, and accuracy are different outcomes. Some clinical effect sizes come from small simulator studies — directionally consistent but not always large samples.*

# Learning, Communication & Design — Research Library
## Master Plan & Build Spec

*A reusable reference library on how adults learn, how to teach and present, and how to design the artifacts that carry it. Built once, shared across every project, queried as needed.*

---

## 0. How to use this document

This is the **spec**, not the research itself. It defines what we're building, the order we'll build it in, the shape every output file will take, and — for each phase — exactly what the research run needs to chase down. Drop this file into any project's knowledge base; it tells that project what exists in the library and what each piece is for.

The library is built in **phases**. Most phases are a single deep-research run (you activate the Research feature, send the prompt, the report comes back, I reformat it into a schema-compliant markdown file). Two phases I build by hand from the others. You can stop after any *Part* and still have something coherent.

---

## 1. The shared output schema

Every researched phase produces one markdown file with these sections, in this order. Consistency is what makes the library composable — a project can jump to "Application by Context" in any file and know what it's looking at.

```
# [Phase N] — Title
Part: ...
Applies to: [Clinical/Training] [Ministry/Teaching] [Creative/Content] [Universal]
Status: Pending / Researched [date]

## Bottom Line
One paragraph. The durable core a busy project can read and move on.

## Core Principles
The load-bearing, citable claims. Each gets a one-line "why it matters."

## Key Thinkers & Seminal Sources
Person — their contribution — the work to actually read.

## Deep Dive
The substantive body, organized by sub-topic. This is the researched content.

## Evidence Base & Open Debates
What's well-supported, what's contested, what's outright myth (e.g. learning styles).
Honesty here is the point — we don't launder folk wisdom as science.

## Application by Context
### Clinical / Training
### Ministry / Teaching
### Creative / Content
Concrete moves, not platitudes.

## Quick-Reference Heuristics
Checklist / rules of thumb for fast recall.

## When to Reach for This
Decision guidance — the conditions under which this material is the right tool.

## Connections to Other Phases
Cross-links. This is what turns a stack of files into a library.

## Sources & Further Reading
```

---

## 2. Tagging convention

Each file (and where useful, each sub-section) carries one or more **Applies-to** tags so a project can filter fast:

- **[Clinical/Training]** — EHR/clinical education, physician onboarding kits, in-services, job aids, patient-facing material.
- **[Ministry/Teaching]** — student ministry, lessons, sermons, small groups, camp.
- **[Creative/Content]** — Timber & Ink, the podcast, the blog, the novel, album work.
- **[Universal]** — applies everywhere; foundational.

---

## 3. Workflow — how we run each phase

1. **You** review this plan and tell me which phase to start (default: in order).
2. **You** turn on the **Research** feature and send the ready-to-run prompt I provide for that phase. (I keep each prompt tightly scoped to our schema so the research goes deep instead of wandering.)
3. The research report comes back.
4. **I** convert it into a schema-compliant markdown file, add the tags, cross-links, and the application-by-context sections, and hand it back as a `.md` file.
5. Repeat. After a Part is complete, I can build any synthesis docs that draw on it.

You can run these in this chat or in separate ones — the prompts are self-contained, so it doesn't matter.

---

## 4. The map

**Part I — Adult Learning Theory** *(who the adult learner is, and the major theories of how they learn)*
- Phase 1 — Andragogy & the Self-Directing Adult
- Phase 2 — Learning Through Experience & Transformation
- Phase 3 — Social & Workplace Learning
- Phase 4 — Synthesis & Application *(built, not researched)*

**Part II — The Cognitive Science of Learning** *(the evidence-based engine under all of it)*
- Phase 5 — Cognitive Load & Multimedia Design
- Phase 6 — Memory & Durable Learning

**Part III — Instructional & Curriculum Design** *(turning all of the above into actual learning experiences)*
- Phase 7 — Designing Learning Experiences
- Phase 8 — Motivation, Engagement, Assessment & Evaluation

**Part IV — Presentation & Communication** *(carrying ideas to a live audience)*
- Phase 9 — Narrative & Rhetoric for Teaching and Speaking
- Phase 10 — Presentation Design & Delivery

**Part V — Visual & Information Design** *(the look and structure of the artifacts)*
- Phase 11 — Visual Design Fundamentals
- Phase 12 — Information Design & Data Visualization

**Part VI — Clarity, Accessibility & Facilitation** *(reaching everyone, and running the room)*
- Phase 13 — Clarity & Accessibility
- Phase 14 — Facilitation & Teaching Presence

**Capstone**
- Phase 15 — Master Index & Cross-Project Application Guide *(built, not researched)*

**Recommended sequence:** straight through. But natural stopping points exist after **Part II** (you'd have a complete, evidence-grounded foundation for designing any training or teaching) and after **Part III** (you'd have the full "design a learning experience" toolkit). Parts IV–VI are the craft layers on top.

---

## 5. Phase briefs

Each brief below defines scope, the questions the research must answer, the thinkers/frameworks that *must* appear, and the applies-to tags. The brief is essentially the research prompt; I'll polish it into a clean paste-ready prompt at activation.

---

### PART I — ADULT LEARNING THEORY

#### Phase 1 — Andragogy & the Self-Directing Adult
**Applies to:** [Universal]
**Scope:** The autonomous adult learner — andragogy, self-directed learning, and self-determined learning (heutagogy).
**Chase down:**
- The history and definition of andragogy; Knowles's six core assumptions about adult learners.
- Andragogy vs pedagogy — is it a continuum, a method, or a set of assumptions? Is it even a "theory"?
- Self-directed learning: how it's defined, scaffolded, and assessed; readiness and the risk of abandoning novices to it.
- Heutagogy (self-determined learning) and how it extends SDL.
- The serious critiques: cultural assumptions, lack of empirical grounding, when self-direction *fails* (links forward to cognitive load and novice/expert differences).
**Must surface:** Malcolm Knowles (six assumptions; Lindeman & Kapp roots); Allen Tough; D.R. Garrison's SDL model; Gerald Grow's *Staged Self-Directed Learning*; Hase & Kenyon (heutagogy); the major critiques.

#### Phase 2 — Learning Through Experience & Transformation
**Applies to:** [Universal]
**Scope:** How experience becomes learning, and how learning can reframe a person's entire perspective.
**Chase down:**
- Kolb's experiential learning cycle (and the strength of the cycle vs the weakness of the learning-styles inventory built on it).
- The mechanics of reflection: reflection-in-action vs reflection-on-action.
- Transformative learning — how a "disorienting dilemma" can trigger genuine perspective change; the phases of that change.
- How (and whether) transformation can be deliberately facilitated.
- The evidence base and where these models are romanticized.
**Must surface:** David Kolb (the cycle; LSI caveat); John Dewey (*Experience and Education*); Kurt Lewin; Donald Schön (*The Reflective Practitioner*); Jack Mezirow (transformative learning, the 10 phases, critical reflection); Stephen Brookfield.

#### Phase 3 — Social & Workplace Learning
**Applies to:** [Universal] [Clinical/Training] [Ministry/Teaching]
**Scope:** Learning that happens with and through other people, in real work and real community.
**Chase down:**
- Situated learning and **legitimate peripheral participation** — how newcomers learn by moving from the edge to the center of a practice.
- Communities of Practice: the domain/community/practice structure; how CoPs are cultivated rather than manufactured.
- Action Learning: Revans's `L = P + Q` (learning = programmed knowledge + questioning insight); the "set," the problem, the roles.
- How these play out in organizations and small groups; evidence of effectiveness.
**Must surface:** Jean Lave & Etienne Wenger (situated learning, LPP); Wenger (*Cultivating Communities of Practice*); Reg Revans (action learning); Michael Marquardt (action learning variants); a light touch on Bandura (social learning) and Siemens/Downes (connectivism) for context.

#### Phase 4 — Synthesis & Application of Adult Learning Theory
**Applies to:** [Universal]
**Built by hand from Phases 1–3.** A comparison matrix (assumptions, mechanism, best-fit context, evidence strength, failure modes), a single decision guide ("given this situation, reach for this theory"), and a consolidated application-by-context section. No research run.

---

### PART II — THE COGNITIVE SCIENCE OF LEARNING

#### Phase 5 — Cognitive Load & Multimedia Design
**Applies to:** [Universal] — *highest-leverage phase for practical work*
**Scope:** The working-memory constraints that govern whether anyone can actually absorb what you put in front of them, and the design rules that follow.
**Chase down:**
- Working memory limits and why they're the bottleneck for all learning.
- Cognitive Load Theory: intrinsic / extraneous / germane load; worked examples; the **expertise-reversal effect** (what helps novices hurts experts); split-attention and redundancy.
- Mayer's Cognitive Theory of Multimedia Learning and its full set of design principles (coherence, signaling, redundancy, contiguity, segmenting, pre-training, modality, personalization, etc.) — with the evidence behind each.
- Dual coding (words + visuals).
- Direct translation into slides, guides, EHR tip sheets, and onboarding documents.
**Must surface:** John Sweller (CLT); Richard Mayer (CTML, the principles); Alan Baddeley (working memory); Allan Paivio (dual coding); the Miller "7±2" myth vs Cowan's ~4.

#### Phase 6 — Memory & Durable Learning
**Applies to:** [Universal]
**Scope:** What makes learning *stick* past the session — the difference between feeling fluent and actually remembering.
**Chase down:**
- The testing/retrieval effect; the spacing effect and the forgetting curve; interleaving.
- "Desirable difficulties" — why making learning slightly harder makes it last.
- The illusions of fluency (rereading, highlighting, massed cramming) and why they fail.
- Practical retrieval and spacing tactics for training and teaching.
- A clear, evidence-based debunking of learning styles.
**Must surface:** Roediger & Karpicke (retrieval practice); Robert Bjork (desirable difficulties); Ebbinghaus (forgetting curve); Cepeda et al. (spacing); Brown, Roediger & McDaniel (*Make It Stick*).

---

### PART III — INSTRUCTIONAL & CURRICULUM DESIGN

#### Phase 7 — Designing Learning Experiences
**Applies to:** [Clinical/Training] [Ministry/Teaching] [Universal]
**Scope:** The architecture of a lesson, course, or training kit — from objective to sequence to job aid.
**Chase down:**
- Writing real, measurable learning objectives; taxonomies of learning.
- Backward design — starting from desired results, not content.
- The major design-process models and how they differ; when to use which.
- Sequencing and scaffolding; the events that structure effective instruction.
- Microlearning vs full courses; performance support and job aids vs training (when *not* to build a course at all — directly relevant to a self-service kit factory).
**Must surface:** Bloom's taxonomy + the Anderson/Krathwohl revision (and affective/psychomotor domains); Dee Fink (*Significant Learning*); Mager (objectives); Wiggins & McTighe (Understanding by Design); ADDIE; Michael Allen (SAM); Robert Gagné (Nine Events); Vygotsky (ZPD/scaffolding); Gloria Gery (performance support).

#### Phase 8 — Motivation, Engagement, Assessment & Evaluation
**Applies to:** [Clinical/Training] [Ministry/Teaching] [Universal]
**Scope:** Getting adults to care, and proving the teaching actually worked.
**Chase down:**
- Motivation models for instruction; designing for autonomy, competence, and relatedness.
- Effective feedback — what makes it work, what makes it backfire.
- Formative vs summative assessment; rubrics.
- Evaluation: measuring beyond the "smile sheet" — reaction, learning, behavior, results, and ROI.
**Must surface:** John Keller (ARCS); Deci & Ryan (Self-Determination Theory); Hattie & Timperley (feedback); Carol Dweck (mindset — *with* replication caveats); Csikszentmihalyi (flow); Donald Kirkpatrick (four levels); Jack Phillips (ROI); Robert Brinkerhoff (Success Case Method).

---

### PART IV — PRESENTATION & COMMUNICATION

#### Phase 9 — Narrative & Rhetoric for Teaching and Speaking
**Applies to:** [Ministry/Teaching] [Creative/Content] [Universal]
**Scope:** Story and persuasion as instruments of teaching — your native strength, made rigorous.
**Chase down:**
- Why story is "psychologically privileged" — how narrative aids comprehension and memory.
- Story structures usable for nonfiction and teaching (three-act, the story spine, in-medias-res, contrast/tension).
- Classical rhetoric: the three appeals and the five canons; how each applies to a lesson or talk.
- Modern, evidence-backed persuasion and stickiness.
- Openings, closings, and the architecture of a memorable talk.
**Must surface:** Aristotle (ethos/pathos/logos; the canons); Daniel Willingham (story and memory); Chip & Dan Heath (*Made to Stick* — SUCCESs); Nancy Duarte (the "what is / what could be" sparkline); a light, ethical touch on Cialdini.

#### Phase 10 — Presentation Design & Delivery
**Applies to:** [Clinical/Training] [Ministry/Teaching] [Universal]
**Scope:** The craft of building and giving a talk that holds a room.
**Chase down:**
- What separates excellent decks from default ones; signal-to-noise and simplicity.
- The **assertion-evidence model** — sentence headlines + visual evidence — and the research showing it beats bullet points for technical/medical content.
- Slide design fundamentals (one idea per slide, contrast, builds).
- Delivery mechanics: voice, pacing, the strategic pause, eye contact, gesture, managing nerves, handling Q&A.
- Audience analysis and rehearsal.
**Must surface:** Nancy Duarte (*slide:ology*, *Resonate*); Garr Reynolds (*Presentation Zen*); Michael Alley (assertion-evidence); Cliff Atkinson (*Beyond Bullet Points*); a light touch on Kawasaki's 10/20/30.

---

### PART V — VISUAL & INFORMATION DESIGN

#### Phase 11 — Visual Design Fundamentals
**Applies to:** [Creative/Content] [Clinical/Training] [Ministry/Teaching] [Universal]
**Scope:** The grammar of visual design — type, layout, hierarchy, color — for someone who designs but isn't a trained designer.
**Chase down:**
- Typography: classification, pairing, hierarchy, measure/leading/tracking, readability vs legibility.
- Layout: grids, alignment, proximity, repetition, the rule of thirds.
- Visual hierarchy and the disciplined use of white space.
- Gestalt principles and how perception groups elements.
- Color theory: schemes, contrast, accessibility (contrast ratios, color-vision deficiency), and cultural meaning.
- Systematizing it all with design systems, tokens, and templates for brand consistency.
**Must surface:** Robin Williams (*The Non-Designer's Design Book* — proximity/alignment/repetition/contrast); core typography references; Gestalt psychology; Josef Albers / Itten on color; WCAG contrast standards; design-token practice.

#### Phase 12 — Information Design & Data Visualization
**Applies to:** [Clinical/Training] [Creative/Content] [Universal]
**Scope:** Structuring complex information and numbers so they're understood at a glance — and honestly.
**Chase down:**
- Information design principles; reducing complexity without distortion.
- Choosing the right chart for the data; designing honest charts; common distortions to avoid.
- Tables, dashboards, diagrams, flowcharts, and wayfinding logic.
- Document and report structure for dense material.
- Infographics done well vs the chartjunk trap.
**Must surface:** Edward Tufte (data-ink ratio, chartjunk, small multiples, sparklines); Stephen Few (*Show Me the Numbers*, dashboards); Alberto Cairo (*The Truthful Art*); core information-design references.

---

### PART VI — CLARITY, ACCESSIBILITY & FACILITATION

#### Phase 13 — Clarity & Accessibility
**Applies to:** [Clinical/Training] [Ministry/Teaching] [Universal]
**Scope:** Writing and designing so that *everyone* — across reading levels, health literacy, and ability — can actually use it. Heavily clinical, but it touches all-ages church material too.
**Chase down:**
- Plain language principles, with before/after patterns.
- Readability formulas and their proper (and improper) use.
- **Health literacy** — designing for low health literacy, the teach-back method, "universal precautions" for health communication.
- Universal Design for Learning — multiple means of engagement, representation, and action/expression.
- Document accessibility — the POUR principles, alt text, contrast, accessible PDFs and Word docs, screen-reader basics.
**Must surface:** plainlanguage.gov / the Plain Writing Act; Flesch-Kincaid and SMOG (with caveats); AHRQ and CDC Clear Communication / health-literacy guidance; CAST (UDL); WCAG (POUR).

#### Phase 14 — Facilitation & Teaching Presence
**Applies to:** [Ministry/Teaching] [Clinical/Training] [Universal]
**Scope:** Running the room — facilitating discussion, asking better questions, building safety, and stewarding ongoing learning communities. Ties back to CoPs and action learning from Phase 3.
**Chase down:**
- Facilitation vs presenting vs teaching — the shift from telling to drawing out.
- Questioning technique: open and probing questions, Socratic method, leveled questions, and the power of wait time.
- Building psychological safety; managing group dynamics and disruption.
- Stewarding communities of practice and running action-learning sets in practice.
- "Teaching presence" and classroom management, including the youth-ministry context.
**Must surface:** Amy Edmondson (psychological safety); Tuckman (group stages); Kounin ("withitness"); Garrison's Community of Inquiry (cognitive/social/teaching presence); Wenger (CoP stewardship); action-learning facilitation practice; a light touch on Bohm (dialogue).

---

### CAPSTONE

#### Phase 15 — Master Index & Cross-Project Application Guide
**Applies to:** [Universal]
**Built by hand once the researched phases are complete.** The single front door to the library: a clean map of every file, the tag key, a "what applies to which project" matrix, a recommended reading order for different needs, and guidance on how to query the library from inside any project. No research run.

---

## 6. Status tracker

| Phase | Title | Type | Status |
|------|-------|------|--------|
| 1 | Andragogy & the Self-Directing Adult | Research | Pending |
| 2 | Learning Through Experience & Transformation | Research | Pending |
| 3 | Social & Workplace Learning | Research | Pending |
| 4 | Synthesis & Application | Built | Pending |
| 5 | Cognitive Load & Multimedia Design | Research | Pending |
| 6 | Memory & Durable Learning | Research | Pending |
| 7 | Designing Learning Experiences | Research | Pending |
| 8 | Motivation, Engagement, Assessment & Evaluation | Research | Pending |
| 9 | Narrative & Rhetoric for Teaching and Speaking | Research | Pending |
| 10 | Presentation Design & Delivery | Research | Pending |
| 11 | Visual Design Fundamentals | Research | Pending |
| 12 | Information Design & Data Visualization | Research | Pending |
| 13 | Clarity & Accessibility | Research | Pending |
| 14 | Facilitation & Teaching Presence | Research | Pending |
| 15 | Master Index & Cross-Project Application Guide | Built | Pending |

---

*Now go and make something of your spare moments.*

# Robert's Rules — plain-language guide for the MBC dashboard

A searchable, plain-spoken guide to running a meeting by Robert's Rules, built for staff and
deacons. It's meant for the moment someone in the room asks "can we do that?" and the group
needs the answer in under a minute.

**Source:** *Robert's Rules of Order Revised* by Henry M. Robert, 1915 edition (public domain),
as published online by the Constitution Society. Section numbers (§28, etc.) follow that
edition. Credit line for the dashboard footer: *Adapted in plain language from Robert's Rules
of Order Revised (1915, public domain), via the Constitution Society, constitution.org.*

**Why MBC uses it:** Bylaws Art. IV §2 ¶1 — "Robert's Rules of Order shall serve as a general
guide to parliamentary procedure except for changes specifically identified by these by-laws."
No edition is named. Wherever the bylaws or policies say something different, they win, and
the article says so in its **At MBC** note.

---

## Decisions (5 Oct 2026)

- **Scope:** meeting-room core only. Left out: Congressional footnotes, mass meetings and
  conventions (§69–71), Committee of the Whole (§55–56), Call of the House (§41), Executive
  Secretary (§61), legal rights and trial of members (§72–75 — membership discipline is
  governed by Bylaws Art. I), and the study plan.
- **At MBC notes:** yes, with citations, checked against this corpus.
- **Voice:** the sample (`articles/lay-on-the-table.md`) is the approved pattern.
- **Home:** this folder, as markdown with front matter, for the dashboard seed script.

## Voice rules

- Talk like a person explaining it across the table. Contractions and conjunctions throughout.
- Answer first. The short answer has to settle the question on its own.
- No filler openers, no "it's important to note," no throat-clearing.
- Plain words over Robert's terms; when a term matters, use it once and say what it means.
- Say only what Robert's says. Where we add MBC context, it's labeled and cited.

## Article template

```
---  front matter (see below)  ---
# <Plain-language title> — "<Robert's name>"
**Short answer:** 2–3 sentences.
`Second · Debate · Amend · Vote · Interrupt a speaker`   (motions only)
**What to say:** the exact words.
## How it works
## Watch out for        (2–4 bullets, bolded lead)
## At MBC               (only when a bylaw or policy applies; cited)
*Source: Robert's Rules of Order Revised (1915), §…*
```

## Front matter

```yaml
id: RR-<SLUG>                  # unique
type: parliamentary-guide      # new governance_document kind
title: <full title>
short_title: <for lists and chips>
group: <one of the groups below>
rr_sections: [28, 35]
mbc_refs: ["Bylaws Art. IV §2 ¶1"]   # empty list if none
search_terms: [ ... ]          # everyday phrasings people will type
audience: both                 # staff and deacon sides
authority_tier: 4              # below bylaws/policies (tier 3)
source: Robert's Rules of Order Revised (1915), Constitution Society edition
status: draft | approved
sensitivity: normal
```

## Lineup

Status: ✅ drafted (all 46 pages, 5 Oct 2026; front matter `status: draft` until Joshua approves each). Every article is a file in `articles/`; links between
articles are plain relative links (`[Amend](amend.md)`), so the seed can map filename → id.

### Reference pages
| | Page | File | Built from |
|---|---|---|---|
| ✅ | "I want to…" finder (front door) | i-want-to.md | §10 plus everyday phrasings |
| ✅ | Motion cheat sheet | motion-cheat-sheet.md | Table of Rules Relating to Motions |
| ✅ | What outranks what (precedence ladder) | precedence.md | Order of Precedence |
| ✅ | Glossary | glossary.md | Definitions, throughout |

### Meeting basics
| | Article | File | § |
|---|---|---|---|
| ✅ | How a motion gets from idea to vote | how-a-motion-moves.md | 1–9 |
| ✅ | Getting the floor | getting-the-floor.md | 3 |
| ✅ | Seconding a motion | seconding.md | 5 |
| ✅ | Quorum | quorum.md | 64 |
| ✅ | Order of business (the agenda) | order-of-business.md | 65, 20 |
| ✅ | General consent | general-consent.md | 48, 46, 47 |
| ✅ | Meeting vs. session | meeting-vs-session.md | 63 |

### Making and shaping a motion
| | Article | File | § |
|---|---|---|---|
| ✅ | Making a main motion | main-motion.md | 4, 11 |
| ✅ | Amending a motion (incl. substitutes, blanks) | amend.md | 33 |
| ✅ | Sending it to a committee | refer-to-committee.md | 32 |
| ✅ | Splitting a motion into parts | divide-the-question.md | 24 |
| ✅ | Withdrawing or changing your motion; asking questions mid-meeting | withdraw-and-requests.md | 27 |

### Putting things off
| | Article | File | § |
|---|---|---|---|
| ✅ | Lay on the Table (and taking it back up) | lay-on-the-table.md | 28, 35, 38 |
| ✅ | Putting it off to a set time; special orders | postpone-to-a-set-time.md | 31, 20 |
| ✅ | Postpone Indefinitely | postpone-indefinitely.md | 34 |

### Discussion
| | Article | File | § |
|---|---|---|---|
| ✅ | Debate: who speaks, how often, how long | debate-rules.md | 7, 42, 45 |
| ✅ | Keeping it civil and on point | decorum.md | 43 |
| ✅ | Ending discussion — "Call the question" | previous-question.md | 29, 44 |
| ✅ | Limiting or extending discussion | limit-debate.md | 30 |
| ✅ | Objecting to even discussing it | objection-to-consideration.md | 23 |

### Voting
| | Article | File | § |
|---|---|---|---|
| ✅ | Ways to vote, and the chair's vote | voting-methods.md | 9, 46 |
| ✅ | Asking for a counted vote | division-of-the-assembly.md | 25 |
| ✅ | Majority vs. two-thirds | majority-and-two-thirds.md | 48 |
| ✅ | Votes that don't count even if everyone agrees | votes-that-dont-count.md | 47 |

### Undoing or revisiting a decision
| | Article | File | § |
|---|---|---|---|
| ✅ | Reconsider (incl. enter on the minutes) | reconsider.md | 36 |
| ✅ | Rescind | rescind.md | 37 |
| ✅ | Bringing a motion back | bringing-it-back.md | 38 |
| ✅ | Ratify | ratify.md | 39 |

### Keeping order
| | Article | File | § |
|---|---|---|---|
| ✅ | Point of order and appealing the chair | point-of-order-and-appeal.md | 21 |
| ✅ | Suspending the rules | suspend-the-rules.md | 22 |
| ✅ | Questions of privilege | questions-of-privilege.md | 19 |
| ✅ | Stalling and nuisance motions | dilatory-motions.md | 40 |
| ✅ | Recess, adjourn, and setting a time to adjourn | recess-and-adjourn.md | 16–18 |

### Officers, minutes, and reports
| | Article | File | § |
|---|---|---|---|
| ✅ | Chairing a meeting | chairing-a-meeting.md | 58 |
| ✅ | Secretary and minutes | secretary-and-minutes.md | 59, 60 |
| ✅ | Treasurer's report | treasurers-report.md | 62 |
| ✅ | Committees and boards; ex officio members | committees-and-boards.md | 49–52 |
| ✅ | Committee reports: receiving vs. adopting | committee-reports.md | 53, 54 |
| ✅ | Small boards and informal discussion | small-boards.md | 57 |

### Elections and governing documents
| | Article | File | § |
|---|---|---|---|
| ✅ | Nominations and elections | nominations-and-elections.md | 26, 66 |
| ✅ | Bylaws, standing rules, and what each one does | bylaws-and-standing-rules.md | 67 |
| ✅ | Amending the bylaws | amending-the-bylaws.md | 68 |

## MBC overrides found so far (to carry into the right articles)

- Moderator is the Senior Pastor; then the Chairman of Deacons; then the Vice-Chairman (Bylaws Art. II.D).
- Bylaws amend by simple majority of members present and voting — but only after the proposal is laid before the church in writing and discussed at a business meeting at least a month ahead, read from the pulpit each Sunday after (or published weekly), and included in the call (Bylaws Art. V).
- Absentee ballots: Policy B001. No proxy voting; no further discussion after absentee ballots go out.
- Budget vote: no amendments at the special business meeting (Policy A009).
- Business meetings quarterly, announced from the pulpit and in the bulletin at least two days ahead (Bylaws Art. IV §2 ¶1).
- Deacon Board meets monthly (Bylaws Art. II.B §3 ¶5).
- No quorum is defined for business meetings or Board meetings anywhere in the corpus. Under §64: congregation = whoever attends a properly called meeting (Robert's church exception); Deacon Board = majority of its twelve, i.e. seven (boards treated as committees). Written into quorum.md.
- Senior Pastor call: secret ballot, three-fourths of those voting (Art. II.A). Associate pastoral positions: secret ballot (Art. II.F). Special called meeting notice must state the purpose (Art. IV §2 ¶4).
- B001: when the Board chooses absentee balloting, everyone votes on that issue by secret ballot; the issue can't change and there's no further discussion once absentee ballots are issued; no absentee voting for calling or dismissing pastoral staff.
- Deacon officers elected by simple majority of the Board (Art. II.B §3 ¶3); deacon elections need an affirmative majority of those voting (Art. II.B §3 ¶11).

- Associate pastoral staff: elected by secret ballot at a special called business meeting, three-fourths of those **present** (Art. II.F).
- **New discrepancy (not yet in DISCREPANCY-DOCKET.md):** ordination of a deacon candidate needs a ¾ affirmative vote of the Deacon Board per Bylaws Art. II.B §1, but the DIT program (¶H.D) says simple majority of the Deacon Body by secret ballot. Bylaws control; flagged in majority-and-two-thirds.md.

- Deacon Board unfinished business: by §17(b), business of a body with members elected for set terms falls to the ground when a term expires — for the Board, at the end of the September meeting (Art. II.B §3 ¶¶2, 9). Labeled as a reading in recess-and-adjourn.md.

- **Gap — constitution has no amendment clause** in the corpus; Art. V covers only "these bylaws." If so, Robert's §68 default would govern constitutional amendments (majority of entire membership, or two-thirds of those voting after written submission at the previous regular business meeting). Flagged as a reading in amending-the-bylaws.md.
- **Gap — no stated procedure for adopting/amending policies.** The Board formulates general policies (Art. II.B §3 ¶5); the corpus doesn't say how they're adopted or changed. Noted in bylaws-and-standing-rules.md.
- Small boards (§50): with twelve members, Board meetings fit Robert's "about a dozen" informality. Labeled as a reading in small-boards.md.

## Accuracy notes

- Every Robert's claim is checked against the 1915 text. Where later editions of Robert's say
  something the 1915 text doesn't (e.g. a missing second being cured once debate begins), it's
  left out rather than imported.
- "At MBC" notes cite the corpus file and paragraph. Readings of a Robert's default applied to
  MBC (like the Board quorum of seven) are labeled as readings.

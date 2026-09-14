import type { BoardMember, Meeting, Motion } from './types'

/* The report builders' shapes, and the standard template each renders into.

   One form per committee, shaped to what that committee actually reports —
   never a generic text box. Figures are fields; narrative is one sentence per
   row. Personnel carries no compensation figures (the database refuses a
   dollar figure). Family Assistance carries counts, amounts and the D002
   confirmation and no circumstances: its form has no free text at all.
   mbc-deacons-dashboard-brief.md §4. */

export type ReportKind = 'committee' | 'treasurer' | 'minutes'
export type ReportStatus = 'draft' | 'submitted' | 'published' | 'archived'

export interface BoardItem {
  text: string
  needsVote: boolean
}

export interface MoneyLine {
  line: string
  amount: number | null
}

/** Appendix A as the Board files it: the year-to-date position against the
    offerings goal, other receipts, and observations. Every position figure
    is derived from the three that are typed. */
export interface FinancePayload {
  asOf: string
  /** Year-to-date offerings goal, actual offerings, actual expenses. */
  budgetAdopted: number | null
  receivedYtd: number | null
  spentYtd: number | null
  otherReceipts: MoneyLine[]
  /** One line, one figure, one sentence. Observations from the prior year go here too. */
  variances: { line: string; amount: string; note: string }[]
  actions: string[]
  items: BoardItem[]
}

/** Appendix D: the month's activity by line, and the annual budget it draws on. */
export interface GroundsPayload {
  expenses: { date: string; description: string; amount: number | null }[]
  budgetAnnual: number | null
  spentYtd: number | null
  projectsOpen: string[]
  projectsClosed: string[]
  items: BoardItem[]
}

/** Appendix C. Reviews, staffing actions, items for the Board — and no
    compensation figures. The database refuses a dollar amount here. */
export interface PersonnelPayload {
  present: string
  reviewsCompleted: string[]
  staffingActions: string[]
  items: BoardItem[]
}

/** Appendix B: the fund, and the D002 confirmation. There is no field for a
    circumstance, which is the whole design. */
export interface FamilyAssistancePayload {
  openingBalance: number | null
  additions: number | null
  expenditures: number | null
  received: number | null
  approved: number | null
  declined: number | null
  thirdPartyInvoiceConfirmed: boolean
}

export interface TreasurerPayload {
  receipts: MoneyLine[]
  disbursements: MoneyLine[]
}

export interface TitledItem {
  title: string
  text: string
}

/** The Brotherhood of Deacons Meeting Minutes, as the Board has kept them
    for years: ten sections and the appendices. Attendance, the opening and
    adjournment, the committee reports and the motions come from the record.
    The rest is the secretary's. */
export interface MinutesPayload {
  draftForReview: boolean
  deaconsInTrainingPresent: string
  staffPresent: string
  openingPrayerBy: string
  chairmanRemarks: string
  memberUpdates: string[]
  oldBusiness: TitledItem[]
  newBusiness: TitledItem[]
  previousMinutes: string
  committeeNotes: Record<string, string>
  pastoralReport: string[]
  keyDates: string[]
  closing: string
}

export type ReportPayload = FinancePayload | GroundsPayload | PersonnelPayload | FamilyAssistancePayload | TreasurerPayload | MinutesPayload

export interface Report {
  id: string
  kind: ReportKind
  bodySlug: string
  bodyName: string
  meetingId: string | null
  periodStart: string | null
  periodEnd: string | null
  status: ReportStatus
  payload: ReportPayload
  createdBy: string | null
  updatedBy: string | null
  updatedAt: string
  submittedBy: string | null
  submittedAt: string | null
  publishedAt: string | null
  archivedAt: string | null
}

export interface ReportVersion {
  id: string
  reportId: string
  versionNo: number
  payload: ReportPayload
  rendered: string
  createdBy: string | null
  publishedAt: string
  supersedesVersionId: string | null
}

/** What was filed against a meeting: a pointer. For a body the reader cannot
    open, `reportId` is null — that it reported is the whole record. */
export interface FiledPointer {
  meetingId: string
  reportId: string | null
  kind: ReportKind
  bodySlug: string
  bodyName: string
  confidential: boolean
  status: ReportStatus
  submittedAt: string | null
  publishedAt: string | null
}

/** The bodies whose chairs file a committee report, in agenda order. */
export const COMMITTEES = ['committee:finance', 'committee:building-grounds', 'committee:personnel', 'committee:family-assistance'] as const

export const STATUS_STEPS: { key: ReportStatus; label: string; means: string }[] = [
  { key: 'draft', label: 'Draft', means: 'Only the chair sees it. Come back to it as often as you like.' },
  { key: 'submitted', label: 'Submitted', means: 'Filed against the meeting and on the agenda.' },
  { key: 'published', label: 'Published', means: 'Official, printable, and in the meeting packet.' },
  { key: 'archived', label: 'Archived', means: 'Replaced by the next period’s report. Still readable, printable, editable.' },
]

export function emptyPayload(kind: ReportKind, bodySlug: string): ReportPayload {
  if (kind === 'treasurer') return { receipts: [], disbursements: [] }
  if (kind === 'minutes') {
    return {
      draftForReview: true, deaconsInTrainingPresent: '', staffPresent: '', openingPrayerBy: '', chairmanRemarks: '',
      memberUpdates: [], oldBusiness: [], newBusiness: [], previousMinutes: '', committeeNotes: {}, pastoralReport: [], keyDates: [], closing: '',
    }
  }
  switch (bodySlug) {
    case 'committee:building-grounds':
      return { expenses: [], budgetAnnual: null, spentYtd: null, projectsOpen: [], projectsClosed: [], items: [] }
    case 'committee:personnel':
      return { present: '', reviewsCompleted: [], staffingActions: [], items: [] }
    case 'committee:family-assistance':
      return { openingBalance: null, additions: null, expenditures: null, received: null, approved: null, declined: null, thirdPartyInvoiceConfirmed: false }
    default:
      return { asOf: '', budgetAdopted: null, receivedYtd: null, spentYtd: null, otherReceipts: [], variances: [], actions: [], items: [] }
  }
}

/** Fill in whatever a stored payload lacks, so a form never reads undefined. */
export function normalisePayload(kind: ReportKind, bodySlug: string, stored: unknown): ReportPayload {
  const base = emptyPayload(kind, bodySlug) as unknown as Record<string, unknown>
  const given = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {}
  const merged: Record<string, unknown> = { ...base }
  for (const key of Object.keys(base)) if (key in given) merged[key] = given[key]
  return merged as unknown as ReportPayload
}

export function reportTitle(report: Pick<Report, 'kind' | 'bodyName'>): string {
  if (report.kind === 'treasurer') return 'Treasurer’s monthly report'
  if (report.kind === 'minutes') return 'Brotherhood of Deacons Meeting Minutes'
  return report.bodyName.replace(/ Committee$/, '') + ' committee report'
}

/** Appendix letters, in the order the minutes have always listed them. */
export const APPENDIX: Record<string, string> = {
  'committee:finance': 'A',
  'committee:family-assistance': 'B',
  'committee:personnel': 'C',
  'committee:building-grounds': 'D',
}

export const COMMITTEE_SHORT: Record<string, string> = {
  'committee:finance': 'Finance',
  'committee:family-assistance': 'Family Assistance',
  'committee:personnel': 'Personnel',
  'committee:building-grounds': 'Building & Grounds',
}

export const money = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : '$' + Math.round(n).toLocaleString('en-US'))

/** The items a committee's report puts on the agenda as new business. */
export function boardItems(payload: ReportPayload): BoardItem[] {
  const items = (payload as { items?: BoardItem[] }).items
  return Array.isArray(items) ? items.filter((item) => item.text.trim()) : []
}

/* ------------------------------------------------------- the position */

export interface BudgetPosition {
  percentReceived: number | null
  percentOfYear: number
  position: number | null
  sentence: string
}

/** Derivation, not entry: over or under goal, the percentage of goal and
    the margin over expenses are never typed. The words are the Board's own
    from its Appendix A. */
export function budgetPosition(payload: FinancePayload, asOf: Date): BudgetPosition {
  const monthsGone = asOf.getMonth() + 1
  const percentOfYear = Math.round((monthsGone / 12) * 100)
  const { budgetAdopted, receivedYtd, spentYtd } = payload
  if (budgetAdopted === null || receivedYtd === null || spentYtd === null || budgetAdopted <= 0) {
    return { percentReceived: null, percentOfYear, position: null, sentence: 'Enter the three figures and the position derives itself.' }
  }
  const percentReceived = Math.round((receivedYtd / budgetAdopted) * 100)
  const overGoal = receivedYtd - budgetAdopted
  const position = receivedYtd - spentYtd
  const sentence =
    `Actual offerings ${overGoal >= 0 ? 'over' : 'under'} goal by ${money(Math.abs(overGoal))} (${percentReceived}% of budget goal). ` +
    (position >= 0 ? `YTD offerings exceed YTD expenses by ${money(position)}.` : `YTD expenses exceed YTD offerings by ${money(-position)}.`)
  return { percentReceived, percentOfYear, position, sentence }
}

export function sum(lines: MoneyLine[]): number {
  return lines.reduce((total, line) => total + (line.amount ?? 0), 0)
}

/* ------------------------------------------------- the standard template */

export interface RenderContext {
  report: Report
  meeting: Meeting | null
  chairName: string
  asOf: Date
  /** For the minutes: what the record already holds. */
  assembled?: AssembledMinutes
  /** For the Treasurer: the same month last year, if it is on record. */
  lastYear?: TreasurerPayload | null
}

export interface RenderedSection {
  title: string
  lines: string[]
}

export interface RenderedReport {
  label: string
  title: string
  byline: string
  sections: RenderedSection[]
}

function meetingLabel(meeting: Meeting | null): string {
  if (!meeting) return 'not yet filed against a meeting'
  const [y, m, d] = meeting.meetsOn.split('-').map(Number)
  return 'for the meeting of ' + new Date(y, m - 1, d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

function periodLabel(report: Report): string {
  if (!report.periodStart) return ''
  const [y, m] = report.periodStart.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Every line here is generated from the payload. This is the `rendered`
    column: the preview on screen, the text filed with a version, and what
    the printer gets are the same object. */
export function renderReport(context: RenderContext): RenderedReport {
  const { report, meeting, chairName, asOf } = context
  const title = reportTitle(report)
  const when = meeting ? meetingLabel(meeting) : 'not yet filed'

  if (report.kind === 'minutes') {
    const p = report.payload as MinutesPayload
    const a: Partial<AssembledMinutes> = context.assembled ?? {}
    const lettered = (items: TitledItem[]) =>
      items.filter((i) => i.title.trim() || i.text.trim()).flatMap((i, index) => [`${String.fromCharCode(65 + index)}. ${i.title}`, ...(i.text ? [i.text] : [])])
    const orNone = (lines: string[], none = '—') => (lines.length ? lines : [none])
    const sections: RenderedSection[] = [
      {
        title: 'Attendance',
        lines: [
          `Deacons present: ${a.present?.length ? a.present.join(', ') : '—'}`,
          `Deacon-in-training present: ${p.deaconsInTrainingPresent || '—'}`,
          `Deacons not present: ${a.absent?.length ? a.absent.join(', ') : '—'}`,
          `Staff present: ${p.staffPresent || '—'}`,
          `Meeting opened: ${a.opened ?? '—'} · Meeting adjourned: ${a.adjourned ?? '—'}`,
        ],
      },
      { title: 'I. Opening prayer', lines: [p.openingPrayerBy || '—'] },
      { title: 'II. Chairman remarks', lines: [p.chairmanRemarks || '—'] },
      { title: 'III. Member update & prayer requests', lines: orNone(p.memberUpdates.filter(Boolean).map((line) => '• ' + line)) },
      { title: 'IV. Old business', lines: orNone([...lettered(p.oldBusiness), ...(a.carriedIn ?? [])]) },
      { title: 'V. New business', lines: orNone([...lettered(p.newBusiness), ...(a.newBusiness ?? [])]) },
      ...(a.motions?.length ? [{ title: 'Motions recorded in session', lines: a.motions }] : []),
      { title: 'VI. Review of previous minutes', lines: [p.previousMinutes || a.previousMinutes || '—'] },
      {
        title: 'VII. Deacon committee reports',
        lines: (a.committees ?? []).map((c) => `${c.letter}. ${c.name} – ${c.filed ? `See Appendix ${c.letter}` : 'not filed'}${p.committeeNotes[c.slug] ? '. ' + p.committeeNotes[c.slug] : ''}`),
      },
      { title: 'VIII. Pastoral report', lines: orNone(p.pastoralReport.filter(Boolean).map((line) => '• ' + line)) },
      { title: 'IX. Key dates', lines: orNone([...(a.keyDates ?? []), ...p.keyDates.filter(Boolean)].map((line) => '• ' + line)) },
      { title: 'X. Closing prayer', lines: [p.closing || '—'] },
    ]
    return {
      label: 'Memorial Baptist Church',
      title,
      byline: `${when}${p.draftForReview ? ' · Draft for Secretary Review' : ''} · recorded by ${chairName}`,
      sections,
    }
  }

  if (report.kind === 'treasurer') {
    const p = report.payload as TreasurerPayload
    const receipts = sum(p.receipts)
    const disbursements = sum(p.disbursements)
    const last = context.lastYear
    const compare = (then: number | null) =>
      then === null ? '' : ` (${then === 0 ? 'nothing' : money(then)} the same month last year)`
    const sections: RenderedSection[] = [
      { title: 'Receipts', lines: [...p.receipts.filter((l) => l.line.trim()).map((l) => `${l.line} · ${money(l.amount)}`), `Total receipts · ${money(receipts)}${compare(last ? sum(last.receipts) : null)}`] },
      { title: 'Disbursements', lines: [...p.disbursements.filter((l) => l.line.trim()).map((l) => `${l.line} · ${money(l.amount)}`), `Total disbursements · ${money(disbursements)}${compare(last ? sum(last.disbursements) : null)}`] },
      { title: 'Net for the month', lines: [`${money(receipts - disbursements)}${receipts - disbursements < 0 ? ' — disbursements exceeded receipts' : ''}`] },
    ]
    return { label: 'Treasurer · itemised report (Art. II.C ¶2)', title, byline: `${periodLabel(report)} · ${chairName}, Treasurer · ${when}`, sections }
  }

  const byline = `${periodLabel(report) || asOf.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · ${chairName}, chair · ${when}`
  const itemLines = (items: BoardItem[]) =>
    items.filter((i) => i.text.trim()).map((i) => `${i.text}${i.needsVote ? ' (a vote is asked for)' : ''}`)

  const appendix = APPENDIX[report.bodySlug]
  const label = `Appendix ${appendix} – ${COMMITTEE_SHORT[report.bodySlug] ?? report.bodyName} report`
  const some = (lines: string[]) => (lines.filter(Boolean).length ? lines.filter(Boolean) : ['None'])

  switch (report.bodySlug) {
    case 'committee:building-grounds': {
      const p = report.payload as GroundsPayload
      const monthTotal = p.expenses.reduce((total, line) => total + (line.amount ?? 0), 0)
      return {
        label,
        title,
        byline,
        sections: [
          {
            title: 'Activity for the month',
            lines: [...p.expenses.filter((l) => l.description.trim()).map((l) => `${l.date || '—'} · ${l.description} · ${money(l.amount)}`), `Total for the month · ${money(monthTotal)}`],
          },
          {
            title: 'Budget information',
            lines: [
              p.budgetAnnual === null ? 'Annual budget · —' : `Annual budget · ${money(p.budgetAnnual)} · year to date ${money(p.spentYtd)} · balance ${money(p.budgetAnnual - (p.spentYtd ?? 0))}`,
            ],
          },
          { title: 'Projects open', lines: some(p.projectsOpen) },
          { title: 'Projects closed', lines: some(p.projectsClosed) },
          { title: 'Items for the Board', lines: some(itemLines(p.items)) },
        ],
      }
    }
    case 'committee:personnel': {
      const p = report.payload as PersonnelPayload
      return {
        label,
        title,
        byline,
        sections: [
          { title: 'Present', lines: [p.present || '—'] },
          { title: 'Reviews completed', lines: some(p.reviewsCompleted) },
          { title: 'Staffing actions', lines: some(p.staffingActions) },
          { title: 'Items requiring Board action', lines: some(itemLines(p.items)) },
        ],
      }
    }
    case 'committee:family-assistance': {
      const p = report.payload as FamilyAssistancePayload
      const n = (v: number | null) => (v === null ? '—' : String(v))
      const closing = p.openingBalance === null ? null : p.openingBalance + (p.additions ?? 0) - (p.expenditures ?? 0)
      return {
        label,
        title,
        byline,
        sections: [
          {
            title: 'The fund',
            lines: [`Balance at start of month · ${money(p.openingBalance)}`, `Additions · ${money(p.additions ?? 0)}`, `Expenditures · ${money(p.expenditures ?? 0)}`, `Balance at end of month · ${money(closing)}`],
          },
          { title: 'Requests', lines: [`Received · ${n(p.received)} · approved · ${n(p.approved)} · declined · ${n(p.declined)}`] },
          { title: 'D002 §6', lines: [p.thirdPartyInvoiceConfirmed ? 'Every disbursement was paid to a third party against an invoice, as D002 §6 requires.' : 'Third-party invoice rule: not yet confirmed.'] },
        ],
      }
    }
    default: {
      const p = report.payload as FinancePayload
      const position = budgetPosition(p, asOf)
      return {
        label,
        title,
        byline: `${p.asOf ? 'As of ' + p.asOf + ' · ' : ''}${byline}`,
        sections: [
          {
            title: 'Budget',
            lines:
              position.position === null
                ? ['—']
                : [
                    `YTD offerings goal · ${money(p.budgetAdopted)}`,
                    `YTD actual offerings · ${money(p.receivedYtd)}`,
                    `YTD actual expenses · ${money(p.spentYtd)}`,
                    position.sentence,
                  ],
          },
          { title: 'Other receipts', lines: some(p.otherReceipts.filter((l) => l.line.trim()).map((l) => `${l.line} · ${money(l.amount)}`)) },
          { title: 'Observations', lines: some(p.variances.filter((v) => v.line.trim()).map((v) => `${v.line}${v.amount ? ' — ' + v.amount : ''}. ${v.note}`.trim())) },
          { title: 'Actions taken', lines: some(p.actions) },
          { title: 'Items for the Board', lines: some(itemLines(p.items)) },
        ],
      }
    }
  }
}

/** The rendered report as plain text: what report_version.rendered stores. */
export function renderedText(rendered: RenderedReport): string {
  const lines = [rendered.label.toUpperCase(), rendered.title, rendered.byline, '']
  for (const section of rendered.sections) {
    lines.push(section.title.toUpperCase())
    for (const line of section.lines) lines.push('  ' + line)
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}

/** What the record supplies to the minutes. Nobody retypes any of it. */
export interface AssembledMinutes {
  present: string[]
  absent: string[]
  excused: string[]
  opened: string | null
  adjourned: string | null
  /** Tabled motions carried into this meeting, as old business lines. */
  carriedIn: string[]
  /** What the filed reports asked the Board to vote on, as new business lines. */
  newBusiness: string[]
  motions: string[]
  previousMinutes: string | null
  committees: { slug: string; letter: string; name: string; filed: boolean }[]
  keyDates: string[]
}

const clock = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '')
}

export function assembleMinutes(input: {
  roster: BoardMember[]
  attendance: Map<string, { status: 'present' | 'absent' | 'excused' }>
  motions: Motion[]
  filed: FiledPointer[]
  carriedIn: Motion[]
  filedReports: Report[]
  meeting: Meeting
  previous: Meeting | null
  next: Meeting | null
}): AssembledMinutes {
  const { roster, attendance, motions, filed, carriedIn, filedReports, meeting, previous, next } = input
  const nameOf = (id: string | null) => roster.find((m) => m.personId === id)?.name ?? '—'
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }
  return {
    present: roster.filter((m) => attendance.get(m.personId)?.status === 'present').map((m) => m.name),
    absent: roster
      .filter((m) => attendance.get(m.personId)?.status !== 'present' && attendance.has(m.personId))
      .map((m) => m.name + (attendance.get(m.personId)?.status === 'excused' ? ' (excused)' : '')),
    excused: roster.filter((m) => attendance.get(m.personId)?.status === 'excused').map((m) => m.name),
    opened: clock(meeting.calledToOrderAt),
    adjourned: clock(meeting.adjournedAt),
    carriedIn: carriedIn.map((m) => `Carried from the last meeting: ${m.text}`),
    newBusiness: filedReports.flatMap((r) =>
      boardItems(r.payload)
        .filter((item) => item.needsVote)
        .map((item) => `From the ${COMMITTEE_SHORT[r.bodySlug] ?? r.bodyName} report: ${item.text}`),
    ),
    motions: motions.map(
      (m) => `${m.text} — ${m.disposition}${m.movedBy ? `, moved by ${nameOf(m.movedBy)}` : ''}${m.secondedBy ? `, seconded by ${nameOf(m.secondedBy)}` : ''}${m.voteFor !== null ? ` (${m.voteFor}–${m.voteAgainst ?? 0})` : ''}.`,
    ),
    previousMinutes: previous ? (previous.minutesStatus === 'approved' ? `The minutes of the ${fmt(previous.meetsOn)} meeting were approved.` : `The minutes of the ${fmt(previous.meetsOn)} meeting were presented for review.`) : null,
    committees: [...COMMITTEES]
      .sort((a, b) => APPENDIX[a].localeCompare(APPENDIX[b]))
      .map((slug) => ({
        slug,
        letter: APPENDIX[slug],
        name: COMMITTEE_SHORT[slug],
        filed: filed.some((f) => f.bodySlug === slug && f.kind === 'committee'),
      })),
    keyDates: next ? [`${fmt(next.meetsOn)}, ${next.timeLabel} – Next deacons meeting`] : [],
  }
}

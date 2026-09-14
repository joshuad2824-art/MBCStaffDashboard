import { agendaFor, attendanceFor, motionsFor, oldBusiness, sortedByDate } from './derive'
import { assembleMinutes, type RenderContext, type RenderedReport, type Report, type TreasurerPayload } from './reports'
import type { Meeting } from './types'
import type { MeetingsData } from './types'

/** Everything the standard template needs from the room, for one report. */
export function renderContextFor(data: MeetingsData, report: Report, asOf: Date): RenderContext {
  const meeting = data.meetings.find((m) => m.id === report.meetingId) ?? null
  const chairId = report.submittedBy ?? report.updatedBy ?? report.createdBy
  const chairName = (chairId && data.names[chairId]) || '—'
  const context: RenderContext = { report, meeting, chairName, asOf }
  if (report.kind === 'minutes' && meeting) {
    context.assembled = assembleFor(data, meeting)
  }
  if (report.kind === 'treasurer' && report.periodStart) {
    const [y, m] = report.periodStart.split('-').map(Number)
    const lastYear = `${y - 1}-${String(m).padStart(2, '0')}-01`
    const prior = data.reports.find((r) => r.kind === 'treasurer' && r.id !== report.id && r.periodStart === lastYear && r.status !== 'draft')
    context.lastYear = prior ? (prior.payload as TreasurerPayload) : null
  }
  return context
}

/** Everything the record supplies to a meeting's minutes. */
export function assembleFor(data: MeetingsData, meeting: Meeting) {
  const ordered = sortedByDate(data.meetings).filter((m) => m.status !== 'cancelled')
  const index = ordered.findIndex((m) => m.id === meeting.id)
  const filed = data.filed.filter((f) => f.meetingId === meeting.id && f.kind !== 'minutes')
  return assembleMinutes({
    roster: data.roster,
    attendance: attendanceFor(data.attendance, meeting),
    motions: motionsFor(data.motions, meeting),
    filed,
    carriedIn: oldBusiness(data.motions, data.meetings, meeting),
    filedReports: data.reports.filter((r) => r.kind === 'committee' && r.meetingId === meeting.id && r.status !== 'draft'),
    meeting,
    previous: index > 0 ? ordered[index - 1] : null,
    next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null,
  })
}

/** The agenda in the Board's template: the same ten sections its minutes
    use, with the appendices listed. What is typed goes under old or new
    business; everything else is derived. */
export function renderAgenda(data: MeetingsData, meeting: Meeting): RenderedReport {
  const a = assembleFor(data, meeting)
  const items = agendaFor(data.agenda, meeting)
  const lettered = (lines: string[]) => lines.map((line, index) => `${String.fromCharCode(65 + index)}. ${line}`)
  const old = [...items.filter((i) => i.source === 'old_business').map((i) => i.title + (i.notes ? ' — ' + i.notes : '')), ...a.carriedIn.map((line) => line.replace(/^Carried from the last meeting: /, ''))]
  const fresh = [
    ...items.filter((i) => i.source !== 'old_business').map((i) => i.title + (i.sourceRef ? ` (${i.sourceRef})` : '') + (i.notes ? ' — ' + i.notes : '')),
    ...a.newBusiness,
  ]
  const [y, m, d] = meeting.meetsOn.split('-').map(Number)
  const when = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return {
    label: 'Memorial Baptist Church',
    title: 'Deacons Meeting Agenda',
    byline: `${when} · ${meeting.timeLabel} · ${meeting.location}${meeting.agendaLockedAt ? '' : ' · not yet locked'}`,
    sections: [
      { title: 'I. Opening prayer', lines: [''] },
      { title: 'II. Chairman remarks', lines: [''] },
      { title: 'III. Member update & prayer requests', lines: [''] },
      { title: 'IV. Old business', lines: old.length ? lettered(old) : ['—'] },
      { title: 'V. New business', lines: fresh.length ? lettered(fresh) : ['—'] },
      { title: 'VI. Review of previous minutes', lines: [a.previousMinutes ?? ''] },
      { title: 'VII. Deacon committee reports', lines: a.committees.map((c) => `${c.letter}. ${c.name} – ${c.filed ? `See Appendix ${c.letter}` : 'not yet filed'}`) },
      { title: 'VIII. Pastoral report', lines: [''] },
      { title: 'IX. Key dates', lines: a.keyDates.length ? a.keyDates : [''] },
      { title: 'X. Closing prayer', lines: [''] },
    ],
  }
}

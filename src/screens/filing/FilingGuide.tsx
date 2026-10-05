import { useNavigate } from 'react-router-dom'
import { Button, Card, Eyebrow } from '../../components/ui'
import { sortedByDate } from '../../data/meetings/derive'
import { COMMITTEE_SHORT, MINUTES_TEMPLATE, type Report } from '../../data/meetings/reports'
import type { MeetingsData } from '../../data/meetings/types'
import { formatShort, parseDate } from '../../lib/date'
import { useSession } from '../../session/session'

/* Who files what. Every form on the Reports page has a holder, and this panel
   says who it is — so the Finance chair, the Building & Grounds chair and the
   secretary can each see their form is theirs, and everyone else can see whose
   it is.

   It decides nothing. The database says who may write: a committee's chair its
   own report (`is_chair_of`), any Board member the minutes
   (`can_write_report`). A button appears only for the person who may press it —
   absence, not greyed-out — and not at all while a seat is being previewed. The
   chair's name is read from `data.seats`, which is already filtered by the same
   policy as the roster: a body the reader does not sit in is described, never
   named, and the confidential committee is not listed to anyone outside it. */

interface Form {
  key: string
  kind: 'committee' | 'treasurer'
  slug: string
  title: string
  tag: string
}

/* Agenda order: the appendices A–D as the minutes list them, then the Treasurer. */
const FORMS: Form[] = [
  { key: 'finance', kind: 'committee', slug: 'committee:finance', title: 'Finance committee report', tag: 'Appendix A' },
  { key: 'family', kind: 'committee', slug: 'committee:family-assistance', title: 'Family Assistance report', tag: 'Appendix B' },
  { key: 'personnel', kind: 'committee', slug: 'committee:personnel', title: 'Personnel committee report', tag: 'Appendix C' },
  { key: 'grounds', kind: 'committee', slug: 'committee:building-grounds', title: 'Building & Grounds activity', tag: 'Appendix D' },
  { key: 'treasurer', kind: 'treasurer', slug: 'committee:finance', title: 'Treasurer’s itemised report', tag: 'Art. II.C ¶2' },
]

export function FilingGuide({ data, onStart }: { data: MeetingsData; onStart(kind: 'committee' | 'treasurer', slug: string): void }) {
  const { bodies, isChairOf, previewSeat } = useSession()
  const navigate = useNavigate()
  const onBoard = bodies.includes('deacon-board')
  const reading = !previewSeat

  const forms = FORMS.filter((form) => form.slug !== 'committee:family-assistance' || bodies.includes(form.slug))

  const holder = (form: Form): string => {
    if (!bodies.includes(form.slug)) return `Filed by the chair of the ${COMMITTEE_SHORT[form.slug]} committee.`
    const chair = data.seats.find((seat) => seat.bodySlug === form.slug && seat.seat === 'chair')
    if (chair) return `Filed by the committee chair, ${chair.name}${form.kind === 'treasurer' ? ', as Treasurer' : ''}.`
    return form.slug === 'committee:family-assistance'
      ? 'No chair is seated yet.'
      : 'No chair is seated yet. The Board chairman seats one from the People page.'
  }

  const stateOf = (form: Form): { open: Report | null; line: string } => {
    const mine = data.reports.filter((r) => r.kind === form.kind && r.bodySlug === form.slug)
    const open = mine.find((r) => r.status === 'draft' || r.status === 'submitted') ?? null
    if (open) return { open, line: open.status === 'draft' ? 'A draft is in progress.' : 'Submitted, waiting to be published.' }
    const latest = mine.filter((r) => r.status === 'published').sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))[0]
    if (latest?.publishedAt) return { open: null, line: `Last published ${formatShort(parseDate(latest.publishedAt.slice(0, 10)))}.` }
    return { open: null, line: 'Not started.' }
  }

  /* The minutes open once the meeting is called to order, so the secretary can
     take them as the meeting goes; held meetings without minutes still do. */
  const minutable = onBoard
    ? sortedByDate(data.meetings).filter((m) => (m.status === 'in_session' || m.status === 'held') && !data.reports.some((r) => r.kind === 'minutes' && r.meetingId === m.id))
    : []
  const secretary = data.roster.find((member) => /secretar/i.test(member.role))

  return (
    <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 6 }}>
      <Eyebrow size="sm">Who files what</Eyebrow>
      <p style={{ ...body, margin: '4px 0 10px', maxWidth: '64ch' }}>
        Each form belongs to one seat. Your own start here; the rest are shown so you know whose they are.
      </p>
      <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
        {forms.map((form) => {
          const { open, line } = stateOf(form)
          const mayWrite = reading && isChairOf(form.slug)
          return (
            <Row
              key={form.key}
              tag={form.tag}
              title={form.title}
              lines={[holder(form), line]}
              action={
                mayWrite ? (
                  open ? (
                    <Button variant="primary" size="sm" onClick={() => navigate(`/reports/${open.id}`)}>
                      Open the draft
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={() => onStart(form.kind, form.slug)}>
                      {form.kind === 'treasurer' ? 'Start the itemised report' : 'Start the report'}
                    </Button>
                  )
                ) : null
              }
            />
          )
        })}

        {onBoard ? (
          <Row
            tag="The minutes"
            title="Brotherhood of Deacons Meeting Minutes"
            lines={[
              `Written by the Board’s secretary${secretary ? `, ${secretary.name}` : ''}. Any Board member may write them.`,
              minutable.length > 0
                ? 'The roll, the motions and the committee reports assemble themselves. The secretary writes the rest.'
                : 'They open once the meeting is called to order.',
            ]}
            action={
              reading && minutable.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {minutable.map((m) => (
                    <Button key={m.id} variant="primary" size="sm" onClick={() => navigate(`/meeting/${m.id}/minutes`)}>
                      {m.status === 'in_session' ? 'Take the minutes of ' : 'Write the minutes of '}
                      {formatShort(parseDate(m.meetsOn))}
                    </Button>
                  ))}
                </div>
              ) : null
            }
          >
            <details style={{ marginTop: 10 }}>
              <summary style={{ font: '700 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                What the template holds
              </summary>
              <ol style={{ margin: '4px 0 0', paddingLeft: 22, display: 'grid', gap: 2 }}>
                {MINUTES_TEMPLATE.map((section) => (
                  <li key={section.title} style={{ ...body, margin: 0 }}>
                    {section.title}
                    <span style={{ color: 'var(--text-meta)' }}>
                      {' — '}
                      {section.from === 'record' ? 'from the record' : section.from === 'secretary' ? 'written by the secretary' : 'the record, and the secretary adds to it'}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </Row>
        ) : null}
      </div>
    </Card>
  )
}

function Row({ tag, title, lines, action, children }: { tag: string; title: string; lines: string[]; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 2px', background: 'var(--surface-card)' }}>
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        <span style={{ font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' }}>{tag}</span>
        <p style={{ font: '600 19px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: '6px 0 4px' }}>{title}</p>
        {lines.map((text) => (
          <p key={text} style={{ ...body, margin: 0, color: 'var(--text-meta)' }}>
            {text}
          </p>
        ))}
        {children}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

const body = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)' } as const

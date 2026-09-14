import { useNavigate } from 'react-router-dom'
import { Button, Card, Eyebrow } from '../components/ui'
import { useData } from '../data/store'
import { useMeetings } from '../data/meetings/store'
import { attendanceFor, carriedForward, currentMeeting, sortedByDate } from '../data/meetings/derive'
import { isUnclaimed } from '../lib/derive'
import { formatShort, parseDate, startOfToday } from '../lib/date'
import { useSession } from '../session/session'
import { homeOf } from './surfaces'

/* The landing screen for the two people who hold both sides. They choose one,
   and then never have to wonder which one they are in: the context bar stays
   on screen afterwards, and the choice is remembered in this browser.
   design_handoff_deacons_dashboard/SCREENS.md §1. */

const RULES = [
  {
    title: 'It narrows, and never widens.',
    body: 'The toggle decides which surfaces are drawn. The database decides which rows come back, and it does not ask the toggle. A person who flips it has gained nothing.',
  },
  {
    title: 'The current side stays the loudest thing on screen.',
    body: 'Someone who has been in the deacon view for twenty minutes should never have to wonder before they type. The marker does not fade, collapse, or move.',
  },
  {
    title: 'Composing inherits the side you are on.',
    body: 'A thread started on the deacon side is addressed to the Board. Widening it to staff is a second, deliberate act, and the badge on the record changes to say so.',
  },
]

export function WhichSide() {
  const { setContext } = useSession()
  const navigate = useNavigate()
  const data = useData()
  const meetings = useMeetings()
  const today = startOfToday()

  const open = (side: 'staff' | 'deacon') => {
    setContext(side)
    navigate(homeOf(side))
  }

  // Real counts, from the records each side already keeps.
  const room = meetings.data
  const next = room ? currentMeeting(room.meetings, today) : null
  const last = room ? [...sortedByDate(room.meetings)].reverse().find((m) => m.status === 'held') : null
  const carried = room && last ? carriedForward(room.motions, last).length : 0
  const recorded = room && last ? attendanceFor(room.attendance, last).size : 0
  const deaconRows: [string, string][] = [
    [next ? (next.status === 'held' ? 'The last meeting' : 'The next meeting') : 'No meeting scheduled', next ? formatShort(parseDate(next.meetsOn)) + ' · ' + next.timeLabel : '—'],
    ['Carried forward as old business', carried === 0 ? 'Nothing tabled' : carried === 1 ? 'One motion' : carried + ' motions'],
    ['Roll recorded last time', last && room ? recorded + ' of ' + room.roster.length : '—'],
  ]

  const unclaimed = data.cadence.filter(isUnclaimed).length
  const latestWeek = [...data.weeks].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))[0]
  const unannounced = data.notices.filter((notice) => notice.notifiedOn === null).length
  const staffRows: [string, string][] = [
    ['Unclaimed commitments', unclaimed === 0 ? 'None' : String(unclaimed)],
    ['Sunday’s bulletin', latestWeek ? (latestWeek.status === 'published' ? 'Published' : 'Still a draft') : '—'],
    ['Decisions not announced', unannounced === 0 ? 'None' : String(unannounced)],
  ]

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))' }}>
        <SideCard
          tone="paper"
          eyebrowTone="sage"
          eyebrow={room ? `Two bodies · ${room.roster.length} on the roll` : 'The Board'}
          title="Deacon view"
          body="The monthly Board meeting. Records you write here default to the Board."
          rows={deaconRows}
          ruleTone="hair"
          action={
            <Button variant="primary" size="md" onClick={() => open('deacon')}>
              Open the deacon view
            </Button>
          }
        />
        <SideCard
          tone="panel"
          eyebrowTone="stone"
          eyebrow={`${data.people.filter((p) => p.active && p.access === 'staff').length} on staff`}
          title="Staff view"
          body="Today at Memorial, the huddle, the ledger, the notice log, the bulletin. Records you write there default to staff."
          rows={staffRows}
          ruleTone="section"
          action={
            <Button variant="outline" size="md" onClick={() => open('staff')}>
              Open the staff view
            </Button>
          }
        />
      </div>

      <Card radius="card" pad="26px clamp(22px,2vw,30px)">
        <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-hairline)' }}>
          <Eyebrow size="sm">Why the toggle has three rules</Eyebrow>
          <p style={{ font: '600 24px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: '10px 0 0' }}>
            The failure it prevents is saying something in the wrong room.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
          {RULES.map((rule, index) => (
            <div
              key={rule.title}
              style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr)', gap: 16, padding: '18px 2px', background: 'var(--surface-card)' }}
            >
              <span style={{ font: '600 22px/1 var(--mbc-font-serif)', color: 'var(--text-eyebrow)' }}>{index + 1}</span>
              <div>
                <p style={{ font: '700 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>{rule.title}</p>
                <p style={{ font: '400 15px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: '4px 0 0', maxWidth: '72ch' }}>
                  {rule.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function SideCard({
  tone,
  eyebrowTone,
  eyebrow,
  title,
  body,
  rows,
  ruleTone,
  action,
}: {
  tone: 'paper' | 'panel'
  eyebrowTone: 'sage' | 'stone'
  eyebrow: string
  title: string
  body: string
  rows: [string, string][]
  ruleTone: 'hair' | 'section'
  action: React.ReactNode
}) {
  const ruleColour = ruleTone === 'hair' ? 'var(--border-hairline)' : 'var(--border-section)'
  const ground = tone === 'paper' ? 'var(--surface-card)' : 'var(--surface-panel)'
  return (
    <Card tone={tone} radius="panel" pad="30px clamp(24px,2vw,32px)" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Eyebrow tone={eyebrowTone} size="sm">
          {eyebrow}
        </Eyebrow>
        <p style={{ font: '600 30px/1.15 var(--mbc-font-serif)', letterSpacing: '-.02em', color: 'var(--text-heading)', margin: '10px 0 0' }}>
          {title}
        </p>
        <p style={{ font: '400 16px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: '10px 0 0', maxWidth: '42ch' }}>{body}</p>
      </div>
      <div style={{ display: 'grid', gap: 1, background: ruleColour, borderTop: `1px solid ${ruleColour}`, borderBottom: `1px solid ${ruleColour}` }}>
        {rows.map(([label, meta]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '13px 2px', background: ground }}>
            <span style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{label}</span>
            <span className="tabular" style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)', textAlign: 'right' }}>
              {meta}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto' }}>{action}</div>
    </Card>
  )
}

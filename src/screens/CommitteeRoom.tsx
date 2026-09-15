import { useNavigate } from 'react-router-dom'
import { BodyBadge, Card, Eyebrow } from '../components/ui'
import { useMeetings } from '../data/meetings/store'
import { seatLabel } from '../data/meetings/derive'
import { STATUS_STEPS } from '../data/meetings/reports'
import { formatShort, parseDate, todayIso } from '../lib/date'
import { bodyName } from './surfaces'
import { Discussion } from './Discussion'

/* A committee room (brief §3.4): visible only to its members, holding the
   committee's report history, its roster and terms, and its working notes.
   The notes are the discussion board drawn for the committee's own slug —
   the same fourteen-day memory, the same rule that anything that became a
   commitment gets promoted before it disappears. Family Assistance is
   confidential on the body record, which is why nothing about its room is
   assembled from anywhere but membership. */

export function CommitteeRoom({ slug }: { slug: string }) {
  const { data, error } = useMeetings()
  const navigate = useNavigate()
  if (error) return <Note>{error}</Note>
  if (!data) return <Note>Opening the room…</Note>

  const today = todayIso()
  const seats = data.seats
    .filter((s) => s.bodySlug === slug)
    .sort((a, b) => rank(a.seat) - rank(b.seat) || a.name.localeCompare(b.name))
  const current = seats.filter((s) => (!s.termStart || s.termStart <= today) && (!s.termEnd || s.termEnd >= today))
  const past = seats.filter((s) => s.termEnd && s.termEnd < today)
  const reports = data.reports
    .filter((r) => r.bodySlug === slug)
    .sort((a, b) => (b.periodEnd ?? b.updatedAt).localeCompare(a.periodEnd ?? a.updatedAt))
  const confidential = slug === 'committee:family-assistance'

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <Card radius="card" pad="22px 24px" style={{ flex: '2 1 380px', minWidth: 0, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Eyebrow size="sm">Roster and terms</Eyebrow>
            <BodyBadge bodies={[slug]} />
          </div>
          {current.length === 0 ? (
            <p style={{ ...body, margin: 0 }}>Nobody is seated here yet. Seats are written by the administrator.</p>
          ) : (
            <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
              {current.map((s) => (
                <div key={s.personId + s.bodySlug} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, padding: '12px 2px', background: 'var(--surface-card)', alignItems: 'baseline' }}>
                  <span style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{s.name}</span>
                  <span style={meta}>
                    {seatLabel({ role: s.role, seat: s.seat })}
                    {s.termStart ? ' · since ' + formatShort(parseDate(s.termStart)) : ''}
                    {s.termEnd ? ' · through ' + formatShort(parseDate(s.termEnd)) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          {past.length ? (
            <p style={{ ...meta, margin: 0 }}>
              Served before: {past.map((s) => s.name + (s.termEnd ? ' (through ' + formatShort(parseDate(s.termEnd)) + ')' : '')).join(', ')}.
            </p>
          ) : null}
          {confidential ? (
            <p style={{ ...meta, margin: 0 }}>
              This committee is confidential. Its room is invisible to non-members, and its membership is left off the October roster published to the church, as Art. II.B §3 requires.
            </p>
          ) : null}
        </Card>

        <Card tone="panel" radius="card" pad="22px 24px" style={{ flex: '1 1 320px', minWidth: 0, display: 'grid', gap: 12 }}>
          <Eyebrow size="sm">Report history</Eyebrow>
          {reports.length === 0 ? (
            <p style={{ ...body, margin: 0 }}>Nothing filed yet. Reports are written on the Reports page and land here.</p>
          ) : (
            <div style={{ display: 'grid', gap: 1, background: 'var(--border-section)' }}>
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => navigate(`/reports/${r.id}`)}
                  style={{ textAlign: 'left', background: 'var(--surface-panel)', border: 'none', padding: '12px 2px', cursor: 'pointer', display: 'grid', gap: 4 }}
                >
                  <span style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                    {r.periodStart && r.periodEnd ? formatShort(parseDate(r.periodStart)) + ' – ' + formatShort(parseDate(r.periodEnd)) : formatShort(parseDate(r.updatedAt.slice(0, 10)))}
                    {' · '}
                    {bodyName(slug).replace(' committee', '')} report
                  </span>
                  <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: r.status === 'published' ? 'var(--mbc-yale-sage)' : 'var(--text-eyebrow)' }}>
                    {STATUS_STEPS.find((s) => s.key === r.status)?.label ?? r.status}
                    {r.publishedAt ? ' · ' + formatShort(parseDate(r.publishedAt.slice(0, 10))) : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <Eyebrow size="sm">Working notes · fourteen-day memory</Eyebrow>
        <Discussion side="deacon" room={slug} />
      </div>
    </div>
  )
}

function rank(seat: string): number {
  return seat === 'chair' ? 0 : seat === 'ex_officio' ? 2 : 1
}

function Note({ children }: { children: string }) {
  return <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>{children}</p>
}

const meta: React.CSSProperties = { font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const body: React.CSSProperties = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)' }

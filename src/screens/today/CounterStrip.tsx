import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../data/store'
import { useSession } from '../../session/session'
import { carePastWindow, openCare, unannouncedNotices, unclaimedCount } from '../../lib/rollups'
import { formatShort, parseDate, startOfToday } from '../../lib/date'

/* Four counts, each one a link to the surface it came from. The dividers are
   shared hairlines: a 1px-gap grid over the hairline colour inside one border. */
export function CounterStrip() {
  const data = useData()
  const navigate = useNavigate()
  const { viewAs } = useSession()
  const today = startOfToday()

  const open = openCare(data.care)
  const past = carePastWindow(data.care, today)
  const staffOnly = viewAs === 'staff'

  const cells = [
    {
      label: 'Unclaimed commitments',
      value: String(unclaimedCount(data.cadence)),
      meta: 'of ' + data.cadence.length + ' on the ledger',
      to: '/cadence',
    },
    {
      label: 'Open care entries',
      value: staffOnly ? String(open.length) : '—',
      meta: staffOnly ? past.length + ' past its response window' : 'Staff role only',
      to: '/care',
    },
    {
      label: 'Decisions not announced',
      value: String(unannouncedNotices(data).length),
      meta: 'waiting on a notification',
      to: '/notice',
    },
    {
      label: 'Sunday bulletin',
      value: data.week.status === 'draft' ? 'Draft' : 'Sent',
      meta: formatShort(parseDate(data.week.serviceDate)) + ' · four panels',
      to: '/communicator',
    },
  ]

  return (
    <div
      style={{
        border: '1px solid var(--border-card)',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'var(--border-hairline)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 1,
      }}
    >
      {cells.map((cell) => (
        <Cell key={cell.label} {...cell} onClick={() => navigate(cell.to)} />
      ))}
    </div>
  )
}

function Cell({
  label,
  value,
  meta,
  onClick,
}: {
  label: string
  value: string
  meta: string
  onClick(): void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        minHeight: 118,
        padding: '20px 22px',
        background: hover ? 'var(--surface-panel)' : 'var(--surface-card)',
        transition: 'var(--motion-hover)',
        display: 'grid',
        gap: 8,
        alignContent: 'start',
      }}
    >
      <span
        style={{
          font: '700 10px/1 var(--mbc-font-sans)',
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--text-eyebrow)',
        }}
      >
        {label}
      </span>
      <span className="tabular" style={{ font: '600 34px/1 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>
        {value}
      </span>
      <span style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{meta}</span>
    </button>
  )
}

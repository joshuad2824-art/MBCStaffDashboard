import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rule } from '../../components/ui'
import { useData } from '../../data/store'
import { useSession } from '../../session/session'
import { TONE_STYLES, deriveNotifications } from '../../lib/notifications'
import { startOfToday } from '../../lib/date'

/* Derived on every render from the same records the other surfaces show.
   Dismissal is a view preference held for this session — nothing is written,
   and "Show N dismissed" puts them all back. */
export function NotificationRail({ limit = 8 }: { limit?: number }) {
  const data = useData()
  const navigate = useNavigate()
  const { viewAs } = useSession()
  const [dismissed, setDismissed] = useState<string[]>([])
  const today = startOfToday()

  const all = useMemo(
    () => deriveNotifications(data, today, { includeCare: viewAs === 'staff', limit: 40 }),
    [data, today, viewAs],
  )
  const shown = all.filter((item) => !dismissed.includes(item.key)).slice(0, limit)
  const hidden = all.length - shown.length

  return (
    <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <span
            style={{
              font: '700 10px/1 var(--mbc-font-sans)',
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: 'var(--text-eyebrow)',
            }}
          >
            Notifications
          </span>
          <span className="tabular" style={{ font: '400 12px/1 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
            {shown.length} waiting
          </span>
        </div>
        <Rule tone="hair" />
      </div>

      {shown.length === 0 ? (
        <p style={{ font: '400 14px/1.7 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
          Nothing is waiting on anybody.
        </p>
      ) : (
        shown.map((item) => {
          const tone = TONE_STYLES[item.tone]
          return (
            <div
              key={item.key}
              style={{
                background: tone.ground,
                border: '1px solid var(--border-hairline)',
                borderRadius: 14,
                padding: '14px 15px',
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <span
                  style={{
                    font: '700 10px/1.3 var(--mbc-font-sans)',
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: tone.tag,
                  }}
                >
                  {item.tag}
                </span>
                <button
                  type="button"
                  aria-label={'Dismiss: ' + item.tag}
                  onClick={() => setDismissed((current) => [...current, item.key])}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    font: '400 14px/1 var(--mbc-font-sans)',
                    color: 'var(--text-muted)',
                  }}
                >
                  ×
                </button>
              </div>

              <p style={{ font: '400 14px/1.55 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>
                {item.body}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => navigate(item.to)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    font: '400 13px/1.4 var(--mbc-font-sans)',
                    color: 'var(--text-link)',
                  }}
                >
                  {item.actionLabel}
                </button>
                <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>{item.meta}</span>
              </div>
            </div>
          )
        })
      )}

      {dismissed.length > 0 ? (
        <button
          type="button"
          onClick={() => setDismissed([])}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            justifySelf: 'start',
            font: '400 13px/1.4 var(--mbc-font-sans)',
            color: 'var(--text-link)',
          }}
        >
          Show {dismissed.length} dismissed
        </button>
      ) : hidden > 0 ? (
        <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>
          {hidden} more below the cap.
        </p>
      ) : null}
    </div>
  )
}

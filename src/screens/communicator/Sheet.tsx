import { forwardRef } from 'react'
import type { ChurchSettings, CommunicatorWeek } from '../../data/types'
import { formatDate, parseDate } from '../../lib/date'

/* The printed piece: one letter sheet, landscape, double-sided, folded in half
   into four 5.5 × 8.5in panels.

     Sheet 1 (outside)   left: order of worship (p4)   right: cover (p1)
     Sheet 2 (inside)    left: welcome and contacts (p2)   right: coming up (p3)

   Nobody touches type, spacing or the fold. Panels are laid out at real inch
   dimensions so the on-screen preview and the printed page are the same object,
   and the fit guard measures the same DOM the printer receives. */

export const PANEL_WIDTH_IN = 5.5
export const PANEL_HEIGHT_IN = 8.5

export type PanelKey = 'cover' | 'welcome' | 'events' | 'worship'

export const PANELS: { key: PanelKey; name: string; page: string; short: string }[] = [
  { key: 'cover', name: 'Cover · page 1', page: 'Sheet 1, right', short: 'Cover' },
  { key: 'welcome', name: 'Welcome and contacts · page 2', page: 'Sheet 2, left', short: 'Welcome' },
  { key: 'events', name: 'Coming up and giving · page 3', page: 'Sheet 2, right', short: 'Coming up' },
  { key: 'worship', name: 'Order of worship · page 4', page: 'Sheet 1, left', short: 'Worship' },
]

/* `measure` releases the 8.5in ceiling so the panel takes its natural height.
   The guard renders a hidden copy that way and compares what comes back to the
   real page: an actual measurement of the same markup the printer receives,
   rather than a guess at how many lines fit. */
function panelBox(measure?: boolean): React.CSSProperties {
  return {
    width: PANEL_WIDTH_IN + 'in',
    height: measure ? 'auto' : PANEL_HEIGHT_IN + 'in',
    background: 'var(--surface-print)',
    color: 'var(--text-body)',
    fontFamily: 'var(--mbc-font-sans)',
    display: 'flex',
    flexDirection: 'column',
    overflow: measure ? 'visible' : 'hidden',
  }
}

function serviceDateLabel(week: CommunicatorWeek): string {
  return formatDate(parseDate(week.serviceDate))
}

/** The inner column is measured, not the panel: it is allowed to grow past the
    8.5 inches so the guard can see by how much. */
const Measured = forwardRef<HTMLDivElement, { children: React.ReactNode; pad: string }>(
  function Measured({ children, pad }, ref) {
    return (
      <div ref={ref} style={{ padding: pad, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {children}
      </div>
    )
  },
)

export function WorshipPanel({
  week,
  measureRef,
  measure,
}: {
  week: CommunicatorWeek
  measureRef?: React.Ref<HTMLDivElement>
  measure?: boolean
}) {
  return (
    <div style={panelBox(measure)}>
      <Measured ref={measureRef} pad="0.45in 0.42in">
        <p style={eyebrow}>{serviceDateLabel(week)}</p>
        <p style={{ ...panelTitle, margin: '12px 0 16px' }}>Order of worship</p>

        <div style={{ display: 'grid' }}>
          {week.order.map((item) => (
            <div key={item.id} style={{ borderBottom: '1px solid var(--mbc-rule-hair)', padding: '7px 0' }}>
              {item.kind === 'song' ? (
                <p style={{ font: '400 italic 17px/1.4 var(--mbc-font-serif)', color: 'var(--text-scripture)', margin: 0 }}>
                  {item.title}
                </p>
              ) : item.kind === 'sermon' ? (
                <p
                  style={{
                    font: '700 16px/1.4 var(--mbc-font-sans)',
                    letterSpacing: '.04em',
                    color: 'var(--text-heading)',
                    margin: 0,
                  }}
                >
                  {item.title}
                </p>
              ) : (
                <p style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>
                  {item.title}
                </p>
              )}
              {item.detail ? (
                <p
                  className="tabular"
                  style={{ font: '400 13px/1.45 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '4px 0 0' }}
                >
                  {item.detail}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 18,
            borderTop: '1px solid var(--mbc-rule)',
            paddingTop: 14,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '0.9in',
          }}
        >
          <p style={{ ...eyebrow, margin: '0 0 14px' }}>Sermon notes</p>
          <div
            style={{
              flex: 1,
              borderRadius: 8,
              backgroundImage: 'radial-gradient(var(--mbc-rule) 1.1px, transparent 1.2px)',
              backgroundSize: '20px 20px',
              backgroundPosition: '8px 8px',
            }}
          />
        </div>
      </Measured>
    </div>
  )
}

export function CoverPanel({
  week,
  settings,
  measureRef,
  measure,
}: {
  week: CommunicatorWeek
  settings: ChurchSettings
  measureRef?: React.Ref<HTMLDivElement>
  measure?: boolean
}) {
  return (
    <div style={{ ...panelBox(measure), borderLeft: '1px solid var(--mbc-rule-hair)' }}>
      <Measured ref={measureRef} pad="0.45in 0.42in">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <img src="/assets/mbc-mark.png" alt="" style={{ width: 54, height: 54, objectFit: 'contain' }} />
          <p
            style={{
              font: '700 11px/1 var(--mbc-font-sans)',
              letterSpacing: '.26em',
              textTransform: 'uppercase',
              color: 'var(--text-meta)',
              margin: 0,
            }}
          >
            Memorial Baptist Church
          </p>
          <p
            style={{
              font: '600 30px/1.1 var(--mbc-font-serif)',
              letterSpacing: '-.02em',
              color: 'var(--text-heading)',
              margin: '4px 0 0',
            }}
          >
            {serviceDateLabel(week)}
          </p>
        </div>

        <div
          style={{
            marginTop: 26,
            background: 'var(--photo-placeholder)',
            border: '1px solid var(--mbc-border-photo)',
            borderRadius: '200px 200px 16px 16px',
            height: '2.5in',
            flex: 'none',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {week.coverImageUrl ? (
            <img
              src={week.coverImageUrl}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}
          {week.artCaption ? (
            <span
              style={{
                position: 'relative',
                font: '400 11px/1.4 ui-monospace, monospace',
                color: 'var(--text-muted)',
                textTransform: 'lowercase',
                background: 'var(--surface-print)',
                borderRadius: 'var(--mbc-radius-input)',
                padding: week.coverImageUrl ? '5px 8px' : 0,
              }}
            >
              {week.artCaption}
            </span>
          ) : null}
        </div>

        <div style={{ marginTop: 22, textAlign: 'center' }}>
          {week.series ? (
            <p
              style={{
                font: '700 11px/1 var(--mbc-font-sans)',
                letterSpacing: '.22em',
                textTransform: 'uppercase',
                color: 'var(--text-category)',
                margin: '0 0 12px',
              }}
            >
              {week.series}
            </p>
          ) : null}
          {week.sermonTitle ? (
            <p
              style={{
                font: '600 26px/1.15 var(--mbc-font-serif)',
                letterSpacing: '-.02em',
                color: 'var(--text-heading)',
                margin: 0,
              }}
            >
              {week.sermonTitle}
            </p>
          ) : null}
          {week.scripture ? (
            <p
              className="tabular"
              style={{ font: '400 15px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '9px 0 0' }}
            >
              {week.scripture}
            </p>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 'auto',
            background: 'var(--surface-dark)',
            borderRadius: 14,
            padding: '20px 22px',
            display: 'grid',
            gap: 14,
          }}
        >
          <p
            style={{
              font: '700 10px/1 var(--mbc-font-sans)',
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: 'var(--text-on-dark-accent)',
              margin: 0,
              textAlign: 'center',
            }}
          >
            Meeting times
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {settings.meetingBlocks.map((block) => (
              <div key={block.day}>
                <p
                  style={{
                    font: '700 11px/1 var(--mbc-font-sans)',
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: 'var(--text-on-dark-label)',
                    margin: '0 0 8px',
                  }}
                >
                  {block.day}
                </p>
                {block.lines.map((line) => (
                  <p
                    key={line}
                    className="tabular"
                    style={{
                      font: '400 13px/1.45 var(--mbc-font-sans)',
                      color: 'var(--text-on-dark-strong)',
                      margin: '0 0 4px',
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <p
            style={{
              font: '400 12px/1.5 var(--mbc-font-sans)',
              color: 'var(--text-on-dark-label)',
              margin: '4px 0 0',
              textAlign: 'center',
              borderTop: '1px solid var(--border-dark)',
              paddingTop: 12,
            }}
          >
            {settings.address}
          </p>
        </div>
      </Measured>
    </div>
  )
}

export function WelcomePanel({
  settings,
  measureRef,
  measure,
}: {
  settings: ChurchSettings
  measureRef?: React.Ref<HTMLDivElement>
  measure?: boolean
}) {
  return (
    <div style={panelBox(measure)}>
      <Measured ref={measureRef} pad="0.42in 0.42in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 17, flex: 1 }}>
          <div>
            <p style={{ font: '600 21px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>
              Welcome.
            </p>
            <p
              style={{
                font: '400 15px/1.6 var(--mbc-font-sans)',
                color: 'var(--text-body)',
                margin: '9px 0 0',
                textWrap: 'pretty',
              }}
            >
              {settings.welcome}
            </p>
          </div>

          <div>
            <p style={{ ...eyebrow, margin: '0 0 9px' }}>For families</p>
            <p
              style={{
                font: '400 15px/1.6 var(--mbc-font-sans)',
                color: 'var(--text-body)',
                margin: 0,
                textWrap: 'pretty',
              }}
            >
              {settings.families}
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--mbc-rule)', paddingTop: 18 }}>
            <p style={{ ...eyebrow, margin: '0 0 12px' }}>Contact us</p>
            <div style={{ display: 'grid' }}>
              {settings.contacts.map((contact) => (
                <div
                  key={contact.role + contact.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 12,
                    alignItems: 'baseline',
                    borderBottom: '1px solid var(--mbc-rule-hair)',
                    padding: '6px 0',
                  }}
                >
                  <span style={{ minWidth: 0, font: '400 14px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                    <span
                      style={{
                        font: '700 10px/1.45 var(--mbc-font-sans)',
                        letterSpacing: '.12em',
                        textTransform: 'uppercase',
                        color: 'var(--text-meta)',
                      }}
                    >
                      {contact.role}{' '}
                    </span>
                    {contact.name}
                  </span>
                  <span
                    className="tabular"
                    style={{
                      font: '400 14px/1.45 var(--mbc-font-sans)',
                      color: 'var(--text-body)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {contact.phone}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 'auto',
              borderTop: '1px solid var(--mbc-rule)',
              paddingTop: 18,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 18,
            }}
          >
            <ScanBlock label="We would love to hear from you" line="memorialbaptist.com/contact" />
            <ScanBlock label="Find a class or group" line="spencer@memorialbaptist.com" />
          </div>
        </div>
      </Measured>
    </div>
  )
}

export function EventsPanel({
  week,
  measureRef,
  measure,
}: {
  week: CommunicatorWeek
  measureRef?: React.Ref<HTMLDivElement>
  measure?: boolean
}) {
  const year = parseDate(week.serviceDate)?.getFullYear() ?? new Date().getFullYear()
  return (
    <div style={{ ...panelBox(measure), borderLeft: '1px solid var(--mbc-rule-hair)' }}>
      <Measured ref={measureRef} pad="0.45in 0.42in">
        <p style={eyebrow}>This week and beyond</p>
        <p style={{ ...panelTitle, margin: '12px 0 18px' }}>Coming up</p>

        <div style={{ display: 'grid' }}>
          {week.bulletinEvents.map((line) => (
            <div
              key={line.id}
              style={{
                borderBottom: '1px solid var(--mbc-rule-hair)',
                padding: '9px 0',
                display: 'grid',
                gridTemplateColumns: '44px 1fr',
                gap: 14,
                alignItems: 'baseline',
              }}
            >
              <span
                className="tabular"
                style={{ font: '600 17px/1.2 var(--mbc-font-serif)', color: 'var(--text-heading)' }}
              >
                {line.date}
              </span>
              <span>
                <span
                  style={{
                    font: '700 12px/1.35 var(--mbc-font-sans)',
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-heading)',
                    display: 'block',
                  }}
                >
                  {line.title}
                </span>
                <span
                  className="tabular"
                  style={{
                    font: '400 14px/1.45 var(--mbc-font-sans)',
                    color: 'var(--text-body)',
                    display: 'block',
                    marginTop: 3,
                  }}
                >
                  {line.when}
                </span>
                {line.detail ? (
                  <span
                    style={{
                      font: '400 13px/1.5 var(--mbc-font-sans)',
                      color: 'var(--text-meta)',
                      display: 'block',
                      marginTop: 4,
                      textWrap: 'pretty',
                    }}
                  >
                    {line.detail}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
        <p style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '12px 0 0' }}>
          More event information at memorialbaptist.com/events
        </p>

        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <div
            style={{
              borderTop: '1px solid var(--mbc-rule)',
              paddingTop: 18,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 18,
              alignItems: 'start',
            }}
          >
            <div>
              <p style={{ ...eyebrow, margin: '0 0 10px' }}>Ways to give</p>
              {week.give.map((line) => (
                <p
                  key={line}
                  className="tabular"
                  style={{ font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)', margin: '0 0 4px' }}
                >
                  {line}
                </p>
              ))}
            </div>
            <div
              style={{
                width: 64,
                height: 64,
                border: '1px solid var(--mbc-rule)',
                borderRadius: 6,
                background: 'var(--photo-placeholder)',
              }}
            />
          </div>

          <div
            style={{
              marginTop: 16,
              background: 'var(--surface-panel)',
              border: '1px solid var(--mbc-rule)',
              borderRadius: 12,
              padding: '16px 18px',
            }}
          >
            <p
              style={{
                font: '700 10px/1 var(--mbc-font-sans)',
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: 'var(--text-meta)',
                margin: '0 0 12px',
              }}
            >
              Stewardship · {year}
            </p>
            <div style={{ display: 'grid', gap: 7 }}>
              {week.stewardship.map((line) => (
                <div
                  key={line.label}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}
                >
                  <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-body)' }}>
                    {line.label}
                  </span>
                  <span
                    className="tabular"
                    style={{ font: '600 15px/1.4 var(--mbc-font-serif)', color: 'var(--text-heading)' }}
                  >
                    {line.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Measured>
    </div>
  )
}

function ScanBlock({ label, line }: { label: string; line: string }) {
  return (
    <div>
      <p
        style={{
          font: '700 11px/1.35 var(--mbc-font-sans)',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'var(--text-heading)',
          margin: '0 0 8px',
        }}
      >
        {label}
      </p>
      <div
        style={{
          width: 64,
          height: 64,
          border: '1px solid var(--mbc-rule)',
          borderRadius: 6,
          background: 'var(--photo-placeholder)',
          marginBottom: 8,
        }}
      />
      <p style={{ font: '400 13px/1.45 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>{line}</p>
    </div>
  )
}

const eyebrow: React.CSSProperties = {
  font: '700 11px/1 var(--mbc-font-sans)',
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: 'var(--text-eyebrow)',
  margin: 0,
}

const panelTitle: React.CSSProperties = {
  font: '600 26px/1.15 var(--mbc-font-serif)',
  letterSpacing: '-.02em',
  color: 'var(--text-heading)',
}

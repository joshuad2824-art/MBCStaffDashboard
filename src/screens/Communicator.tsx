import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Card, Chip, Input, Rule } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import { nextId, personName } from '../lib/derive'
import {
  bulletinDate,
  currentWeek,
  eventAsBulletinLine,
  noticesForPublish,
  noticesForUnpublish,
  sortedWeeks,
} from '../lib/communicator'
import { addDays, formatDate, parseDate, startOfToday, toIso, todayIso } from '../lib/date'
import { CoverPanel, EventsPanel, PANELS, WelcomePanel, WorshipPanel } from './communicator/Sheet'
import type { PanelKey } from './communicator/Sheet'
import { useFitGuard } from './communicator/useFitGuard'
import type { CommunicatorWeek, OrderKind } from '../data/types'

export function Communicator() {
  const data = useData()
  const { mutate, update: writeQuietly, say } = useStore()
  const { member } = useSession()
  const today = startOfToday()

  const [openWeekId, setOpenWeekId] = useState<number | null>(null)
  const [panel, setPanel] = useState<PanelKey>('cover')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const week = data.weeks.find((candidate) => candidate.id === openWeekId) ?? currentWeek(data.weeks, today)
  const settings = data.settings

  const { refs, fits, anyOver } = useFitGuard([week, settings])

  if (!week || !member) {
    return (
      <Card tone="panel" pad={30}>
        <p style={{ font: '400 15px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
          No issue yet. Start one and the four panels format themselves.
        </p>
      </Card>
    )
  }

  const published = week.status === 'published'

  const patch = (label: string, fields: Partial<CommunicatorWeek>) =>
    mutate(label, (current) => ({
      ...current,
      weeks: current.weeks.map((candidate) =>
        candidate.id === week.id
          ? { ...candidate, ...fields, updatedBy: member.id, updatedAt: todayIso() }
          : candidate,
      ),
    }))

  // Typing in a field should not put a step on the undo stack per keystroke.
  // Structural changes — removing a line, pulling an event — go through `patch`.
  const update = (fields: Partial<CommunicatorWeek>) =>
    writeQuietly((current) => ({
      ...current,
      weeks: current.weeks.map((candidate) =>
        candidate.id === week.id
          ? { ...candidate, ...fields, updatedBy: member.id, updatedAt: todayIso() }
          : candidate,
      ),
    }))

  const publish = () => {
    const { notices, created, stamped } = noticesForPublish(data, week, todayIso())
    const counted = created.length + stamped.length
    mutate(
      counted === 0
        ? 'Published. Nothing new to notify — every event it carries was already announced.'
        : 'Published. ' + counted + (counted === 1 ? ' event now counts' : ' events now count') + ' as notified.',
      (current) => ({
        ...current,
        notices,
        weeks: current.weeks.map((candidate) =>
          candidate.id === week.id
            ? {
                ...candidate,
                status: 'published' as const,
                publishedCreatedNoticeIds: created,
                publishedStampedNoticeIds: stamped,
                updatedBy: member.id,
                updatedAt: todayIso(),
              }
            : candidate,
        ),
      }),
    )
  }

  const unpublish = () =>
    mutate('Back to a draft. The notice entries it wrote are gone.', (current) => ({
      ...current,
      notices: noticesForUnpublish(
        current.notices,
        week.publishedCreatedNoticeIds,
        week.publishedStampedNoticeIds,
      ),
      weeks: current.weeks.map((candidate) =>
        candidate.id === week.id
          ? {
              ...candidate,
              status: 'draft' as const,
              publishedCreatedNoticeIds: [],
              publishedStampedNoticeIds: [],
              updatedBy: member.id,
              updatedAt: todayIso(),
            }
          : candidate,
      ),
    }))

  const duplicate = () => {
    const id = nextId(data.weeks)
    const nextSunday = toIso(addDays(parseDate(week.serviceDate) ?? today, 7))
    setOpenWeekId(id)
    mutate('Duplicated last week’s issue. Change what changed.', (current) => ({
      ...current,
      weeks: [
        ...current.weeks,
        {
          ...week,
          id,
          serviceDate: nextSunday,
          status: 'draft' as const,
          publishedCreatedNoticeIds: [],
          publishedStampedNoticeIds: [],
          updatedBy: member.id,
          updatedAt: todayIso(),
        },
      ],
    }))
  }

  const pullFromCalendar = (eventId: number) => {
    const line = eventAsBulletinLine(data, eventId, week.bulletinEvents)
    if (!line) return
    patch('Pulled ' + line.title + ' from the calendar.', { bulletinEvents: [...week.bulletinEvents, line] })
  }

  const alreadyPulled = new Set(week.bulletinEvents.map((line) => line.eventId).filter(Boolean))
  const pullable = data.events.filter((event) => !alreadyPulled.has(event.id))

  const preview = {
    cover: <CoverPanel week={week} settings={settings} />,
    welcome: <WelcomePanel settings={settings} />,
    events: <EventsPanel week={week} />,
    worship: <WorshipPanel week={week} />,
  }[panel]

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* The hidden rig the guard measures. Same markup, no height ceiling. */}
      <div aria-hidden style={{ position: 'absolute', left: -99999, top: 0, visibility: 'hidden' }}>
        <CoverPanel week={week} settings={settings} measure measureRef={refs.cover} />
        <WelcomePanel settings={settings} measure measureRef={refs.welcome} />
        <EventsPanel week={week} measure measureRef={refs.events} />
        <WorshipPanel week={week} measure measureRef={refs.worship} />
      </div>

      <Card tone="panel" radius="card" pad="20px 24px" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ font: '600 24px/1.2 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>
              {formatDate(parseDate(week.serviceDate))}
            </p>
            <p style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '6px 0 0' }}>
              {published ? 'Published' : 'Draft'} · last touched by {personName(data.people, week.updatedBy)} on{' '}
              <span className="tabular">{formatDate(parseDate(week.updatedAt))}</span>
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Button variant="outline" size="sm" onClick={duplicate}>
              Duplicate for next week
            </Button>
            {published ? (
              <Button variant="outline" size="sm" onClick={unpublish}>
                Back to a draft
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={publish}>
                Publish
              </Button>
            )}
          </div>
        </div>

        {data.weeks.length > 1 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sortedWeeks(data.weeks).map((candidate) => (
              <Chip
                key={candidate.id}
                active={candidate.id === week.id}
                onClick={() => setOpenWeekId(candidate.id)}
              >
                {formatDate(parseDate(candidate.serviceDate))}
                {candidate.status === 'published' ? ' · sent' : ''}
              </Chip>
            ))}
          </div>
        ) : null}

        <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '68ch' }}>
          Publishing counts as notice: every event this issue carries that nobody has announced gets a notification date
          in the notice log. Going back to a draft removes exactly the entries it wrote.
        </p>
      </Card>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 440px', minWidth: 0, display: 'grid', gap: 20 }}>
          <Section title="Week details">
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
              <Input
                label="Service date"
                type="date"
                value={week.serviceDate}
                onChange={(event) => update({ serviceDate: event.target.value })}
              />
              <Input label="Series" value={week.series} onChange={(event) => update({ series: event.target.value })} />
              <Input
                label="Sermon title"
                value={week.sermonTitle}
                onChange={(event) => update({ sermonTitle: event.target.value })}
              />
              <Input
                label="Scripture"
                value={week.scripture}
                onChange={(event) => update({ scripture: event.target.value })}
              />
              <Input
                label="Art caption"
                value={week.artCaption}
                onChange={(event) => update({ artCaption: event.target.value })}
              />
            </div>
          </Section>

          <Section title="Order of worship">
            <div style={{ display: 'grid', gap: 8 }}>
              {week.order.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) 110px auto',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <input
                    value={item.title}
                    aria-label={'Order line ' + (index + 1)}
                    onChange={(event) =>
                      update({
                        order: week.order.map((row) =>
                          row.id === item.id ? { ...row, title: event.target.value } : row,
                        ),
                      })
                    }
                    style={rowInput}
                  />
                  <select
                    value={item.kind}
                    aria-label={'Kind of ' + (item.title || 'line ' + (index + 1))}
                    onChange={(event) =>
                      update({
                        order: week.order.map((row) =>
                          row.id === item.id ? { ...row, kind: event.target.value as OrderKind } : row,
                        ),
                      })
                    }
                    style={rowInput}
                  >
                    <option value="song">Song</option>
                    <option value="spoken">Spoken</option>
                    <option value="sermon">Sermon</option>
                  </select>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <IconAction
                      label={'Move ' + (item.title || 'line') + ' up'}
                      disabled={index === 0}
                      onClick={() => update({ order: swap(week.order, index, index - 1) })}
                    >
                      ↑
                    </IconAction>
                    <IconAction
                      label={'Move ' + (item.title || 'line') + ' down'}
                      disabled={index === week.order.length - 1}
                      onClick={() => update({ order: swap(week.order, index, index + 1) })}
                    >
                      ↓
                    </IconAction>
                    <IconAction
                      label={'Remove ' + (item.title || 'line')}
                      onClick={() =>
                        patch('Removed a line from the order of worship.', {
                          order: week.order.filter((row) => row.id !== item.id),
                        })
                      }
                    >
                      ×
                    </IconAction>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              style={{ justifySelf: 'start' }}
              onClick={() =>
                update({
                  order: [...week.order, { id: nextId(week.order), title: '', kind: 'song', detail: '' }],
                })
              }
            >
              Add a line
            </Button>
          </Section>

          <Section title="Coming up">
            <div style={{ display: 'grid', gap: 10 }}>
              {week.bulletinEvents.map((line) => (
                <div
                  key={line.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px minmax(0,1fr) auto',
                    gap: 10,
                    alignItems: 'start',
                  }}
                >
                  <input
                    value={line.date}
                    aria-label={'Date for ' + line.title}
                    onChange={(event) =>
                      update({
                        bulletinEvents: week.bulletinEvents.map((row) =>
                          row.id === line.id ? { ...row, date: event.target.value } : row,
                        ),
                      })
                    }
                    style={{ ...rowInput, fontVariantNumeric: 'tabular-nums' }}
                  />
                  <div style={{ display: 'grid', gap: 6 }}>
                    <input
                      value={line.title}
                      aria-label={'Title of ' + line.title}
                      onChange={(event) =>
                        update({
                          bulletinEvents: week.bulletinEvents.map((row) =>
                            row.id === line.id ? { ...row, title: event.target.value } : row,
                          ),
                        })
                      }
                      style={rowInput}
                    />
                    <input
                      value={line.when}
                      aria-label={'When ' + line.title + ' happens'}
                      onChange={(event) =>
                        update({
                          bulletinEvents: week.bulletinEvents.map((row) =>
                            row.id === line.id ? { ...row, when: event.target.value } : row,
                          ),
                        })
                      }
                      style={rowInput}
                    />
                    {line.eventId !== null ? (
                      <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-category)' }}>
                        From the calendar · publishing counts as notice for it
                      </span>
                    ) : (
                      <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                        Typed by hand · not linked to an event, so it notifies nobody
                      </span>
                    )}
                  </div>
                  <IconAction
                    label={'Remove ' + line.title}
                    onClick={() =>
                      patch('Removed a line from Coming up.', {
                        bulletinEvents: week.bulletinEvents.filter((row) => row.id !== line.id),
                      })
                    }
                  >
                    ×
                  </IconAction>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <Rule tone="hair" />
              <span style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                Pull from the calendar rather than retyping — one entry, many outputs.
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pullable.length === 0 ? (
                  <span style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                    Every event on the calendar is already in this issue.
                  </span>
                ) : (
                  pullable.map((event) => (
                    <Button
                      key={event.id}
                      variant="outline"
                      size="sm"
                      style={{ minHeight: 36, padding: '10px 16px' }}
                      onClick={() => pullFromCalendar(event.id)}
                    >
                      {bulletinDate(event.startsAt)} {event.name}
                    </Button>
                  ))
                )}
              </div>
            </div>
          </Section>

          <Section title="Giving and stewardship">
            <div style={{ display: 'grid', gap: 8 }}>
              {week.give.map((line, index) => (
                <input
                  key={index}
                  value={line}
                  aria-label={'Giving line ' + (index + 1)}
                  onChange={(event) =>
                    update({ give: week.give.map((row, i) => (i === index ? event.target.value : row)) })
                  }
                  style={rowInput}
                />
              ))}
            </div>
            <Rule tone="hair" />
            <div style={{ display: 'grid', gap: 8 }}>
              {week.stewardship.map((line, index) => (
                <div key={line.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 150px', gap: 10 }}>
                  <input
                    value={line.label}
                    aria-label={'Stewardship label ' + (index + 1)}
                    onChange={(event) =>
                      update({
                        stewardship: week.stewardship.map((row, i) =>
                          i === index ? { ...row, label: event.target.value } : row,
                        ),
                      })
                    }
                    style={rowInput}
                  />
                  <input
                    value={line.value}
                    aria-label={'Stewardship figure ' + (index + 1)}
                    onChange={(event) =>
                      update({
                        stewardship: week.stewardship.map((row, i) =>
                          i === index ? { ...row, value: event.target.value } : row,
                        ),
                      })
                    }
                    style={{ ...rowInput, fontVariantNumeric: 'tabular-nums' }}
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Standing content"
            action={
              <button type="button" onClick={() => setSettingsOpen(!settingsOpen)} style={linkButton}>
                {settingsOpen ? 'Close' : 'Edit standing content'}
              </button>
            }
          >
            {settingsOpen ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <Field label="Welcome">
                  <textarea
                    value={settings.welcome}
                    rows={3}
                    onChange={(event) =>
                      writeQuietly((current) => ({
                        ...current,
                        settings: { ...current.settings, welcome: event.target.value },
                      }))
                    }
                    style={{ ...rowInput, resize: 'vertical' }}
                  />
                </Field>
                <Field label="For families">
                  <textarea
                    value={settings.families}
                    rows={4}
                    onChange={(event) =>
                      writeQuietly((current) => ({
                        ...current,
                        settings: { ...current.settings, families: event.target.value },
                      }))
                    }
                    style={{ ...rowInput, resize: 'vertical' }}
                  />
                </Field>
                <Field label="Address line">
                  <input
                    value={settings.address}
                    onChange={(event) =>
                      writeQuietly((current) => ({
                        ...current,
                        settings: { ...current.settings, address: event.target.value },
                      }))
                    }
                    style={rowInput}
                  />
                </Field>
              </div>
            ) : (
              <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
                The welcome paragraph, the families note and the address are the same for whoever builds the issue.
              </p>
            )}
          </Section>
        </div>

        <div style={{ flex: '1 1 460px', minWidth: 0, display: 'grid', gap: 20 }}>
          <Card radius="card" pad={22} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <span style={sectionLabel}>Panel fit · 5.5 × 8.5 in</span>
              <Rule tone="hair" />
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {fits.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setPanel(entry.key)}
                  style={{
                    textAlign: 'left',
                    background: entry.key === panel ? 'var(--surface-panel)' : 'transparent',
                    border: '1px solid ' + (entry.key === panel ? 'var(--border-section)' : 'transparent'),
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 7,
                  }}
                >
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                    <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                      {entry.name}
                    </span>
                    <span
                      className="tabular"
                      style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}
                    >
                      {entry.fits ? entry.fillPercent + '% full' : 'over by ' + entry.overIn + ' in'}
                    </span>
                  </span>
                  <span style={{ display: 'block', height: 6, borderRadius: 999, background: 'var(--border-hairline)' }}>
                    <span
                      style={{
                        display: 'block',
                        height: 6,
                        borderRadius: 999,
                        width: entry.fillPercent + '%',
                        background: entry.fits ? 'var(--mbc-yale-sage)' : 'var(--mbc-lamplight)',
                      }}
                    />
                  </span>
                </button>
              ))}
            </div>

            <Rule tone="hair" />

            <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
              {anyOver
                ? 'A panel is over its 8.5 inches. Fix it above and the print button comes back — the guard is what makes this safe to hand to anyone.'
                : 'All four panels fit. Prints landscape on one letter sheet, double-sided, flip on short edge, 100% scale, then folded in half.'}
            </p>

            <Button
              variant="dark"
              size="sm"
              disabled={anyOver}
              style={{ justifySelf: 'start' }}
              onClick={() => {
                if (anyOver) return
                say('Landscape, double-sided, flip on short edge, 100% scale.')
                window.print()
              }}
            >
              Print the sheet
            </Button>
          </Card>

          <Card radius="card" pad={22} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PANELS.map((entry) => (
                <Chip key={entry.key} active={entry.key === panel} onClick={() => setPanel(entry.key)}>
                  {entry.short}
                </Chip>
              ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div
                style={{
                  border: '1px solid var(--mbc-border-photo)',
                  boxShadow: 'var(--mbc-shadow-print-sm)',
                  width: 'fit-content',
                }}
              >
                {preview}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* What the printer gets: two landscape sheets, four panels, nothing else.
          Portalled to the body so no layout in the interface can wrap or clip
          them, and hidden on screen. */}
      {createPortal(
        <div className="print-only" aria-hidden>
          <div className="print-sheet">
            <WorshipPanel week={week} />
            <CoverPanel week={week} settings={settings} />
          </div>
          <div className="print-sheet">
            <WelcomePanel settings={settings} />
            <EventsPanel week={week} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

function swap<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

const rowInput: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-panel)',
  borderRadius: 'var(--mbc-radius-md)',
  padding: '9px 12px',
  font: '400 14px/1.4 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
}

const sectionLabel: React.CSSProperties = {
  font: '700 10px/1 var(--mbc-font-sans)',
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: 'var(--text-eyebrow)',
}

const linkButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: '400 13px/1.4 var(--mbc-font-sans)',
  color: 'var(--text-link)',
  cursor: 'pointer',
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card radius="card" pad={22} style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <span style={sectionLabel}>{title}</span>
          {action}
        </div>
        <Rule tone="hair" />
      </div>
      {children}
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 'var(--mbc-space-3)' }}>
      <span
        style={{
          font: '700 11px/1 var(--mbc-font-sans)',
          letterSpacing: 'var(--mbc-track-label-tight)',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick(): void
  children: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 34,
        height: 40,
        borderRadius: 'var(--mbc-radius-md)',
        border: '1px solid var(--border-control)',
        background: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        color: 'var(--text-heading)',
        font: '400 15px/1 var(--mbc-font-sans)',
      }}
    >
      {children}
    </button>
  )
}

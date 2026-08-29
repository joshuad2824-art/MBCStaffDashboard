import { useMemo, useState } from 'react'
import { Button, Card, Chip, Input, Rule } from '../components/ui'
import { MINISTRIES, NOTICE_CATEGORIES } from '../data/seed'
import { useData, useStore } from '../data/store'
import { describeVerdict, nextId, noticeGap, noticeVerdict } from '../lib/derive'
import { medianGapByMonth } from '../lib/rollups'
import { countDays, formatDate, monthKey, parseDate, startOfToday, todayIso } from '../lib/date'
import type { Ministry, Notice } from '../data/types'

/* Two dates for anything that affects people outside this staff, and the gap
   between them. The gap is a measurement: it is stated in days and left alone.
   No red, no "overdue" — the number and the standard beside it are the argument. */

const COLUMNS = '2fr .8fr 1fr .95fr .95fr .55fr 1.7fr'

export function NoticeLog() {
  const data = useData()
  const { mutate } = useStore()
  const today = startOfToday()
  const [ministry, setMinistry] = useState<Ministry | 'All ministries'>('All ministries')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({
    subject: '',
    category: NOTICE_CATEGORIES[0].name,
    ministry: 'Children' as Ministry,
    audience: '',
    decidedOn: todayIso(),
    notifiedOn: '',
    channel: '',
  })

  const months = medianGapByMonth(data)
  const highest = Math.max(1, ...months.map((month) => month.median ?? 0))
  const thisMonth = months.find((month) => month.month === monthKey(today))

  const rows = useMemo(
    () =>
      data.notices
        .filter((notice) => (ministry === 'All ministries' ? true : notice.ministry === ministry))
        .sort((a, b) => b.decidedOn.localeCompare(a.decidedOn)),
    [data.notices, ministry],
  )

  // The preview line under the form, so the gap is visible before it is recorded.
  const previewGap = (() => {
    const decided = parseDate(draft.decidedOn)
    const notified = parseDate(draft.notifiedOn)
    if (!decided) return 'Pick the date the decision was made.'
    if (!notified) return 'Nothing recorded as sent yet — this will sit as not yet communicated.'
    const preview: Notice = {
      id: -1,
      subject: draft.subject,
      ministry: draft.ministry,
      category: draft.category,
      decidedOn: draft.decidedOn,
      notifiedOn: draft.notifiedOn,
      audience: draft.audience,
      channel: draft.channel,
      eventId: null,
    }
    const gap = noticeGap(preview)
    return gap === null
      ? 'Those dates do not parse.'
      : 'A gap of ' + countDays(gap) + '. ' + describeVerdict(noticeVerdict(preview)) + '.'
  })()

  const record = () => {
    const subject = draft.subject.trim()
    if (!subject) return
    const id = nextId(data.notices)
    setAdding(false)
    setDraft((current) => ({ ...current, subject: '', notifiedOn: '', channel: '', audience: '' }))
    mutate('Recorded a notice entry.', (current) => ({
      ...current,
      notices: [
        ...current.notices,
        {
          id,
          subject,
          ministry: draft.ministry,
          category: draft.category,
          decidedOn: draft.decidedOn,
          notifiedOn: draft.notifiedOn || null,
          audience: draft.audience.trim(),
          channel: draft.channel.trim() || (draft.notifiedOn ? 'Logged by hand' : 'Not sent'),
          eventId: null,
        },
      ],
    }))
  }

  const markCommunicated = (notice: Notice) =>
    mutate('Logged as communicated today. The gap and the median moved.', (current) => ({
      ...current,
      notices: current.notices.map((entry) =>
        entry.id === notice.id
          ? {
              ...entry,
              notifiedOn: todayIso(),
              channel: entry.channel === 'Not sent' ? 'Logged by hand' : entry.channel,
            }
          : entry,
      ),
    }))

  const clearNotified = (notice: Notice) =>
    mutate('Cleared the notification date. The entry is open again.', (current) => ({
      ...current,
      notices: current.notices.map((entry) =>
        entry.id === notice.id ? { ...entry, notifiedOn: null, channel: 'Not sent' } : entry,
      ),
    }))

  const remove = (notice: Notice) =>
    mutate('Deleted a notice entry.', (current) => ({
      ...current,
      notices: current.notices.filter((entry) => entry.id !== notice.id),
    }))

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Card radius="card" pad={24} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionLabel>Median gap by month</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, minHeight: 118, flex: 1 }}>
            {months.length === 0 ? (
              <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
                Nothing has been decided and announced yet.
              </p>
            ) : (
              months.map((month) => {
                const value = month.median ?? 0
                return (
                  <div key={month.month} style={{ display: 'grid', gap: 7, justifyItems: 'center', flex: 1 }}>
                    <span
                      className="tabular"
                      style={{ font: '400 12px/1 var(--mbc-font-sans)', color: 'var(--text-meta)' }}
                    >
                      {value}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 34,
                        height: 10 + (value / highest) * 82,
                        borderRadius: '6px 6px 0 0',
                        background: value <= 7 ? 'var(--mbc-yale-sage)' : 'var(--mbc-lamplight)',
                      }}
                    />
                    <span
                      style={{
                        font: '700 10px/1 var(--mbc-font-sans)',
                        letterSpacing: '.14em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {month.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
          <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
            {thisMonth && thisMonth.median !== null
              ? 'This month the median is ' + countDays(thisMonth.median) + '.'
              : 'No decision has been both made and announced this month.'}{' '}
            Sage is at or under a week; lamplight is over it.
          </p>
        </Card>

        <Card tone="dark" radius="card" pad={24} style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <span
            style={{
              font: '700 10px/1 var(--mbc-font-sans)',
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: 'var(--text-on-dark-accent)',
            }}
          >
            The standard
          </span>
          <Rule tone="dark" />
          <div style={{ display: 'grid' }}>
            {NOTICE_CATEGORIES.map((category) => (
              <div
                key={category.name}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-dark)',
                }}
              >
                <span style={{ font: '400 15px/1.45 var(--mbc-font-sans)', color: 'var(--text-on-dark)' }}>
                  {category.name}
                </span>
                <span
                  className="tabular"
                  style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)' }}
                >
                  {countDays(category.std)}
                </span>
              </div>
            ))}
          </div>
          <p style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)', margin: 0 }}>
            The longest delay that still counts as telling people in time.
          </p>
        </Card>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Chip active={ministry === 'All ministries'} onClick={() => setMinistry('All ministries')}>
          All ministries
        </Chip>
        {MINISTRIES.filter((name) => name !== 'All').map((name) => (
          <Chip key={name} active={ministry === name} onClick={() => setMinistry(name)}>
            {name}
          </Chip>
        ))}
        <Button
          variant={adding ? 'outline' : 'primary'}
          size="sm"
          style={{ marginLeft: 'auto' }}
          onClick={() => setAdding(!adding)}
        >
          {adding ? 'Close' : 'Record an entry'}
        </Button>
      </div>

      {adding ? (
        <Card tone="panel" radius="card" pad={24} style={{ display: 'grid', gap: 18 }}>
          <SectionLabel>Record an entry</SectionLabel>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            <Input
              label="Subject"
              value={draft.subject}
              onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
              placeholder="What was decided"
            />
            <Field label="Category">
              <select
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                style={selectStyle}
              >
                {NOTICE_CATEGORIES.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name} · {category.std}d
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ministry">
              <select
                value={draft.ministry}
                onChange={(event) => setDraft({ ...draft, ministry: event.target.value as Ministry })}
                style={selectStyle}
              >
                {MINISTRIES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Input
              label="Audience"
              value={draft.audience}
              onChange={(event) => setDraft({ ...draft, audience: event.target.value })}
              placeholder="Who it affects"
            />
            <Input
              label="Decided on"
              type="date"
              value={draft.decidedOn}
              onChange={(event) => setDraft({ ...draft, decidedOn: event.target.value })}
            />
            <Input
              label="Notified on"
              type="date"
              value={draft.notifiedOn}
              onChange={(event) => setDraft({ ...draft, notifiedOn: event.target.value })}
            />
            <Input
              label="Channel"
              value={draft.channel}
              onChange={(event) => setDraft({ ...draft, channel: event.target.value })}
              placeholder="Email, bulletin, text"
            />
          </div>
          <Rule />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
            <Button variant="outline" size="sm" disabled={draft.subject.trim().length === 0} onClick={record}>
              Record it
            </Button>
            <span style={{ font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{previewGap}</span>
          </div>
        </Card>
      ) : null}

      <Card radius="card" pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1080 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: COLUMNS,
                gap: 16,
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-section)',
                background: 'var(--surface-panel)',
              }}
            >
              {['Subject', 'Ministry', 'Category', 'Decided', 'Notified', 'Gap', 'Standard'].map((label) => (
                <span
                  key={label}
                  style={{
                    font: '700 10px/1 var(--mbc-font-sans)',
                    letterSpacing: 'var(--mbc-track-label-tight)',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {rows.length === 0 ? (
              <p style={{ font: '400 15px/1.7 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0, padding: 24 }}>
                Nothing recorded for that ministry yet.
              </p>
            ) : (
              rows.map((notice) => {
                const gap = noticeGap(notice)
                const verdict = noticeVerdict(notice)
                return (
                  <div
                    key={notice.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: COLUMNS,
                      gap: 16,
                      padding: '18px 24px',
                      borderBottom: '1px solid var(--border-hairline)',
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <p style={{ font: '400 15px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>
                        {notice.subject}
                      </p>
                      <p
                        style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: '5px 0 0' }}
                      >
                        {notice.audience ? notice.audience + ' · ' : ''}
                        {notice.channel}
                      </p>
                    </div>

                    <Cell>{notice.ministry}</Cell>
                    <Cell>{notice.category}</Cell>
                    <Cell tabular>{formatDate(parseDate(notice.decidedOn))}</Cell>
                    <Cell tabular tone={notice.notifiedOn ? 'body' : 'meta'}>
                      {notice.notifiedOn ? formatDate(parseDate(notice.notifiedOn)) : 'Not sent'}
                    </Cell>
                    <Cell tabular tone={gap === null ? 'meta' : 'heading'}>{gap === null ? '—' : gap}</Cell>

                    <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
                      <p style={{ font: '400 14px/1.45 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
                        {describeVerdict(verdict)}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                        {notice.notifiedOn === null ? (
                          <TextAction onClick={() => markCommunicated(notice)}>Communicated today</TextAction>
                        ) : (
                          <TextAction onClick={() => clearNotified(notice)}>Clear the date</TextAction>
                        )}
                        <TextAction onClick={() => remove(notice)}>Delete</TextAction>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Card>

      <p style={{ font: '400 13px/1.7 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0, maxWidth: '66ch' }}>
        The gap is the number of days between the two dates. It is stored nowhere: change either date and every figure
        on this page, including the medians, follows it.
      </p>
    </div>
  )
}

const selectStyle = {
  width: '100%',
  minHeight: 'var(--mbc-tap-min)',
  background: 'var(--surface-card)',
  border: '1px solid var(--mbc-border-panel)',
  borderRadius: 'var(--mbc-radius-input)',
  padding: '13px 16px',
  font: '400 16px/1.2 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
} as const

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <span
        style={{
          font: '700 10px/1 var(--mbc-font-sans)',
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--text-eyebrow)',
        }}
      >
        {children}
      </span>
      <Rule tone="hair" />
    </div>
  )
}

function Cell({
  children,
  tabular = false,
  tone = 'body',
}: {
  children: React.ReactNode
  tabular?: boolean
  tone?: 'body' | 'meta' | 'heading'
}) {
  const colours = { body: 'var(--text-body)', meta: 'var(--text-meta)', heading: 'var(--text-heading)' }
  return (
    <p
      className={tabular ? 'tabular' : undefined}
      style={{ font: '400 15px/1.45 var(--mbc-font-sans)', color: colours[tone], margin: 0 }}
    >
      {children}
    </p>
  )
}

function TextAction({ onClick, children }: { onClick(): void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        font: '400 12px/1.4 var(--mbc-font-sans)',
        color: 'var(--text-link)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

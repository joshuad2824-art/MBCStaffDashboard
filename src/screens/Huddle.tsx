import { useState } from 'react'
import { Button, Card, Rule } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import { isHuddleArchived, nextId, staffName } from '../lib/derive'
import { dueWithin } from '../lib/rollups'
import { formatShort, relativeDay, parseDate, startOfToday, todayIso } from '../lib/date'
import type { HuddleColumn, HuddlePost } from '../data/types'

const COLUMNS: { key: HuddleColumn; title: string; placeholder: string }[] = [
  { key: 'win', title: 'Wins', placeholder: 'Something that went well.' },
  { key: 'tension', title: 'Tensions', placeholder: 'Something stuck or at risk.' },
  { key: 'fyi', title: 'FYIs', placeholder: 'For the good of the group.' },
]

export function Huddle() {
  const data = useData()
  const { mutate } = useStore()
  const { member, viewAs } = useSession()
  const today = startOfToday()
  const [drafts, setDrafts] = useState<Record<HuddleColumn, string>>({ win: '', tension: '', fyi: '' })

  // Wins and FYIs age out after fourteen days. Tensions stay until cleared.
  const visible = (col: HuddleColumn): HuddlePost[] =>
    data.huddle
      .filter((post) => post.col === col)
      .filter((post) => (col === 'tension' ? true : !isHuddleArchived(post.createdAt, today)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const archivedCount = data.huddle.filter(
    (post) => post.col !== 'tension' && isHuddleArchived(post.createdAt, today),
  ).length

  const post = (col: HuddleColumn) => {
    const body = drafts[col].trim()
    if (!body || !member) return
    const id = nextId(data.huddle)
    setDrafts((current) => ({ ...current, [col]: '' }))
    mutate('Posted to ' + (col === 'fyi' ? 'FYIs' : col === 'win' ? 'Wins' : 'Tensions') + '.', (current) => ({
      ...current,
      huddle: [
        ...current.huddle,
        { id, col, authorId: member.id, body, createdAt: todayIso(), resolvedAt: null },
      ],
    }))
  }

  const setResolved = (id: number, resolved: boolean) =>
    mutate(resolved ? 'Marked a tension cleared.' : 'Reopened a cleared tension.', (current) => ({
      ...current,
      huddle: current.huddle.map((entry) =>
        entry.id === id ? { ...entry, resolvedAt: resolved ? todayIso() : null } : entry,
      ),
    }))

  const remove = (id: number) =>
    mutate('Deleted a Huddle entry.', (current) => ({
      ...current,
      huddle: current.huddle.filter((entry) => entry.id !== id),
    }))

  const due = dueWithin(data, today, 30, viewAs === 'staff')

  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(268px, 1fr))' }}>
      {COLUMNS.map((column) => {
        const entries = visible(column.key)
        return (
          <Card key={column.key} radius="card" pad={22} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ColumnHead title={column.title} count={entries.length} />

            <div style={{ display: 'grid', gap: 10 }}>
              {entries.length === 0 ? (
                <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>
                  Nothing here this week.
                </p>
              ) : (
                entries.map((entry) => (
                  <Entry
                    key={entry.id}
                    entry={entry}
                    author={staffName(data.staff, entry.authorId)}
                    mine={entry.authorId === member?.id}
                    today={today}
                    onResolve={column.key === 'tension' ? setResolved : undefined}
                    onDelete={remove}
                  />
                ))
              )}
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 'auto' }}>
              <textarea
                value={drafts[column.key]}
                placeholder={column.placeholder}
                onChange={(event) => setDrafts((current) => ({ ...current, [column.key]: event.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  background: 'var(--surface-field)',
                  border: '1px solid var(--mbc-border-panel)',
                  borderRadius: 'var(--mbc-radius-input)',
                  padding: '12px 14px',
                  font: '400 15px/1.55 var(--mbc-font-sans)',
                  color: 'var(--text-heading)',
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={drafts[column.key].trim().length === 0}
                onClick={() => post(column.key)}
                style={{ justifySelf: 'start' }}
              >
                Post
              </Button>
            </div>

            {column.key === 'fyi' && archivedCount > 0 ? (
              <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>
                {archivedCount} older {archivedCount === 1 ? 'entry has' : 'entries have'} archived.
              </p>
            ) : null}
          </Card>
        )
      })}

      <Card tone="dark" radius="card" pad={22} style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span
              style={{
                font: '700 11px/1 var(--mbc-font-sans)',
                letterSpacing: 'var(--mbc-track-label)',
                textTransform: 'uppercase',
                color: 'var(--text-on-dark-accent)',
              }}
            >
              Due next
            </span>
            <span className="tabular" style={{ font: '400 12px/1 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)' }}>
              {due.length}
            </span>
          </div>
          <Rule tone="dark" />
        </div>

        <p style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)', margin: 0 }}>
          Read-only. Everything here is derived from the ledger and the pipelines.
        </p>

        <div style={{ display: 'grid' }}>
          {due.length === 0 ? (
            <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)', margin: 0 }}>
              Nothing enters its window in the next thirty days.
            </p>
          ) : (
            due.map((row) => (
              <div key={row.key} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-dark)' }}>
                <p style={{ font: '400 14px/1.45 var(--mbc-font-sans)', color: 'var(--text-on-dark)', margin: 0 }}>
                  {row.label}
                </p>
                <p
                  className="tabular"
                  style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)', margin: '5px 0 0' }}
                >
                  {formatShort(row.date)} · {row.meta}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

function ColumnHead({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <span
          style={{
            font: '700 11px/1 var(--mbc-font-sans)',
            letterSpacing: 'var(--mbc-track-label)',
            textTransform: 'uppercase',
            color: 'var(--text-eyebrow)',
          }}
        >
          {title}
        </span>
        <span className="tabular" style={{ font: '400 12px/1 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
          {count}
        </span>
      </div>
      <Rule tone="hair" />
    </div>
  )
}

function Entry({
  entry,
  author,
  mine,
  today,
  onResolve,
  onDelete,
}: {
  entry: HuddlePost
  author: string
  mine: boolean
  today: Date
  onResolve?: (id: number, resolved: boolean) => void
  onDelete: (id: number) => void
}) {
  const created = parseDate(entry.createdAt)
  const cleared = entry.resolvedAt !== null

  return (
    <div
      style={{
        background: 'var(--surface-panel)',
        borderRadius: 14,
        padding: '15px 16px',
        display: 'grid',
        gap: 8,
      }}
    >
      <p
        style={{
          font: '400 15px/1.55 var(--mbc-font-sans)',
          color: cleared ? 'var(--text-meta)' : 'var(--text-heading)',
          margin: 0,
        }}
      >
        {entry.body}
      </p>
      <p style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
        {author} · {created ? relativeDay(created, today) : '—'}
        {cleared ? ' · cleared' : ''}
      </p>
      <div style={{ display: 'flex', gap: 14 }}>
        {onResolve ? (
          <TextAction onClick={() => onResolve(entry.id, !cleared)}>{cleared ? 'Reopen' : 'Clear'}</TextAction>
        ) : null}
        {mine ? <TextAction onClick={() => onDelete(entry.id)}>Delete</TextAction> : null}
      </div>
    </div>
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

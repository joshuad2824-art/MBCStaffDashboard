import { useMemo, useState } from 'react'
import { Button, Card, Chip } from '../components/ui'
import { useData, useStore } from '../data/store'
import { MINISTRIES } from '../data/seed'
import { deriveCadence, isUnclaimed, staffName } from '../lib/derive'
import { formatDate, startOfToday, todayIso } from '../lib/date'
import type { CadenceItem, Ministry } from '../data/types'

/* Nothing in the two right-hand columns is typed. Next due is the last time it
   was held plus its interval; announce by is that date minus the notice window.
   With no last-held date, next due reads "—" and says why.

   There is no red and no "overdue". "Never held" sitting in the last-held column
   makes its own argument. */

type SortKey = 'name' | 'ministry' | 'owner' | 'lastHeld' | 'nextDue' | 'announceBy'

const COLUMNS = '2.2fr .85fr 1.1fr .8fr .95fr 1fr 1fr 1.2fr'

export function Cadence() {
  const data = useData()
  const { mutate } = useStore()
  const today = startOfToday()
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'nextDue', dir: 1 })
  const [unclaimedOnly, setUnclaimedOnly] = useState(false)
  const [ministry, setMinistry] = useState<Ministry | 'All ministries'>('All ministries')

  const unclaimed = data.cadence.filter(isUnclaimed)

  const rows = useMemo(() => {
    const filtered = data.cadence
      .filter((item) => (unclaimedOnly ? isUnclaimed(item) : true))
      .filter((item) => (ministry === 'All ministries' ? true : item.ministry === ministry))

    const value = (item: CadenceItem): string | number => {
      const { lastHeld, nextDue, announceBy } = deriveCadence(item)
      switch (sort.key) {
        case 'name':
          return item.name.toLowerCase()
        case 'ministry':
          return item.ministry.toLowerCase()
        case 'owner':
          return staffName(data.staff, item.ownerId).toLowerCase()
        case 'lastHeld':
          // Never held sorts last in either direction: it has no date to compare.
          return lastHeld ? lastHeld.getTime() : Number.MAX_SAFE_INTEGER
        case 'nextDue':
          return nextDue ? nextDue.getTime() : Number.MAX_SAFE_INTEGER
        case 'announceBy':
          return announceBy ? announceBy.getTime() : Number.MAX_SAFE_INTEGER
      }
    }

    return [...filtered].sort((a, b) => {
      const left = value(a)
      const right = value(b)
      if (left === right) return a.name.localeCompare(b.name)
      return (left < right ? -1 : 1) * sort.dir
    })
  }, [data.cadence, data.staff, ministry, sort, unclaimedOnly])

  const patch = (id: number, label: string, fields: Partial<CadenceItem>) =>
    mutate(label, (current) => ({
      ...current,
      cadence: current.cadence.map((item) => (item.id === id ? { ...item, ...fields } : item)),
    }))

  const toggleSort = (key: SortKey) =>
    setSort((current) => (current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: 1 }))

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card tone="panel" radius="card" pad="24px 26px" style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 16 }}>
          <span className="tabular" style={{ font: '600 40px/1 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>
            {unclaimed.length}
          </span>
          <span style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '52ch' }}>
            of {data.cadence.length} recurring commitments have no owner. Unclaimed is a state, not a blank — naming
            someone is the whole fix.
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Chip active={unclaimedOnly} onClick={() => setUnclaimedOnly(!unclaimedOnly)}>
            Unclaimed · {unclaimed.length}
          </Chip>
          <Chip active={ministry === 'All ministries'} onClick={() => setMinistry('All ministries')}>
            All ministries
          </Chip>
          {MINISTRIES.filter((name) => name !== 'All').map((name) => (
            <Chip key={name} active={ministry === name} onClick={() => setMinistry(name)}>
              {name}
            </Chip>
          ))}
        </div>
      </Card>

      <Card radius="card" pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1180 }}>
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
              <HeadCell label="Commitment" sortKey="name" sort={sort} onSort={toggleSort} />
              <HeadCell label="Ministry" sortKey="ministry" sort={sort} onSort={toggleSort} />
              <HeadCell label="Owner" sortKey="owner" sort={sort} onSort={toggleSort} />
              <HeadCell label="Interval" />
              <HeadCell label="Last held" sortKey="lastHeld" sort={sort} onSort={toggleSort} />
              <HeadCell label="Next due" sortKey="nextDue" sort={sort} onSort={toggleSort} />
              <HeadCell label="Announce by" sortKey="announceBy" sort={sort} onSort={toggleSort} />
              <HeadCell label="Record" />
            </div>

            {rows.length === 0 ? (
              <p style={{ font: '400 15px/1.7 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0, padding: 24 }}>
                No commitments match that filter.
              </p>
            ) : (
              rows.map((item) => {
                const { lastHeld, nextDue, announceBy } = deriveCadence(item)
                return (
                  <div
                    key={item.id}
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
                        {item.name}
                      </p>
                      <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: '5px 0 0' }}>
                        {item.notes}
                      </p>
                    </div>

                    <Cell>{item.ministry}</Cell>

                    <div>
                      <select
                        value={item.ownerId === null ? '' : String(item.ownerId)}
                        aria-label={'Owner of ' + item.name}
                        onChange={(event) => {
                          const value = event.target.value
                          const ownerId = value === '' ? null : Number(value)
                          patch(
                            item.id,
                            ownerId === null
                              ? 'Cleared the owner. It is unclaimed again.'
                              : staffName(data.staff, ownerId) + ' owns ' + item.name + '.',
                            { ownerId },
                          )
                        }}
                        style={{
                          width: '100%',
                          minHeight: 40,
                          background: 'var(--surface-field)',
                          border: '1px solid var(--mbc-border-panel)',
                          borderRadius: 'var(--mbc-radius-md)',
                          padding: '9px 10px',
                          font: '400 14px/1.3 var(--mbc-font-sans)',
                          color: item.ownerId === null ? 'var(--text-muted)' : 'var(--text-heading)',
                        }}
                      >
                        <option value="">Unclaimed</option>
                        {data.staff
                          .filter((person) => person.active)
                          .map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <Cell>{item.intervalLabel}</Cell>

                    <Cell tabular tone={lastHeld ? 'body' : 'meta'}>
                      {lastHeld ? formatDate(lastHeld) : 'Never held'}
                    </Cell>

                    <div>
                      <p
                        className="tabular"
                        style={{
                          font: '400 15px/1.45 var(--mbc-font-sans)',
                          color: nextDue ? 'var(--text-heading)' : 'var(--text-meta)',
                          margin: 0,
                        }}
                      >
                        {nextDue ? formatDate(nextDue) : '—'}
                      </p>
                      {!nextDue ? (
                        <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: '5px 0 0' }}>
                          derived once it is held
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p
                        className="tabular"
                        style={{ font: '400 15px/1.45 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}
                      >
                        {announceBy ? formatDate(announceBy) : '—'}
                      </p>
                      <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: '5px 0 0' }}>
                        {item.noticeDays}-day notice
                      </p>
                    </div>

                    <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        style={{ minHeight: 36, padding: '10px 16px' }}
                        onClick={() =>
                          patch(item.id, 'Recorded ' + item.name + ' as held today.', { lastHeld: todayIso() })
                        }
                      >
                        Held today
                      </Button>
                      <input
                        type="date"
                        aria-label={'Date ' + item.name + ' was last held'}
                        value={item.lastHeld ?? ''}
                        max={todayIso()}
                        onChange={(event) =>
                          patch(item.id, 'Set the last-held date for ' + item.name + '.', {
                            lastHeld: event.target.value || null,
                          })
                        }
                        style={{
                          width: '100%',
                          minHeight: 36,
                          background: 'var(--surface-field)',
                          border: '1px solid var(--mbc-border-panel)',
                          borderRadius: 'var(--mbc-radius-md)',
                          padding: '7px 9px',
                          font: '400 13px/1 var(--mbc-font-sans)',
                          color: 'var(--text-heading)',
                        }}
                      />
                      {item.lastHeld ? (
                        <button
                          type="button"
                          onClick={() =>
                            patch(item.id, 'Cleared the record for ' + item.name + '.', { lastHeld: null })
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            font: '400 12px/1.4 var(--mbc-font-sans)',
                            color: 'var(--text-link)',
                            cursor: 'pointer',
                          }}
                        >
                          Clear record
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Card>

      <p style={{ font: '400 13px/1.7 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0, maxWidth: '66ch' }}>
        Today is {formatDate(today)}. Next due and announce by are recomputed every time this page opens; nothing on
        this screen stores them.
      </p>
    </div>
  )
}

function HeadCell({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey?: SortKey
  sort?: { key: SortKey; dir: 1 | -1 }
  onSort?: (key: SortKey) => void
}) {
  const style = {
    font: '700 10px/1 var(--mbc-font-sans)',
    letterSpacing: 'var(--mbc-track-label-tight)',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    margin: 0,
    textAlign: 'left',
  } as const

  if (!sortKey || !onSort || !sort) return <p style={style}>{label}</p>

  const active = sort.key === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      style={{
        ...style,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: active ? 'var(--text-heading)' : 'var(--text-muted)',
      }}
    >
      {label}
      {active ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
    </button>
  )
}

function Cell({
  children,
  tabular = false,
  tone = 'body',
}: {
  children: React.ReactNode
  tabular?: boolean
  tone?: 'body' | 'meta'
}) {
  return (
    <p
      className={tabular ? 'tabular' : undefined}
      style={{
        font: '400 15px/1.45 var(--mbc-font-sans)',
        color: tone === 'meta' ? 'var(--text-meta)' : 'var(--text-body)',
        margin: 0,
      }}
    >
      {children}
    </p>
  )
}

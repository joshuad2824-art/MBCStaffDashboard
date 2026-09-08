import { Button, Card, Rule } from '../components/ui'
import { useData, useStore } from '../data/store'
import { OwnerNote, OwnerSelect } from '../components/OwnerSelect'

import type { Goal } from '../data/types'

/* Annual, entered once, reviewed four times. Deliberately lightweight: a
   sentence per quarter, not a metric. The point is remembering in October what
   was said in January. */

const STATUSES = ['Not started', 'In progress', 'On track', 'Behind', 'Done'] as const

const QUARTERS: { key: keyof Goal['q']; label: string }[] = [
  { key: 'q1', label: 'Q1' },
  { key: 'q2', label: 'Q2' },
  { key: 'q3', label: 'Q3' },
  { key: 'q4', label: 'Q4' },
]

export function Goals() {
  const data = useData()
  const { mutate, update } = useStore()

  const cycleStatus = (goal: Goal) => {
    const index = STATUSES.indexOf(goal.status as (typeof STATUSES)[number])
    const next = STATUSES[(index + 1) % STATUSES.length]
    mutate('Status set to ' + next.toLowerCase() + '.', (current) => ({
      ...current,
      goals: current.goals.map((row) => (row.id === goal.id ? { ...row, status: next } : row)),
    }))
  }

  const writeNote = (goal: Goal, quarter: keyof Goal['q'], value: string) =>
    update((current) => ({
      ...current,
      goals: current.goals.map((row) => (row.id === goal.id ? { ...row, q: { ...row.q, [quarter]: value } } : row)),
    }))

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {data.goals.map((goal) => (
        <Card key={goal.id} radius="card" pad={24} style={{ display: 'grid', gap: 18 }}>
          <div
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
          >
            <div style={{ minWidth: 0, flex: '1 1 380px' }}>
              <p
                style={{
                  font: '600 21px/1.3 var(--mbc-font-serif)',
                  letterSpacing: '-.01em',
                  color: 'var(--text-heading)',
                  margin: 0,
                  maxWidth: '52ch',
                }}
              >
                {goal.title}
              </p>
              <p style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '8px 0 0' }}>
                {goal.ministry} · {goal.target}
              </p>
              <div style={{ maxWidth: 260, marginTop: 12 }}>
                <OwnerSelect
                  ownerId={goal.ownerId}
                  label={'Owner of: ' + goal.title}
                  onChange={(ownerId, name) =>
                    mutate(
                      ownerId === null ? 'Cleared the owner of a goal.' : name + ' owns that goal.',
                      (current) => ({
                        ...current,
                        goals: current.goals.map((row) => (row.id === goal.id ? { ...row, ownerId } : row)),
                      }),
                    )
                  }
                />
                <OwnerNote ownerId={goal.ownerId} />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => cycleStatus(goal)}>
              {goal.status}
            </Button>
          </div>

          <Rule tone="hair" />

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {QUARTERS.map((quarter) => (
              <label key={quarter.key} style={{ display: 'grid', gap: 8 }}>
                <span
                  style={{
                    font: '700 10px/1 var(--mbc-font-sans)',
                    letterSpacing: 'var(--mbc-track-label-tight)',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {quarter.label}
                </span>
                <textarea
                  value={goal.q[quarter.key]}
                  rows={3}
                  placeholder="One sentence."
                  onChange={(event) => writeNote(goal, quarter.key, event.target.value)}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    background: 'var(--surface-field)',
                    border: '1px solid var(--mbc-border-panel)',
                    borderRadius: 'var(--mbc-radius-input)',
                    padding: '11px 13px',
                    font: '400 14px/1.55 var(--mbc-font-sans)',
                    color: 'var(--text-heading)',
                  }}
                />
              </label>
            ))}
          </div>
        </Card>
      ))}

      <p style={{ font: '400 13px/1.7 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0, maxWidth: '66ch' }}>
        Five goals, reviewed quarterly. Status cycles through not started, in progress, on track, behind and done —
        there is no score and nothing is ranked.
      </p>
    </div>
  )
}

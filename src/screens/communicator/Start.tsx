import { Button, Card, Eyebrow } from '../../components/ui'
import { formatDate, parseDate } from '../../lib/date'
import type { IssueCheck } from '../../lib/communicator'

/* The front door. An issue is a form the office fills in and four panels that
   assemble from it; before there is an issue the page has to say that, and give
   somebody something to press. Until this existed a site with no issues showed
   one sentence — "Start one" — and no way to. */

const day = (iso: string) => formatDate(parseDate(iso))

export function StartIssue({ serviceDate, calendarCount, onStart }: { serviceDate: string; calendarCount: number; onStart(): void }) {
  return (
    <Card tone="panel" radius="card" pad="clamp(24px, 3vw, 36px)" style={{ display: 'grid', gap: 22, maxWidth: 820 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <Eyebrow>No issue yet</Eyebrow>
        <p style={{ font: '600 clamp(24px, 2.6vw, 30px)/1.2 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)', margin: 0 }}>
          Start the communicator for {day(serviceDate)}
        </p>
        <p style={{ font: '400 16px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '62ch' }}>
          You fill in a short form. The cover, the welcome and contacts, the coming-up and giving page, and the order of worship assemble themselves into one letter sheet, ready to print and fold.
        </p>
      </div>

      <ol style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8, font: '400 16px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '62ch' }}>
        <li>Fill in what is new this week: the series, the sermon, the songs.</li>
        <li>Check the preview. A list tells you what is still blank, and Print stays off while a page is too full.</li>
        <li>Print it: landscape, double-sided, flip on the short edge.</li>
      </ol>

      <p style={{ font: '400 15px/1.65 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0, maxWidth: '62ch' }}>
        It starts with the church’s usual order of worship and the ways to give from Standing content.{' '}
        {calendarCount > 0
          ? `Coming up is filled from the calendar — ${calendarCount} ${calendarCount === 1 ? 'event' : 'events'} in the next three weeks. Remove any that are not ready to announce.`
          : 'The calendar has nothing in the next three weeks, so Coming up starts empty; add lines by hand or pull them in as events are scheduled.'}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Button variant="primary" size="md" onClick={onStart}>
          Start the issue for {day(serviceDate)}
        </Button>
      </div>
    </Card>
  )
}

/** Shown above an issue whose Sunday has passed and when nothing later exists —
    the case after every Sunday, when the page would otherwise open on last week's
    bulletin and look current. */
export function PastIssueNotice({ serviceDate, nextDate, onStart }: { serviceDate: string; nextDate: string; onStart(): void }) {
  return (
    <Card tone="panel" radius="card" pad="16px 22px" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
      <p style={{ font: '400 16px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '60ch' }}>
        <strong style={{ fontWeight: 700 }}>This issue is for {day(serviceDate)}, which has passed.</strong> The next one has not been started.
      </p>
      <Button variant="primary" size="sm" onClick={onStart}>
        Start the issue for {day(nextDate)}
      </Button>
    </Card>
  )
}

/** What is left to fill in, as a list the office can work down. Advice, not a lock. */
export function BeforePrint({ checks, onGo }: { checks: IssueCheck[]; onGo(section: IssueCheck['section']): void }) {
  const todo = checks.filter((check) => !check.ok)
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' }}>Before you print</span>
      {todo.length === 0 ? (
        <p role="status" style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
          Nothing is left to fill in. Look over the preview, then print.
        </p>
      ) : (
        <>
          <p role="status" style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
            {todo.length === 1 ? '1 thing is' : `${todo.length} things are`} still to do:
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
            {todo.map((check) => (
              <li key={check.key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '2px 12px', borderBottom: '1px solid var(--border-hairline)', padding: '6px 0' }}>
                <span style={{ font: '400 15px/1.5 var(--mbc-font-sans)', color: 'var(--text-heading)', flex: '1 1 220px' }}>{check.todo}</span>
                <button
                  type="button"
                  onClick={() => onGo(check.section)}
                  style={{ background: 'none', border: 'none', padding: '0 4px', minHeight: 44, font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer' }}
                >
                  Go to it
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

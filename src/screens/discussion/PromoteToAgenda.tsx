import { Button } from '../../components/ui'
import { useMeetings } from '../../data/meetings/store'
import { useStore } from '../../data/store'
import { agendaFor, currentMeeting } from '../../data/meetings/derive'
import { formatShort, parseDate, startOfToday, todayIso } from '../../lib/date'
import type { Post } from '../../data/types'

/* The Board's room forgets like the staff's. What became business goes on the
   next meeting's agenda as new business — a record, which does not forget.
   Only the subject line travels; the agenda item is a pointer to a
   conversation, not a copy of it. */
export function PromoteToAgenda({ post, onDone }: { post: Post; onDone(): void }) {
  const { data, addAgendaItem } = useMeetings()
  const { say } = useStore()
  const candidate = data ? currentMeeting(data.meetings, startOfToday()) : null
  const next = candidate && candidate.status === 'planned' && candidate.meetsOn >= todayIso() ? candidate : null

  if (!data || !next) {
    return (
      <p style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
        There is no upcoming meeting to put it on yet.
      </p>
    )
  }
  if (next.agendaLockedAt) {
    return (
      <p style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
        The agenda for {formatShort(parseDate(next.meetsOn))} is locked. It can be raised from the floor as new business.
      </p>
    )
  }

  const title = post.body.length > 120 ? post.body.slice(0, 117).trimEnd() + '…' : post.body
  const put = async () => {
    const position = agendaFor(data.agenda, next).length + 1
    await addAgendaItem({ meetingId: next.id, position, title, source: 'new_business', sourceRef: '', notes: '' })
    say('On the agenda for ' + formatShort(parseDate(next.meetsOn)) + ' as new business.')
    onDone()
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      <Button variant="outline" size="sm" onClick={() => void put()}>
        Put it on the {formatShort(parseDate(next.meetsOn))} agenda
      </Button>
    </div>
  )
}

import { Card, Eyebrow } from '../ui'
import { useSession } from '../../session/session'
import { bodyName } from '../../screens/surfaces'
import type { Surface } from '../../screens/surfaces'

/* The one exception to absence-not-greyed-out, and it is confined to view-as.

   Outside view-as a surface a person cannot open is not rendered, not
   disabled and not dimmed. In view-as the question being asked is about
   somebody *else's* access — "what can the Family Assistance men open?" — and
   a truthful answer has to name the room. So the seat's surface appears in
   the sidebar and opens to this panel, which says whose door it is and shows
   nothing of what is behind it. The rows on this site stay the
   administrator's own; RLS has not been consulted differently, because the
   preview never reaches a query. */

export function Stub({ surface }: { surface: Surface }) {
  const { bodies, previewSeat } = useSession()
  const missing = surface.bodies.filter((slug) => !bodies.includes(slug)).map(bodyName)
  const reason = surface.bothSides
    ? 'you do not hold both sides'
    : missing.length === 1
      ? `you are not a member of the ${missing[0]}`
      : `you are not a member of ${missing.join(' or ')}`

  return (
    <Card radius="card" pad={28} style={{ maxWidth: '72ch', display: 'grid', gap: 14 }}>
      <Eyebrow size="sm">Viewing as — {previewSeat?.label}</Eyebrow>
      <p style={{ font: '400 17px/1.6 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>
        {surface.title}. This seat has this surface. Its contents are not shown here — {reason}.
      </p>
      <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
        View-as shows the shape of a seat’s access — the surfaces it can open — and never another person’s records.
        What you read on this site is still your own, on every screen, and nothing here changes what the database returns.
      </p>
    </Card>
  )
}

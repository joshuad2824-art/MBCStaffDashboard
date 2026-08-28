import { Card, Eyebrow, Rule } from '../components/ui'

/* Phases two through five are not built yet. Their records already exist and
   Today already counts them, so this page says exactly where the surface stands
   rather than pretending it is missing. */

export function ComingLater({
  phase,
  what,
  holding,
}: {
  phase: string
  what: string
  holding: string
}) {
  return (
    <Card tone="panel" pad="clamp(28px,3vw,44px)" style={{ maxWidth: 680, display: 'grid', gap: 16 }}>
      <Eyebrow>{phase}</Eyebrow>
      <p style={{ font: '600 24px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>{what}</p>
      <Rule />
      <p style={{ font: '400 15px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>{holding}</p>
    </Card>
  )
}

export const NoticeLog = () => (
  <ComingLater
    phase="Phase two"
    what="The notice log is next."
    holding="Twelve decisions are already recorded, and Today is counting the ones nobody has announced yet. What lands here is the gap in days, the median by month, and the standard for each category."
  />
)

export const Communicator = () => (
  <ComingLater
    phase="Phase four"
    what="The communicator gets ported in after the pastoral layer."
    holding="It works today as a standalone file. Bringing it in moves the weeks into the database, reads Coming Up from the same events the calendar shows, and writes a notification date for every event an issue carries when it is published."
  />
)

export const CarePipelines = () => (
  <ComingLater
    phase="Phase three"
    what="Care pipelines wait until the Huddle has been in weekly use."
    holding="Seven entries are already recorded and their response windows show on the calendar and in the rail. The surface itself is deliberately last of the three, because it is the one that must not be built casually: it is staff-role only, enforced in the database, and it never shares a table with the member-facing site."
  />
)

export const Goals = () => (
  <ComingLater
    phase="Phase five"
    what="Goals come last, and stay small."
    holding="Five annual goals are recorded with their owners and targets. The surface is a status you cycle and one sentence per quarter — narrative, not metrics."
  />
)

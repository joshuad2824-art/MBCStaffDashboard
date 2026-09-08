import { Card, Eyebrow, Rule } from '../components/ui'

/* Phase three is not built yet. Its records already exist and Today already
   counts them, so this page says exactly where the surface stands rather than
   pretending it is missing. */

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

export const CarePipelines = () => (
  <ComingLater
    phase="Phase three"
    what="Care pipelines wait until the Huddle has been in weekly use."
    holding="Seven entries are already recorded and their response windows show on the calendar and in the rail. The surface itself is deliberately last of the three, because it is the one that must not be built casually: it is staff-role only, enforced in the database, and it never shares a table with the member-facing site."
  />
)

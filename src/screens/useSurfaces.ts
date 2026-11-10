import { useCallback, useMemo } from 'react'
import { useSession } from '../session/session'
import { SURFACES, surfacesFor } from './surfaces'
import type { Surface, Viewer } from './surfaces'

/** The viewer the interface is drawn for, from the session. The router, the
    pill and every in-page link ask about the same one. */
export function useViewer(): Viewer {
  const { bodies, viewAs, sides, context, previewSeat, access, admin } = useSession()
  return useMemo(() => ({ bodies, viewAs, sides, context, previewSeat, access, admin }), [bodies, viewAs, sides, context, previewSeat, access, admin])
}

/** The surfaces this person may open — what the router has routes for. */
export function useOpenSurfaces(): Surface[] {
  const viewer = useViewer()
  return useMemo(() => surfacesFor(viewer), [viewer])
}

/** Whether a link to a surface (by its SURFACES key) would land. A tile,
    counter or button that opens a surface asks this first and is not drawn
    when the answer is no — so switching a page off can never leave an orphan
    pointing at a route that refuses (home brief §1.3). */
export function useCanOpen(): (key: string) => boolean {
  const open = useOpenSurfaces()
  return useCallback((key: string) => {
    const surface = SURFACES[key]
    return Boolean(surface) && open.includes(surface)
  }, [open])
}

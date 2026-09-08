import { useCallback, useEffect, useRef, useState } from 'react'
import { PANEL_HEIGHT_IN, PANELS } from './Sheet'
import type { PanelKey } from './Sheet'

/* The guard is what makes this safe to hand to a staff member who has never
   opened Canva: while any panel is over its 8.5 inches the print button is gone
   and the panel says by how much.

   It measures the rendered panel rather than counting lines. A hidden copy of
   each panel is laid out with no height ceiling and its real height compared to
   8.5in, so what the guard checks is the same markup the printer receives. */

const DPI = 96
export const PANEL_HEIGHT_PX = PANEL_HEIGHT_IN * DPI

export interface PanelFit {
  key: PanelKey
  name: string
  page: string
  short: string
  height: number
  fits: boolean
  /** How far past the page it runs, in inches, when it does not fit. */
  overIn: number
  fillPercent: number
}

export function useFitGuard(dependencies: unknown[]): {
  refs: Record<PanelKey, (node: HTMLDivElement | null) => void>
  fits: PanelFit[]
  anyOver: boolean
} {
  const nodes = useRef<Partial<Record<PanelKey, HTMLDivElement>>>({})
  const [heights, setHeights] = useState<Partial<Record<PanelKey, number>>>({})

  const measure = useCallback(() => {
    const next: Partial<Record<PanelKey, number>> = {}
    for (const panel of PANELS) {
      const node = nodes.current[panel.key]
      if (node) next[panel.key] = node.getBoundingClientRect().height
    }
    setHeights((current) => {
      const changed = PANELS.some((panel) => Math.abs((current[panel.key] ?? 0) - (next[panel.key] ?? 0)) > 0.5)
      return changed ? next : current
    })
  }, [])

  // Fonts land after first paint and change every measurement on the page.
  useEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    for (const panel of PANELS) {
      const node = nodes.current[panel.key]
      if (node) observer.observe(node)
    }
    document.fonts?.ready.then(measure).catch(() => undefined)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...dependencies])

  const refs = Object.fromEntries(
    PANELS.map((panel) => [
      panel.key,
      (node: HTMLDivElement | null) => {
        if (node) nodes.current[panel.key] = node
        else delete nodes.current[panel.key]
      },
    ]),
  ) as Record<PanelKey, (node: HTMLDivElement | null) => void>

  const fits: PanelFit[] = PANELS.map((panel) => {
    const height = heights[panel.key] ?? 0
    const over = height - PANEL_HEIGHT_PX
    return {
      ...panel,
      height,
      // Nothing is over until it has actually been measured.
      fits: height === 0 || over <= 0,
      overIn: over > 0 ? Math.round((over / DPI) * 100) / 100 : 0,
      fillPercent: height === 0 ? 0 : Math.min(100, Math.round((height / PANEL_HEIGHT_PX) * 100)),
    }
  })

  return { refs, fits, anyOver: fits.some((panel) => !panel.fits) }
}

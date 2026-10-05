import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/* Display size — for the same screens on a phone, a monitor, and a wall.

   The interface is drawn in CSS pixels, which is right for a desk and wrong for
   a room: on a 4K television the whole dashboard is a postage stamp. The fix a
   presenter would reach for is the browser's zoom, and this is that, made
   findable and remembered: one scale applied to the whole page with CSS `zoom`.

   Three things follow from it, and each is handled once, here and in
   global.css, rather than in every screen.

   - Media queries do not see element zoom. A 1280px laptop at Wall size lays
     out like a 710px page but still answers "wide", so "is this narrow?" is
     asked through `useNarrow()`, which divides the real width by the scale.
   - `100vh` and `100vw` are multiplied by the zoom. Anything that means "the
     height of the screen" says `var(--ui-vh)` instead.
   - Fixed layers (present mode, drawers) keep filling the real screen on their
     own, and printing is reset to 1 in global.css.

   Auto steps up only on screens that are unambiguously large. A 1920×1080 panel
   could be a desk monitor or a projector and the page cannot tell which, so the
   person at the keyboard says. This is a view setting, kept in this browser. It
   decides nothing about what anyone may read. */

export type DisplaySize = 'auto' | 'standard' | 'large' | 'wall'

export const DISPLAY_CHOICES: { key: DisplaySize; label: string; hint: string }[] = [
  { key: 'auto', label: 'Auto', hint: 'by screen size' },
  { key: 'standard', label: 'Normal', hint: 'desk or laptop' },
  { key: 'large', label: 'Large', hint: 'projector or TV' },
  { key: 'wall', label: 'Wall', hint: 'far from the screen' },
]

const STEPS = { standard: 1, large: 1.35, wall: 1.8 } as const
const KEY = 'mbc.dashboard.display'

/** Below this effective width the sidebar becomes a menu and grids go to one column. */
export const NARROW_PX = 900

function autoScale(width: number): number {
  if (width >= 3000) return 2
  if (width >= 2300) return 1.5
  return 1
}

function readChoice(): DisplaySize {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw === 'standard' || raw === 'large' || raw === 'wall' || raw === 'auto' ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

interface DisplayValue {
  choice: DisplaySize
  setChoice(next: DisplaySize): void
  /** The multiplier in force. */
  scale: number
  /** The width the layout actually has: the screen's, divided by the scale. */
  width: number
}

const DisplayContext = createContext<DisplayValue>({ choice: 'auto', setChoice: () => undefined, scale: 1, width: 1280 })

export function DisplayScaleProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<DisplaySize>(readChoice)
  const [screen, setScreen] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setScreen(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const scale = choice === 'auto' ? autoScale(screen) : STEPS[choice]

  useEffect(() => {
    const root = document.documentElement
    root.style.zoom = scale === 1 ? '' : String(scale)
    root.style.setProperty('--ui-zoom', String(scale))
    return () => {
      root.style.zoom = ''
      root.style.removeProperty('--ui-zoom')
    }
  }, [scale])

  const value = useMemo<DisplayValue>(
    () => ({
      choice,
      scale,
      width: screen / scale,
      setChoice: (next) => {
        setChoiceState(next)
        try {
          window.localStorage.setItem(KEY, next)
        } catch {
          // Remembered for this tab only.
        }
      },
    }),
    [choice, scale, screen],
  )

  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>
}

export function useDisplayScale(): DisplayValue {
  return useContext(DisplayContext)
}

/** True when the layout has phone or tablet-portrait room, whatever the scale. */
export function useNarrow(): boolean {
  return useDisplayScale().width <= NARROW_PX
}

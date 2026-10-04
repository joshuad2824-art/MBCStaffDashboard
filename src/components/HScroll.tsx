import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/* A table that is wider than its room scrolls sideways, and says so. The hint
   appears only when there is something to scroll — a monitor never sees it, a
   phone always does — and the region takes the keyboard when it does, so a
   person who cannot swipe can still reach every column. */
export function HScroll({ minWidth, label, children }: { minWidth: number; label: string; children: ReactNode }) {
  const region = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const el = region.current
    if (!el) return
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 2)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {overflowing ? (
        <p style={{ font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0, padding: '12px 18px', borderBottom: '1px solid var(--border-hairline)' }}>
          This table is wider than the screen. Swipe sideways to see every column.
        </p>
      ) : null}
      <div
        ref={region}
        style={{ overflowX: 'auto' }}
        {...(overflowing ? { tabIndex: 0, role: 'region', 'aria-label': label } : null)}
      >
        <div style={{ minWidth }}>{children}</div>
      </div>
    </>
  )
}

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/* Day and after dark. A view setting like Display size: it is kept in this
   browser and decides nothing about what anyone may read. Automatic turns the
   lamps on at seven in the evening and off at six in the morning. The
   evening palette is the MBC Students' Night ground, already contrast-checked;
   theme.css applies it to the screen only, so nothing ever prints dark. */

export type Appearance = 'auto' | 'day' | 'evening'

export const APPEARANCE_CHOICES: { key: Appearance; label: string }[] = [
  { key: 'auto', label: 'Automatic — evening after 7 PM' },
  { key: 'day', label: 'Always day' },
  { key: 'evening', label: 'Always evening' },
]

const KEY = 'mbc.dashboard.appearance'

function readChoice(): Appearance {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw === 'day' || raw === 'evening' || raw === 'auto' ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

export function isEveningHour(date: Date): boolean {
  const hour = date.getHours()
  return hour >= 19 || hour < 6
}

interface ThemeValue {
  choice: Appearance
  setChoice(next: Appearance): void
  evening: boolean
}

const ThemeContext = createContext<ThemeValue>({ choice: 'auto', setChoice: () => undefined, evening: false })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<Appearance>(readChoice)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const evening = choice === 'evening' || (choice === 'auto' && isEveningHour(now))

  useEffect(() => {
    document.documentElement.dataset.theme = evening ? 'evening' : 'day'
  }, [evening])

  const setChoice = (next: Appearance) => {
    setChoiceState(next)
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      /* A private window keeps the choice for this visit only. */
    }
  }

  return <ThemeContext.Provider value={{ choice, setChoice, evening }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext)
}

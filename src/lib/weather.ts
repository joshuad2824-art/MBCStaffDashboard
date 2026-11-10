import { useEffect, useState } from 'react'
import { addDays, startOfToday, toIso } from './date'
import type { ForecastDay, WeatherAlert, WeatherNow, WeatherPayload } from './weatherFeed'

export type { ForecastDay, WeatherAlert, WeatherNow } from './weatherFeed'
export { describeCode } from './weatherFeed'

/* Weather for Home (home brief §2.3). The sources are asked by the `weather`
   Netlify function, behind its cache, never from the browser: Home is left
   open all day in every office. Every tab polls the function every two minutes
   while it is visible — the alerts' lifetime — and the CDN answers almost all
   of those without the function running.

   Where the function is not there (`npm run dev` without `netlify dev`) or the
   forecast cannot be had, the seeded week below stands in, and it is labelled
   as seed rather than passed off as live. A seeded week carries no alerts and
   claims nothing about them. */

/** Where the Weather tile and the severe-weather band go. One constant. */
export const WEATHER_URL = 'https://weather.com/us/oklahoma/city/tulsa/today'

const ENDPOINT = '/.netlify/functions/weather'
const POLL_MS = 2 * 60 * 1000

export type ForecastState = 'loading' | 'live' | 'seed'

export interface Weather {
  now: WeatherNow | null
  days: ForecastDay[]
  alerts: WeatherAlert[]
  /** Whether the alerts were checked at all. A seed, or an NWS outage, is not. */
  alertsChecked: boolean
  state: ForecastState
}

const SEED_WEEK: Omit<ForecastDay, 'date'>[] = [
  { high: 73, low: 48, condition: 'Partly cloudy', precipitation: 0 },
  { high: 65, low: 50, condition: 'Overcast', precipitation: 10 },
  { high: 58, low: 45, condition: 'Rain', precipitation: 70 },
  { high: 61, low: 40, condition: 'Mostly clear', precipitation: 5 },
  { high: 55, low: 38, condition: 'Clear', precipitation: 0 },
  { high: 59, low: 41, condition: 'Partly cloudy', precipitation: 10 },
  { high: 63, low: 44, condition: 'Clear', precipitation: 0 },
]

function seed(state: ForecastState): Weather {
  const today = startOfToday()
  return {
    now: null,
    days: SEED_WEEK.map((day, index) => ({ ...day, date: toIso(addDays(today, index)) })),
    alerts: [],
    alertsChecked: false,
    state,
  }
}

/* One poll for the whole page, however many tiles read it. */
let current: Weather = seed('loading')
const listeners = new Set<(weather: Weather) => void>()
let timer: number | null = null
let inFlight = false

function publish(next: Weather) {
  current = next
  listeners.forEach((listener) => listener(next))
}

async function refresh() {
  if (inFlight) return
  inFlight = true
  try {
    const response = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } })
    const type = response.headers.get('Content-Type') ?? ''
    if (!response.ok || !type.includes('json')) throw new Error('Weather unavailable')
    const payload = (await response.json()) as WeatherPayload
    if (!Array.isArray(payload.days) || payload.days.length === 0) throw new Error('No forecast')
    publish({ now: payload.now, days: payload.days, alerts: payload.alerts ?? [], alertsChecked: Boolean(payload.alertsChecked), state: 'live' })
  } catch {
    // Keep a live answer already on screen; fall back to the seed only if
    // there has never been one.
    if (current.state !== 'live') publish(seed('seed'))
  } finally {
    inFlight = false
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') void refresh()
}

function start() {
  void refresh()
  timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') void refresh()
  }, POLL_MS)
  document.addEventListener('visibilitychange', onVisible)
}

function stop() {
  if (timer !== null) window.clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', onVisible)
}

export function useWeather(): Weather {
  const [weather, setWeather] = useState<Weather>(current)
  useEffect(() => {
    listeners.add(setWeather)
    if (listeners.size === 1) start()
    setWeather(current)
    return () => {
      listeners.delete(setWeather)
      if (listeners.size === 0) stop()
    }
  }, [])
  return weather
}

/** Ticks every twenty seconds off the client's own clock. */
export function useClock(): string {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })), 20000)
    return () => window.clearInterval(id)
  }, [])
  return time
}

/** "5:45 PM", in the browser's own zone — Tulsa, for everyone who uses this. */
export function untilTime(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

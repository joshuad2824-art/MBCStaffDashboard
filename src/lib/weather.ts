import { useEffect, useState } from 'react'
import { CHURCH } from '../data/seed'
import { addDays, startOfToday, toIso } from './date'

/* Open-Meteo, no API key. This screen is meant to be left up on a monitor, so
   in production the fetch belongs on the server behind a ~30 minute cache
   rather than running in every open tab. The seeded week below is the fallback,
   and it is labelled as seed rather than passed off as live. */

const ENDPOINT =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=' +
  CHURCH.latitude +
  '&longitude=' +
  CHURCH.longitude +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  '&temperature_unit=fahrenheit&timezone=' +
  CHURCH.timezone +
  '&forecast_days=7'

export interface ForecastDay {
  date: string
  high: number
  low: number
  condition: string
  precipitation: number
}

export type ForecastState = 'loading' | 'live' | 'seed'

/** WMO weather codes in words. There is no icon set in this brand. */
export function describeCode(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 55) return 'Drizzle'
  if (code >= 61 && code <= 65) return 'Rain'
  if (code >= 71 && code <= 75) return 'Snow'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code >= 95) return 'Thunderstorms'
  return 'Mixed'
}

const SEED_WEEK: Omit<ForecastDay, 'date'>[] = [
  { high: 94, low: 73, condition: 'Clear', precipitation: 0 },
  { high: 96, low: 75, condition: 'Mostly clear', precipitation: 5 },
  { high: 93, low: 74, condition: 'Partly cloudy', precipitation: 20 },
  { high: 88, low: 71, condition: 'Thunderstorms', precipitation: 60 },
  { high: 85, low: 68, condition: 'Showers', precipitation: 45 },
  { high: 87, low: 67, condition: 'Partly cloudy', precipitation: 10 },
  { high: 90, low: 69, condition: 'Clear', precipitation: 0 },
]

function seedForecast(): ForecastDay[] {
  const today = startOfToday()
  return SEED_WEEK.map((day, index) => ({ ...day, date: toIso(addDays(today, index)) }))
}

interface Payload {
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: (number | null)[]
  }
}

export function useForecast(): { days: ForecastDay[]; state: ForecastState } {
  const [days, setDays] = useState<ForecastDay[]>(seedForecast)
  const [state, setState] = useState<ForecastState>('loading')

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    fetch(ENDPOINT, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Forecast unavailable')
        return response.json() as Promise<Payload>
      })
      .then((payload) => {
        if (cancelled) return
        const daily = payload.daily
        setDays(
          daily.time.map((date, index) => ({
            date,
            high: Math.round(daily.temperature_2m_max[index]),
            low: Math.round(daily.temperature_2m_min[index]),
            condition: describeCode(daily.weather_code[index]),
            precipitation: daily.precipitation_probability_max[index] ?? 0,
          })),
        )
        setState('live')
      })
      .catch(() => {
        if (!cancelled) setState('seed')
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return { days, state }
}

/** Ticks every twenty seconds off the client's own clock. */
export function useClock(): string {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  )
  useEffect(() => {
    const id = window.setInterval(
      () => setTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })),
      20000,
    )
    return () => window.clearInterval(id)
  }, [])
  return time
}

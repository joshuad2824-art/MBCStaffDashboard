/* The weather feed: what the `weather` Netlify function fetches, how it reads
   the answers, and the one payload it returns. Pure — no imports, no fetch, no
   clock of its own — so the function, the browser and the test all read the
   same shape from the same file (home brief §2.3).

   Two sources, neither needing a key:
   - Open-Meteo for the conditions now and the days ahead;
   - the National Weather Service for active watches and warnings in Tulsa
     County. Only a watch or a warning interrupts Home; advisories and
     statements do not. */

/** Memorial Baptist, 2800 South Yale. Matches CHURCH in data/seed.ts. */
export const TULSA = {
  latitude: 36.1539,
  longitude: -95.9928,
  timezone: 'America/Chicago',
  /** NWS zones: Tulsa County (OKC143), where warnings are issued, and the
      Tulsa forecast zone (OKZ060), where watches and winter products are. */
  zones: ['OKC143', 'OKZ060'],
} as const

export const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${TULSA.latitude}&longitude=${TULSA.longitude}` +
  '&current=temperature_2m,weather_code' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  `&temperature_unit=fahrenheit&timezone=${encodeURIComponent(TULSA.timezone)}&forecast_days=7`

export const NWS_ALERTS_URL = `https://api.weather.gov/alerts/active?zone=${TULSA.zones.join(',')}`

export interface ForecastDay {
  /** YYYY-MM-DD, in Tulsa. */
  date: string
  high: number
  low: number
  condition: string
  precipitation: number
}

export interface WeatherNow {
  temperature: number
  condition: string
}

export interface WeatherAlert {
  id: string
  /** The NWS event name, as issued: "Tornado Warning". */
  event: string
  kind: 'warning' | 'watch'
  headline: string
  /** ISO timestamp the alert ends or expires, whichever the NWS gives. */
  until: string | null
}

export interface WeatherPayload {
  now: WeatherNow | null
  days: ForecastDay[]
  /** Active watches and warnings, the most serious first. */
  alerts: WeatherAlert[]
  /** False when the NWS could not be reached: "no alerts" would then be a
      guess, and the screen does not say it. */
  alertsChecked: boolean
  /** When each half was fetched from its source, ISO. */
  forecastAt: string
  alertsAt: string | null
}

/** WMO weather codes in words. There is no icon set in this brand. */
export function describeCode(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code === 85 || code === 86) return 'Snow showers'
  if (code >= 95) return 'Thunderstorms'
  return 'Mixed'
}

interface OpenMeteoAnswer {
  current?: { temperature_2m?: number | null; weather_code?: number | null }
  daily?: {
    time?: string[]
    weather_code?: (number | null)[]
    temperature_2m_max?: (number | null)[]
    temperature_2m_min?: (number | null)[]
    precipitation_probability_max?: (number | null)[]
  }
}

/** Open-Meteo's answer as the payload's forecast half. Throws when the answer
    has no days, so the function reports a failure rather than an empty week. */
export function readForecast(answer: unknown): { now: WeatherNow | null; days: ForecastDay[] } {
  const body = (answer ?? {}) as OpenMeteoAnswer
  const daily = body.daily
  const time = daily?.time ?? []
  if (!daily || time.length === 0) throw new Error('Open-Meteo returned no days')
  const days: ForecastDay[] = []
  time.forEach((date, i) => {
    const high = daily.temperature_2m_max?.[i]
    const low = daily.temperature_2m_min?.[i]
    if (typeof high !== 'number' || typeof low !== 'number') return
    days.push({
      date,
      high: Math.round(high),
      low: Math.round(low),
      condition: describeCode(daily.weather_code?.[i] ?? -1),
      precipitation: daily.precipitation_probability_max?.[i] ?? 0,
    })
  })
  if (days.length === 0) throw new Error('Open-Meteo returned no usable days')
  const t = body.current?.temperature_2m
  const now = typeof t === 'number' ? { temperature: Math.round(t), condition: describeCode(body.current?.weather_code ?? -1) } : null
  return { now, days }
}

interface NwsFeature {
  id?: string
  properties?: {
    id?: string
    event?: string
    headline?: string | null
    status?: string
    messageType?: string
    ends?: string | null
    expires?: string | null
  }
}

/** How serious an event is, for ordering: a tornado warning before a flood
    watch. The NWS's own `severity` field is too coarse for this (a severe
    thunderstorm warning and a winter storm warning are both "Severe"). */
function rank(alert: WeatherAlert): number {
  const life = /tornado|extreme wind|flash flood emergency/i.test(alert.event) ? 0 : /severe thunderstorm|flash flood/i.test(alert.event) ? 1 : 2
  return (alert.kind === 'warning' ? 0 : 10) + life
}

/** The NWS's active alerts as the payload's alerts half: actual watches and
    warnings that have not yet ended, the most serious first. `now` is passed
    in so the reading is testable. */
export function readAlerts(answer: unknown, now: number): WeatherAlert[] {
  const features = ((answer ?? {}) as { features?: NwsFeature[] }).features ?? []
  const byEvent = new Map<string, WeatherAlert>()
  for (const feature of features) {
    const p = feature.properties
    if (!p?.event) continue
    if (p.status && p.status !== 'Actual') continue
    if (p.messageType === 'Cancel') continue
    const kind = /warning$/i.test(p.event.trim()) ? 'warning' : /watch$/i.test(p.event.trim()) ? 'watch' : null
    if (!kind) continue
    const until = p.ends ?? p.expires ?? null
    if (until && Date.parse(until) <= now) continue
    // Two zones can carry the same alert, and an update can repeat an event.
    // One line per event name is all Home needs, running to the latest end.
    const event = p.event.trim()
    const earlier = byEvent.get(event)
    if (earlier) {
      if (until && (!earlier.until || Date.parse(until) > Date.parse(earlier.until))) earlier.until = until
      continue
    }
    byEvent.set(event, { id: p.id ?? feature.id ?? event, event, kind, headline: (p.headline ?? event).trim(), until })
  }
  return [...byEvent.values()].sort((a, b) => rank(a) - rank(b))
}

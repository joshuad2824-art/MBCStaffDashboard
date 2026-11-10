import { NWS_ALERTS_URL, OPEN_METEO_URL, readAlerts, readForecast } from '../../src/lib/weatherFeed'
import type { ForecastDay, WeatherAlert, WeatherNow, WeatherPayload } from '../../src/lib/weatherFeed'

/* weather — Home's forecast and Tulsa County's watches and warnings, in one
   payload (home brief §2.3). Home is left open all day in every office, so the
   sources are asked from here, behind a cache, and never from each tab.

   Two lifetimes. The forecast keeps thirty minutes; the alerts keep two, because
   a tornado warning on a Wednesday afternoon decides whether the evening goes
   ahead. The CDN holds the combined answer for the shorter of the two, and a
   warm instance keeps each half in memory for its own lifetime, so most CDN
   misses ask Open-Meteo nothing at all.

   If the forecast cannot be had, the function says so (502) and the browser
   falls back to its seeded week, labelled as seed. If only the NWS fails, the
   forecast still goes out with `alertsChecked: false`, and Home claims nothing
   about alerts it could not check. No key, no secret, nothing personal is
   sent to either service. */

const FORECAST_MS = 30 * 60 * 1000
const ALERTS_MS = 2 * 60 * 1000
const TIMEOUT_MS = 8000

/* The NWS asks every client to identify itself. A generic name, not a person. */
const NWS_HEADERS = { 'User-Agent': '(church staff dashboard, weather tile)', Accept: 'application/geo+json' }

let forecast: { at: number; now: WeatherNow | null; days: ForecastDay[] } | null = null
let alerts: { at: number; list: WeatherAlert[] } | null = null

async function getJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`)
  return response.json()
}

export default async function handler(): Promise<Response> {
  const now = Date.now()

  const forecastFresh = forecast && now - forecast.at < FORECAST_MS
  const alertsFresh = alerts && now - alerts.at < ALERTS_MS

  const [forecastResult, alertsResult] = await Promise.allSettled([
    forecastFresh ? Promise.resolve(forecast!) : getJson(OPEN_METEO_URL).then((answer) => ({ at: now, ...readForecast(answer) })),
    alertsFresh ? Promise.resolve(alerts!) : getJson(NWS_ALERTS_URL, NWS_HEADERS).then((answer) => ({ at: now, list: readAlerts(answer, now) })),
  ])

  if (forecastResult.status === 'fulfilled') forecast = forecastResult.value
  if (alertsResult.status === 'fulfilled') alerts = alertsResult.value

  // A forecast a little past its thirty minutes is still better than none;
  // an alert list past its two minutes is not, so it is never served stale.
  if (!forecast) {
    return json({ error: 'The forecast is unavailable.' }, 502, 'no-store')
  }

  const alertsChecked = alertsResult.status === 'fulfilled'
  const payload: WeatherPayload = {
    now: forecast.now,
    days: forecast.days,
    alerts: alertsChecked && alerts ? alerts.list : [],
    alertsChecked,
    forecastAt: new Date(forecast.at).toISOString(),
    alertsAt: alertsChecked && alerts ? new Date(alerts.at).toISOString() : null,
  }

  // When the NWS was not reached, cache only briefly so the next ask tries again.
  return json(payload, 200, alertsChecked ? 'public, durable, s-maxage=120, stale-while-revalidate=30' : 'public, s-maxage=20')
}

function json(body: unknown, status: number, cdn: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
      'Netlify-CDN-Cache-Control': cdn,
    },
  })
}

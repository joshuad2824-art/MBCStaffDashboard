import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { readAlerts, readForecast } from '../src/lib/weatherFeed.ts'

/* The weather feed (home brief §2.3). No network: the readers are given
   answers shaped like Open-Meteo's and the NWS's, and the function runs against
   a stubbed fetch and a stubbed clock, so the two cache lifetimes and both
   failure paths are checked without asking either service anything. */

const OPEN_METEO = {
  current: { temperature_2m: 59.6, weather_code: 2 },
  daily: {
    time: ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'],
    weather_code: [2, 3, 61, 95, 0],
    temperature_2m_max: [72.6, 65.1, 58.4, 61, 55],
    temperature_2m_min: [48.2, 50, 44.9, 40, 38],
    precipitation_probability_max: [0, 10, 70, 55, null],
  },
}

const NOW = Date.parse('2026-11-10T21:00:00Z')
const LATER = '2026-11-10T23:45:00Z'
const EARLIER = '2026-11-10T20:00:00Z'

const feature = (props) => ({ properties: { status: 'Actual', messageType: 'Alert', ...props } })

const NWS = {
  features: [
    feature({ id: 'a1', event: 'Severe Thunderstorm Watch', headline: 'Severe Thunderstorm Watch until 9 PM', expires: LATER }),
    feature({ id: 'a2', event: 'Wind Advisory', headline: 'Wind Advisory', expires: LATER }),
    feature({ id: 'a3', event: 'Tornado Warning', headline: 'Tornado Warning until 5:45 PM', ends: '2026-11-10T22:45:00Z', expires: LATER }),
    feature({ id: 'a4', event: 'Tornado Warning', headline: 'Tornado Warning continued', ends: LATER }),
    feature({ id: 'a5', event: 'Flood Warning', headline: 'Flood Warning', expires: EARLIER }),
    feature({ id: 'a6', event: 'Winter Storm Warning', status: 'Test', expires: LATER }),
    feature({ id: 'a7', event: 'Flash Flood Warning', messageType: 'Cancel', expires: LATER }),
    feature({ id: 'a8', event: 'Special Weather Statement', expires: LATER }),
  ],
}

test('the forecast reads in whole degrees and in words', () => {
  const { now, days } = readForecast(OPEN_METEO)
  assert.deepEqual(now, { temperature: 60, condition: 'Partly cloudy' })
  assert.equal(days.length, 5)
  assert.deepEqual(days[0], { date: '2026-11-10', high: 73, low: 48, condition: 'Partly cloudy', precipitation: 0 })
  assert.equal(days[2].condition, 'Rain')
  assert.equal(days[3].condition, 'Thunderstorms')
  assert.equal(days[4].precipitation, 0, 'a missing chance of rain reads as none')
})

test('a forecast with no days is a failure, not an empty week', () => {
  assert.throws(() => readForecast({ daily: { time: [] } }))
  assert.throws(() => readForecast(null))
})

test('only live watches and warnings come through, the most serious first', () => {
  const alerts = readAlerts(NWS, NOW)
  assert.deepEqual(
    alerts.map((alert) => alert.event),
    ['Tornado Warning', 'Severe Thunderstorm Watch'],
    'advisories, statements, tests, cancellations and expired alerts are dropped',
  )
  assert.equal(alerts[0].kind, 'warning')
  assert.equal(alerts[1].kind, 'watch')
  assert.equal(alerts[0].until, LATER, 'a repeated event runs to its latest end')
})

test('no features is no alerts', () => {
  assert.deepEqual(readAlerts({ features: [] }, NOW), [])
  assert.deepEqual(readAlerts({}, NOW), [])
})

/* --------------------------------------------------------------- the function */

async function loadHandler() {
  const result = await build({
    entryPoints: ['netlify/functions/weather.mts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
  })
  const code = result.outputFiles[0].text
  // A fresh module each time, so each test starts with an empty cache.
  return (await import('data:text/javascript;base64,' + Buffer.from(code + `\n// ${Math.random()}`).toString('base64'))).default
}

function stub({ meteo = () => OPEN_METEO, nws = () => NWS } = {}) {
  const calls = { meteo: 0, nws: 0 }
  let clock = NOW
  const realFetch = globalThis.fetch
  const realNow = Date.now
  globalThis.fetch = async (url) => {
    const host = new URL(url).host
    const answer = host === 'api.open-meteo.com' ? (calls.meteo++, meteo()) : host === 'api.weather.gov' ? (calls.nws++, nws()) : null
    if (answer instanceof Error || answer === null) return new Response('down', { status: 503 })
    return new Response(JSON.stringify(answer), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  Date.now = () => clock
  return {
    calls,
    advance(minutes) {
      clock += minutes * 60 * 1000
    },
    restore() {
      globalThis.fetch = realFetch
      Date.now = realNow
    },
  }
}

test('the function returns one payload and caches each half for its own lifetime', async () => {
  const handler = await loadHandler()
  const env = stub()
  try {
    const first = await handler()
    assert.equal(first.status, 200)
    assert.match(first.headers.get('Netlify-CDN-Cache-Control'), /s-maxage=120/)
    const payload = await first.json()
    assert.equal(payload.now.temperature, 60)
    assert.equal(payload.days.length, 5)
    assert.equal(payload.alertsChecked, true)
    assert.deepEqual(payload.alerts.map((a) => a.event), ['Tornado Warning', 'Severe Thunderstorm Watch'])
    assert.deepEqual(env.calls, { meteo: 1, nws: 1 })

    env.advance(1)
    await handler()
    assert.deepEqual(env.calls, { meteo: 1, nws: 1 }, 'inside two minutes, neither source is asked')

    env.advance(2)
    await handler()
    assert.deepEqual(env.calls, { meteo: 1, nws: 2 }, 'after two minutes, only the alerts are asked again')

    env.advance(30)
    await handler()
    assert.deepEqual(env.calls, { meteo: 2, nws: 3 }, 'after thirty, the forecast too')
  } finally {
    env.restore()
  }
})

test('when the NWS cannot be reached, the forecast still goes out and claims nothing about alerts', async () => {
  const handler = await loadHandler()
  const env = stub({ nws: () => new Error('down') })
  try {
    const response = await handler()
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.alertsChecked, false)
    assert.deepEqual(payload.alerts, [])
    assert.equal(payload.alertsAt, null)
    assert.match(response.headers.get('Netlify-CDN-Cache-Control'), /s-maxage=20/, 'cached only briefly, so the next ask tries again')
  } finally {
    env.restore()
  }
})

test('when the forecast cannot be had, the function says so and caches nothing', async () => {
  const handler = await loadHandler()
  const env = stub({ meteo: () => new Error('down') })
  try {
    const response = await handler()
    assert.equal(response.status, 502)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
  } finally {
    env.restore()
  }
})

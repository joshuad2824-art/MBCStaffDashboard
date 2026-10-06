import { test } from 'node:test'
import assert from 'node:assert/strict'
import { transform } from 'esbuild'
import { readFile } from 'node:fs/promises'
async function ts(path) {
  const { code } = await transform(await readFile(new URL('../' + path, import.meta.url), 'utf8'), { loader: 'ts', format: 'esm' })
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
}
const { createDeviceStorage } = await ts('src/lib/deviceStorage.ts')
const { activationHandler } = await ts('supabase/functions/request-activation-code/core.ts')
function store() {
  const items = new Map()
  return { getItem: k => items.get(k) ?? null, setItem: (k,v) => items.set(k,v), removeItem: k => items.delete(k) }
}
const key = 'sb-test-auth-token'
test('new devices use tab sessions and remembered devices survive a fresh tab', () => {
  const local = store(), tab = store()
  const first = createDeviceStorage(local, tab, key)
  first.storage.setItem(key, 'session')
  assert.equal(local.getItem(key), null)
  assert.equal(createDeviceStorage(local, tab, key).storage.getItem(key), 'session')
  assert.equal(createDeviceStorage(local, store(), key).storage.getItem(key), null)
  first.choose(true)
  assert.equal(tab.getItem(key), null)
  assert.equal(createDeviceStorage(local, store(), key).storage.getItem(key), 'session')
  assert.equal(local.getItem('password'), null)
})
test('turning remember off moves the session out of persistent storage; sign-out forgets both', () => {
  const local = store(), tab = store(), client = createDeviceStorage(local, tab, key)
  client.choose(true); client.storage.setItem(key, 'session'); client.choose(false)
  assert.equal(local.getItem(key), null)
  assert.equal(tab.getItem(key), 'session')
  client.clear()
  assert.equal(client.storage.getItem(key), null)
  assert.equal(createDeviceStorage(local, tab, key).storage.getItem(key), null)
})
test('existing sessions survive the upgrade and refresh replaces their stored tokens', () => {
  const local = store(), tab = store()
  local.setItem(key, 'existing-session')
  const client = createDeviceStorage(local, tab, key)
  assert.equal(client.isRemembered(), true)
  client.storage.setItem(key, 'refreshed-session')
  assert.equal(createDeviceStorage(local, store(), key).storage.getItem(key), 'refreshed-session')
})
test('blocked storage allows the current visit and clearly reports inability to remember', () => {
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') }, removeItem() { throw Error('blocked') } }
  const client = createDeviceStorage(blocked, blocked, key)
  assert.match(client.choose(true), /could not remember/)
  client.storage.setItem(key, 'session')
  assert.equal(client.storage.getItem(key), 'session')
  assert.match(client.notice(), /could not remember/)
  client.clear(); assert.equal(client.storage.getItem(key), null)
})
function fixture(overrides = {}) {
  const calls = []
  const services = {
    consume: async (...v) => { calls.push(['consume', ...v]); return true },
    approved: async email => { calls.push(['approved', email]); return true },
    ensureAccount: async email => { calls.push(['ensure',email]) },
    sendCode: async (...v) => { calls.push(['send',...v]) },
    report: () => {}, ...overrides,
  }
  const handler = activationHandler(services)
  const request = (email = ' Approved@Memorial.test ', origin = 'https://mbctulsa.team') => handler(new Request('https://api.test', {
    method: 'POST', headers: { origin, 'Content-Type':'application/json' }, body: JSON.stringify({ email, access: 'staff', redirectTo: 'https://evil.test' }),
  }))
  return { calls, request }
}
test('activation normalizes approved email and never trusts supplied roles or redirect URLs', async () => {
  const f = fixture(); const result = await f.request()
  assert.deepEqual(await result.json(), { requested: true })
  assert.deepEqual(f.calls[1], ['approved','approved@memorial.test'])
  assert.deepEqual(f.calls.at(-1), ['send','approved@memorial.test','https://mbctulsa.team/?setup=password'])
})
test('unapproved, inactive and roster-only people never get accounts or codes; response stays neutral', async () => {
  const f = fixture({ approved: async () => false }); const result = await f.request()
  assert.deepEqual(await result.json(), { requested: true })
  assert.equal(f.calls.some(v => ['ensure','send'].includes(v[0])), false)
})
test('requests fail closed when the roster or rate limiter is unavailable', async () => {
  for (const name of ['consume','approved']) {
    const f = fixture({ [name]: async () => { throw Error('offline') } })
    assert.equal((await f.request()).status,503)
    assert.equal(f.calls.some(v => ['ensure','send'].includes(v[0])),false)
  }
})
test('limits, malformed addresses and foreign origins cannot create an account', async () => {
  const f = fixture({ consume: async () => false })
  assert.equal((await f.request()).status,429)
  assert.equal((await f.request('invalid')).status,400)
  assert.equal((await f.request('approved@memorial.test','https://evil.test')).status,403)
  assert.equal(f.calls.length,0)
})

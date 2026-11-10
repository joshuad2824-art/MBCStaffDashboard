import test from 'node:test'
import assert from 'node:assert/strict'
import { checkTarget, decodeEntities, fetchPreview, isPrivateAddress, readPreview } from '../src/lib/unfurlCore.ts'

/* unfurl (home brief §5.2): a link's own preview tags, and only from the open
   web. No network: fetch and DNS are stand-ins, so every path — a redirect to
   an internal address, a page too large, a file that is not a page — runs. */

test('private, loopback, link-local and metadata addresses are refused', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, ip)
  }
  for (const ip of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700::6810:85e5']) {
    assert.equal(isPrivateAddress(ip), false, ip)
  }
})

test('only public http(s) addresses on the standard ports are fetched', () => {
  assert.ok(!('refused' in checkTarget('https://www.bpnews.net/article')))
  for (const bad of ['ftp://example.org', 'file:///etc/passwd', 'javascript:alert(1)', 'http://localhost/', 'http://127.0.0.1/', 'http://[::1]/',
    'http://169.254.169.254/latest/meta-data', 'http://printer.local/', 'https://user:pw@example.org/', 'https://example.org:8443/', 'http://intranet/', 'not a url']) {
    assert.ok('refused' in checkTarget(bad), bad)
  }
})

test('a page\'s own preview tags, entities decoded, a relative image resolved', () => {
  const html = `<html><head>
    <title>Fallback &amp; title</title>
    <meta property="og:title" content="Yale Avenue lane closures &#8212; what to expect">
    <meta content='Tulsa World' property='og:site_name'>
    <meta property="og:image" content="/img/yale.jpg">
  </head><body><p>The article text, which is never read.</p></body></html>`
  assert.deepEqual(readPreview(html, 'https://tulsaworld.com/news/yale'), {
    url: 'https://tulsaworld.com/news/yale',
    title: 'Yale Avenue lane closures — what to expect',
    siteName: 'Tulsa World',
    imageUrl: 'https://tulsaworld.com/img/yale.jpg',
  })
})

test('with no preview tags: the <title>, and the host for the site', () => {
  const p = readPreview('<title>  Plain   page </title>', 'https://www.example.org/x')
  assert.equal(p.title, 'Plain page')
  assert.equal(p.siteName, 'example.org')
  assert.equal(p.imageUrl, null)
  assert.equal(readPreview('<meta property="og:image" content="javascript:alert(1)">', 'https://example.org/').imageUrl, null, 'an image must be http(s)')
  assert.equal(decodeEntities('&#xD800;ok&#0;'), 'ok', 'unrepresentable characters are dropped')
})

function deps({ pages, dns = {} }) {
  const fetched = []
  return {
    fetched,
    timeoutMs: 1000,
    lookup: async (host) => dns[host] ?? ['93.184.216.34'],
    fetch: async (url) => {
      fetched.push(url)
      const page = pages[url]
      if (!page) return new Response('nope', { status: 404 })
      return new Response(page.body ?? '', { status: page.status ?? 200, headers: page.headers ?? { 'content-type': 'text/html; charset=utf-8' } })
    },
  }
}

test('follows a redirect to a public page', async () => {
  const d = deps({ pages: {
    'https://short.example/a': { status: 301, headers: { location: 'https://news.example/story' } },
    'https://news.example/story': { body: '<meta property="og:title" content="The story">' },
  } })
  const result = await fetchPreview('https://short.example/a', d)
  assert.equal(result.title, 'The story')
  assert.equal(result.url, 'https://news.example/story')
})

test('a redirect into the private network is refused before it is followed', async () => {
  const d = deps({ pages: { 'https://evil.example/': { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } } } })
  assert.deepEqual(await fetchPreview('https://evil.example/', d), { refused: 'Not a public address' })
  assert.deepEqual(d.fetched, ['https://evil.example/'])
})

test('a public name that resolves to a private address is refused without a fetch', async () => {
  const d = deps({ pages: {}, dns: { 'rebind.example': ['10.0.0.5'] } })
  assert.deepEqual(await fetchPreview('https://rebind.example/', d), { refused: 'Not a public address' })
  assert.equal(d.fetched.length, 0)
})

test('not a page, an error, and too many hops are each refused', async () => {
  const pdf = deps({ pages: { 'https://x.example/f.pdf': { headers: { 'content-type': 'application/pdf' } } } })
  assert.deepEqual(await fetchPreview('https://x.example/f.pdf', pdf), { refused: 'Not a web page' })
  assert.deepEqual(await fetchPreview('https://x.example/missing', deps({ pages: {} })), { refused: 'The page answered 404' })
  const loop = deps({ pages: { 'https://loop.example/': { status: 302, headers: { location: 'https://loop.example/' } } } })
  assert.deepEqual(await fetchPreview('https://loop.example/', loop), { refused: 'Too many redirects' })
})

test('reads no more than 512 KB of a page', async () => {
  const big = '<meta property="og:title" content="Early">' + 'x'.repeat(2 * 1024 * 1024) + '<meta property="og:site_name" content="Late">'
  const result = await fetchPreview('https://big.example/', deps({ pages: { 'https://big.example/': { body: big } } }))
  assert.equal(result.title, 'Early')
  assert.equal(result.siteName, 'big.example', 'a tag past the cap is never seen')
})

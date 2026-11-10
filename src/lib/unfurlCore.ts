/* unfurl — a shared link's title, site name and preview image, read from the
   page's own preview tags the way a link pasted into a text message gets its
   title (home brief §5.2). Nothing else is read and nothing is stored here:
   News holds links and our own notes, never an article's text.

   The function fetches a URL a person typed, so it is careful about where it
   will go: http or https only, ports 80 and 443, never a private, loopback,
   link-local or metadata address — checked after DNS, and again at every
   redirect — and never more than 512 KB of an HTML page.

   Pure and import-free: fetch and DNS are passed in, so scripts/unfurl.test.mjs
   runs every path without the network. netlify/functions/unfurl.mts wires the
   real ones. */

export interface Preview {
  url: string
  title: string
  siteName: string
  imageUrl: string | null
}

export type Refusal = { refused: string }

export interface Deps {
  fetch(url: string, init: { redirect: 'manual'; signal: AbortSignal; headers: Record<string, string> }): Promise<Response>
  /** Every address the host resolves to. */
  lookup(host: string): Promise<string[]>
  timeoutMs?: number
}

const MAX_BYTES = 512 * 1024
const MAX_HOPS = 4

/* --------------------------------------------------------------- addresses */

function v4(ip: string): number[] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const n = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN))
  return n.every((x) => x >= 0 && x <= 255) ? n : null
}

/** Private, loopback, link-local, carrier-grade NAT, metadata, multicast,
    reserved — anything a page on the open web has no business being. */
export function isPrivateAddress(ip: string): boolean {
  const addr = ip.trim().toLowerCase().replace(/^\[|\]$/g, '')
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(addr)
  const four = v4(mapped ? mapped[1] : addr)
  if (four) {
    const [a, b] = four
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    )
  }
  if (!addr.includes(':')) return true // not an address we understand: refuse
  if (addr === '::' || addr === '::1') return true
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(addr) || addr.startsWith('::ffff:') || addr.startsWith('64:ff9b:')
}

/** Whether a URL is one the function will fetch, before DNS. */
export function checkTarget(raw: string): URL | Refusal {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { refused: 'Not a web address' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { refused: 'Only http and https addresses' }
  if (url.username || url.password) return { refused: 'Addresses with a login are not fetched' }
  if (url.port && url.port !== '80' && url.port !== '443') return { refused: 'Only the standard web ports' }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!host || host === 'localhost' || /\.(localhost|local|internal|home|lan|corp|intranet)$/.test(host) || !host.includes('.') && !host.includes(':')) {
    return { refused: 'Not a public address' }
  }
  if ((v4(host) || host.includes(':')) && isPrivateAddress(host)) return { refused: 'Not a public address' }
  return url
}

/* ------------------------------------------------------------------- tags */

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' }

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeChar(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeChar(Number(dec)))
    .replace(/&([a-z0-9#]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
}

function safeChar(code: number): string {
  // Nothing outside Unicode, no NUL, and no lone surrogate halves.
  return code > 0 && code < 0x110000 && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ''
}

function clean(text: string | undefined, max: number): string {
  return decodeEntities(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

/** The value of the first <meta> whose property or name is one of `keys`. */
function meta(html: string, keys: string[]): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase()
    if (!key || !keys.includes(key)) continue
    const content = /\bcontent\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? /\bcontent\s*=\s*'([^']*)'/i.exec(tag)?.[1]
    if (content && content.trim()) return content
  }
  return undefined
}

/** A page's own preview, from its head. Falls back to <title>, and to the
    host for the site name. An image is kept only as an http(s) address. */
export function readPreview(html: string, pageUrl: string): Preview {
  const head = html.slice(0, MAX_BYTES)
  const host = new URL(pageUrl).hostname.replace(/^www\./, '')
  const title = clean(meta(head, ['og:title', 'twitter:title']) ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1], 300) || host
  const siteName = clean(meta(head, ['og:site_name', 'application-name']), 120) || host
  let imageUrl: string | null = null
  const image = meta(head, ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'])
  if (image) {
    try {
      const resolved = new URL(decodeEntities(image.trim()), pageUrl)
      if (resolved.protocol === 'https:' || resolved.protocol === 'http:') imageUrl = resolved.href
    } catch {
      imageUrl = null
    }
  }
  return { url: pageUrl, title, siteName, imageUrl }
}

/* ---------------------------------------------------------------- fetching */

async function readCapped(response: Response): Promise<string> {
  if (!response.body) return (await response.text()).slice(0, MAX_BYTES)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value)
    total += value.byteLength
  }
  await reader.cancel().catch(() => undefined)
  const all = new Uint8Array(Math.min(total, MAX_BYTES))
  let offset = 0
  for (const chunk of chunks) {
    const take = Math.min(chunk.byteLength, all.length - offset)
    all.set(chunk.subarray(0, take), offset)
    offset += take
    if (offset >= all.length) break
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(all)
}

/** Fetches a page's preview, following at most four redirects and checking
    every hop — the address and what it resolves to — before going there. */
export async function fetchPreview(raw: string, deps: Deps): Promise<Preview | Refusal> {
  let target = checkTarget(raw)
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if ('refused' in target) return target
    const addresses = await deps.lookup(target.hostname.replace(/^\[|\]$/g, '')).catch(() => [] as string[])
    if (addresses.length === 0) return { refused: 'That address could not be found' }
    if (addresses.some(isPrivateAddress)) return { refused: 'Not a public address' }

    let response: Response
    try {
      response = await deps.fetch(target.href, {
        redirect: 'manual',
        signal: AbortSignal.timeout(deps.timeoutMs ?? 6000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; church-staff-dashboard link preview)', Accept: 'text/html,application/xhtml+xml' },
      })
    } catch {
      return { refused: 'The page did not answer' }
    }

    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location')
      if (!next) return { refused: 'The page redirected nowhere' }
      target = checkTarget(new URL(next, target.href).href)
      continue
    }
    if (!response.ok) return { refused: `The page answered ${response.status}` }
    const type = response.headers.get('content-type') ?? ''
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) return { refused: 'Not a web page' }
    return readPreview(await readCapped(response), target.href)
  }
  return { refused: 'Too many redirects' }
}

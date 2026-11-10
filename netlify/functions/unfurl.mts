import { lookup } from 'node:dns/promises'
import { fetchPreview } from '../../src/lib/unfurlCore'

/* unfurl — a shared link's title, site name and preview image (home brief
   §5.2). The careful parts — which addresses it will fetch, the redirect and
   size limits, reading the preview tags — are in src/lib/unfurlCore.ts and
   tested there. This file wires in the real network and asks who is calling.

   Only a signed-in session may use it: the bearer token is checked with
   Supabase before anything is fetched, so the function is not a page-fetcher
   for the open web. It fails closed — if the site's Supabase settings have not
   reached the function (they must be set for the Functions scope in Netlify),
   it refuses, and the share form asks for the title by hand. The one exception
   is `netlify dev` on seed data, where there is no session to check. */

// The site's own settings, as Netlify hands them to a function. Read through
// globalThis so the browser code's typecheck never learns of a `process`.
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const SUPABASE_URL = (env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
const ANON_KEY = (env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? '').trim()

const LOCAL_DEV = env.NETLIFY_DEV === 'true'

async function signedIn(request: Request): Promise<boolean> {
  if (!SUPABASE_URL || !ANON_KEY) return LOCAL_DEV
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
  if (!token) return false
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    })
    return response.ok
  } catch {
    return false
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ refused: 'GET only' }, 405)
  if (!(await signedIn(request))) return json({ refused: 'Sign in first' }, 401)
  const target = new URL(request.url).searchParams.get('url') ?? ''
  if (!target) return json({ refused: 'No address given' }, 400)

  const result = await fetchPreview(target, {
    fetch: (url, init) => fetch(url, init),
    lookup: async (host) => (await lookup(host, { all: true })).map((entry) => entry.address),
  })
  return json(result, 'refused' in result ? 422 : 200)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, max-age=600' },
  })
}

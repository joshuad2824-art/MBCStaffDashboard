import { supabase } from './supabase'

/* The browser's half of unfurl (home brief §5.2): ask the function for a
   link's title, site name and preview image, carrying the signed-in session so
   the function knows it is being asked by staff. Anything but a preview —
   the function absent (`npm run dev`), a refusal, a slow page — is null, and
   the share form simply asks for the title by hand. */

export interface LinkPreview {
  url: string
  title: string
  siteName: string
  imageUrl: string | null
}

export async function unfurl(url: string, signal?: AbortSignal): Promise<LinkPreview | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const session = supabase ? (await supabase.auth.getSession()).data.session : null
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    const response = await fetch(`/.netlify/functions/unfurl?url=${encodeURIComponent(url)}`, { headers, signal })
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('json')) return null
    const body = (await response.json()) as Partial<LinkPreview> & { refused?: string }
    if (body.refused || !body.title) return null
    return { url: body.url || url, title: body.title, siteName: body.siteName ?? '', imageUrl: body.imageUrl ?? null }
  } catch {
    return null
  }
}

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/* The auth seam.

   Two build variables decide whether this file has anything to do:

     VITE_SUPABASE_URL        https://<ref>.supabase.co
     VITE_SUPABASE_ANON_KEY   the anon public key, safe to ship

   With both set, sign-in is Supabase Auth: a real magic link, a real session,
   and the roster row in Postgres saying what the person may see. With either
   missing — a local checkout, a preview build — the app falls back to the
   stubbed sign-in it has always had, so `npm run dev` needs no secrets.

   The anon key is public by design. Every table is protected by the policies in
   supabase/migrations/0002_rls.sql, not by keeping that string quiet. */

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const supabaseConfigured = Boolean(url && anonKey)

/* Read the callback off the URL before the client is built.

   A magic link comes back to the site carrying its result in the fragment —
   tokens when it worked, `error_description` when it did not. supabase-js
   strips that fragment the moment it finds tokens in it, and it keeps the
   failures to itself. Whatever is on the address bar at import time is the only
   chance anyone gets to read them, so we take a copy first and construct the
   client second. */
function readCallbackFailure(): string | null {
  if (typeof window === 'undefined') return null
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const code = hash.get('error_code') ?? query.get('error_code')
  const described = hash.get('error_description') ?? query.get('error_description')
  if (!code && !described) return null

  // Say the one thing the person can act on. The raw text underneath is written
  // for whoever wired the project up, not for whoever is trying to get to work.
  if (code === 'otp_expired') {
    return 'That sign-in link has expired. Links last fifteen minutes — ask for a fresh one below.'
  }
  // Supabase answers a used link and a stale one with the same sentence, so
  // this says both rather than guessing at which it was.
  if (code === 'access_denied' || /invalid|expired/i.test(described ?? '')) {
    return 'That sign-in link is no longer good — links last fifteen minutes and work only once. Ask for a fresh one below.'
  }
  return described ? described.replace(/\+/g, ' ') : 'That sign-in link did not work. Ask for a fresh one below.'
}

export const linkFailure = readCallbackFailure()

/** Take the tokens and the error text back off the address bar once they have
    been read. A sign-in link is a credential and does not belong in history. */
export function clearCallbackFromUrl(): void {
  if (typeof window === 'undefined') return
  if (!window.location.hash && !window.location.search) return
  window.history.replaceState(null, '', window.location.pathname)
}

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Invites sent from the Supabase dashboard and links sent from this app
        // come back in different shapes. This is what reads both of them.
        detectSessionInUrl: true,
      },
    })
  : null

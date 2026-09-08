import { supabase } from '../lib/supabase'
import type { Access } from '../data/types'

/* Who the signed-in person is, according to Postgres.

   Authenticating and being on staff are two different facts, and this is where
   the second one is established. `claim_account()` — supabase/migrations/
   0003_claim_account.sql — matches the address Supabase verified against the
   roster, links the two the first time, and returns the row. No row means the
   address got through the mail but is not on the roster, or is at 'none', or is
   marked as no longer here. Any of those is a closed door. */

export interface Account {
  name: string
  role: string
  email: string
  access: Access
}

export type AccountLookup =
  | { state: 'account'; account: Account }
  | { state: 'not-on-roster' }
  | { state: 'not-set-up' }
  | { state: 'failed'; message: string }

/* The project has authentication turned on but has never had the migrations
   run against it, so the function this asks for is not there. Worth its own
   answer: it is a job half done, not a person who should be refused. */
const NOT_SET_UP = new Set(['PGRST202', 'PGRST106', '42883', '42P01'])

export async function loadAccount(): Promise<AccountLookup> {
  if (!supabase) return { state: 'failed', message: 'Supabase is not configured for this build.' }

  const { data, error } = await supabase.rpc('claim_account')
  if (error) {
    if (NOT_SET_UP.has(error.code ?? '')) return { state: 'not-set-up' }
    return { state: 'failed', message: error.message }
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { name?: string; role?: string; email?: string; access?: Access }
    | null
    | undefined
  if (!row || !row.email) return { state: 'not-on-roster' }

  return {
    state: 'account',
    account: {
      name: row.name ?? row.email,
      role: row.role ?? '',
      email: row.email.trim().toLowerCase(),
      access: row.access ?? 'none',
    },
  }
}

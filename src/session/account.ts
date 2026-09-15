import { supabase } from '../lib/supabase'
import type { Access } from '../data/types'

/* Who the signed-in person is, according to Postgres.

   Authenticating and being on staff are two different facts, and this is where
   the second one is established. `claim_account()` — supabase/migrations/
   0003_claim_account.sql — matches the address Supabase verified against the
   roster, links the two the first time, and returns the row. No row means the
   address got through the mail but is not on the roster, or is at 'none', or is
   marked as no longer here. Any of those is a closed door. */

export interface Seat {
  slug: string
  role: 'chair' | 'member' | 'ex_officio'
}

export interface Account {
  /** The roster row's id. What the deacon side writes under. */
  id: string
  name: string
  role: string
  email: string
  access: Access
  /** Offered the view-as control (brief §C.2 rule 6). `person.admin` arrives
      with migration 0016 and rides on `claim_account()` from then; until it
      does, nobody is. It gates nothing in the database. */
  admin: boolean
  /** The bodies this person sits in, and the role in each, from `my_seats()`. */
  seats: Seat[]
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
    | { id?: string; name?: string; role?: string; email?: string; access?: Access; admin?: boolean }
    | null
    | undefined
  if (!row || !row.email) return { state: 'not-on-roster' }

  // Which bodies they sit in, and in what role — supabase/migrations/
  // 0004_bodies.sql and 0005_meeting.sql. The nav is assembled from the slugs;
  // the policies consult the same tables through is_member_of().
  const seats = await supabase.rpc('my_seats')
  if (seats.error) {
    if (NOT_SET_UP.has(seats.error.code ?? '')) return { state: 'not-set-up' }
    return { state: 'failed', message: seats.error.message }
  }

  return {
    state: 'account',
    account: {
      id: row.id ?? '',
      name: row.name ?? row.email,
      role: row.role ?? '',
      email: row.email.trim().toLowerCase(),
      access: row.access ?? 'none',
      admin: row.admin === true,
      seats: readSeats(seats.data),
    },
  }
}

function readSeats(data: unknown): Seat[] {
  if (!Array.isArray(data)) return []
  return data
    .map((item) => {
      const row = item as { slug?: string; role_in_body?: string } | null
      const role = row?.role_in_body
      return {
        slug: row?.slug ?? '',
        role: (role === 'chair' || role === 'ex_officio' ? role : 'member') as Seat['role'],
      }
    })
    .filter((seat) => seat.slug.length > 0)
}

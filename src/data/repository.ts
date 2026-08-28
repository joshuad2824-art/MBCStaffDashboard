import { isThreadExpired } from '../lib/derive'
import { startOfToday } from '../lib/date'
import { seed } from './seed'
import type { DashboardData } from './types'

/* The seam.
   ---------
   Everything above this file reads and writes `DashboardData` and knows nothing
   about where it lives. Today that is seed data kept in the browser; when the
   Supabase project is stood up, `LocalRepository` is replaced by a
   `SupabaseRepository` with the same two methods and nothing else has to change.

   Two things move to the server at that point, and they are the two that cannot
   be trusted to a client: the role gate on Care and Discussion becomes Row Level
   Security, and the fourteen-day purge below becomes a scheduled DELETE. */

export interface Repository {
  load(): Promise<DashboardData>
  persist(data: DashboardData): Promise<void>
}

const STORAGE_KEY = 'mbc.staff-dashboard.v1'

/** Real deletion, not a flag and not a filter. A board that says it forgets has
    to actually forget. Runs on load here; becomes a nightly job in Postgres. */
export function purgeExpired(data: DashboardData): DashboardData {
  const today = startOfToday()
  const kept = data.threads.filter((thread) => !isThreadExpired(thread, today))
  if (kept.length === data.threads.length) return data

  const keptIds = new Set(kept.map((t) => t.id))
  const posts = data.posts.filter((post) => keptIds.has(post.threadId))
  const postIds = new Set(posts.map((p) => p.id))
  return {
    ...data,
    threads: kept,
    posts,
    mentions: data.mentions.filter((mention) => postIds.has(mention.postId)),
  }
}

export class LocalRepository implements Repository {
  async load(): Promise<DashboardData> {
    let data = seed
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) data = { ...seed, ...(JSON.parse(stored) as DashboardData) }
    } catch {
      // A corrupt or unavailable store is not worth failing the app over.
    }
    const purged = purgeExpired(data)
    if (purged !== data) await this.persist(purged)
    return purged
  }

  async persist(data: DashboardData): Promise<void> {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Private browsing, a full quota — the session still works, it just will
      // not survive a reload. Not worth interrupting anyone over.
    }
  }
}

export const repository: Repository = new LocalRepository()

import { useEffect, useState } from 'react'

/* Adoption on the discussion board is one unread count in the nav and one daily
   digest — no per-post notifications, which would turn it into another inbox.
   The read marks live per person; in Postgres this becomes a thread_read table.

   The listener set below is what makes the nav badge drop the moment a thread is
   opened: the marks live outside React state, so something has to say they moved. */

const READS_KEY = 'mbc.staff-dashboard.reads'

type Reads = Record<string, Record<string, string>>

const listeners = new Set<() => void>()

function readAll(): Reads {
  try {
    const raw = window.localStorage.getItem(READS_KEY)
    return raw ? (JSON.parse(raw) as Reads) : {}
  } catch {
    return {}
  }
}

function writeAll(reads: Reads): void {
  try {
    window.localStorage.setItem(READS_KEY, JSON.stringify(reads))
  } catch {
    // Unread counts are a convenience, not a record.
  }
  listeners.forEach((notify) => notify())
}

export function markThreadRead(staffId: number, threadId: number, at: string): void {
  const reads = readAll()
  const mine = reads[String(staffId)] ?? {}
  if (mine[String(threadId)] === at) return
  mine[String(threadId)] = at
  reads[String(staffId)] = mine
  writeAll(reads)
}

/** Threads with activity this person has not opened since. */
export function unreadThreadIds(
  staffId: number,
  threads: { id: number; lastActivity: string }[],
): number[] {
  const mine = readAll()[String(staffId)] ?? {}
  return threads.filter((thread) => (mine[String(thread.id)] ?? '') < thread.lastActivity).map((t) => t.id)
}

/** Re-reads whenever a thread is marked read, so the badge stays honest. */
export function useUnreadThreadIds(
  staffId: number | null,
  threads: { id: number; lastActivity: string }[],
): number[] {
  const [ids, setIds] = useState<number[]>([])

  useEffect(() => {
    const recompute = () => setIds(staffId === null ? [] : unreadThreadIds(staffId, threads))
    recompute()
    listeners.add(recompute)
    return () => {
      listeners.delete(recompute)
    }
  }, [staffId, threads])

  return ids
}

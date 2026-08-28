import type { DashboardData } from '../data/types'
import { careDueBy, deriveCadence, firstName, isUnclaimed, staffName, threadForgetsIn } from './derive'
import { countDays, daysBetween, formatShort, relativeDay } from './date'
import { carePastWindow, openCare, unannouncedNotices } from './rollups'

/* Notifications are derived, never authored. There is no notifications table:
   this recomputes from the same records the other surfaces show, so dismissing
   one is a view preference and nothing is ever "marked read" in the data. */

export type Tone = 'alert' | 'attention' | 'info'

export interface Notification {
  key: string
  tone: Tone
  tag: string
  body: string
  actionLabel: string
  to: string
  meta: string
}

const ORDER: Record<Tone, number> = { alert: 0, attention: 1, info: 2 }

export function deriveNotifications(
  data: DashboardData,
  today: Date,
  options: { includeCare: boolean; limit: number },
): Notification[] {
  const items: Notification[] = []

  for (const item of data.cadence) {
    const { announceBy, nextDue } = deriveCadence(item)
    if (!announceBy || !nextDue) continue
    const away = daysBetween(today, announceBy)
    if (away < 0 && daysBetween(today, nextDue) >= 0) {
      items.push({
        key: 'announce-passed-' + item.id,
        tone: 'alert',
        tag: 'Notice window passed',
        body:
          item.name +
          ' is due ' +
          formatShort(nextDue) +
          ' and its ' +
          item.noticeDays +
          '-day notice window closed ' +
          countDays(Math.abs(away)) +
          ' ago.',
        actionLabel: 'Open the cadence ledger',
        to: '/cadence',
        meta: staffName(data.staff, item.ownerId),
      })
    } else if (away >= 0 && away <= 14) {
      items.push({
        key: 'announce-soon-' + item.id,
        tone: 'attention',
        tag: 'Announce by ' + formatShort(announceBy),
        body: item.name + ' has to be announced ' + relativeDay(announceBy, today) + ' to keep its notice window.',
        actionLabel: 'Open the cadence ledger',
        to: '/cadence',
        meta: staffName(data.staff, item.ownerId),
      })
    }
  }

  const unclaimed = data.cadence.filter(isUnclaimed)
  if (unclaimed.length > 0) {
    items.push({
      key: 'unclaimed',
      tone: 'attention',
      tag: 'Unclaimed',
      body:
        unclaimed.length +
        ' recurring ' +
        (unclaimed.length === 1 ? 'commitment has' : 'commitments have') +
        ' no owner: ' +
        unclaimed.map((item) => item.name).join(', ') +
        '.',
      actionLabel: 'Open the cadence ledger',
      to: '/cadence',
      meta: 'Cadence ledger',
    })
  }

  const unannounced = unannouncedNotices(data)
  for (const notice of unannounced) {
    items.push({
      key: 'unannounced-' + notice.id,
      tone: 'alert',
      tag: 'Decided, not announced',
      body: notice.subject + ' was decided ' + formatShort(new Date(notice.decidedOn + 'T00:00:00')) + ' and nobody outside this staff has been told.',
      actionLabel: 'Open the notice log',
      to: '/notice',
      meta: notice.ministry,
    })
  }

  if (options.includeCare) {
    for (const entry of carePastWindow(data.care, today)) {
      items.push({
        key: 'care-past-' + entry.id,
        tone: 'alert',
        tag: 'Past its window',
        body:
          (entry.sensitive ? firstName(entry.person) : entry.person) +
          ' — ' +
          entry.type +
          ' is past its response window.',
        actionLabel: 'Open care pipelines',
        to: '/care',
        meta: staffName(data.staff, entry.ownerId),
      })
    }
    for (const entry of openCare(data.care)) {
      const due = careDueBy(entry)
      if (!due) continue
      const away = daysBetween(today, due)
      if (away < 0 || away > 2) continue
      items.push({
        key: 'care-soon-' + entry.id,
        tone: 'attention',
        tag: 'Due ' + relativeDay(due, today),
        body:
          (entry.sensitive ? firstName(entry.person) : entry.person) +
          ' — ' +
          entry.type +
          ' is due ' +
          relativeDay(due, today) +
          '.',
        actionLabel: 'Open care pipelines',
        to: '/care',
        meta: staffName(data.staff, entry.ownerId),
      })
    }
  }

  if (data.week.status === 'draft') {
    items.push({
      key: 'bulletin-draft',
      tone: 'attention',
      tag: 'Still a draft',
      body:
        'The bulletin for ' +
        formatShort(new Date(data.week.serviceDate + 'T00:00:00')) +
        ' has not been published, so nothing in it counts as notice yet.',
      actionLabel: 'Open the communicator',
      to: '/communicator',
      meta: staffName(data.staff, data.week.updatedBy),
    })
  }

  const latestFyi = [...data.huddle]
    .filter((post) => post.col === 'fyi')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (latestFyi) {
    items.push({
      key: 'fyi-' + latestFyi.id,
      tone: 'info',
      tag: 'Latest FYI',
      body: latestFyi.body,
      actionLabel: 'Open the Huddle',
      to: '/huddle',
      meta: staffName(data.staff, latestFyi.authorId),
    })
  }

  if (options.includeCare) {
    for (const thread of data.threads) {
      const forgets = threadForgetsIn(thread, today)
      if (forgets > 3) continue
      items.push({
        key: 'thread-' + thread.id,
        tone: 'info',
        tag: 'Forgets in ' + countDays(Math.max(forgets, 0)),
        body: '“' + thread.subject + '” ages out soon. Promote anything on it that became a commitment.',
        actionLabel: 'Open the discussion board',
        to: '/discussion',
        meta: staffName(data.staff, thread.createdBy),
      })
    }
  }

  return items.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]).slice(0, options.limit)
}

export const TONE_STYLES: Record<Tone, { ground: string; tag: string }> = {
  alert: { ground: 'var(--mbc-lamplight-tint)', tag: 'var(--mbc-lamplight-deep)' },
  attention: { ground: 'var(--surface-panel)', tag: 'var(--text-eyebrow)' },
  info: { ground: 'var(--surface-card)', tag: 'var(--mbc-yale-sage)' },
}

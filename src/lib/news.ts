import type { DashboardData, NewsCategory, NewsPost } from '../data/types'
import { addDays, startOfToday, toIso } from './date'

/* News & articles (home brief §5), derived. Current versus archive is a
   reading of the dates, never a move: current is post_on ≤ today ≤ expires_on,
   the archive is everything past expires_on, and a post dated ahead waits. */

export const isCurrent = (post: NewsPost, today = toIso(startOfToday())) => post.postOn <= today && today <= post.expiresOn
export const isArchived = (post: NewsPost, today = toIso(startOfToday())) => post.expiresOn < today
export const isScheduled = (post: NewsPost, today = toIso(startOfToday())) => post.postOn > today

/** Newest first: by the day it went up, then by when it was shared. */
export const newestFirst = (a: NewsPost, b: NewsPost) => b.postOn.localeCompare(a.postOn) || b.createdAt.localeCompare(a.createdAt)

export function activeCategories(data: DashboardData): NewsCategory[] {
  return data.newsCategories.filter((c) => c.active).sort((a, b) => a.position - b.position)
}

export function categoryName(data: DashboardData, slug: string): string {
  return data.newsCategories.find((c) => c.slug === slug)?.name ?? slug
}

/** Shared in the last seven days and current: Home's "3 shared this week". */
export function sharedThisWeek(data: DashboardData, today = startOfToday()): number {
  const since = toIso(addDays(today, -6))
  const iso = toIso(today)
  return data.newsPosts.filter((post) => isCurrent(post, iso) && post.postOn >= since).length
}

/** Forgiving, the way the manual's search is: every word typed must begin a
    word of the title, the site, the note or a category's name. Reaches current
    and archive alike. */
export function matches(data: DashboardData, post: NewsPost, query: string): boolean {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
  if (words.length === 0) return true
  const haystack = [post.title, post.siteName, post.note, ...post.categories.map((slug) => categoryName(data, slug))]
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  return words.every((word) => haystack.some((h) => h.startsWith(word)))
}

/** "November 2026", for the archive's month filter. */
export function monthOf(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** "Tue 10 Nov". */
export function dayOf(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '')
}

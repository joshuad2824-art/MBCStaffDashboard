import type { DashboardData, GroupKind, MinistryRecord, ServingAssignment, ServingGroup } from '../data/types'

/* The directory's derived facts. Nothing here is stored: whether a group has a
   gap, how many are open, who is primary — all of it is read off the rows.

   Groups hold who serves, never who attends. There is no helper here that
   counts attendance, because there is no column for it to count. */

export const KIND_LABEL: Record<GroupKind, string> = {
  class: 'Class',
  'community-group': 'Community group',
  team: 'Ministry team',
}

export const KINDS: GroupKind[] = ['class', 'community-group', 'team']

/** The leading roles a kind of group needs somebody in, first choice first.
    A class needs a teacher, a community group a host, a team a coordinator.
    (Brief handoff: "a product decision worth confirming before it is coded".) */
export const LEADS: Record<GroupKind, string[]> = {
  class: ['teacher', 'co-teacher'],
  'community-group': ['host', 'leader', 'co-leader'],
  team: ['coordinator', 'leader'],
}

export const LEAD_WORD: Record<GroupKind, string> = {
  class: 'teacher',
  'community-group': 'host',
  team: 'coordinator',
}

export function isLive(group: ServingGroup): boolean {
  return group.endedOn === null
}

/** Current assignments in a group, the one to call first. */
export function serving(data: DashboardData, groupId: number): ServingAssignment[] {
  return data.assignments
    .filter((a) => a.groupId === groupId && a.endedOn === null)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.startedOn.localeCompare(b.startedOn) || a.id - b.id)
}

/** Nobody in the leading role: the state the directory exists to expose. */
export function hasGap(data: DashboardData, group: ServingGroup): boolean {
  const leads = LEADS[group.kind]
  return !serving(data, group.id).some((a) => leads.includes(a.roleSlug))
}

export function liveGroups(data: DashboardData, ministryId?: number): ServingGroup[] {
  return data.groups.filter((g) => isLive(g) && (ministryId === undefined || g.ministryId === ministryId))
}

/** Groups with nobody in their leading role, across every ministry. */
export function gapsIn(data: DashboardData, ministryId?: number): ServingGroup[] {
  return liveGroups(data, ministryId).filter((g) => hasGap(data, g))
}

/** The ministries the directory lists, in order. `All` and `All groups` are
    values the ledger carries, not ministries, and stay off the shelf. */
export function directoryMinistries(data: DashboardData): MinistryRecord[] {
  return data.ministries.filter((m) => m.active && m.directory).sort((a, b) => a.position - b.position)
}

/** Every ministry name a filter or a select may offer, in the table's order. */
export function ministryNames(data: DashboardData): string[] {
  return [...data.ministries].filter((m) => m.active).sort((a, b) => a.position - b.position).map((m) => m.name)
}

export function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ministry'
}

import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Chip, Eyebrow } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import { nextId, personName } from '../lib/derive'
import { formatShort, parseDate, todayIso } from '../lib/date'
import { KINDS, KIND_LABEL, LEADS, LEAD_WORD, directoryMinistries, gapsIn, hasGap, liveGroups, serving } from '../lib/serving'
import type { GroupKind, Person, ServingAssignment, ServingGroup } from '../data/types'

/* Ministries, classes and groups (expansion brief §B; design handoff in
   design_handoff_ministries/). Two routes: /ministries, one card per
   ministry and nothing else to decide; /ministries/:slug, one ministry, the
   groups inside it, and who serves in each.

   Who serves. Never who attends. There is no attendance field on this
   screen, no headcount, no roster, and the audience note is free text on
   purpose: "Grades 7–12" describes a group, it does not list children.

   Editing happens where the value is — a value is a button at rest and a
   field when clicked, Done closes it, and every change is one undoable
   mutation with the toast the staff dashboard already uses. No modal, no
   edit mode, no Save bar. Adding someone creates the roster entry and the
   assignment in one motion, as OwnerSelect does. Nothing here is deleted: a
   group ends with a date, an assignment ends with a date, and the ended
   groups sit behind a toggle on the panel ground.

   The gap — a class with no teacher, a group with no host, a team with no
   coordinator — is the state the surface exists to expose: counted in a
   band, labelled on the group in Lamplight with one button that fills it,
   and filterable. The Cadence ledger's Unclaimed treatment, in its own words. */

export function Ministries() {
  return (
    <Routes>
      <Route index element={<MinistryIndex />} />
      <Route path=":slug" element={<MinistryPage />} />
    </Routes>
  )
}

/* ------------------------------------------------------------- the index */

function MinistryIndex() {
  const data = useData()
  const navigate = useNavigate()
  const ministries = directoryMinistries(data)
  const gaps = gapsIn(data)
  const gapMinistries = [...new Set(gaps.map((g) => data.ministries.find((m) => m.id === g.ministryId)?.name ?? ''))].filter(Boolean)
  const groupsTotal = liveGroups(data).length

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <p style={{ ...lead, margin: 0 }}>
        {ministries.length} ministries · {groupsTotal} {groupsTotal === 1 ? 'group' : 'groups'}. Open the one you need — the groups inside it, and who serves in each, live on its page. Classes, community groups and teams all sit under the ministry they belong to.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {ministries.map((ministry) => {
          const live = liveGroups(data, ministry.id)
          const gap = live.filter((g) => hasGap(data, g))
          const people = new Set(live.flatMap((g) => serving(data, g.id).map((a) => a.personId))).size
          const kinds = KINDS.map((kind) => {
            const n = live.filter((g) => g.kind === kind).length
            return n ? `${n} ${plural(n, kind === 'class' ? ['class', 'classes'] : kind === 'community-group' ? ['community group', 'community groups'] : ['team', 'teams'])}` : null
          }).filter(Boolean)
          return (
            <button key={ministry.id} type="button" onClick={() => navigate(`/ministries/${ministry.slug}`)} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', display: 'grid', gap: 14, alignContent: 'start', padding: '26px clamp(20px, 2vw, 28px)' }}>
              <span style={{ display: 'flex', gap: 18, alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ font: '600 26px/1.15 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)' }}>{ministry.name}</span>
                <span className="tabular" style={{ font: '600 26px/1.15 var(--mbc-font-serif)', color: 'var(--text-meta)', flex: 'none' }}>{live.length}</span>
              </span>
              {ministry.description ? <span style={{ font: '400 16px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '46ch', textWrap: 'pretty' } as CSSProperties}>{ministry.description}</span> : null}
              <span style={{ display: 'grid', gap: 6, paddingTop: 12, borderTop: '1px solid var(--border-hairline)' }}>
                <span className="tabular" style={meta}>{live.length ? `${kinds.join(' · ')} · ${people} ${plural(people, ['person serving', 'people serving'])}` : 'No groups yet'}</span>
                {live.length ? (
                  <span style={{ font: gap.length ? '700 13px/1.4 var(--mbc-font-sans)' : '400 13px/1.5 var(--mbc-font-sans)', color: gap.length ? 'var(--text-eyebrow)' : 'var(--text-meta)' }}>
                    {gap.length === 0 ? 'Every leading role is named' : gap.length === 1 ? `1 group needs a ${LEAD_WORD[gap[0].kind]}` : `${gap.length} groups need a leading role filled`}
                  </span>
                ) : null}
              </span>
              <span style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)' }}>{live.length ? `Open ${ministry.name} →` : 'Add the first group →'}</span>
            </button>
          )
        })}
      </div>

      <GapBand
        count={gaps.length}
        note={gaps.length ? `In ${gapMinistries.join(' and ')}. Open the ministry to name someone; nothing on this page edits a group.` : 'Nothing to chase this week.'}
        where="Across every ministry."
      />
    </div>
  )
}

/* ---------------------------------------------------------- one ministry */

type Editing = { key: string; value: string } | null
interface Adding {
  groupId: number
  name: string
  roleSlug: string
}

function MinistryPage() {
  const { slug } = useParams()
  const data = useData()
  const { mutate } = useStore()
  const { viewAs } = useSession()
  const navigate = useNavigate()
  const ministry = data.ministries.find((m) => m.slug === slug && m.directory)
  const [editing, setEditing] = useState<Editing>(null)
  const [adding, setAdding] = useState<Adding | null>(null)
  const [gapsOnly, setGapsOnly] = useState(false)
  const [showEnded, setShowEnded] = useState(false)

  if (!ministry) return <Navigate to="/ministries" replace />

  const canEdit = viewAs === 'staff'
  const all = data.groups.filter((g) => g.ministryId === ministry.id)
  const live = all.filter((g) => g.endedOn === null)
  const ended = all.filter((g) => g.endedOn !== null).sort((a, b) => (b.endedOn ?? '').localeCompare(a.endedOn ?? ''))
  const gaps = live.filter((g) => hasGap(data, g))
  const people = new Set(live.flatMap((g) => serving(data, g.id).map((a) => a.personId))).size
  let shown = showEnded ? [...live, ...ended] : live
  if (gapsOnly) shown = shown.filter((g) => hasGap(data, g))

  const patchGroup = (group: ServingGroup, label: string, fields: Partial<ServingGroup>) =>
    mutate(label, (current) => ({ ...current, groups: current.groups.map((g) => (g.id === group.id ? { ...g, ...fields } : g)) }))
  const patchAssignment = (assignment: ServingAssignment, label: string, fields: Partial<ServingAssignment>) =>
    mutate(label, (current) => ({ ...current, assignments: current.assignments.map((a) => (a.id === assignment.id ? { ...a, ...fields } : a)) }))

  const commitEdit = () => {
    if (!editing) return
    const value = editing.value.trim()
    const [kind, id, field] = editing.key.split(':')
    setEditing(null)
    if (kind === 'ministry') {
      if (value === ministry.description) return
      mutate(`Updated what ${ministry.name} says about itself.`, (current) => ({ ...current, ministries: current.ministries.map((m) => (m.id === ministry.id ? { ...m, description: value } : m)) }))
    } else if (kind === 'group') {
      const group = data.groups.find((g) => g.id === Number(id))
      if (!group) return
      if (field === 'name') {
        if (!value || value === group.name) return
        patchGroup(group, `Renamed ${group.name} to ${value}.`, { name: value })
      } else if (field === 'meets' || field === 'location' || field === 'audienceNote') {
        if (value === group[field]) return
        patchGroup(group, `Updated ${FACT_LABEL[field].toLowerCase()} for ${group.name}.`, { [field]: value })
      }
    } else if (kind === 'person') {
      const person = data.people.find((p) => p.id === Number(id))
      if (!person || !value || value === person.name) return
      mutate(`Renamed ${person.name} to ${value} on the roster.`, (current) => ({ ...current, people: current.people.map((p) => (p.id === person.id ? { ...p, name: value } : p)) }))
    }
  }

  const addGroup = () => {
    const id = nextId(data.groups)
    const group: ServingGroup = { id, ministryId: ministry.id, kind: 'class', name: 'Untitled group', meets: '', location: '', audienceNote: '', notes: '', startedOn: todayIso(), endedOn: null }
    mutate(`Added a group to ${ministry.name}, with its name open. Set the kind, when and where it meets, and name someone.`, (current) => ({ ...current, groups: [...current.groups, group] }))
    setGapsOnly(false)
    setEditing({ key: `group:${id}:name`, value: '' })
  }

  const confirmAdd = () => {
    if (!adding) return
    const group = data.groups.find((g) => g.id === adding.groupId)
    const name = adding.name.trim()
    if (!group || !name) return
    const role = data.servingRoles.find((r) => r.slug === adding.roleSlug) ?? data.servingRoles[0]
    const existing = data.people.find((p) => p.active && p.name.trim().toLowerCase() === name.toLowerCase())
    const personId = existing?.id ?? nextId(data.people)
    const current = serving(data, group.id)
    const assignment: ServingAssignment = {
      id: nextId(data.assignments), groupId: group.id, personId, roleSlug: role.slug, startedOn: todayIso(), endedOn: null,
      isPrimary: !current.some((a) => a.isPrimary),
    }
    setAdding(null)
    mutate(
      `${existing?.name ?? name} · ${role.name.toLowerCase()} in ${group.name}.${existing ? '' : ' A person record was created at the same time; they cannot sign in.'}`,
      (state) => ({
        ...state,
        people: existing ? state.people : [...state.people, { id: personId, name, role: role.name, email: '', access: 'none', active: true } satisfies Person],
        assignments: [...state.assignments, assignment],
      }),
    )
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Eyebrow size="sm" style={{ marginRight: 6 }}>Ministries</Eyebrow>
        <Chip onClick={() => navigate('/ministries')}>← All ministries</Chip>
        {directoryMinistries(data).map((m) => (
          <Chip key={m.id} active={m.id === ministry.id} onClick={() => navigate(`/ministries/${m.slug}`)}>{m.name}</Chip>
        ))}
      </div>

      <Card radius="card" pad="24px clamp(20px, 2vw, 28px)" style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 32px', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 16px' }}>
            <h2 style={{ font: '600 26px/1.15 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)', margin: 0 }}>{ministry.name}</h2>
            <span className="tabular" style={meta}>{live.length} {plural(live.length, ['group', 'groups'])} · {people} {plural(people, ['person serving', 'people serving'])}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <InlineText
              editKey={`ministry:${ministry.id}:description`}
              value={ministry.description}
              display={ministry.description || (canEdit ? 'Say in a line what this ministry is.' : '')}
              placeholder="What this ministry is, in a line"
              editTitle={`Edit what ${ministry.name} says about itself`}
              editing={editing}
              setEditing={setEditing}
              onCommit={commitEdit}
              canEdit={canEdit}
              style={{ font: '400 16px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '62ch' }}
            />
          </div>
          <p style={{ ...meta, margin: '8px 0 0' }}>
            {canEdit ? 'Every value on this page is editable in place — ✎ opens it. ' : ''}Nothing here saves a list of who attends, only who serves.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ended.length ? (
            <Chip active={showEnded} onClick={() => setShowEnded(!showEnded)}>
              {showEnded ? 'Hide' : 'Show'} the {ended.length} {plural(ended.length, ['group that has ended', 'groups that have ended'])}
            </Chip>
          ) : null}
          {gaps.length ? (
            <Chip active={gapsOnly} onClick={() => setGapsOnly(!gapsOnly)}>Gaps only · {gaps.length}</Chip>
          ) : null}
          {canEdit ? <Button variant="primary" size="sm" onClick={addGroup}>Add a group</Button> : null}
        </div>
      </Card>

      {gaps.length ? (
        <GapBand count={gaps.length} where="A leading role with nobody in it is a state, not a blank." note="A class with no teacher, a community group with no host, a team with no coordinator. It is the one thing this directory exists to make visible, so it is said in a number and a sentence — never in a colour." />
      ) : null}

      {all.length === 0 ? (
        <section style={{ ...cardStyle, border: '1px dashed var(--border-control)', padding: 'clamp(30px, 3.4vw, 48px)', maxWidth: 720, display: 'grid', gap: 14 }}>
          <Eyebrow tone="stone" size="sm">No groups yet</Eyebrow>
          <p style={{ font: '600 26px/1.2 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)', margin: 0 }}>Nothing meets under {ministry.name} yet.</p>
          <p style={{ font: '400 16px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '56ch', textWrap: 'pretty' } as CSSProperties}>
            A group is a class, a community group or a team, with a name, a time, a room and at least one person serving in it. You can add the first one now and fill in the rest as it settles.
          </p>
          {canEdit ? <div><Button variant="outline" size="md" onClick={addGroup}>Add the first group</Button></div> : null}
        </section>
      ) : null}

      <section style={{ display: 'grid', gap: 18 }}>
        {shown.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            canEdit={canEdit}
            editing={editing}
            setEditing={setEditing}
            onCommit={commitEdit}
            adding={adding?.groupId === group.id ? adding : null}
            setAdding={setAdding}
            onConfirmAdd={confirmAdd}
            patchGroup={patchGroup}
            patchAssignment={patchAssignment}
          />
        ))}
        {shown.length === 0 && all.length > 0 ? <p style={{ ...meta, margin: 0 }}>{gapsOnly ? 'Every leading role is named.' : 'Every group here has ended. Show the ended groups to see them.'}</p> : null}
        {canEdit && all.length > 0 ? (
          <button type="button" onClick={addGroup} style={{ justifySelf: 'start', background: 'none', border: '1px dashed var(--border-control)', borderRadius: 'var(--mbc-radius-input)', padding: '0 20px', minHeight: 48, cursor: 'pointer', font: '400 16px/1 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
            Add a class, community group or team…
          </button>
        ) : null}
      </section>
    </div>
  )
}

/* ------------------------------------------------------------- one group */

const FACT_LABEL = { meets: 'Meets', location: 'Location', audienceNote: 'Audience note' } as const

function GroupCard({ group, canEdit, editing, setEditing, onCommit, adding, setAdding, onConfirmAdd, patchGroup, patchAssignment }: {
  group: ServingGroup
  canEdit: boolean
  editing: Editing
  setEditing(next: Editing): void
  onCommit(): void
  adding: Adding | null
  setAdding(next: Adding | null): void
  onConfirmAdd(): void
  patchGroup(group: ServingGroup, label: string, fields: Partial<ServingGroup>): void
  patchAssignment(assignment: ServingAssignment, label: string, fields: Partial<ServingAssignment>): void
}) {
  const data = useData()
  const locked = group.endedOn !== null
  const editable = canEdit && !locked
  const rows = serving(data, group.id)
  const gap = !locked && hasGap(data, group)
  const leads = LEADS[group.kind]
  const roster = data.people.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name))
  const ground = locked ? 'var(--surface-panel)' : 'var(--surface-card)'

  const openAdd = (roleSlug: string) => setAdding({ groupId: group.id, name: '', roleSlug })
  const endGroup = () => patchGroup(group, `${group.name} has ended. It is kept, not deleted — show the ended groups to find it.`, { endedOn: todayIso() })
  const reopen = () => patchGroup(group, `${group.name} is open again, and editable.`, { endedOn: null })
  const endAssignment = (a: ServingAssignment) =>
    patchAssignment(a, `${personName(data.people, a.personId)} no longer serves in ${group.name}. The person record stays.`, { endedOn: todayIso(), isPrimary: false })

  return (
    <article style={{ background: ground, border: `1px solid ${locked ? 'var(--border-section)' : 'var(--border-card)'}`, borderRadius: 'var(--mbc-radius-panel)', padding: 'clamp(22px, 2.2vw, 30px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 22px', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 18, borderBottom: '1px solid var(--border-hairline)' }}>
        <div style={{ minWidth: 0, display: 'grid', gap: 9 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 14px', alignItems: 'center' }}>
            {editable ? (
              <select
                value={group.kind}
                aria-label="What kind of group this is"
                onChange={(event) => {
                  const kind = event.target.value as GroupKind
                  patchGroup(group, `Kind changed to ${KIND_LABEL[kind].toLowerCase()}. The leading role it needs changed with it.`, { kind })
                }}
                style={{ ...field, width: 'auto', font: '700 12px/1 var(--mbc-font-sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-category)' }}
              >
                {KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
              </select>
            ) : (
              <Eyebrow tone="sage" size="sm">{KIND_LABEL[group.kind]}</Eyebrow>
            )}
            {locked ? <span style={{ ...meta, border: '1px solid var(--mbc-border-chip)', borderRadius: 'var(--mbc-radius-pill)', padding: '6px 12px' }}>Ended {formatShort(parseDate(group.endedOn))}</span> : null}
          </div>
          <InlineText
            editKey={`group:${group.id}:name`}
            value={group.name}
            display={group.name}
            placeholder="The group's name"
            editTitle={`Rename ${group.name}`}
            editing={editing}
            setEditing={setEditing}
            onCommit={onCommit}
            canEdit={editable}
            style={{ font: '600 22px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)' }}
          />
        </div>
        <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
          {gap ? (
            <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
              <p style={{ font: '700 13px/1.3 var(--mbc-font-sans)', color: 'var(--text-eyebrow)', margin: 0 }}>No {LEAD_WORD[group.kind]} named.</p>
              {canEdit ? <Chip onClick={() => openAdd(leads[0])}>Name a {LEAD_WORD[group.kind]}</Chip> : null}
            </div>
          ) : null}
          {canEdit ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', alignItems: 'center' }}>
              {locked ? (
                <button type="button" onClick={reopen} style={linkButton}>Reopen this group</button>
              ) : (
                <button type="button" onClick={endGroup} style={linkButton}>End this group</button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginTop: 18 }}>
        {(['meets', 'location', 'audienceNote'] as const).map((fact, index) => (
          <div key={fact} style={{ flex: '1 1 210px', minWidth: 0, borderLeft: index ? '1px solid var(--border-hairline)' : 'none', padding: '14px 16px 16px', display: 'grid', gap: 7, alignContent: 'start' }}>
            <Eyebrow tone="stone" size="sm">{FACT_LABEL[fact]}</Eyebrow>
            <InlineText
              editKey={`group:${group.id}:${fact}`}
              value={group[fact]}
              display={group[fact] || 'Not set'}
              placeholder={fact === 'meets' ? 'Sundays 10:00 AM' : fact === 'location' ? 'Room or building' : 'Free text — never a roster'}
              editTitle={`Edit ${FACT_LABEL[fact].toLowerCase()} for ${group.name}`}
              editing={editing}
              setEditing={setEditing}
              onCommit={onCommit}
              canEdit={editable}
              style={{ font: '400 16px/1.5 var(--mbc-font-sans)', color: fact === 'audienceNote' ? 'var(--text-body)' : 'var(--text-heading)' }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-hairline)' }}>
          <Eyebrow size="sm">Who serves</Eyebrow>
          <span className="tabular" style={meta}>
            {rows.length ? `${rows.length} ${plural(rows.length, ['person', 'people'])} · primary contact first${editable ? ' · change a role, a name, or remove anyone on the row' : ''}` : 'nobody named yet'}
          </span>
        </div>
        <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
          {rows.map((assignment, index) => {
            const person = data.people.find((p) => p.id === assignment.personId)
            const name = person?.name ?? 'Someone no longer on the roster'
            const roleName = data.servingRoles.find((r) => r.slug === assignment.roleSlug)?.name ?? assignment.roleSlug
            const key = `person:${assignment.personId}:name`
            const isEditing = editing?.key === key
            return (
              <div key={assignment.id} style={{ background: ground, padding: '13px 2px', display: 'flex', flexWrap: 'wrap', gap: '10px 18px', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
                {isEditing && person ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={editing.value}
                      aria-label={`Name of ${person.name}`}
                      onChange={(event) => setEditing({ key, value: event.target.value })}
                      onKeyDown={(event) => { if (event.key === 'Enter') onCommit(); if (event.key === 'Escape') setEditing(null) }}
                      style={{ ...field, minWidth: 200 }}
                    />
                    <button type="button" onClick={onCommit} style={doneButton}>Done</button>
                    <span style={meta}>Renames them on the roster too.</span>
                  </div>
                ) : (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', alignItems: 'baseline' }}>
                    <span style={{ font: '400 16px/1.45 var(--mbc-font-sans)', color: locked ? 'var(--text-meta)' : 'var(--text-heading)' }}>{name}</span>
                    <span style={{ font: '400 16px/1.45 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>· {roleName}</span>
                    {!locked && index === 0 ? <Eyebrow tone="sage" size="sm" style={{ alignSelf: 'center' }}>Primary contact</Eyebrow> : null}
                    {!locked && index !== 0 && leads.includes(assignment.roleSlug) ? <Eyebrow tone="stone" size="sm" style={{ alignSelf: 'center' }}>Leading role</Eyebrow> : null}
                  </span>
                )}
                {editable && !isEditing ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', alignItems: 'center' }}>
                    <select
                      value={assignment.roleSlug}
                      aria-label={`Role of ${name} in ${group.name}`}
                      onChange={(event) => {
                        const role = data.servingRoles.find((r) => r.slug === event.target.value)
                        if (role) patchAssignment(assignment, `${name} is now ${role.name.toLowerCase()} in ${group.name}.`, { roleSlug: role.slug })
                      }}
                      style={{ ...field, width: 'auto', font: '400 15px/1 var(--mbc-font-sans)' }}
                    >
                      {data.servingRoles.map((role) => <option key={role.slug} value={role.slug}>{role.name}</option>)}
                    </select>
                    {index !== 0 ? (
                      <button type="button" onClick={() => patchAssignment(assignment, `${name} is the one to call for ${group.name}.`, { isPrimary: true })} style={linkButton}>
                        Make primary
                      </button>
                    ) : null}
                    {person ? <IconButton title={`Change the name of ${name}`} onClick={() => setEditing({ key, value: person.name })}>✎</IconButton> : null}
                    <IconButton title={`Remove ${name} from ${group.name}. The person record stays.`} onClick={() => endAssignment(assignment)}>×</IconButton>
                  </div>
                ) : null}
              </div>
            )
          })}
          {rows.length === 0 ? <div style={{ background: ground, padding: '15px 2px' }}><p style={{ font: '400 16px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>Nobody is named in this group yet.</p></div> : null}
        </div>

        {adding ? (
          <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-section)', borderRadius: 'var(--mbc-radius-input)', padding: 16, marginTop: 14, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <input
                autoFocus
                value={adding.name}
                list={`roster-${group.id}`}
                placeholder="Type a name"
                aria-label={`Who to add to ${group.name}`}
                onChange={(event) => setAdding({ ...adding, name: event.target.value })}
                onKeyDown={(event) => { if (event.key === 'Enter') onConfirmAdd(); if (event.key === 'Escape') setAdding(null) }}
                style={{ ...field, minWidth: 230 }}
              />
              <datalist id={`roster-${group.id}`}>{roster.map((p) => <option key={p.id} value={p.name} />)}</datalist>
              <select value={adding.roleSlug} aria-label="Their role" onChange={(event) => setAdding({ ...adding, roleSlug: event.target.value })} style={{ ...field, width: 'auto' }}>
                {data.servingRoles.map((role) => <option key={role.slug} value={role.slug}>{role.name}</option>)}
              </select>
              <Button variant="dark" size="sm" disabled={adding.name.trim().length === 0} onClick={onConfirmAdd}>Add to this group</Button>
              <button type="button" onClick={() => setAdding(null)} style={{ ...linkButton, color: 'var(--text-meta)' }}>Cancel</button>
            </div>
            <p style={{ ...meta, margin: 0, maxWidth: '64ch' }}>A name typed here that is not already on the roster creates the person and assigns them in one motion. Leaving to create a record first is how a class ends up with no teacher on file.</p>
          </div>
        ) : editable ? (
          <button type="button" onClick={() => openAdd(gap ? leads[0] : 'volunteer')} style={{ background: 'none', border: '1px dashed var(--border-control)', borderRadius: 'var(--mbc-radius-input)', padding: '0 16px', minHeight: 44, marginTop: 14, cursor: 'pointer', font: '400 16px/1 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
            Add someone…
          </button>
        ) : null}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------ the pieces */

function GapBand({ count, where, note }: { count: number; where: string; note: string }) {
  return (
    <section style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 32px', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-panel)', border: '1px solid var(--border-section)', borderRadius: 'var(--mbc-radius-card)', padding: '22px clamp(20px, 2vw, 28px)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span className="tabular" style={{ font: '600 40px/1 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>{count}</span>
        <div>
          <p style={{ font: '700 13px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>{count === 1 ? 'group with nobody in its leading role' : 'groups with nobody in their leading role'}</p>
          <p style={{ ...meta, margin: '4px 0 0' }}>{where}</p>
        </div>
      </div>
      <p style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '52ch', textWrap: 'pretty' } as CSSProperties}>{note}</p>
    </section>
  )
}

/** A value that is a button at rest and a field when clicked. Done, Enter or
    leaving the field commits one undoable change; Escape drops it. The ✎ is
    the edit affordance the design system permits, one character in the type
    stack, always with a title naming the thing being edited. */
function InlineText({ editKey, value, display, placeholder, editTitle, editing, setEditing, onCommit, canEdit, style }: {
  editKey: string
  value: string
  display: string
  placeholder: string
  editTitle: string
  editing: Editing
  setEditing(next: Editing): void
  onCommit(): void
  canEdit: boolean
  style: CSSProperties
}) {
  const isEditing = editing?.key === editKey
  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input
          autoFocus
          value={editing.value}
          placeholder={placeholder}
          aria-label={editTitle}
          onChange={(event) => setEditing({ key: editKey, value: event.target.value })}
          onBlur={onCommit}
          onKeyDown={(event) => { if (event.key === 'Enter') onCommit(); if (event.key === 'Escape') setEditing(null) }}
          style={{ ...field, minWidth: 'min(320px, 100%)', font: style.font ?? field.font }}
        />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onCommit} style={doneButton}>Done</button>
      </div>
    )
  }
  if (!canEdit) return <span style={style}>{display}</span>
  const open = () => setEditing({ key: editKey, value })
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      <button type="button" onClick={open} style={{ textAlign: 'left', background: 'none', border: '1px solid transparent', borderRadius: 8, padding: '4px 8px', margin: '-4px -8px', cursor: 'pointer', ...style }}>{display}</button>
      <IconButton title={editTitle} onClick={open}>✎</IconButton>
    </span>
  )
}

function IconButton({ title, onClick, children }: { title: string; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} style={{ background: 'none', border: '1px solid transparent', borderRadius: 'var(--mbc-radius-pill)', width: 44, minHeight: 44, cursor: 'pointer', font: '400 17px/1 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
      {children}
    </button>
  )
}

function plural(n: number, [one, many]: [string, string]): string {
  return n === 1 ? one : many
}

const lead: CSSProperties = { font: '400 16px/1.7 var(--mbc-font-sans)', color: 'var(--text-meta)', maxWidth: '66ch' }
const meta: CSSProperties = { font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const cardStyle: CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--mbc-radius-panel)' }
const field: CSSProperties = { width: '100%', minHeight: 44, background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 'var(--mbc-radius-input)', padding: '0 12px', font: '400 16px/1.2 var(--mbc-font-sans)', color: 'var(--text-heading)' }
const linkButton: CSSProperties = { background: 'none', border: 'none', padding: '0 4px', minHeight: 44, cursor: 'pointer', font: '400 14px/1 var(--mbc-font-sans)', color: 'var(--text-link)' }
const doneButton: CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: '700 13px/1 var(--mbc-font-sans)', color: 'var(--text-link)' }

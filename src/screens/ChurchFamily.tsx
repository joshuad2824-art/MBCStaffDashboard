import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import type { DashboardData, FamilyKind, FamilyNews, MemberDate } from '../data/types'
import { nextId, personName } from '../lib/derive'
import { startOfToday, todayIso } from '../lib/date'
import { cleanLink } from '../lib/needs'
import { KINDS, SITUATIONS, comingRound, defaultShowUntil, grouped, kindInfo, onTheBoard, shortDay, whenLabel } from '../lib/family'
import { planImport } from '../lib/breezeImport'
import type { ImportPlan } from '../lib/breezeImport'

/* Church family (home brief §4): what the church would announce — new members,
   baptisms, births, passings, who is in the hospital — and the birthdays and
   anniversaries coming round. A reading surface, not a records system.

   Two rules, said in the form where they apply: an illness entry says where
   someone is and how to reach them, never what is wrong; and only what the
   family has shared with the church goes on the board. Nothing is copied from
   Care.

   Anyone on staff may add, edit or remove an entry they can see (Joshua,
   10 November 2026). Illness and expecting are the staff role's alone — a
   limited account is not offered them and the database refuses them anyway. */

export function ChurchFamily() {
  const data = useData()
  const { mutate } = useStore()
  const { member, viewAs, admin, previewSeat } = useSession()
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState(params.get('new') === '1')
  const today = startOfToday()
  const staffRole = viewAs === 'staff'
  const board = useMemo(() => grouped(onTheBoard(data, today)), [data, today])
  const soon = comingRound(data.memberDates, 14, today)

  if (!member) return null

  const add = (entry: Omit<FamilyNews, 'id' | 'postedBy' | 'createdAt' | 'restricted'>) => {
    mutate(`Added to church family: ${entry.names}`, (current) => ({
      ...current,
      familyNews: [
        ...current.familyNews,
        { ...entry, id: nextId(current.familyNews), postedBy: member.id, createdAt: new Date().toISOString(), restricted: kindInfo(entry.kind).restricted },
      ],
    }))
    setAdding(false)
    setParams({}, { replace: true })
  }

  return (
    <div style={{ display: 'grid', gap: 26, maxWidth: 900 }}>
      {adding ? (
        <Card radius="panel" pad="22px 24px" style={{ border: '1px solid var(--border-card)' }}>
          <FamilyForm staffRole={staffRole} submit="Add to the board" onSubmit={add} onCancel={() => setAdding(false)} />
        </Card>
      ) : (
        <div>
          <Button variant="dark" onClick={() => setAdding(true)}>
            Add church-family news
          </Button>
        </div>
      )}

      {board.length === 0 ? (
        <p style={{ margin: 0, font: '400 19px/1.6 var(--mbc-font-serif)', color: 'var(--text-meta)' }}>Nothing on the board. Add what the church would announce.</p>
      ) : (
        <div style={{ display: 'grid', gap: 22 }}>
          {board.map((group) => (
            <section key={group.info.kind} aria-label={group.info.heading} style={{ display: 'grid', gap: 10 }}>
              <h2 className="tile-label" style={{ color: 'var(--text-category)', fontSize: 12 }}>{group.info.heading}</h2>
              {group.entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} data={data} staffRole={staffRole} />
              ))}
            </section>
          ))}
        </div>
      )}

      <section aria-label="Coming round" style={{ display: 'grid', gap: 10 }}>
        <h2 className="tile-label" style={{ color: 'var(--text-category)', fontSize: 12 }}>Birthdays and anniversaries · next two weeks</h2>
        {soon.length === 0 ? (
          <p style={{ margin: 0, ...reading, color: 'var(--text-meta)' }}>None in the next two weeks.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            {soon.map(({ entry, date, years }) => (
              <li key={entry.id} style={{ ...reading, display: 'flex', gap: 14 }}>
                <span className="tabular" style={{ width: 110, flex: 'none', color: 'var(--text-meta)' }}>{shortDay(date)}</span>
                <span>
                  {entry.names}
                  <span style={{ color: 'var(--text-meta)' }}> · {entry.kind === 'birthday' ? 'birthday' : years ? `${years} years` : 'anniversary'}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MemberDates data={data} />

      {admin && !previewSeat ? <BreezeImport data={data} /> : null}
    </div>
  )
}

/* ----------------------------------------------------------------- the form */

type Draft = Omit<FamilyNews, 'id' | 'postedBy' | 'createdAt' | 'restricted'>

/** Splits an illness entry's one line back into situation and where. */
function splitIllness(detail: string): { situation: string; where: string } {
  const found = SITUATIONS.find((s) => detail.startsWith(s))
  return found ? { situation: found, where: detail.slice(found.length).replace(/^\s*[—-]\s*/, '') } : { situation: SITUATIONS[0], where: detail }
}

function FamilyForm({
  staffRole,
  initial,
  submit,
  onSubmit,
  onCancel,
}: {
  staffRole: boolean
  initial?: Draft
  submit: string
  onSubmit(draft: Draft): void
  onCancel(): void
}) {
  const kinds = KINDS.filter((k) => staffRole || !k.restricted)
  const [kind, setKind] = useState<FamilyKind>(initial?.kind ?? 'baptism')
  const [names, setNames] = useState(initial?.names ?? '')
  const [onDate, setOnDate] = useState(initial?.onDate ?? '')
  const [detail, setDetail] = useState(initial && initial.kind !== 'illness' && initial.kind !== 'birth' ? initial.detail : '')
  const ill = splitIllness(initial?.kind === 'illness' ? initial.detail : '')
  const [situation, setSituation] = useState<string>(ill.situation)
  const [where, setWhere] = useState(ill.where)
  const [child, setChild] = useState(initial?.kind === 'birth' ? initial.detail : 'a son')
  const [link, setLink] = useState(initial?.link ?? '')
  const [showUntil, setShowUntil] = useState(initial?.showUntil ?? '')
  const info = kindInfo(kind)
  const linkOk = !link.trim() || cleanLink(link) !== ''
  const ready = names.trim() && linkOk

  const send = () => {
    if (!ready) return
    const line = kind === 'illness' ? [situation, where.trim()].filter(Boolean).join(' — ') : kind === 'birth' ? child : detail.trim()
    const date = info.date ? onDate || null : null
    onSubmit({ kind, names: names.trim(), onDate: date, detail: line.slice(0, 280), link: cleanLink(link), showUntil: showUntil || defaultShowUntil(kind, date) })
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
      style={{ display: 'grid', gap: 14 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Field label="What">
          <select value={kind} onChange={(event) => setKind(event.target.value as FamilyKind)} style={input}>
            {kinds.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.one}
                {k.restricted ? ' · staff only' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={info.names}>
          <input value={names} onChange={(event) => setNames(event.target.value)} placeholder={info.namesHint} maxLength={200} style={input} />
        </Field>
        {info.date ? (
          <Field label={`${info.date} · optional`}>
            <input type="date" value={onDate} onChange={(event) => setOnDate(event.target.value)} style={input} />
          </Field>
        ) : null}
      </div>

      {kind === 'illness' ? (
        <>
          <p style={{ margin: 0, font: '700 15px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>Where they are and how to reach them — never what is wrong.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Field label="Situation">
              <select value={situation} onChange={(event) => setSituation(event.target.value)} style={input}>
                {SITUATIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Where cards or visits go · optional">
              <input value={where} onChange={(event) => setWhere(event.target.value)} placeholder="Saint Francis, room 412 — cards welcome" maxLength={200} style={input} />
            </Field>
          </div>
        </>
      ) : kind === 'birth' ? (
        <Field label="A son or a daughter">
          <select value={child} onChange={(event) => setChild(event.target.value)} style={input}>
            <option>a son</option>
            <option>a daughter</option>
            <option>twins</option>
          </select>
        </Field>
      ) : (
        <Field label="One line · optional">
          <input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={info.detailHint} maxLength={280} style={input} />
        </Field>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Field label={kind === 'passing' ? 'Obituary or livestream · optional' : 'Link · optional'}>
          <input value={link} onChange={(event) => setLink(event.target.value)} inputMode="url" placeholder="https://" style={input} aria-invalid={!linkOk} />
          {!linkOk ? <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-body)' }}>A link has to be a web address.</span> : null}
        </Field>
        <Field label="On the board until · optional">
          <input type="date" value={showUntil} min={todayIso()} onChange={(event) => setShowUntil(event.target.value)} style={input} />
        </Field>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Button type="submit" variant="dark" disabled={!ready}>
          {submit}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Never mind
        </Button>
        <span style={{ font: '400 15px/1.45 var(--mbc-font-sans)', color: 'var(--text-meta)', flex: '1 1 260px' }}>
          Only what the family has shared with the church.
          {info.restricted ? ' Staff role only — limited accounts do not see this kind.' : ''}
        </span>
      </div>
    </form>
  )
}

/* ---------------------------------------------------------------- an entry */

function EntryCard({ entry, data, staffRole }: { entry: FamilyNews; data: DashboardData; staffRole: boolean }) {
  const { mutate } = useStore()
  const [editing, setEditing] = useState(false)
  const when = whenLabel(entry)

  if (editing) {
    return (
      <Card radius="panel" pad="20px 22px" style={{ border: '1px solid var(--border-card)' }}>
        <FamilyForm
          staffRole={staffRole}
          initial={entry}
          submit="Save"
          onCancel={() => setEditing(false)}
          onSubmit={(draft) => {
            mutate(`Edited: ${draft.names}`, (current) => ({
              ...current,
              familyNews: current.familyNews.map((e) => (e.id === entry.id ? { ...e, ...draft, restricted: kindInfo(draft.kind).restricted } : e)),
            }))
            setEditing(false)
          }}
        />
      </Card>
    )
  }

  return (
    <article aria-label={`${kindInfo(entry.kind).one}: ${entry.names}`} style={{ background: 'var(--tile-chalk)', color: 'var(--tile-tint-ink)', borderRadius: 'var(--mbc-radius-panel)', padding: '18px 22px', display: 'grid', gap: 6 }}>
      <p style={{ margin: 0, font: '600 22px/1.3 var(--mbc-font-serif)' }}>{entry.names}</p>
      {when || entry.detail ? (
        <p style={{ margin: 0, ...reading }}>
          {[when, entry.kind === 'birth' && entry.detail ? `welcomed ${entry.detail}` : entry.detail].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {entry.link ? (
        <a href={entry.link} target="_blank" rel="noopener noreferrer" style={{ font: '700 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', justifySelf: 'start' }}>
          {entry.kind === 'passing' ? 'Obituary ↗' : 'Open the link ↗'}
        </a>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 18px' }}>
        <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
          Posted by {personName(data.people, entry.postedBy)} · up until {shortDay(new Date(entry.showUntil + 'T12:00'))}
        </span>
        <TextButton onClick={() => setEditing(true)}>Edit</TextButton>
        <TextButton
          onClick={() => {
            if (window.confirm(`Take “${entry.names}” off the board?`)) mutate(`Removed from church family: ${entry.names}`, (current) => ({ ...current, familyNews: current.familyNews.filter((e) => e.id !== entry.id) }))
          }}
        >
          Remove
        </TextButton>
      </div>
    </article>
  )
}

/* ---------------------------------------------- birthdays and anniversaries */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function MemberDates({ data }: { data: DashboardData }) {
  const { mutate } = useStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const all = [...data.memberDates].sort((a, b) => a.month - b.month || a.day - b.day || a.names.localeCompare(b.names))

  const save = (draft: Omit<MemberDate, 'id' | 'source'>, id: number | 'new') => {
    const clean = { ...draft, year: draft.kind === 'birthday' ? null : draft.year }
    if (id === 'new') mutate(`Added a ${clean.kind}: ${clean.names}`, (current) => ({ ...current, memberDates: [...current.memberDates, { ...clean, id: nextId(current.memberDates), source: 'manual' }] }))
    else mutate(`Edited: ${clean.names}`, (current) => ({ ...current, memberDates: current.memberDates.map((m) => (m.id === id ? { ...m, ...clean } : m)) }))
    setEditing(null)
  }

  return (
    <section aria-label="All birthdays and anniversaries" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ ...plain, font: '700 16px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)', minHeight: 44 }}>
          {open ? '▾' : '▸'} All birthdays and anniversaries · {all.length}
        </button>
        {open ? <Button variant="outline" size="sm" onClick={() => setEditing('new')}>Add one</Button> : null}
      </div>
      {open ? (
        <>
          <p style={{ margin: 0, font: '400 15px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>Birthdays are adults only, and keep no year.</p>
          {editing === 'new' ? <DateForm onSave={(d) => save(d, 'new')} onCancel={() => setEditing(null)} /> : null}
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
            {all.map((m) =>
              editing === m.id ? (
                <li key={m.id}>
                  <DateForm initial={m} onSave={(d) => save(d, m.id)} onCancel={() => setEditing(null)} />
                </li>
              ) : (
                <li key={m.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 16px', padding: '6px 0', borderTop: '1px solid var(--border-hairline)', font: '400 17px/1.4 var(--mbc-font-sans)' }}>
                  <span className="tabular" style={{ width: 130, color: 'var(--text-meta)' }}>{MONTH_NAMES[m.month - 1]} {m.day}</span>
                  <span style={{ flex: 1, minWidth: 180, color: 'var(--text-heading)' }}>
                    {m.names}
                    <span style={{ color: 'var(--text-meta)' }}> · {m.kind}{m.kind === 'anniversary' && m.year ? `, since ${m.year}` : ''}{m.source === 'breeze-import' ? ' · from Breeze' : ''}</span>
                  </span>
                  <TextButton onClick={() => setEditing(m.id)}>Edit</TextButton>
                  <TextButton
                    onClick={() => {
                      if (window.confirm(`Remove ${m.names}’s ${m.kind}?`)) mutate(`Removed a ${m.kind}: ${m.names}`, (current) => ({ ...current, memberDates: current.memberDates.filter((x) => x.id !== m.id) }))
                    }}
                  >
                    Remove
                  </TextButton>
                </li>
              ),
            )}
          </ul>
        </>
      ) : null}
    </section>
  )
}

function DateForm({ initial, onSave, onCancel }: { initial?: MemberDate; onSave(draft: Omit<MemberDate, 'id' | 'source'>): void; onCancel(): void }) {
  const [names, setNames] = useState(initial?.names ?? '')
  const [kind, setKind] = useState<MemberDate['kind']>(initial?.kind ?? 'birthday')
  const [month, setMonth] = useState(initial?.month ?? 1)
  const [day, setDay] = useState(initial?.day ?? 1)
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '')
  const days = new Date(2000, month, 0).getDate()
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (names.trim()) onSave({ names: names.trim(), kind, month, day: Math.min(day, days), year: kind === 'anniversary' && /^\d{4}$/.test(year) ? Number(year) : null })
      }}
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10, padding: '10px 0' }}
    >
      <Field label="Who" style={{ flex: '2 1 200px' }}>
        <input value={names} onChange={(event) => setNames(event.target.value)} placeholder={kind === 'birthday' ? 'Linda Rogers' : 'Tom and Linda Rogers'} style={input} />
      </Field>
      <Field label="Which" style={{ flex: '1 1 140px' }}>
        <select value={kind} onChange={(event) => setKind(event.target.value as MemberDate['kind'])} style={input}>
          <option value="birthday">Birthday · adult</option>
          <option value="anniversary">Anniversary</option>
        </select>
      </Field>
      <Field label="Month" style={{ flex: '1 1 140px' }}>
        <select value={month} onChange={(event) => setMonth(Number(event.target.value))} style={input}>
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>
      </Field>
      <Field label="Day" style={{ flex: '0 1 90px' }}>
        <input type="number" min={1} max={days} value={day} onChange={(event) => setDay(Number(event.target.value) || 1)} style={input} />
      </Field>
      {kind === 'anniversary' ? (
        <Field label="Year · optional" style={{ flex: '0 1 110px' }}>
          <input inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1976" style={input} />
        </Field>
      ) : null}
      <Button type="submit" variant="dark" size="sm" disabled={!names.trim()}>Save</Button>
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>Never mind</Button>
    </form>
  )
}

/* ------------------------------------------------------- the Breeze import */

/** The administrator's: a Breeze people export in, a preview of what it would
    add, update and skip, and nothing written until Commit. The file stays in
    this browser; only names, months, days and anniversary years are saved. */
function BreezeImport({ data }: { data: DashboardData }) {
  const { mutate } = useStore()
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [fileName, setFileName] = useState('')

  const read = async (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setPlan(planImport(await file.text(), data.memberDates, startOfToday()))
  }

  const commit = () => {
    if (!plan) return
    mutate(`Imported from Breeze: ${plan.add.length} added, ${plan.update.length} updated`, (current) => {
      let id = nextId(current.memberDates)
      const updates = new Map(plan.update.map((u) => [u.id, u.now]))
      return {
        ...current,
        memberDates: [
          ...current.memberDates.map((m) => (updates.has(m.id) ? { ...m, ...updates.get(m.id), source: 'breeze-import' as const } : m)),
          ...plan.add.map((a) => ({ ...a, id: id++, source: 'breeze-import' as const })),
        ],
      }
    })
    setPlan(null)
    setFileName('')
  }

  return (
    <section aria-label="Import from Breeze" style={{ display: 'grid', gap: 12, paddingTop: 18, borderTop: '1px solid var(--border-section)' }}>
      <h2 className="tile-label" style={{ color: 'var(--text-category)', fontSize: 12 }}>Import birthdays and anniversaries from Breeze · administrator</h2>
      <p style={{ margin: 0, font: '400 16px/1.55 var(--mbc-font-sans)', color: 'var(--text-body)' }}>
        Export people from Breeze as a CSV with first name, last name, birthdate and anniversary. Anyone under 18, and anyone without a birth year, is skipped. Nothing is saved until you commit.
      </p>
      <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, font: '400 16px/1.4 var(--mbc-font-sans)' }}>
        <span style={{ ...labelStyle }}>Breeze export</span>
        <input type="file" accept=".csv,text/csv" onChange={(event) => void read(event.target.files?.[0])} />
      </label>
      {plan ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <p style={{ margin: 0, font: '700 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
            {fileName}: {plan.add.length} to add · {plan.update.length} to update · {plan.skip.length} skipped
          </p>
          <PlanList title="To add" items={plan.add.map((a) => `${a.names} — ${a.kind}, ${MONTH_NAMES[a.month - 1]} ${a.day}${a.year ? `, ${a.year}` : ''}`)} />
          <PlanList title="To update" items={plan.update.map((u) => `${u.now.names} — ${MONTH_NAMES[u.was.month - 1]} ${u.was.day} → ${MONTH_NAMES[u.now.month - 1]} ${u.now.day}`)} />
          <PlanList title="Skipped" items={plan.skip.map((s) => `${s.names} — ${s.reason}`)} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="dark" onClick={commit} disabled={plan.add.length + plan.update.length === 0}>
              Commit
            </Button>
            <Button variant="outline" onClick={() => setPlan(null)}>Never mind</Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <details>
      <summary style={{ font: '700 15px/1.4 var(--mbc-font-sans)', cursor: 'pointer', minHeight: 32 }}>{title} · {items.length}</summary>
      <ul style={{ margin: '6px 0 0', paddingLeft: 22, font: '400 15px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)' }}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </details>
  )
}

/* ---------------------------------------------------------------- bits */

function Field({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <label style={{ display: 'grid', gap: 6, ...style }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  )
}

function TextButton({ onClick, children }: { onClick(): void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ ...plain, font: '700 15px/1.3 var(--mbc-font-sans)', color: 'var(--text-link)', minHeight: 40 }}>
      {children}
    </button>
  )
}

const plain: CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }
/** The reading size: 19px in the serif, as the brief asks for this panel (§2.4). */
const reading: CSSProperties = { font: '400 19px/1.5 var(--mbc-font-serif)' }
const labelStyle: CSSProperties = { font: '700 12px/1.2 var(--mbc-font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-category)' }
const input: CSSProperties = {
  minHeight: 48,
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-input)',
  borderRadius: 10,
  padding: '0 14px',
  font: '400 17px/1.3 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
}

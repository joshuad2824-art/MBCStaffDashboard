import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Chip } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import { canSignIn } from '../data/types'
import type { DashboardData, Id, Need } from '../data/types'
import { nextId, personName } from '../lib/derive'
import { todayIso } from '../lib/date'
import { byNeededBy, cleanLink, dayLabel, isOpen, markDone, markSeen, neededByLabel, reopen, setTags, taggedOn, unseenBy, waitingOn } from '../lib/needs'
import { Markdown } from './reference/Markdown'

/* Needs (home brief §3). A staff member posts a short need, tags the people
   whose input it needs, and they see it on Home under Waiting on you until it
   is done. A need with nobody tagged is a to-do.

   Deliberately not an approval workflow: no required approver, no statuses, no
   step the page insists on. Open and done, and anyone may move a need between
   them; the database records who and when. A tagged person with input replies
   in the comments. The author may edit the ask at any time. Nothing here is
   deleted: done needs stay behind Show done, newest first.

   Posting a need and replying are not undo steps — nothing in Needs is
   deleted, so an undo could only hide what the database keeps. Marking done,
   reopening and editing are, because undoing them writes back cleanly. */

type Filter = 'open' | 'waiting' | 'mine'

export function Needs() {
  const data = useData()
  const { mutate, update, say } = useStore()
  const { member } = useSession()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('open')
  const [showDone, setShowDone] = useState(false)
  const composing = params.get('new') === '1'
  const focusId = Number(params.get('need')) || null

  const me = member?.id ?? null
  const waiting = useMemo(() => waitingOn(data, me), [data, me])
  const open = useMemo(() => data.needs.filter(isOpen).sort(byNeededBy), [data.needs])
  const done = useMemo(() => data.needs.filter((need) => !isOpen(need)).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')), [data.needs])
  const shown = filter === 'waiting' ? waiting : filter === 'mine' ? open.filter((need) => need.createdBy === me) : open

  /* Opening the page is seeing what is waiting on you. Not an undo step and
     not a gate: seen_at only quiets the "new" mark on Home. */
  const hasUnseen = me !== null && data.needTags.some((tag) => tag.personId === me && tag.seenAt === null)
  useEffect(() => {
    if (me !== null && hasUnseen) update((current) => markSeen(current, me))
  }, [me, hasUnseen, update])

  if (!member) return null

  const post = (draft: Draft) => {
    const id = nextId(data.needs)
    update((current) => {
      const need: Need = {
        id, title: draft.title.trim(), body: draft.body.trim(), link: cleanLink(draft.link), neededBy: draft.neededBy || null,
        createdBy: member.id, createdAt: new Date().toISOString(), doneAt: null, doneBy: null,
      }
      return setTags({ ...current, needs: [...current.needs, need] }, id, draft.tagged)
    })
    say(draft.tagged.length ? `Posted. ${draft.tagged.length === 1 ? 'They’ll' : 'They’ll each'} see it on Home.` : 'Posted to your list.')
    setParams({}, { replace: true })
  }

  return (
    <div style={{ display: 'grid', gap: 22, maxWidth: 860 }}>
      <Composer key={composing ? 'focus' : 'rest'} data={data} me={member.id} autoFocus={composing} onPost={post} />

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div role="group" aria-label="Which needs" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Chip active={filter === 'open'} onClick={() => setFilter('open')} style={chip}>All open · {open.length}</Chip>
          <Chip active={filter === 'waiting'} onClick={() => setFilter('waiting')} style={chip}>Waiting on you · {waiting.length}</Chip>
          <Chip active={filter === 'mine'} onClick={() => setFilter('mine')} style={chip}>Posted by you</Chip>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, font: '400 16px/1.3 var(--mbc-font-sans)', color: 'var(--text-body)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--text-heading)' }} />
          Show done · {done.length}
        </label>
      </div>

      {shown.length === 0 ? (
        <p style={{ margin: 0, font: '400 17px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
          {filter === 'waiting' ? 'Nothing is waiting on you.' : filter === 'mine' ? 'Nothing you posted is open.' : 'Nothing open. Post one above when something can’t move without somebody.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {shown.map((need) => (
            <NeedCard key={need.id} need={need} data={data} me={member.id} focused={need.id === focusId} mutate={mutate} update={update} say={say} />
          ))}
        </div>
      )}

      {showDone ? (
        <section aria-label="Done" style={{ display: 'grid', gap: 12 }}>
          <p className="tile-label" style={{ color: 'var(--text-category)', marginTop: 8 }}>Done · newest first</p>
          {done.length === 0 ? (
            <p style={{ margin: 0, font: '400 17px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>Nothing marked done yet.</p>
          ) : (
            done.map((need) => <NeedCard key={need.id} need={need} data={data} me={member.id} focused={need.id === focusId} mutate={mutate} update={update} say={say} />)
          )}
        </section>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------ the form */

interface Draft {
  title: string
  body: string
  link: string
  neededBy: string
  tagged: Id[]
}

const empty: Draft = { title: '', body: '', link: '', neededBy: '', tagged: [] }

/** Who can be tagged: anyone on the roster who can sign in, but you. The same
    people Discussion offers to @mention. */
function taggable(data: DashboardData, me: Id) {
  return data.people.filter((person) => canSignIn(person) && person.id !== me).sort((a, b) => a.name.localeCompare(b.name))
}

function NeedForm({
  data,
  me,
  initial,
  submit,
  onSubmit,
  onCancel,
  autoFocus = false,
  compact = false,
}: {
  data: DashboardData
  me: Id
  initial: Draft
  submit: string
  onSubmit(draft: Draft): void
  onCancel?(): void
  autoFocus?: boolean
  compact?: boolean
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const title = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const open = !compact || draft.title.trim().length > 0
  const linkOk = !draft.link.trim() || cleanLink(draft.link) !== ''

  useEffect(() => {
    if (autoFocus) title.current?.focus()
  }, [autoFocus])

  const send = () => {
    if (!draft.title.trim() || !linkOk) return
    onSubmit(draft)
    setDraft(empty)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
      style={{ display: 'grid', gap: 14 }}
    >
      <label style={field}>
        <span style={label}>What do you need?</span>
        <input
          ref={title}
          value={draft.title}
          onChange={(event) => set('title', event.target.value)}
          maxLength={200}
          placeholder="Flyer for the Christmas Eve service — can you look before Thursday?"
          style={input}
        />
      </label>

      {open ? (
        <>
          <label style={field}>
            <span style={label}>Details · optional</span>
            <textarea
              value={draft.body}
              onChange={(event) => set('body', event.target.value)}
              rows={3}
              placeholder="For pastoral matters, talk in person."
              style={{ ...input, minHeight: 88, padding: '12px 14px', resize: 'vertical', lineHeight: 1.5 }}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <label style={field}>
              <span style={label}>Link · optional</span>
              <input value={draft.link} onChange={(event) => set('link', event.target.value)} placeholder="A doc, a flyer, a Canva link" inputMode="url" style={input} aria-invalid={!linkOk} />
              {!linkOk ? <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-body)' }}>A link has to be a web address.</span> : null}
            </label>
            <label style={field}>
              <span style={label}>Needed by · optional</span>
              <input type="date" value={draft.neededBy} min={initial.neededBy && initial.neededBy < todayIso() ? undefined : todayIso()} onChange={(event) => set('neededBy', event.target.value)} style={input} />
            </label>
          </div>
          <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            <legend style={{ ...label, marginBottom: 8 }}>Whose input · nobody makes it a to-do</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {taggable(data, me).map((person) => {
                const on = draft.tagged.includes(person.id)
                return (
                  <Chip key={person.id} active={on} onClick={() => set('tagged', on ? draft.tagged.filter((id) => id !== person.id) : [...draft.tagged, person.id])} style={chip}>
                    {person.name}
                  </Chip>
                )
              })}
            </div>
          </fieldset>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <Button type="submit" variant="dark" disabled={!draft.title.trim() || !linkOk}>
              {submit}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Never mind
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </form>
  )
}

function Composer({ data, me, autoFocus, onPost }: { data: DashboardData; me: Id; autoFocus: boolean; onPost(draft: Draft): void }) {
  return (
    <Card radius="panel" pad="22px 24px" style={{ border: '1px solid var(--border-card)' }}>
      <NeedForm data={data} me={me} initial={empty} submit="Post the need" onSubmit={onPost} autoFocus={autoFocus} compact />
    </Card>
  )
}

/* ------------------------------------------------------------ the card */

function NeedCard({
  need,
  data,
  me,
  focused,
  mutate,
  update,
  say,
}: {
  need: Need
  data: DashboardData
  me: Id
  focused: boolean
  mutate: ReturnType<typeof useStore>['mutate']
  update: ReturnType<typeof useStore>['update']
  say: ReturnType<typeof useStore>['say']
}) {
  const [editing, setEditing] = useState(false)
  const [talking, setTalking] = useState(focused)
  const [reply, setReply] = useState('')
  const card = useRef<HTMLElement>(null)
  const tagged = taggedOn(data, need.id)
  const comments = data.needComments.filter((comment) => comment.needId === need.id)
  const mine = need.createdBy === me
  const done = !isOpen(need)
  const due = neededByLabel(need.neededBy)
  const fresh = unseenBy(data, me, need.id)

  useEffect(() => {
    if (focused) card.current?.scrollIntoView({ block: 'center' })
  }, [focused])

  const toggle = () =>
    done ? mutate(`Reopened: ${need.title}`, (current) => reopen(current, need.id)) : mutate(`Done: ${need.title}`, (current) => markDone(current, need.id, me))

  const sendReply = () => {
    const body = reply.trim()
    if (!body) return
    const now = new Date()
    update((current) => ({
      ...current,
      needComments: [
        ...current.needComments,
        { id: nextId(current.needComments), needId: need.id, authorId: me, body, createdAt: todayIso(), time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) },
      ],
    }))
    setReply('')
    say('Replied.')
  }

  return (
    <article
      ref={card}
      id={`need-${need.id}`}
      aria-label={need.title}
      style={{
        background: 'var(--surface-card)',
        border: focused ? '2px solid var(--text-heading)' : '1px solid var(--border-card)',
        borderRadius: 'var(--mbc-radius-panel)',
        padding: '18px 22px 18px 16px',
        display: 'grid',
        gridTemplateColumns: '44px 1fr',
        gap: '4px 14px',
        opacity: done ? 0.82 : 1,
      }}
    >
      <Ring done={done} label={done ? `Reopen: ${need.title}` : `Mark done: ${need.title}`} onClick={toggle} />

      <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
        {editing ? (
          <NeedForm
            data={data}
            me={me}
            initial={{ title: need.title, body: need.body, link: need.link, neededBy: need.neededBy ?? '', tagged }}
            submit="Save"
            onCancel={() => setEditing(false)}
            onSubmit={(draft) => {
              mutate(`Edited: ${draft.title.trim()}`, (current) =>
                setTags(
                  {
                    ...current,
                    needs: current.needs.map((n) =>
                      n.id === need.id ? { ...n, title: draft.title.trim(), body: draft.body.trim(), link: cleanLink(draft.link), neededBy: draft.neededBy || null } : n,
                    ),
                  },
                  need.id,
                  draft.tagged,
                ),
              )
              setEditing(false)
            }}
          />
        ) : (
          <>
            <p style={{ margin: '8px 0 0', font: '600 21px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', textDecoration: done ? 'line-through' : undefined, textDecorationThickness: 1 }}>
              {need.title}
              {fresh ? <span style={{ marginLeft: 10, font: '700 12px/1 var(--mbc-font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-eyebrow)', verticalAlign: 'middle' }}>New</span> : null}
            </p>
            <p style={meta}>
              {personName(data.people, need.createdBy)} · {dayLabel(need.createdAt)}
              {due && !done ? <strong style={{ color: 'var(--text-heading)', fontWeight: 700 }}> · {due}</strong> : null}
            </p>
            {tagged.length > 0 ? (
              <p style={meta}>
                Asking {tagged.map((id) => (id === me ? 'you' : personName(data.people, id))).join(', ')}
              </p>
            ) : (
              <p style={meta}>A to-do — nobody tagged</p>
            )}
            {done ? <p style={{ ...meta, color: 'var(--text-heading)' }}>Done by {need.doneBy === me ? 'you' : personName(data.people, need.doneBy)} · {dayLabel(need.doneAt)}</p> : null}
            {need.body ? (
              <div style={{ marginTop: 4 }}>
                <Markdown text={need.body} />
              </div>
            ) : null}
            {need.link ? (
              <a href={need.link} target="_blank" rel="noopener noreferrer" style={{ font: '700 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', justifySelf: 'start', minHeight: 32 }}>
                Open the link ↗
              </a>
            ) : null}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 4 }}>
              <TextButton onClick={() => setTalking((v) => !v)} expanded={talking}>
                {comments.length === 0 ? 'Reply' : `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}`}
              </TextButton>
              {mine ? <TextButton onClick={() => setEditing(true)}>Edit</TextButton> : null}
            </div>

            {talking ? (
              <div style={{ display: 'grid', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border-hairline)' }}>
                {comments.map((comment) => (
                  <div key={comment.id} style={{ display: 'grid', gap: 2 }}>
                    <span style={{ font: '700 14px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                      {comment.authorId === me ? 'You' : personName(data.people, comment.authorId)}
                      <span style={{ fontWeight: 400, color: 'var(--text-meta)' }}> · {dayLabel(comment.createdAt)}{comment.time ? `, ${comment.time}` : ''}</span>
                    </span>
                    <span style={{ font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)', whiteSpace: 'pre-wrap' }}>{comment.body}</span>
                  </div>
                ))}
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    sendReply()
                  }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}
                >
                  <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Your input" aria-label={`Reply to ${need.title}`} style={{ ...input, flex: '1 1 240px' }} />
                  <Button type="submit" variant="outline" disabled={!reply.trim()}>
                    Reply
                  </Button>
                </form>
              </div>
            ) : null}
          </>
        )}
      </div>
    </article>
  )
}

/** The ring that marks a need done — one press, 44px, and it says what it
    will do. Done is a filled ring with a tick; the words carry it too. */
export function Ring({ done, label, onClick, size = 44 }: { done: boolean; label: string; onClick(): void; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      onClick={onClick}
      style={{ width: size, height: size, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', flex: 'none' }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          border: '2px solid var(--text-heading)',
          background: done ? 'var(--text-heading)' : 'transparent',
          color: 'var(--surface-card)',
          display: 'grid',
          placeItems: 'center',
          font: '700 15px/1 var(--mbc-font-sans)',
        }}
      >
        {done ? '✓' : ''}
      </span>
    </button>
  )
}

function TextButton({ onClick, expanded, children }: { onClick(): void; expanded?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      style={{ background: 'none', border: 'none', padding: '8px 0', minHeight: 40, font: '700 15px/1.3 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer' }}
    >
      {children}
    </button>
  )
}

const chip: CSSProperties = { minHeight: 44, fontSize: 14 }
const field: CSSProperties = { display: 'grid', gap: 6 }
const label: CSSProperties = { font: '700 12px/1.2 var(--mbc-font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-category)' }
const meta: CSSProperties = { margin: 0, font: '400 16px/1.45 var(--mbc-font-sans)', color: 'var(--text-meta)' }
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

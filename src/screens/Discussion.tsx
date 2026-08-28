import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Rule } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import { markThreadRead, useUnreadThreadIds } from '../lib/unread'
import { nextId, parseMentions, quotedPost, staffName, threadForgetsIn } from '../lib/derive'
import { countDays, formatShort, parseDate, startOfToday, todayIso } from '../lib/date'
import type { Post, Staff } from '../data/types'

/* Posts are a flat chronological list, not a nested tree — a staff of seven does
   not need indentation levels. A reply carries a reference to the post it
   answers and the quoted strip is rendered from that reference every time.
   Nothing is copied: edit the original and the quote follows it; delete the
   original and the strip says so. */

export function Discussion() {
  const data = useData()
  const { mutate, say } = useStore()
  const { member } = useSession()
  const navigate = useNavigate()
  const today = startOfToday()

  const [activeThreadId, setActiveThreadId] = useState<number | null>(data.threads[0]?.id ?? null)
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [promoting, setPromoting] = useState<number | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const composer = useRef<HTMLTextAreaElement>(null)

  const unreadIds = useUnreadThreadIds(member?.id ?? null, data.threads)
  const unread = useMemo(() => new Set(unreadIds), [unreadIds])

  const thread = data.threads.find((t) => t.id === activeThreadId) ?? data.threads[0] ?? null
  const posts = useMemo(
    () =>
      thread
        ? data.posts.filter((post) => post.threadId === thread.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        : [],
    [data.posts, thread],
  )

  // Opening a thread marks it read for this person. No per-post notifications:
  // one count in the nav, one digest a day.
  useEffect(() => {
    if (member && thread) markThreadRead(member.id, thread.id, thread.lastActivity)
  }, [member, thread])

  if (!member) return null

  const activeStaff = data.staff.filter((person) => person.active)

  const touchThread = (threadId: number) => (current: typeof data) => ({
    ...current,
    threads: current.threads.map((t) => (t.id === threadId ? { ...t, lastActivity: todayIso() } : t)),
  })

  const submitPost = () => {
    const body = draft.trim()
    if (!body || !thread) return
    const postId = nextId(data.posts)
    const mentioned = parseMentions(body, data.staff)
    setDraft('')
    setReplyTo(null)
    setMentionQuery(null)
    mutate('Posted to the board.', (current) => {
      const withThread = touchThread(thread.id)(current)
      const post: Post = {
        id: postId,
        threadId: thread.id,
        replyTo,
        authorId: member.id,
        body,
        createdAt: todayIso(),
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        editedAt: null,
        removed: false,
      }
      return {
        ...withThread,
        posts: [...withThread.posts, post],
        mentions: [
          ...withThread.mentions,
          ...mentioned.map((staffId, index) => ({ id: nextId(withThread.mentions) + index, postId, staffId })),
        ],
      }
    })
  }

  const saveEdit = () => {
    const body = editDraft.trim()
    if (!body || editing === null || !thread) return
    const postId = editing
    const mentioned = parseMentions(body, data.staff)
    setEditing(null)
    mutate('Edited a post. It shows as edited; no history is kept.', (current) => {
      const withThread = touchThread(thread.id)(current)
      return {
        ...withThread,
        posts: withThread.posts.map((post) =>
          post.id === postId ? { ...post, body, editedAt: todayIso() } : post,
        ),
        // Mentions are re-parsed on edit so the link never points at stale text.
        mentions: [
          ...withThread.mentions.filter((mention) => mention.postId !== postId),
          ...mentioned.map((staffId, index) => ({ id: nextId(withThread.mentions) + index, postId, staffId })),
        ],
      }
    })
  }

  const removePost = (post: Post) => {
    const hasReplies = data.posts.some((other) => other.replyTo === post.id)
    mutate(
      hasReplies ? 'Removed a post. Its replies stay under a placeholder.' : 'Deleted a post. No history, no flag.',
      (current) => ({
        ...current,
        // A parent with replies becomes a tombstone so the thread stays readable;
        // anything else is a hard delete, mentions and all.
        posts: hasReplies
          ? current.posts.map((other) => (other.id === post.id ? { ...other, removed: true, body: '' } : other))
          : current.posts.filter((other) => other.id !== post.id),
        mentions: current.mentions.filter((mention) => mention.postId !== post.id),
      }),
    )
  }

  const startThread = () => {
    const subject = newSubject.trim()
    if (!subject) return
    const threadId = nextId(data.threads)
    setNewSubject('')
    setActiveThreadId(threadId)
    mutate('Started a thread.', (current) => ({
      ...current,
      threads: [...current.threads, { id: threadId, subject, createdBy: member.id, lastActivity: todayIso() }],
    }))
  }

  const promoteToTension = (post: Post) => {
    setPromoting(null)
    mutate('Promoted to a Huddle tension. It will outlive the thread.', (current) => ({
      ...current,
      huddle: [
        ...current.huddle,
        {
          id: nextId(current.huddle),
          col: 'tension' as const,
          authorId: member.id,
          body: post.body,
          createdAt: todayIso(),
          resolvedAt: null,
        },
      ],
    }))
  }

  const promoteToNotice = (post: Post) => {
    setPromoting(null)
    mutate('Recorded a decision in the notice log. It is not announced yet.', (current) => ({
      ...current,
      notices: [
        ...current.notices,
        {
          id: nextId(current.notices),
          subject: post.body.slice(0, 90),
          ministry: 'All' as const,
          category: 'Internal',
          decidedOn: todayIso(),
          notifiedOn: null,
          audience: '',
          channel: 'Not sent',
          eventId: null,
        },
      ],
    }))
  }

  const onDraftChange = (value: string) => {
    setDraft(value)
    // Typing @ opens the picker; it closes on a space or a match.
    const match = /@([\w' -]*)$/.exec(value)
    setMentionQuery(match ? match[1] : null)
  }

  const insertMention = (person: Staff) => {
    setDraft((current) => current.replace(/@([\w' -]*)$/, '@' + person.name + ' '))
    setMentionQuery(null)
    composer.current?.focus()
  }

  const mentionMatches =
    mentionQuery === null
      ? []
      : activeStaff.filter((person) => person.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <Card radius="card" pad={22} style={{ flex: '1 1 300px', maxWidth: 340, display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span
              style={{
                font: '700 11px/1 var(--mbc-font-sans)',
                letterSpacing: 'var(--mbc-track-label)',
                textTransform: 'uppercase',
                color: 'var(--text-eyebrow)',
              }}
            >
              Threads
            </span>
            <span className="tabular" style={{ font: '400 12px/1 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
              {data.threads.length}
            </span>
          </div>
          <Rule tone="hair" />
        </div>

        <div style={{ display: 'grid' }}>
          {data.threads.length === 0 ? (
            <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>
              The board is empty. Everything on it has aged out.
            </p>
          ) : (
            data.threads.map((item) => {
              const active = thread?.id === item.id
              const forgets = threadForgetsIn(item, today)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveThreadId(item.id)}
                  style={{
                    textAlign: 'left',
                    background: active ? 'var(--surface-panel)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border-hairline)',
                    borderRadius: active ? 10 : 0,
                    padding: '13px 12px',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      font: (unread.has(item.id) ? '700' : '400') + ' 15px/1.4 var(--mbc-font-sans)',
                      color: 'var(--text-heading)',
                    }}
                  >
                    {item.subject}
                  </span>
                  <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                    {staffName(data.staff, item.createdBy)} · {countPosts(data.posts, item.id)}
                  </span>
                  <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                    forgets in {countDays(Math.max(forgets, 0))}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <input
            value={newSubject}
            placeholder="Start a thread"
            onChange={(event) => setNewSubject(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') startThread()
            }}
            style={{
              width: '100%',
              minHeight: 44,
              background: 'var(--surface-field)',
              border: '1px solid var(--mbc-border-panel)',
              borderRadius: 'var(--mbc-radius-input)',
              padding: '12px 14px',
              font: '400 15px/1.3 var(--mbc-font-sans)',
              color: 'var(--text-heading)',
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={newSubject.trim().length === 0}
            onClick={startThread}
            style={{ justifySelf: 'start' }}
          >
            Start it
          </Button>
        </div>
      </Card>

      <Card radius="card" pad={24} style={{ flex: '3 1 480px', display: 'grid', gap: 18 }}>
        {!thread ? (
          <p style={{ font: '400 15px/1.7 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
            Nothing to read. Start a thread on the left.
          </p>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 10 }}>
              <h2
                style={{
                  font: '600 24px/1.25 var(--mbc-font-serif)',
                  letterSpacing: '-.01em',
                  color: 'var(--text-heading)',
                  margin: 0,
                }}
              >
                {thread.subject}
              </h2>
              <p style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
                Started by {staffName(data.staff, thread.createdBy)} · forgets in{' '}
                {countDays(Math.max(threadForgetsIn(thread, today), 0))} unless somebody posts
              </p>
              <Rule tone="hair" />
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
              {posts.map((post) => {
                const parent = quotedPost(data.posts, post.replyTo)
                const mine = post.authorId === member.id
                const mentions = data.mentions.filter((mention) => mention.postId === post.id)
                return (
                  <article
                    key={post.id}
                    id={'post-' + post.id}
                    style={{ padding: '14px 0', borderBottom: '1px solid var(--border-hairline)', display: 'grid', gap: 8 }}
                  >
                    {post.replyTo !== null ? <QuotedStrip parent={parent} staff={data.staff} /> : null}

                    {post.removed ? (
                      <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>
                        message removed
                      </p>
                    ) : editing === post.id ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <textarea
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.target.value)}
                          rows={3}
                          style={composerStyle}
                        />
                        <div style={{ display: 'flex', gap: 10 }}>
                          <Button variant="outline" size="sm" onClick={saveEdit}>
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ font: '400 15px/1.65 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>
                        <Body body={post.body} staff={data.staff} />
                      </p>
                    )}

                    <p style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
                      {post.removed ? '—' : staffName(data.staff, post.authorId)} ·{' '}
                      <span className="tabular">
                        {formatShort(parseDate(post.createdAt))} · {post.time}
                      </span>
                      {post.editedAt ? ' · edited' : ''}
                      {mentions.length > 0 ? ' · mentions ' + mentions.map((m) => staffName(data.staff, m.staffId)).join(', ') : ''}
                    </p>

                    {!post.removed ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                        <TextAction
                          onClick={() => {
                            setReplyTo(post.id)
                            composer.current?.focus()
                          }}
                        >
                          Reply
                        </TextAction>
                        <TextAction onClick={() => setPromoting(promoting === post.id ? null : post.id)}>
                          Promote
                        </TextAction>
                        {mine ? (
                          <>
                            <TextAction
                              onClick={() => {
                                setEditing(post.id)
                                setEditDraft(post.body)
                              }}
                            >
                              Edit
                            </TextAction>
                            <TextAction onClick={() => removePost(post)}>Delete</TextAction>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {promoting === post.id ? (
                      <div
                        style={{
                          background: 'var(--surface-panel)',
                          border: '1px solid var(--border-section)',
                          borderRadius: 14,
                          padding: '14px 16px',
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        <p style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
                          This board forgets. Move anything that became a commitment somewhere that does not.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          <Button variant="outline" size="sm" onClick={() => promoteToTension(post)}>
                            Post as a tension
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => promoteToNotice(post)}>
                            Record the decision
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              say('A mention is not an assignment. Name the owner on the ledger.')
                              navigate('/cadence')
                            }}
                          >
                            Open the ledger
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>

            <div style={{ display: 'grid', gap: 10, position: 'relative' }}>
              {replyTo !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                    Replying to {staffName(data.staff, quotedPost(data.posts, replyTo)?.authorId ?? null)}
                  </span>
                  <TextAction onClick={() => setReplyTo(null)}>Cancel</TextAction>
                </div>
              ) : null}

              <textarea
                ref={composer}
                value={draft}
                rows={3}
                placeholder="Say it here. Type @ to name someone."
                onChange={(event) => onDraftChange(event.target.value)}
                style={composerStyle}
              />

              {mentionMatches.length > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 58,
                    left: 0,
                    zIndex: 6,
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-section)',
                    borderRadius: 14,
                    padding: 6,
                    display: 'grid',
                    minWidth: 240,
                  }}
                >
                  {mentionMatches.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => insertMention(person)}
                      style={{
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 12px',
                        cursor: 'pointer',
                        font: '400 14px/1.3 var(--mbc-font-sans)',
                        color: 'var(--text-heading)',
                      }}
                    >
                      {person.name}
                      <span style={{ color: 'var(--text-muted)' }}> · {person.role}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Button variant="outline" size="sm" disabled={draft.trim().length === 0} onClick={submitPost}>
                  Post
                </Button>
                <span style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                  Naming someone is not handing them the job.
                </span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

const composerStyle = {
  width: '100%',
  resize: 'vertical',
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-panel)',
  borderRadius: 'var(--mbc-radius-input)',
  padding: '12px 14px',
  font: '400 15px/1.55 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
} as const

/** Rendered from the reference, never from a stored copy of the original. */
function QuotedStrip({ parent, staff }: { parent: Post | null; staff: Staff[] }) {
  const removed = !parent || parent.removed
  return (
    <a
      href={parent ? '#post-' + parent.id : undefined}
      style={{
        display: 'block',
        borderLeft: '2px solid var(--border-control)',
        paddingLeft: 12,
        font: '400 13px/1.5 var(--mbc-font-sans)',
        color: 'var(--text-meta)',
        textDecoration: 'none',
      }}
    >
      {removed ? (
        'message removed'
      ) : (
        <>
          <span style={{ fontWeight: 700 }}>{staffName(staff, parent.authorId)}</span>
          <span className="tabular"> · {formatShort(parseDate(parent.createdAt))} · </span>
          {parent.body.length > 90 ? parent.body.slice(0, 90) + '…' : parent.body}
        </>
      )}
    </a>
  )
}

/** Mentions render as a chip. The stored link is the staff id, not this text. */
function Body({ body, staff }: { body: string; staff: Staff[] }) {
  const names = staff.filter((person) => body.includes('@' + person.name)).map((person) => person.name)
  if (names.length === 0) return <>{body}</>

  const pattern = new RegExp('(@(?:' + names.map(escapeRegExp).join('|') + '))', 'g')
  return (
    <>
      {body.split(pattern).map((part, index) =>
        part.startsWith('@') && names.includes(part.slice(1)) ? (
          <span
            key={index}
            style={{
              background: 'var(--mbc-lamplight-tint)',
              color: 'var(--mbc-lamplight-deep)',
              borderRadius: 'var(--mbc-radius-pill)',
              padding: '1px 8px',
              font: '700 14px/1.4 var(--mbc-font-sans)',
            }}
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

function countPosts(posts: Post[], threadId: number): string {
  const total = posts.filter((post) => post.threadId === threadId).length
  return total + (total === 1 ? ' post' : ' posts')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function TextAction({ onClick, children }: { onClick(): void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        font: '400 12px/1.4 var(--mbc-font-sans)',
        color: 'var(--text-link)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

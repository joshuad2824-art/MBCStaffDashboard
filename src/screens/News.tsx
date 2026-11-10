import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Chip } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import type { DashboardData, Id, NewsPost } from '../data/types'
import { nextId, personName } from '../lib/derive'
import { addDays, startOfToday, toIso, todayIso } from '../lib/date'
import { cleanLink } from '../lib/needs'
import { activeCategories, categoryName, dayOf, isArchived, isCurrent, isScheduled, matches, monthOf, newestFirst } from '../lib/news'
import { unfurl } from '../lib/unfurl'
import { SURFACES } from './surfaces'

/* News & articles (home brief §5). A place for staff to pass articles to each
   other: a link someone found worth sharing, the note they wrote with it, and
   the categories it belongs in. Nothing is gathered automatically, nothing is
   copied in, and no article gets a page of its own — a card opens the article
   at its source, in a new tab.

   /news is what is current, /news/<category> the same filtered, and
   /news/archive what has expired. The search reaches current and archive
   alike. Anyone on staff shares and replies; the sharer, or any staff-role
   account, edits or removes a post. A post may sit in several categories
   (Joshua, 10 November 2026). */

export function News() {
  const data = useData()
  const { mutate, update, say } = useStore()
  const { member, viewAs } = useSession()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState('')
  const sharing = params.get('share') === '1'
  const base = SURFACES.news.path
  const rest = pathname.slice(base.length).replace(/^\/|\/$/g, '')
  const categories = activeCategories(data)
  const archive = rest === 'archive'
  const category = !archive && rest ? categories.find((c) => c.slug === rest) ?? null : null
  const today = todayIso()

  const posts = useMemo(() => [...data.newsPosts].sort(newestFirst), [data.newsPosts])
  if (!member) return null

  const me = member.id
  const staffRole = viewAs === 'staff'
  const inCategory = (post: NewsPost) => !category || post.categories.includes(category.slug)
  const searching = query.trim().length >= 2

  let shown: NewsPost[]
  if (searching) shown = posts.filter((post) => !isScheduled(post, today) && inCategory(post) && matches(data, post, query))
  else if (archive) shown = posts.filter((post) => isArchived(post, today) && (!month || monthOf(post.postOn) === month))
  else shown = posts.filter((post) => isCurrent(post, today) && inCategory(post))
  const waiting = !archive && !searching ? posts.filter((post) => isScheduled(post, today) && post.sharedBy === me && inCategory(post)) : []
  const months = [...new Set(posts.filter((post) => isArchived(post, today)).map((post) => monthOf(post.postOn)))]

  const share = (draft: Draft) => {
    mutate(`Shared: ${draft.title}`, (current) => ({
      ...current,
      newsPosts: [...current.newsPosts, { ...draft, id: nextId(current.newsPosts), sharedBy: me, createdAt: new Date().toISOString() }],
    }))
    setParams({}, { replace: true })
  }

  return (
    <div style={{ display: 'grid', gap: 22, maxWidth: 920 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <nav aria-label="News categories" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Chip active={!category && !archive} onClick={() => navigate(base)} style={chip}>All</Chip>
          {categories.map((c) => (
            <Chip key={c.slug} active={category?.slug === c.slug} onClick={() => navigate(`${base}/${c.slug}`)} style={chip}>
              {c.name}
            </Chip>
          ))}
          <Chip active={archive} onClick={() => navigate(`${base}/archive`)} style={chip}>Archive</Chip>
        </nav>
        {!sharing ? <Button variant="dark" onClick={() => setParams({ share: '1' })}>Share a link</Button> : null}
      </div>

      {sharing ? (
        <Card radius="panel" pad="22px 24px" style={{ border: '1px solid var(--border-card)' }}>
          <ShareForm data={data} submit="Share" onSubmit={share} onCancel={() => setParams({}, { replace: true })} initialCategory={category?.slug} />
        </Card>
      ) : null}

      {category?.description ? <p style={{ margin: 0, font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{category.description}</p> : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={archive ? 'Search everything shared' : 'Search current and archive'}
          aria-label="Search news"
          style={{ ...input, flex: '1 1 280px', maxWidth: 520 }}
        />
        {archive && !searching && months.length > 1 ? (
          <select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Month" style={{ ...input, width: 'auto', minWidth: 180 }}>
            <option value="">Every month</option>
            {months.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        ) : null}
      </div>

      {waiting.length ? (
        <p style={{ margin: 0, font: '400 16px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
          You have {waiting.length} waiting to go up: {waiting.map((post) => `“${post.title}” on ${dayOf(post.postOn)}`).join('; ')}.
        </p>
      ) : null}

      {shown.length === 0 ? (
        <p style={{ margin: 0, font: '400 19px/1.6 var(--mbc-font-serif)', color: 'var(--text-meta)' }}>
          {searching ? 'Nothing shared matches that.' : archive ? 'Nothing in the archive yet.' : category ? `Nothing current in ${category.name}.` : 'Nothing shared right now. Share a link worth reading.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {shown.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              data={data}
              me={me}
              canEdit={post.sharedBy === me || staffRole}
              archived={isArchived(post, today)}
              mutate={mutate}
              update={update}
              say={say}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- the form */

type Draft = Omit<NewsPost, 'id' | 'sharedBy' | 'createdAt'>

function ShareForm({
  data,
  initial,
  initialCategory,
  submit,
  onSubmit,
  onCancel,
}: {
  data: DashboardData
  initial?: NewsPost
  initialCategory?: string
  submit: string
  onSubmit(draft: Draft): void
  onCancel(): void
}) {
  const today = startOfToday()
  const [url, setUrl] = useState(initial?.url ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [siteName, setSiteName] = useState(initial?.siteName ?? '')
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null)
  const [note, setNote] = useState(initial?.note ?? '')
  const [chosen, setChosen] = useState<string[]>(initial?.categories ?? (initialCategory ? [initialCategory] : []))
  const [postOn, setPostOn] = useState(initial?.postOn ?? toIso(today))
  const [expiresOn, setExpiresOn] = useState(initial?.expiresOn ?? toIso(addDays(today, 14)))
  const [reading, setReading] = useState(false)
  const [readFor, setReadFor] = useState(initial?.url ?? '')
  const typedTitle = useRef(Boolean(initial))
  const link = cleanLink(url)
  const ready = link && title.trim() && chosen.length > 0 && expiresOn >= postOn

  /* Reading the link: once it is a web address and has stopped changing, ask
     unfurl for its title, site and preview image. A title already typed is
     left alone. */
  useEffect(() => {
    if (!link || link === readFor) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setReading(true)
      const preview = await unfurl(link, controller.signal)
      setReading(false)
      setReadFor(link)
      if (!preview || controller.signal.aborted) return
      if (!typedTitle.current) setTitle(preview.title)
      setSiteName((s) => s || preview.siteName)
      setImageUrl(preview.imageUrl)
    }, 500)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [link, readFor])

  const toggle = (slug: string) => setChosen((list) => (list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]))

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!ready) return
        onSubmit({ url: link, title: title.trim(), siteName: siteName.trim() || new URL(link).hostname.replace(/^www\./, ''), imageUrl, note: note.trim(), categories: chosen, postOn, expiresOn })
      }}
      style={{ display: 'grid', gap: 14 }}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        <Field label="The link">
          <input value={url} onChange={(event) => setUrl(event.target.value)} inputMode="url" placeholder="Paste the article’s address" autoFocus={!initial} style={input} aria-invalid={Boolean(url.trim()) && !link} aria-describedby="share-link-hint" />
        </Field>
        <span id="share-link-hint" aria-live="polite" style={hint}>
          {reading ? 'Reading the page’s title…' : url.trim() && !link ? 'A link has to be a web address.' : 'The title and site fill in by themselves; change them if they’re unhelpful.'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <Field label="Title">
          <input
            value={title}
            onChange={(event) => {
              typedTitle.current = true
              setTitle(event.target.value)
            }}
            maxLength={300}
            style={input}
          />
        </Field>
        <Field label="Site · optional">
          <input value={siteName} onChange={(event) => setSiteName(event.target.value)} maxLength={120} placeholder="Baptist Press" style={input} />
        </Field>
      </div>
      <Field label="Your note · optional">
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} placeholder="Worth reading before Sunday’s meeting." style={{ ...input, minHeight: 72, padding: '12px 14px', resize: 'vertical', font: '400 18px/1.45 var(--mbc-font-serif)' }} />
      </Field>
      <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        <legend style={{ ...labelStyle, marginBottom: 8 }}>Categories · one or more</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {activeCategories(data).map((c) => (
            <Chip key={c.slug} active={chosen.includes(c.slug)} onClick={() => toggle(c.slug)} style={chip}>
              {c.name}
            </Chip>
          ))}
        </div>
        {chosen.includes('politics') ? <span style={hint}>{data.newsCategories.find((c) => c.slug === 'politics')?.description}</span> : null}
      </fieldset>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <Field label="Goes up">
          <input type="date" value={postOn} onChange={(event) => setPostOn(event.target.value)} style={input} />
        </Field>
        <Field label="Current until">
          <input type="date" value={expiresOn} min={postOn} onChange={(event) => setExpiresOn(event.target.value)} style={input} />
        </Field>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Button type="submit" variant="dark" disabled={!ready}>{submit}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Never mind</Button>
        {!chosen.length && link && title.trim() ? <span style={hint}>Pick at least one category — Other if you’re not sure.</span> : null}
      </div>
    </form>
  )
}

/* ------------------------------------------------------------- the card */

function PostCard({
  post,
  data,
  me,
  canEdit,
  archived,
  mutate,
  update,
  say,
}: {
  post: NewsPost
  data: DashboardData
  me: Id
  canEdit: boolean
  archived: boolean
  mutate: ReturnType<typeof useStore>['mutate']
  update: ReturnType<typeof useStore>['update']
  say: ReturnType<typeof useStore>['say']
}) {
  const [editing, setEditing] = useState(false)
  const [talking, setTalking] = useState(false)
  const [reply, setReply] = useState('')
  const [imageOk, setImageOk] = useState(true)
  const comments = data.newsComments.filter((c) => c.postId === post.id)

  if (editing) {
    return (
      <Card radius="panel" pad="20px 22px" style={{ border: '1px solid var(--border-card)' }}>
        <ShareForm
          data={data}
          initial={post}
          submit="Save"
          onCancel={() => setEditing(false)}
          onSubmit={(draft) => {
            mutate(`Edited: ${draft.title}`, (current) => ({ ...current, newsPosts: current.newsPosts.map((p) => (p.id === post.id ? { ...p, ...draft } : p)) }))
            setEditing(false)
          }}
        />
      </Card>
    )
  }

  const sendReply = () => {
    const body = reply.trim()
    if (!body) return
    update((current) => ({
      ...current,
      newsComments: [...current.newsComments, { id: nextId(current.newsComments), postId: post.id, authorId: me, body, createdAt: todayIso(), time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }],
    }))
    setReply('')
    say('Replied.')
  }

  return (
    <article aria-label={post.title} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--mbc-radius-panel)', padding: '22px 24px', display: 'grid', gap: 14 }}>
      {/* The headline and the picture are the link: a card opens the article
          at its source. The actions below sit outside it. */}
      <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start', textDecoration: 'none', color: 'inherit' }}>
        {post.imageUrl && imageOk ? (
          <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageOk(false)}
            style={{ width: 168, height: 112, objectFit: 'cover', borderRadius: 12, flex: 'none', background: 'var(--surface-panel)' }}
          />
        ) : null}
        <span style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span style={{ font: '700 12px/1.3 var(--mbc-font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-category)' }}>
            {post.siteName || new URL(post.url).hostname}
            <span aria-hidden="true"> ↗</span>
          </span>
          <span style={{ font: '600 24px/1.25 var(--mbc-font-serif)', letterSpacing: '-.01em', color: 'var(--text-heading)' }}>{post.title}</span>
        </span>
      </a>

      {post.note ? (
        <p style={{ margin: 0, paddingLeft: 16, borderLeft: '3px solid var(--room-huddle)', font: 'italic 400 19px/1.5 var(--mbc-font-serif)', color: 'var(--text-body)' }}>{post.note}</p>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px' }}>
        <span style={{ font: '400 15px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
          Shared by {post.sharedBy === me ? 'you' : personName(data.people, post.sharedBy)} · {dayOf(post.postOn)}
          {archived ? ' · archived' : ''}
        </span>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {post.categories.map((slug) => (
            <Link key={slug} to={`${SURFACES.news.path}/${slug}`} style={{ font: '700 12px/1 var(--mbc-font-sans)', letterSpacing: '.06em', padding: '7px 10px', borderRadius: 999, border: '1px solid var(--mbc-border-chip)', color: 'var(--text-body)', textDecoration: 'none' }}>
              {categoryName(data, slug)}
            </Link>
          ))}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
        <TextButton onClick={() => setTalking((v) => !v)} expanded={talking}>
          {comments.length === 0 ? 'Reply' : `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}`}
        </TextButton>
        {canEdit ? <TextButton onClick={() => setEditing(true)}>Edit</TextButton> : null}
        {canEdit ? (
          <TextButton
            onClick={() => {
              if (window.confirm(`Remove “${post.title}”? Its replies go with it.`))
                mutate(`Removed: ${post.title}`, (current) => ({
                  ...current,
                  newsPosts: current.newsPosts.filter((p) => p.id !== post.id),
                  newsComments: current.newsComments.filter((c) => c.postId !== post.id),
                }))
            }}
          >
            Remove
          </TextButton>
        ) : null}
      </div>

      {talking ? (
        <div style={{ display: 'grid', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border-hairline)' }}>
          {comments.map((c) => (
            <div key={c.id} style={{ display: 'grid', gap: 2 }}>
              <span style={{ font: '700 14px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                {c.authorId === me ? 'You' : personName(data.people, c.authorId)}
                <span style={{ fontWeight: 400, color: 'var(--text-meta)' }}> · {dayOf(c.createdAt)}{c.time ? `, ${c.time}` : ''}</span>
              </span>
              <span style={{ font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)', whiteSpace: 'pre-wrap' }}>{c.body}</span>
            </div>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              sendReply()
            }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}
          >
            <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="We should talk about this…" aria-label={`Reply to ${post.title}`} style={{ ...input, flex: '1 1 240px' }} />
            <Button type="submit" variant="outline" disabled={!reply.trim()}>Reply</Button>
          </form>
        </div>
      ) : null}
    </article>
  )
}

/* ---------------------------------------------------------------- bits */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  )
}

function TextButton({ onClick, expanded, children }: { onClick(): void; expanded?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} style={{ background: 'none', border: 'none', padding: '8px 0', minHeight: 40, font: '700 15px/1.3 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer' }}>
      {children}
    </button>
  )
}

const chip: CSSProperties = { minHeight: 44, fontSize: 14 }
const hint: CSSProperties = { font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }
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

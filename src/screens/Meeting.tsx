import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { BodyBadge, Button, Card, Eyebrow } from '../components/ui'
import { useStore } from '../data/store'
import { useMeetings } from '../data/meetings/store'
import {
  FLAG_AT_ABSENCES,
  MEETINGS_PER_YEAR,
  REQUIRED_MEETINGS,
  agendaFor,
  attendanceFor,
  carriedForward,
  currentMeeting,
  deaconYearLabel,
  motionsFor,
  oldBusiness,
  ordinalInYear,
  phaseOf,
  seatLabel,
  sortedByDate,
} from '../data/meetings/derive'
import type { AttendanceCount, AttendanceStatus, Meeting as MeetingRecord, MeetingsData, Motion, MotionDisposition, Phase } from '../data/meetings/types'
import { formatLong, formatShort, parseDate, startOfToday, todayIso } from '../lib/date'
import { useSession } from '../session/session'
import { SURFACES } from './surfaces'

/** Absolute, so a phase can be reached from any depth of the meeting's URL. */
const meetingPath = (meetingId: string, phase?: Phase) => `${SURFACES.meeting.path}/${meetingId}${phase ? '/' + phase : ''}`

/* The spine. One record per month in three phases, and the phase is in the
   URL so a man can be sent straight to the roll.
   design_handoff_deacons_dashboard/SCREENS.md §2. */

export function Meeting() {
  const { data, error } = useMeetings()
  if (error) return <Note>{error}</Note>
  if (!data) return <Note>Opening the Board’s room…</Note>
  const current = currentMeeting(data.meetings, startOfToday())
  return (
    <Routes>
      <Route path=":meetingId/:phase?" element={<MeetingView data={data} />} />
      <Route index element={current ? <Navigate to={meetingPath(current.id)} replace /> : <NoMeetingYet />} />
    </Routes>
  )
}

const PHASES: { key: Phase; step: string; name: string }[] = [
  { key: 'agenda', step: 'Phase one of three', name: 'Agenda' },
  { key: 'session', step: 'Phase two of three', name: 'In session' },
  { key: 'minutes', step: 'Phase three of three', name: 'Minutes' },
]

function MeetingView({ data }: { data: MeetingsData }) {
  const { meetingId, phase: phaseParam } = useParams()
  const navigate = useNavigate()
  const meeting = data.meetings.find((m) => m.id === meetingId)
  if (!meeting) return <Navigate to={SURFACES.meeting.path} replace />
  const phase: Phase = phaseParam === 'session' || phaseParam === 'minutes' ? phaseParam : phaseParam === 'agenda' ? 'agenda' : phaseOf(meeting)

  const on = parseDate(meeting.meetsOn)
  const ordinal = ordinalInYear(data.meetings, meeting, data.deaconYearStartMonth)
  const year = on ? deaconYearLabel(on, data.deaconYearStartMonth) : ''
  const roll = attendanceFor(data.attendance, meeting)
  const tonight = motionsFor(data.motions, meeting)
  const agenda = agendaFor(data.agenda, meeting)
  const carried = oldBusiness(data.motions, data.meetings, meeting)

  const stateLine: Record<Phase, string> = {
    agenda: meeting.agendaLockedAt
      ? `Locked · ${agenda.length + carried.length} items`
      : `Open · ${agenda.length + carried.length} items`,
    session:
      meeting.status === 'planned'
        ? 'Not yet called to order'
        : `${roll.size} of ${data.roster.length} recorded · ${tonight.length} motion${tonight.length === 1 ? '' : 's'} captured`,
    minutes: meeting.status === 'held' ? 'Assembled from the record' : 'Nothing written yet',
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 22 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ font: '600 26px/1.2 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)', margin: 0 }}>
              {on ? formatLong(on) : meeting.meetsOn} · {meeting.timeLabel} · {meeting.location}
            </p>
            <p style={{ font: '400 15px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '8px 0 0' }}>
              {meeting.kind === 'regular' ? 'Regular monthly meeting' : 'Special meeting'}
              {meeting.kind === 'regular' && ordinal > 0 ? ` · ${ORDINALS[ordinal] ?? ordinal} of ${MEETINGS_PER_YEAR} in the ${year} deacon year` : ''}
              {` · ${data.roster.length} on the roll`}
              {meeting.status === 'cancelled' ? ' · cancelled' : ''}
            </p>
          </div>
          <BodyBadge bodies={['deacon-board']} />
        </div>

        <div
          role="tablist"
          aria-label="Phase"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            background: 'var(--border-hairline)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--mbc-radius-card)',
            overflow: 'hidden',
          }}
        >
          {PHASES.map((entry) => {
            const selected = entry.key === phase
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => navigate(meetingPath(meeting.id, entry.key))}
                style={{
                  flex: '1 1 230px',
                  minHeight: 116,
                  padding: '20px 22px',
                  display: 'grid',
                  gap: 9,
                  alignContent: 'start',
                  textAlign: 'left',
                  background: selected ? 'var(--surface-panel)' : 'var(--surface-card)',
                  boxShadow: selected ? 'inset 0 0 0 2px var(--mbc-border-control)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' }}>
                  {entry.step}
                </span>
                <span style={{ font: '600 24px/1.15 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>{entry.name}</span>
                <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{stateLine[entry.key]}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {phase === 'agenda' ? <AgendaPhase data={data} meeting={meeting} /> : null}
      {phase === 'session' ? <SessionPhase data={data} meeting={meeting} /> : null}
      {phase === 'minutes' ? <MinutesPhase data={data} meeting={meeting} /> : null}

      <OtherMeetings data={data} meeting={meeting} />
    </div>
  )
}

const ORDINALS: Record<number, string> = {
  1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth',
  7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth',
}

/* ------------------------------------------------------------ phase one */

function AgendaPhase({ data, meeting }: { data: MeetingsData; meeting: MeetingRecord }) {
  const { addAgendaItem, removeAgendaItem, updateMeeting, takeUp } = useMeetings()
  const { say } = useStore()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const agenda = agendaFor(data.agenda, meeting)
  const carried = oldBusiness(data.motions, data.meetings, meeting)
  const locked = meeting.agendaLockedAt !== null
  const closed = meeting.status === 'held' || meeting.status === 'cancelled'
  const previous = [...sortedByDate(data.meetings)].reverse().find((m) => m.meetsOn < meeting.meetsOn && m.status === 'held')

  const add = async () => {
    if (!title.trim()) {
      say('An agenda item needs a title.')
      return
    }
    await addAgendaItem({
      meetingId: meeting.id,
      position: (agenda[agenda.length - 1]?.position ?? 0) + 1,
      title: title.trim(),
      source: 'manual',
      sourceRef: '',
      notes: notes.trim(),
    })
    setTitle('')
    setNotes('')
    say('Added to the agenda.')
  }

  const toggleLock = async () => {
    if (locked) {
      await updateMeeting(meeting.id, { agendaLockedAt: null, agendaLockedBy: null })
      say('Agenda unlocked.')
    } else {
      await updateMeeting(meeting.id, { agendaLockedAt: new Date().toISOString(), agendaLockedBy: data.me })
      say(`Agenda locked. The packet is set for ${data.roster.length} men.`)
    }
  }

  const rows: { key: string; position: number; title: string; meta: string; tag: string; tagColour: string; remove?: () => void }[] = [
    ...agenda.map((item, index) => ({
      key: item.id,
      position: index + 1,
      title: item.title,
      meta: [item.sourceRef, item.notes].filter(Boolean).join(' · '),
      tag: item.source === 'old_business' ? 'old business' : item.source === 'new_business' ? 'new business' : item.source,
      tagColour: item.source === 'report' ? 'var(--mbc-yale-sage)' : item.source === 'old_business' ? 'var(--text-eyebrow)' : 'var(--text-muted)',
      remove: !locked && !closed && item.source === 'manual' ? () => void removeAgendaItem(item.id).then(() => say('Removed from the agenda. It stays in the record.')) : undefined,
    })),
    ...carried.map((motion, index) => {
      const from = data.meetings.find((m) => m.id === motion.meetingId)
      return {
        key: motion.id,
        position: agenda.length + index + 1,
        title: motion.text,
        meta: `Tabled ${from ? formatShort(parseDate(from.meetsOn)) : 'earlier'}${motion.tabledToMeetingId === meeting.id ? ' · taken up tonight' : ''}`,
        tag: 'old business',
        tagColour: 'var(--text-eyebrow)',
      }
    }),
  ]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
      <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ flex: '3 1 560px', display: 'grid', gap: 0, minWidth: 0 }}>
        <SectionHead label="The agenda assembles itself" meta={`${rows.length} item${rows.length === 1 ? '' : 's'}${locked ? ' · locked' : ''}`} />
        <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
          {rows.length === 0 ? <p style={{ ...metaText, padding: '16px 2px', margin: 0, background: 'var(--surface-card)' }}>Nothing on it yet.</p> : null}
          {rows.map((row) => (
            <div
              key={row.key}
              style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) auto', gap: '8px 16px', padding: '16px 2px', background: 'var(--surface-card)', alignItems: 'start' }}
            >
              <span className="tabular" style={{ font: '600 17px/1.5 var(--mbc-font-serif)', color: 'var(--text-meta)' }}>{row.position}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0, textWrap: 'pretty' } as CSSProperties}>{row.title}</p>
                {row.meta ? <p style={{ ...metaText, margin: '4px 0 0' }}>{row.meta}</p> : null}
                {row.remove ? (
                  <button type="button" onClick={row.remove} style={linkButton}>
                    Remove
                  </button>
                ) : null}
              </div>
              <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: row.tagColour, whiteSpace: 'nowrap', paddingTop: 6 }}>
                {row.tag}
              </span>
            </div>
          ))}
        </div>

        {!locked && !closed ? (
          <div style={{ display: 'grid', gap: 12, paddingTop: 20, marginTop: 4, borderTop: '1px solid var(--border-hairline)' }}>
            <Field label="Add an item">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What the Board will take up" style={fieldStyle} />
            </Field>
            <Field label="A line of context, if it helps">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" style={fieldStyle} />
            </Field>
            <div>
              <Button variant="outline" size="md" onClick={() => void add()}>
                Add to the agenda
              </Button>
            </div>
          </div>
        ) : null}

        {!closed ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 20, marginTop: 20, borderTop: '1px solid var(--border-hairline)' }}>
            <p style={{ ...metaText, margin: 0, maxWidth: '60ch' }}>
              {locked
                ? `Locked ${meeting.agendaLockedAt ? formatShort(parseDate(meeting.agendaLockedAt.slice(0, 10))) : ''}. Unlocking reopens it; the record keeps both.`
                : 'Locking fixes the agenda for the packet. Tabled motions from last time are already on it.'}
            </p>
            <Button variant={locked ? 'outline' : 'primary'} size="md" onClick={() => void toggleLock()}>
              {locked ? 'Unlock it' : 'Lock the agenda'}
            </Button>
          </div>
        ) : null}
      </Card>

      <div style={{ flex: '1 1 320px', display: 'grid', gap: 20, alignContent: 'start', minWidth: 0 }}>
        <Card tone="panel" radius="card" pad="22px 24px" style={{ display: 'grid', gap: 12 }}>
          <Eyebrow size="sm">{previous ? `Carried from ${formatShort(parseDate(previous.meetsOn))}` : 'Carried forward'}</Eyebrow>
          {carried.length === 0 ? (
            <p style={{ ...bodyText, margin: 0 }}>Nothing was tabled. The agenda starts clean.</p>
          ) : (
            carried.map((motion) => (
              <div key={motion.id} style={{ display: 'grid', gap: 8 }}>
                <p style={{ ...bodyText, margin: 0 }}>{motion.text}</p>
                {motion.tabledToMeetingId === null && meeting.status !== 'held' ? (
                  <button type="button" onClick={() => void takeUp(motion.id, meeting.id).then(() => say('Taken up tonight. Record the new motion in session.'))} style={linkButton}>
                    Take it up at this meeting
                  </button>
                ) : null}
              </div>
            ))
          )}
        </Card>
        <Card radius="card" pad="22px 24px" style={{ display: 'grid', gap: 12 }}>
          <Eyebrow size="sm">Committee reports due</Eyebrow>
          <p style={{ ...bodyText, margin: 0 }}>
            The report builders arrive with the next phase. When they do, a filed report lands on this agenda on its own — that it reported is the whole record here.
          </p>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ phase two */

function SessionPhase({ data, meeting }: { data: MeetingsData; meeting: MeetingRecord }) {
  const { updateMeeting } = useMeetings()
  const { say } = useStore()
  const closed = meeting.status === 'held' || meeting.status === 'cancelled'

  const callToOrder = async () => {
    await updateMeeting(meeting.id, { status: 'in_session' })
    say('Called to order. Call the roll.')
  }
  const adjourn = async () => {
    await updateMeeting(meeting.id, { status: 'held' })
    say('Adjourned. The minutes assemble from what was recorded.')
  }

  if (meeting.status === 'planned') {
    return (
      <Card tone="panel" radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
        <Eyebrow size="sm">Not yet in session</Eyebrow>
        <p style={{ font: '600 24px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>Call the meeting to order to start the roll.</p>
        <p style={{ ...bodyText, margin: 0, maxWidth: '60ch' }}>
          Attendance and motions are recorded against a meeting in session. Nothing recorded tonight can be deleted afterwards; a motion made in error is withdrawn, and the record says so.
        </p>
        <div>
          <Button variant="primary" size="md" onClick={() => void callToOrder()}>
            Call to order
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Roll data={data} meeting={meeting} readOnly={closed} />
      <ThresholdPanel data={data} meeting={meeting} />
      <Motions data={data} meeting={meeting} readOnly={closed} />
      {!closed ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <p style={{ ...metaText, margin: 0, maxWidth: '60ch' }}>Adjourning closes the session. The minutes phase assembles itself from the roll and the motions above.</p>
          <Button variant="dark" size="md" onClick={() => void adjourn()}>
            Adjourn
          </Button>
        </div>
      ) : null}
    </div>
  )
}

const STATUSES: { key: AttendanceStatus; label: string }[] = [
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
  { key: 'excused', label: 'Excused' },
]

function Roll({ data, meeting, readOnly }: { data: MeetingsData; meeting: MeetingRecord; readOnly: boolean }) {
  const { recordAttendance } = useMeetings()
  const roll = attendanceFor(data.attendance, meeting)
  const counts = { present: 0, absent: 0, excused: 0 }
  roll.forEach((row) => {
    counts[row.status] += 1
  })
  const [notes, setNotes] = useState<Record<string, string>>({})

  const mark = (personId: string, status: AttendanceStatus) => {
    const note = notes[personId] ?? roll.get(personId)?.justCauseNote ?? ''
    void recordAttendance(meeting.id, personId, status, status === 'absent' ? note : '')
  }
  const saveNote = (personId: string) => {
    const row = roll.get(personId)
    if (!row || row.status !== 'absent') return
    const note = notes[personId] ?? row.justCauseNote
    if (note !== row.justCauseNote) void recordAttendance(meeting.id, personId, 'absent', note)
  }

  return (
    <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 0 }}>
      <SectionHead
        label="Attendance · call the roll"
        meta={`${roll.size} of ${data.roster.length} recorded · ${counts.present} present, ${counts.absent} absent, ${counts.excused} excused`}
      />
      <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
        {data.roster.map((member) => {
          const row = roll.get(member.personId)
          return (
            <div key={member.personId} style={{ display: 'grid', gap: 12, padding: '14px 2px', background: 'var(--surface-card)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 190 }}>
                  <p style={{ font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>{member.name}</p>
                  <p style={{ ...metaText, margin: '2px 0 0' }}>{seatLabel(member)}</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STATUSES.map((status) => (
                    <Pill key={status.key} selected={row?.status === status.key} disabled={readOnly} onClick={() => mark(member.personId, status.key)}>
                      {status.label}
                    </Pill>
                  ))}
                </div>
              </div>
              {row?.status === 'absent' ? (
                <div style={{ display: 'grid', gap: 8, maxWidth: '74ch' }}>
                  <p style={{ ...metaText, margin: 0 }}>Just cause — a note written by a person, in his own words. Optional, and never a checkbox.</p>
                  <textarea
                    rows={2}
                    value={notes[member.personId] ?? row.justCauseNote}
                    readOnly={readOnly}
                    onChange={(e) => setNotes((current) => ({ ...current, [member.personId]: e.target.value }))}
                    onBlur={() => saveNote(member.personId)}
                    style={{ ...fieldStyle, minHeight: 0, padding: '13px 14px', resize: 'vertical' }}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/** The count, and the threshold. Nothing else. In a configured build this is
    a query that returns nothing to anyone but the chairman; the screen asks
    only when it is drawn for him, and nothing here acts on the number. */
function ThresholdPanel({ data, meeting }: { data: MeetingsData; meeting: MeetingRecord }) {
  const { isChairOf } = useSession()
  const { counts } = useMeetings()
  const chair = isChairOf('deacon-board')
  const [rows, setRows] = useState<AttendanceCount[] | null>(null)
  const version = useMemo(() => JSON.stringify(data.attendance) + data.meetings.map((m) => m.status).join(), [data.attendance, data.meetings])

  useEffect(() => {
    if (!chair) return
    let live = true
    counts(data, meeting).then((result) => {
      if (live) setRows(result)
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chair, meeting.id, version])

  if (!chair || !rows) return null
  const missed = rows.filter((row) => row.absent > 0).sort((a, b) => b.absent - a.absent)
  const clean = rows.length - missed.length

  return (
    <Card tone="panel" radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 16 }}>
      <div>
        <Eyebrow size="sm">Chairman only · this panel is not on anyone else’s screen</Eyebrow>
        <p style={{ font: '600 24px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: '10px 0 8px' }}>The count, and the threshold. Nothing else.</p>
        <p style={{ font: '400 16px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '70ch' }}>
          Three-fourths of {MEETINGS_PER_YEAR} meetings is {REQUIRED_MEETINGS}. A man may miss {MEETINGS_PER_YEAR - REQUIRED_MEETINGS} and still meet the rule. This
          panel raises it at the {FLAG_AT_ABSENCES === 2 ? 'second' : String(FLAG_AT_ABSENCES) + 'th'} absence so the conversation is pastoral rather than procedural — it
          does not act on the number, and no man’s standing changes here.
        </p>
      </div>
      <div style={{ display: 'grid', gap: 1, background: 'var(--border-section)', borderTop: '1px solid var(--border-section)', borderBottom: '1px solid var(--border-section)' }}>
        {missed.length === 0 ? (
          <p style={{ ...bodyText, margin: 0, padding: '14px 2px', background: 'var(--surface-panel)' }}>Nobody has missed a meeting this deacon year.</p>
        ) : null}
        {missed.map((row) => (
          <div key={row.personId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 16, padding: '14px 2px', background: 'var(--surface-panel)' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>{row.name}</p>
              <p style={{ font: '400 14px/1.55 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '2px 0 0', maxWidth: '64ch' }}>
                {row.absent === 1 ? 'One missed' : `${row.absent} missed`}
                {row.excused > 0 ? `, ${row.excused} excused` : ''}
                {row.absent >= FLAG_AT_ABSENCES ? '. This is the second, which is why it is on this panel and not anywhere else.' : '.'}
                {row.present + row.absent + row.excused < row.meetingsHeld ? ` Roll not recorded for ${row.meetingsHeld - row.present - row.absent - row.excused}.` : ''}
              </p>
            </div>
            <span className="tabular" style={{ font: '600 20px/1.4 var(--mbc-font-serif)', color: 'var(--text-heading)', whiteSpace: 'nowrap' }}>
              {row.present} of {REQUIRED_MEETINGS}
            </span>
          </div>
        ))}
      </div>
      <p style={{ ...metaText, margin: 0, maxWidth: '72ch' }}>
        {clean === rows.length ? 'Every man on the roll' : `The other ${clean === 1 ? 'man has' : clean + ' have'}`} missed none. Present mode is not available on this side: no committee room, no
        care assignment and no deacon-audience thread goes on a wall.
      </p>
    </Card>
  )
}

const DISPOSITIONS: MotionDisposition[] = ['approved', 'tabled', 'withdrawn', 'failed']

const EMPTY_MOTION = {
  text: '', movedBy: '', secondedBy: '', disposition: '' as MotionDisposition | '', voteFor: '', voteAgainst: '',
  amends: false, bylawReference: '', textBefore: '', textAfter: '',
}

function Motions({ data, meeting, readOnly }: { data: MeetingsData; meeting: MeetingRecord; readOnly: boolean }) {
  const { recordMotion } = useMeetings()
  const { say } = useStore()
  const [draft, setDraft] = useState(EMPTY_MOTION)
  const tonight = motionsFor(data.motions, meeting)
  const tabled = tonight.filter((motion) => motion.disposition === 'tabled').length
  const nameOf = (personId: string | null) => data.roster.find((m) => m.personId === personId)?.name ?? '—'
  const set = <K extends keyof typeof EMPTY_MOTION>(key: K, value: (typeof EMPTY_MOTION)[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const record = async () => {
    if (!draft.text.trim() || !draft.disposition) {
      say('A motion needs its text and a disposition.')
      return
    }
    if (draft.amends && (!draft.bylawReference.trim() || !draft.textBefore.trim() || !draft.textAfter.trim())) {
      say('An amendment quotes the sentence before and after, not just the paragraph number.')
      return
    }
    await recordMotion(meeting.id, (tonight[tonight.length - 1]?.position ?? 0) + 1, {
      text: draft.text.trim(),
      movedBy: draft.movedBy || null,
      secondedBy: draft.secondedBy || null,
      disposition: draft.disposition,
      voteFor: draft.voteFor === '' ? null : Number(draft.voteFor),
      voteAgainst: draft.voteAgainst === '' ? null : Number(draft.voteAgainst),
      bylawReference: draft.amends ? draft.bylawReference.trim() : '',
      textBefore: draft.amends ? draft.textBefore.trim() : '',
      textAfter: draft.amends ? draft.textAfter.trim() : '',
    })
    setDraft(EMPTY_MOTION)
    say(draft.disposition === 'tabled' ? 'Recorded, and carried to the next agenda.' : 'Recorded.')
  }

  return (
    <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 0 }}>
      <SectionHead label="Motions" meta={`${tonight.length} captured tonight${tabled ? ` · ${tabled} tabled to the next meeting` : ''}`} />
      <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
        {tonight.length === 0 ? <p style={{ ...metaText, margin: 0, padding: '16px 2px', background: 'var(--surface-card)' }}>None yet.</p> : null}
        {tonight.map((motion) => (
          <MotionRow key={motion.id} motion={motion} nameOf={nameOf} />
        ))}
      </div>

      {!readOnly ? (
        <div style={{ display: 'grid', gap: 14, paddingTop: 22, marginTop: 6, borderTop: '1px solid var(--border-hairline)' }}>
          <p style={{ font: '600 22px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>Capture a motion</p>
          <Field label="Text moved — write it as it was moved">
            <textarea rows={3} value={draft.text} onChange={(e) => set('text', e.target.value)} style={{ ...fieldStyle, minHeight: 0, padding: '13px 14px', resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
            <Field label="Moved by">
              <select value={draft.movedBy} onChange={(e) => set('movedBy', e.target.value)} style={fieldStyle}>
                <option value="">—</option>
                {data.roster.map((m) => (
                  <option key={m.personId} value={m.personId}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Seconded by">
              <select value={draft.secondedBy} onChange={(e) => set('secondedBy', e.target.value)} style={fieldStyle}>
                <option value="">—</option>
                {data.roster.map((m) => (
                  <option key={m.personId} value={m.personId}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label="The count, if one was taken" group>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input inputMode="numeric" placeholder="For" value={draft.voteFor} onChange={(e) => set('voteFor', e.target.value.replace(/\D/g, ''))} style={fieldStyle} />
                <input inputMode="numeric" placeholder="Against" value={draft.voteAgainst} onChange={(e) => set('voteAgainst', e.target.value.replace(/\D/g, ''))} style={fieldStyle} />
              </div>
            </Field>
          </div>
          <Field label="Disposition" group>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DISPOSITIONS.map((disposition) => (
                <Pill key={disposition} selected={draft.disposition === disposition} onClick={() => set('disposition', disposition)}>
                  {disposition[0].toUpperCase() + disposition.slice(1)}
                </Pill>
              ))}
            </div>
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, font: '400 15px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
            <input type="checkbox" checked={draft.amends} onChange={(e) => set('amends', e.target.checked)} style={{ width: 18, height: 18 }} />
            This motion amends the bylaws
          </label>
          {draft.amends ? (
            <div style={{ display: 'grid', gap: 14, background: 'var(--surface-panel)', borderRadius: 14, padding: '16px 18px' }}>
              <p style={{ ...metaText, margin: 0, maxWidth: '70ch' }}>
                Quote the sentence before and the sentence after — not the paragraph number. A ledger that quotes the sentence cannot drift the way a ledger that cites a location does.
              </p>
              <Field label="Article and paragraph">
                <input value={draft.bylawReference} onChange={(e) => set('bylawReference', e.target.value)} placeholder="Art. II.B §3 ¶12" style={fieldStyle} />
              </Field>
              <Field label="The sentence before">
                <textarea rows={2} value={draft.textBefore} onChange={(e) => set('textBefore', e.target.value)} style={{ ...fieldStyle, minHeight: 0, padding: '13px 14px', resize: 'vertical' }} />
              </Field>
              <Field label="The sentence after">
                <textarea rows={2} value={draft.textAfter} onChange={(e) => set('textAfter', e.target.value)} style={{ ...fieldStyle, minHeight: 0, padding: '13px 14px', resize: 'vertical' }} />
              </Field>
            </div>
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <p style={{ ...metaText, margin: 0, maxWidth: '52ch' }}>Text and a disposition are required. A tabled motion is on the next agenda without anyone retyping it.</p>
            <Button variant="dark" size="md" onClick={() => void record()}>
              Record this motion
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function MotionRow({ motion, nameOf }: { motion: Motion; nameOf: (id: string | null) => string }) {
  const meta = [
    motion.movedBy ? `Moved by ${nameOf(motion.movedBy)}` : null,
    motion.secondedBy ? `seconded by ${nameOf(motion.secondedBy)}` : null,
    motion.voteFor !== null || motion.voteAgainst !== null ? `${motion.voteFor ?? 0}–${motion.voteAgainst ?? 0}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <div style={{ display: 'grid', gap: 10, padding: '18px 2px', background: 'var(--surface-card)' }}>
      <p style={{ font: '400 17px/1.6 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0, maxWidth: '84ch' }}>{motion.text}</p>
      <p style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline' }}>
        <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: motion.disposition === 'approved' ? 'var(--mbc-yale-sage)' : 'var(--text-eyebrow)' }}>
          {motion.disposition}
        </span>
        <span style={metaText}>{meta}</span>
      </p>
      {motion.bylawReference ? (
        <div style={{ background: 'var(--surface-panel)', borderRadius: 14, padding: '16px 18px', display: 'grid', gap: 8 }}>
          <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' }}>
            {motion.bylawReference} · the sentence, quoted both ways
          </span>
          <p style={{ ...bodyText, margin: 0 }}>
            <strong>Before.</strong> {motion.textBefore}
          </p>
          <p style={{ ...bodyText, margin: 0 }}>
            <strong>After.</strong> {motion.textAfter}
          </p>
        </div>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------- phase three */

function MinutesPhase({ data, meeting }: { data: MeetingsData; meeting: MeetingRecord }) {
  const roll = attendanceFor(data.attendance, meeting)
  const tonight = motionsFor(data.motions, meeting)
  const carried = carriedForward(data.motions, meeting)
  const nameOf = (personId: string | null) => data.roster.find((m) => m.personId === personId)?.name ?? '—'
  const present = data.roster.filter((m) => roll.get(m.personId)?.status === 'present')
  const absent = data.roster.filter((m) => roll.get(m.personId)?.status === 'absent')
  const excused = data.roster.filter((m) => roll.get(m.personId)?.status === 'excused')

  const blocks: { title: string; from: string; lines: string[] }[] = [
    {
      title: 'Attendance',
      from: 'from phase two',
      lines:
        roll.size === 0
          ? ['The roll was not called.']
          : [
              `${present.length} of ${data.roster.length} present${present.length ? ': ' + present.map((m) => m.name).join(', ') : ''}.`,
              ...(absent.length ? [`Absent: ${absent.map((m) => m.name).join(', ')}.`] : []),
              ...(excused.length ? [`Excused: ${excused.map((m) => m.name).join(', ')}.`] : []),
            ],
    },
    {
      title: 'Committee reports received',
      from: 'from the report builders',
      lines: ['The report builders arrive with the next phase. Reports filed against this meeting will be listed here on their own.'],
    },
    {
      title: 'Motions',
      from: 'derived from dispositions',
      lines: tonight.length === 0 ? ['No motions were recorded.'] : tonight.map((motion) => `${motion.text} — ${motion.disposition}${motion.movedBy ? `, moved by ${nameOf(motion.movedBy)}` : ''}${motion.secondedBy ? `, seconded by ${nameOf(motion.secondedBy)}` : ''}${motion.voteFor !== null ? ` (${motion.voteFor}–${motion.voteAgainst ?? 0})` : ''}.`),
    },
    {
      title: 'Carried to the next meeting',
      from: 'derived from dispositions',
      lines: carried.length === 0 ? ['Nothing was tabled.'] : carried.map((motion) => motion.text),
    },
  ]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
      <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ flex: '3 1 540px', display: 'grid', gap: 16, minWidth: 0 }}>
        <div>
          <Eyebrow size="sm">Already in the record — nobody retypes this</Eyebrow>
          <p style={{ font: '600 24px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: '10px 0 0' }}>
            {meeting.status === 'held' ? 'Assembled from the meeting.' : 'Assembling as the meeting goes.'}
          </p>
        </div>
        <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
          {blocks.map((block) => (
            <div key={block.title} style={{ display: 'grid', gap: 8, padding: '16px 2px', background: 'var(--surface-card)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-heading)' }}>{block.title}</span>
                <span style={{ font: '400 13px/1 var(--mbc-font-mono)', color: 'var(--text-muted)' }}>{block.from}</span>
              </div>
              {block.lines.map((line, index) => (
                <p key={index} style={{ font: '400 16px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '80ch' }}>{line}</p>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ flex: '2 1 380px', display: 'grid', gap: 20, alignContent: 'start', minWidth: 0 }}>
        <Card tone="panel" radius="card" pad="24px 26px" style={{ display: 'grid', gap: 12 }}>
          <Eyebrow size="sm">What only the secretary writes</Eyebrow>
          <p style={{ font: '600 22px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>The narrative, and the publishing, come with the builders.</p>
          <p style={{ ...bodyText, margin: 0 }}>
            The opening and prayer, the pastor’s word to the Board and the closing are the three things nobody can derive. They are written here in the next phase, and publishing then makes a version — an edit after publication creates a new one and leaves the prior readable.
          </p>
          <p style={{ ...metaText, margin: 0 }}>
            Minutes status: {meeting.minutesStatus === 'none' ? 'nothing written' : meeting.minutesStatus}.
          </p>
        </Card>
        <Card radius="card" pad="24px 26px" style={{ display: 'grid', gap: 10 }}>
          <Eyebrow size="sm">One thing to settle with the Board</Eyebrow>
          <p style={{ ...bodyText, margin: 0 }}>
            Art. II.E makes the Church Clerk the keeper of the church’s records. Whether this copy of the minutes or the Clerk’s is the record of file is a Board decision, and it should be made before the first set is published.
          </p>
        </Card>
      </div>
    </div>
  )
}

/* ----------------------------------------------------- the other meetings */

function OtherMeetings({ data, meeting }: { data: MeetingsData; meeting: MeetingRecord }) {
  const { createMeeting } = useMeetings()
  const { say } = useStore()
  const navigate = useNavigate()
  const [meetsOn, setMeetsOn] = useState('')
  const [kind, setKind] = useState<'regular' | 'special'>('regular')
  const others = sortedByDate(data.meetings).filter((m) => m.id !== meeting.id)

  const schedule = async () => {
    if (!meetsOn || meetsOn < todayIso()) {
      say('Pick a date that has not passed.')
      return
    }
    if (data.meetings.some((m) => m.meetsOn === meetsOn && m.kind === 'regular' && kind === 'regular')) {
      say('There is already a regular meeting on that date.')
      return
    }
    const created = await createMeeting({ meetsOn, kind, timeLabel: meeting.timeLabel, location: meeting.location })
    if (!created) return
    setMeetsOn('')
    say('Scheduled. The standing items are on its agenda.')
    navigate(meetingPath(created.id, 'agenda'))
  }

  return (
    <Card radius="card" pad="22px 24px" style={{ display: 'grid', gap: 14 }}>
      <SectionHead label="Other meetings" meta={`${data.meetings.length} on record`} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {others.length === 0 ? <p style={{ ...metaText, margin: 0 }}>This is the only one.</p> : null}
        {others.map((m) => (
          <Pill key={m.id} selected={false} onClick={() => navigate(meetingPath(m.id))}>
            {formatShort(parseDate(m.meetsOn))} · {m.status === 'held' ? 'held' : m.status === 'in_session' ? 'in session' : m.status}
          </Pill>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12, paddingTop: 14, borderTop: '1px solid var(--border-hairline)' }}>
        <Field label="Schedule the next meeting">
          <input type="date" value={meetsOn} onChange={(e) => setMeetsOn(e.target.value)} style={{ ...fieldStyle, width: 'auto' }} />
        </Field>
        <Field label="Kind">
          <select value={kind} onChange={(e) => setKind(e.target.value as 'regular' | 'special')} style={{ ...fieldStyle, width: 'auto' }}>
            <option value="regular">Regular</option>
            <option value="special">Special</option>
          </select>
        </Field>
        <Button variant="outline" size="md" onClick={() => void schedule()}>
          Schedule it
        </Button>
      </div>
    </Card>
  )
}

function NoMeetingYet() {
  const { createMeeting, addAgendaItem } = useMeetings()
  const { say } = useStore()
  const navigate = useNavigate()
  const [meetsOn, setMeetsOn] = useState('')
  const schedule = async () => {
    if (!meetsOn) {
      say('Pick the date.')
      return
    }
    const created = await createMeeting({ meetsOn, kind: 'regular', timeLabel: '7:00 PM', location: 'fellowship hall' })
    if (!created) return
    await addAgendaItem({ meetingId: created.id, position: 1, title: 'Treasurer’s report', source: 'recurring', sourceRef: 'Art. II.C ¶2', notes: '' })
    navigate(meetingPath(created.id))
  }
  return (
    <Card tone="panel" radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 14, maxWidth: 640 }}>
      <Eyebrow size="sm">No meeting on record yet</Eyebrow>
      <p style={{ font: '600 24px/1.25 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>Schedule the first one.</p>
      <p style={{ ...bodyText, margin: 0 }}>The Board convenes monthly (Art. II.B §3 ¶5). The Treasurer’s report is on every regular agenda by rule (Art. II.C ¶2).</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
        <Field label="Meets on">
          <input type="date" value={meetsOn} onChange={(e) => setMeetsOn(e.target.value)} style={{ ...fieldStyle, width: 'auto' }} />
        </Field>
        <Button variant="primary" size="md" onClick={() => void schedule()}>
          Schedule it
        </Button>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------ small parts */

function SectionHead({ label, meta }: { label: string; meta: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingBottom: 14, marginBottom: 2, borderBottom: '1px solid var(--border-hairline)' }}>
      <span style={{ font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' }}>{label}</span>
      <span className="tabular" style={{ font: '400 15px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{meta}</span>
    </div>
  )
}

/** A labelled field. `group` for a set of controls — pills, a pair of inputs —
    where a <label> would wrongly hand a click on the caption to the first one. */
function Field({ label, group, children }: { label: string; group?: boolean; children: ReactNode }) {
  const caption = <span style={{ font: '700 13px/1.3 var(--mbc-font-sans)', letterSpacing: '.04em', color: 'var(--text-heading)' }}>{label}</span>
  if (group) {
    return (
      <div role="group" aria-label={label} style={{ display: 'grid', gap: 8 }}>
        {caption}
        {children}
      </div>
    )
  }
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      {caption}
      {children}
    </label>
  )
}

function Pill({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      style={{
        minHeight: 48,
        borderRadius: 'var(--mbc-radius-pill)',
        padding: '0 20px',
        background: selected ? 'var(--surface-panel)' : 'transparent',
        border: selected ? '1px solid var(--text-heading)' : '1px solid var(--border-control)',
        font: selected ? '700 15px/1 var(--mbc-font-sans)' : '400 15px/1 var(--mbc-font-sans)',
        color: 'var(--text-heading)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>{children}</p>
}

const fieldStyle: CSSProperties = {
  width: '100%',
  minHeight: 48,
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-input)',
  borderRadius: 10,
  padding: '0 14px',
  font: '400 16px/1.4 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
}

const metaText: CSSProperties = { font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const bodyText: CSSProperties = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)' }
const linkButton: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '6px 0 0',
  font: '400 14px/1.4 var(--mbc-font-sans)',
  color: 'var(--text-link)',
  cursor: 'pointer',
  textAlign: 'left',
}

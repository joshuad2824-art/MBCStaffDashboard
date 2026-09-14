import { useRef, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { Button, Card, Eyebrow } from '../components/ui'
import { useMeetings } from '../data/meetings/store'
import { currentMeeting, sortedByDate } from '../data/meetings/derive'
import { COMMITTEES, COMMITTEE_SHORT, emptyPayload, reportTitle, type Report } from '../data/meetings/reports'
import type { MeetingsData } from '../data/meetings/types'
import { formatShort, parseDate, startOfToday, toIso, todayIso } from '../lib/date'
import { useSession } from '../session/session'
import { ReportBuilder } from './ReportBuilder'
import { ReportPrint } from './ReportPrint'

/* Where every report lives. Publishing puts it here; a new period's report
   moves the one it replaces to the archive, where it stays readable,
   printable and editable. Nothing is deleted. */

export function Reports() {
  const { data, error } = useMeetings()
  if (error) return <Note>{error}</Note>
  if (!data) return <Note>Opening the records…</Note>
  return (
    <Routes>
      <Route index element={<ReportsIndex data={data} />} />
      <Route path="print/:reportId" element={<ReportPrint data={data} />} />
      <Route path="packet/:meetingId" element={<ReportPrint data={data} />} />
      <Route path="range/:from/:to" element={<ReportPrint data={data} />} />
      <Route path=":reportId" element={<ReportBuilder data={data} />} />
    </Routes>
  )
}

function ReportsIndex({ data }: { data: MeetingsData }) {
  const { bodies, isChairOf } = useSession()
  const { createReport, attachFile } = useMeetings()
  const navigate = useNavigate()
  const today = startOfToday()
  const picker = useRef<HTMLInputElement>(null)
  const [uploadFor, setUploadFor] = useState<string>('committee:finance')
  const current = currentMeeting(data.meetings, today)
  const onBoard = bodies.includes('deacon-board')
  const [from, setFrom] = useState(toIso(new Date(today.getFullYear(), 0, 1)))
  const [to, setTo] = useState(todayIso())

  const mine = data.reports.filter((r) => r.status === 'draft' || r.status === 'submitted')
  const published = data.reports.filter((r) => r.status === 'published').sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  const archived = data.reports.filter((r) => r.status === 'archived').sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))

  const start = async (kind: 'committee' | 'treasurer', bodySlug: string) => {
    const meetingId = current?.id ?? null
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const last = new Date(today.getFullYear(), today.getMonth(), 0)
    const created = await createReport({
      kind,
      bodySlug,
      meetingId,
      periodStart: kind === 'treasurer' ? toIso(first) : null,
      periodEnd: kind === 'treasurer' ? toIso(last) : null,
      payload: emptyPayload(kind, bodySlug),
    })
    if (created) navigate(`/reports/${created.id}`)
  }

  const starters: { label: string; onStart(): void }[] = []
  for (const slug of COMMITTEES) {
    if (!isChairOf(slug)) continue
    const open = mine.find((r) => r.kind === 'committee' && r.bodySlug === slug)
    if (!open) starters.push({ label: `Start the ${COMMITTEE_SHORT[slug]} report`, onStart: () => void start('committee', slug) })
  }
  if (isChairOf('committee:finance') && !mine.some((r) => r.kind === 'treasurer')) {
    starters.push({ label: 'Start the Treasurer’s itemised report', onStart: () => void start('treasurer', 'committee:finance') })
  }
  /* A report filed their traditional way: pick the committee, pick the file.
     The chair or any Board member may do this; the file stands in for the
     form and moves through the same lifecycle. */
  const upload = async (chosen: File | null) => {
    if (!chosen) return
    const created = await createReport({ kind: 'committee', bodySlug: uploadFor, meetingId: current?.id ?? null, periodStart: null, periodEnd: null, payload: emptyPayload('committee', uploadFor) })
    if (!created) return
    const stored = await attachFile(created, chosen)
    if (stored) navigate(`/reports/${created.id}`)
  }
  const canUploadFor = COMMITTEES.filter((slug) => onBoard || isChairOf(slug))

  const heldWithoutMinutes = onBoard
    ? sortedByDate(data.meetings).filter((m) => m.status === 'held' && !data.reports.some((r) => r.kind === 'minutes' && r.meetingId === m.id))
    : []

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {canUploadFor.length > 0 ? (
        <Card tone="panel" radius="card" pad="22px 24px" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'grid', gap: 6, maxWidth: '56ch' }}>
            <Eyebrow size="sm">Upload a report instead</Eyebrow>
            <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
              For a committee that puts its report together its own way. Attach the file and it files, publishes and archives like any other; each newer file is a new version.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Committee</span>
              <select value={uploadFor} onChange={(e) => setUploadFor(e.target.value)} style={fieldStyle}>
                {canUploadFor.map((slug) => (
                  <option key={slug} value={slug}>{COMMITTEE_SHORT[slug]}</option>
                ))}
              </select>
            </label>
            <input ref={picker} type="file" accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,application/pdf" style={{ display: 'none' }} onChange={(e) => void upload(e.target.files?.[0] ?? null)} />
            <Button variant="outline" size="md" onClick={() => picker.current?.click()}>
              Choose the file
            </Button>
          </div>
        </Card>
      ) : null}

      {(mine.length > 0 || starters.length > 0 || heldWithoutMinutes.length > 0) ? (
        <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 14 }}>
          <Eyebrow size="sm">Yours to write</Eyebrow>
          <ReportRows data={data} reports={mine} empty="Nothing in progress." />
          {starters.length > 0 || heldWithoutMinutes.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 8 }}>
              {starters.map((starter) => (
                <Button key={starter.label} variant="outline" size="md" onClick={starter.onStart}>
                  {starter.label}
                </Button>
              ))}
              {heldWithoutMinutes.map((m) => (
                <Button key={m.id} variant="outline" size="md" onClick={() => navigate(`/meeting/${m.id}/minutes`)}>
                  Write the minutes of {formatShort(parseDate(m.meetsOn))}
                </Button>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <Eyebrow size="sm">Current · published</Eyebrow>
          <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{published.length} on the page</span>
        </div>
        <ReportRows data={data} reports={published} empty="Nothing published yet. Publishing a report puts it here and makes it printable." />
      </Card>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <Card tone="panel" radius="card" pad="22px 24px" style={{ flex: '1 1 320px', display: 'grid', gap: 12 }}>
          <Eyebrow size="sm">Print a meeting’s packet</Eyebrow>
          <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>The agenda in the Board’s template, then every report filed against the meeting as its appendices.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sortedByDate(data.meetings).filter((m) => m.status !== 'cancelled').slice(-6).reverse().map((m) => (
              <Button key={m.id} variant="outline" size="sm" onClick={() => navigate(`/reports/packet/${m.id}`)}>
                {formatShort(parseDate(m.meetsOn))}
              </Button>
            ))}
          </div>
        </Card>
        <Card tone="panel" radius="card" pad="22px 24px" style={{ flex: '1 1 320px', display: 'grid', gap: 12 }}>
          <Eyebrow size="sm">Print a date range</Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={fieldStyle} />
            </label>
            <Button variant="outline" size="md" onClick={() => navigate(`/reports/range/${from}/${to}`)}>
              Print everything published
            </Button>
          </div>
        </Card>
      </div>

      <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <Eyebrow size="sm">Archive</Eyebrow>
          <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>A state, not a bin. Still readable, printable, editable.</span>
        </div>
        <ReportRows data={data} reports={archived} empty="Nothing archived. A new period’s report moves the one it replaces here." />
      </Card>
    </div>
  )
}

function ReportRows({ data, reports, empty }: { data: MeetingsData; reports: Report[]; empty: string }) {
  const navigate = useNavigate()
  if (reports.length === 0) return <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>{empty}</p>
  return (
    <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
      {reports.map((report) => {
        const meeting = data.meetings.find((m) => m.id === report.meetingId)
        const versions = data.versions.filter((v) => v.reportId === report.id).length
        const who = (report.updatedBy && data.names[report.updatedBy]) || (report.createdBy && data.names[report.createdBy]) || ''
        const meta = [
          meeting ? `for ${formatShort(parseDate(meeting.meetsOn))}` : 'not yet filed against a meeting',
          report.status === 'published' && report.publishedAt ? `published ${formatShort(parseDate(report.publishedAt.slice(0, 10)))}` : null,
          report.status === 'archived' && report.archivedAt ? `archived ${formatShort(parseDate(report.archivedAt.slice(0, 10)))}` : null,
          versions > 1 ? `${versions} versions` : versions === 1 ? '1 version' : null,
          who,
        ]
          .filter(Boolean)
          .join(' · ')
        return (
          <div key={report.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 2px', background: 'var(--surface-card)' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>{reportTitle(report)}</p>
              <p style={{ font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '2px 0 0' }}>
                <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: report.status === 'published' ? 'var(--mbc-yale-sage)' : 'var(--text-eyebrow)', marginRight: 10 }}>{report.status}</span>
                {meta}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" onClick={() => navigate(`/reports/${report.id}`)}>
                Open
              </Button>
              {report.status === 'published' || report.status === 'archived' ? (
                <Button variant="outline" size="sm" onClick={() => navigate(`/reports/print/${report.id}`)}>
                  Print
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>{children}</p>
}

const labelStyle = { font: '700 13px/1.3 var(--mbc-font-sans)', letterSpacing: '.04em', color: 'var(--text-heading)' } as const
const fieldStyle = {
  minHeight: 48, background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 10, padding: '0 14px',
  font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)',
} as const

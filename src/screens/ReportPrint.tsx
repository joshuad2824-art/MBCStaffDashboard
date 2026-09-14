import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useParams } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { Button, Card, Eyebrow } from '../components/ui'
import { APPENDIX, renderReport, type RenderedReport, type Report, type ReportVersion } from '../data/meetings/reports'
import { renderAgenda, renderContextFor } from '../data/meetings/render'
import { useMeetings } from '../data/meetings/store'
import type { MeetingsData } from '../data/meetings/types'
import { formatLong, parseDate, startOfToday } from '../lib/date'

/* Printing. One report, a meeting's whole packet, or a date range — in the
   MBC print styling rather than whatever the browser does by default. The
   on-screen view is the same rendered object the printer gets, portalled to
   the body the way the Communicator does it, on portrait letter. */

export function ReportPrint({ data }: { data: MeetingsData }) {
  const { reportId, meetingId, from, to } = useParams()

  let items: { report: Report; version: ReportVersion | null }[] = []
  let heading = ''
  let agenda: RenderedReport | null = null
  /** The appendices a meeting's committee reports make, A to D. */
  const appendices = (id: string) =>
    data.reports
      .filter((r) => r.meetingId === id && r.status !== 'draft' && r.kind !== 'minutes')
      .sort((a, b) => order(a) - order(b))
      .map((report) => ({ report, version: latest(data, report) }))
  if (reportId) {
    const report = data.reports.find((r) => r.id === reportId)
    if (!report) return <Navigate to="/reports" replace />
    items = [{ report, version: latest(data, report) }]
    // The minutes carry their appendices, as the Board's always have.
    if (report.kind === 'minutes' && report.meetingId) items = [...items, ...appendices(report.meetingId)]
    heading = report.kind === 'minutes' ? 'The minutes, with their appendices' : 'One report'
  } else if (meetingId) {
    const meeting = data.meetings.find((m) => m.id === meetingId)
    if (!meeting) return <Navigate to="/reports" replace />
    const on = parseDate(meeting.meetsOn)
    heading = 'The packet for ' + (on ? formatLong(on) : meeting.meetsOn)
    agenda = renderAgenda(data, meeting)
    items = appendices(meeting.id)
  } else if (from && to) {
    heading = `Published ${from} to ${to}`
    items = data.reports
      .filter((r) => r.publishedAt && r.publishedAt.slice(0, 10) >= from && r.publishedAt.slice(0, 10) <= to)
      .sort((a, b) => (a.publishedAt ?? '').localeCompare(b.publishedAt ?? ''))
      .map((report) => ({ report, version: latest(data, report) }))
  }

  const rendered = items.map(({ report, version }) => ({
    report,
    version,
    rendered: renderReport(renderContextFor(data, version ? { ...report, payload: version.payload } : report, startOfToday())),
  }))

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <Eyebrow size="sm">{heading}</Eyebrow>
          <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '6px 0 0', maxWidth: '60ch' }}>
            {rendered.length === 0 && !agenda
              ? 'Nothing published in that range.'
              : `${agenda ? 'The agenda, then ' : ''}${rendered.length} ${rendered.length === 1 ? 'report' : 'reports'}, each on its own page. What you see is what the printer gets.`}
          </p>
        </div>
        {rendered.length > 0 || agenda ? (
          <Button variant="primary" size="md" onClick={() => window.print()}>
            Print
          </Button>
        ) : null}
      </div>

      {agenda ? <PrintedReport page={agenda} footer="Agenda · Memorial Baptist Church, Tulsa" /> : null}
      {rendered.map(({ report, version, rendered: page }) => (
        <div key={report.id} style={{ display: 'grid', gap: 10 }}>
          <PrintedReport page={page} footer={footerFor(report, version)} />
          {(version?.file ?? report.file) ? <FileLink file={(version?.file ?? report.file)!} /> : null}
        </div>
      ))}

      {createPortal(
        <div className="print-only" aria-hidden>
          <style>{'@page { size: letter portrait; margin: 0.8in; }'}</style>
          {agenda ? (
            <div className="print-report">
              <PrintedReport page={agenda} footer="Agenda · Memorial Baptist Church, Tulsa" plain />
            </div>
          ) : null}
          {rendered.map(({ report, version, rendered: page }) => (
            <div key={report.id} className="print-report">
              <PrintedReport page={page} footer={footerFor(report, version)} plain />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

/** An uploaded report prints from its file. */
function FileLink({ file }: { file: { path: string; name: string; type: string } }) {
  const { fileUrl } = useMeetings()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    fileUrl(file).then((u) => {
      if (live) setUrl(u)
    })
    return () => {
      live = false
    }
  }, [file, fileUrl])
  if (!url) return null
  return (
    <p style={{ font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
      Filed as a file:{' '}
      <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)', fontWeight: 700 }}>
        open {file.name}
      </a>{' '}
      and print it from there.
    </p>
  )
}

function latest(data: MeetingsData, report: Report): ReportVersion | null {
  return data.versions.filter((v) => v.reportId === report.id).sort((a, b) => b.versionNo - a.versionNo)[0] ?? null
}

/** Appendix order: A to D, then the Treasurer's itemised report. */
function order(report: Report): number {
  if (report.kind === 'treasurer') return 10
  return (APPENDIX[report.bodySlug] ?? 'Z').charCodeAt(0)
}

export function footerFor(report: Report, version: ReportVersion | null): string {
  return (
    (version ? `Version ${version.versionNo} · published ${version.publishedAt.slice(0, 10)}` : 'Unpublished draft') +
    (report.status === 'archived' ? ' · archived' : '') +
    ' · Memorial Baptist Church, Tulsa'
  )
}

/** The printed artefact: the one on-screen shadow in the deacon side, because
    it stands in for paper. `plain` drops the card for the printer. */
export function PrintedReport({ page, footer, plain }: { page: RenderedReport; footer: string; plain?: boolean }) {
  const body = (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{page.label}</span>
        <p style={{ font: '600 24px/1.2 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: '8px 0 0' }}>{page.title}</p>
        <p style={{ font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '6px 0 0' }}>{page.byline}</p>
      </div>
      <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
        {page.sections.map((section) => (
          <div key={section.title} style={{ display: 'grid', gap: 6, padding: '14px 0', background: plain ? '#fff' : 'var(--surface-print)' }}>
            <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-heading)' }}>{section.title}</span>
            {section.lines.map((line, index) => (
              <p key={index} style={{ font: '400 15px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>{line}</p>
            ))}
          </div>
        ))}
      </div>
      <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>{footer}</p>
    </div>
  )
  if (plain) return <div style={{ ...printPage }}>{body}</div>
  return (
    <Card tone="print" pad="30px 32px" style={{ borderRadius: 4, maxWidth: 760 }}>
      {body}
    </Card>
  )
}

const printPage: CSSProperties = { fontFamily: 'var(--mbc-font-sans)', color: '#3A322B' }

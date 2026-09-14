import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Eyebrow } from '../components/ui'
import { useStore } from '../data/store'
import { useMeetings } from '../data/meetings/store'
import { sortedByDate } from '../data/meetings/derive'
import {
  APPENDIX,
  COMMITTEES,
  COMMITTEE_SHORT,
  STATUS_STEPS,
  budgetPosition,
  money,
  normalisePayload,
  renderReport,
  renderedText,
  reportTitle,
  sum,
  type BoardItem,
  type FamilyAssistancePayload,
  type FinancePayload,
  type GroundsPayload,
  type MinutesPayload,
  type MoneyLine,
  type PersonnelPayload,
  type Report,
  type ReportPayload,
  type TitledItem,
  type TreasurerPayload,
} from '../data/meetings/reports'
import { renderContextFor } from '../data/meetings/render'
import type { MeetingsData } from '../data/meetings/types'
import { formatShort, parseDate, startOfToday } from '../lib/date'
import { useSession } from '../session/session'
import { PrintedReport, footerFor } from './ReportPrint'

/* The builders. One form per committee shaped to what that committee files;
   the Treasurer's itemised report; the minutes in the Board's own template.
   Every figure is a field and every narrative is one sentence per row. The
   preview on the right is the `rendered` column: what is filed, what is
   printed, and what is on screen are the same object.
   design_handoff_deacons_dashboard/SCREENS.md §3. */

export function ReportBuilder({ data }: { data: MeetingsData }) {
  const { reportId } = useParams()
  const report = data.reports.find((r) => r.id === reportId)
  if (!report) return <Navigate to="/reports" replace />
  return <Builder key={report.id} data={data} report={report} />
}

function Builder({ data, report }: { data: MeetingsData; report: Report }) {
  const { bodies, isChairOf } = useSession()
  const { saveReport, publish, refresh, error } = useMeetings()
  const { say } = useStore()
  const navigate = useNavigate()
  const [payload, setPayload] = useState<ReportPayload>(() => normalisePayload(report.kind, report.bodySlug, report.payload))
  const [meetingId, setMeetingId] = useState<string | null>(report.meetingId)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (error) say(error)
  }, [error, say])

  const canWrite = report.kind === 'minutes' ? bodies.includes('deacon-board') : isChairOf(report.bodySlug)
  const versions = data.versions.filter((v) => v.reportId === report.id).sort((a, b) => b.versionNo - a.versionNo)
  const meetings = sortedByDate(data.meetings).filter((m) => m.status !== 'cancelled')
  const asOf = startOfToday()
  const preview = useMemo(
    () => renderReport(renderContextFor(data, { ...report, payload, meetingId }, asOf)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, report, payload, meetingId],
  )
  const set = (next: ReportPayload) => {
    setPayload(next)
    setDirty(true)
  }

  const save = async () => {
    setBusy(true)
    await saveReport(report.id, { payload, meetingId })
    setBusy(false)
    setDirty(false)
    say('Draft saved.')
  }
  const submit = async () => {
    if (!meetingId) {
      say('Choose the meeting it is filed against.')
      return
    }
    setBusy(true)
    await saveReport(report.id, { payload, meetingId, status: 'submitted', submittedAt: new Date().toISOString(), submittedBy: data.me })
    await refresh()
    setBusy(false)
    setDirty(false)
    say('Filed. It is on the meeting’s agenda.')
  }
  const doPublish = async () => {
    if (!meetingId) {
      say('Choose the meeting it is filed against.')
      return
    }
    setBusy(true)
    if (meetingId !== report.meetingId) await saveReport(report.id, { meetingId })
    const version = await publish({ ...report, meetingId }, payload, renderedText(preview))
    await refresh()
    setBusy(false)
    setDirty(false)
    if (version) say(version.versionNo === 1 ? 'Published. Version 1 is on the Reports page and printable.' : `Published as version ${version.versionNo}. The prior version stays readable.`)
  }

  const primary =
    report.status === 'draft'
      ? { label: 'Submit to the Board', act: submit }
      : report.status === 'submitted'
        ? { label: 'Publish the report', act: doPublish }
        : { label: 'Publish a new version', act: doPublish }

  const chair = (report.submittedBy && data.names[report.submittedBy]) || (report.createdBy && data.names[report.createdBy]) || '—'
  const lastRevision = versions[0]

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div>
          <Eyebrow size="sm">
            {report.kind === 'minutes' ? 'Deacon Board · the secretary’s record' : `${report.bodyName.replace(/ Committee$/, '')} · ${chair}${report.kind === 'treasurer' ? ', Treasurer' : ', chair'}`}
          </Eyebrow>
          <p style={{ font: '600 26px/1.2 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: '8px 0 0' }}>{reportTitle(report)}</p>
        </div>
        <button type="button" onClick={() => navigate('/reports')} style={linkButton}>
          All reports
        </button>
      </div>

      <LifecycleStrip status={report.status} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ flex: '3 1 560px', display: 'grid', gap: 20, minWidth: 0 }}>
          <Card radius="card" pad="22px 24px" style={{ display: 'grid', gap: 14 }}>
            <SectionHead label="Filed against" meta={meetingId ? 'on that meeting’s agenda once submitted' : 'not yet chosen'} />
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
              <Field label="The meeting">
                <select value={meetingId ?? ''} disabled={!canWrite || report.kind === 'minutes'} onChange={(e) => { setMeetingId(e.target.value || null); setDirty(true) }} style={fieldStyle}>
                  <option value="">—</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>{formatShort(parseDate(m.meetsOn))} · {m.status === 'held' ? 'held' : m.status === 'in_session' ? 'in session' : 'planned'}</option>
                  ))}
                </select>
              </Field>
              {report.kind === 'treasurer' ? (
                <Field label="The month reported">
                  <input value={report.periodStart ? report.periodStart.slice(0, 7) : ''} readOnly style={fieldStyle} />
                </Field>
              ) : null}
            </div>
          </Card>

          {report.kind === 'minutes' ? (
            <MinutesForm payload={payload as MinutesPayload} onChange={set} readOnly={!canWrite} />
          ) : report.kind === 'treasurer' ? (
            <TreasurerForm data={data} report={report} payload={payload as TreasurerPayload} onChange={set} readOnly={!canWrite} />
          ) : report.bodySlug === 'committee:building-grounds' ? (
            <GroundsForm payload={payload as GroundsPayload} onChange={set} readOnly={!canWrite} />
          ) : report.bodySlug === 'committee:personnel' ? (
            <PersonnelForm payload={payload as PersonnelPayload} onChange={set} readOnly={!canWrite} />
          ) : report.bodySlug === 'committee:family-assistance' ? (
            <FamilyAssistanceForm payload={payload as FamilyAssistancePayload} onChange={set} readOnly={!canWrite} />
          ) : (
            <FinanceForm payload={payload as FinancePayload} onChange={set} readOnly={!canWrite} asOf={asOf} />
          )}

          {canWrite ? (
            <Card radius="card" pad="22px 24px" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <p style={{ ...metaText, margin: 0, maxWidth: '56ch' }}>
                {report.status === 'draft'
                  ? 'Submitting files it against the meeting and puts it on the agenda. Saving a draft costs nothing and you can come back.'
                  : report.status === 'submitted'
                    ? 'Publishing makes it official: on the Reports page, in the packet, and printable. It writes version one.'
                    : `Published${lastRevision ? ` · version ${lastRevision.versionNo}, ${formatShort(parseDate(lastRevision.publishedAt.slice(0, 10)))} by ${(lastRevision.createdBy && data.names[lastRevision.createdBy]) || '—'}` : ''}. An edit here becomes a new version; the prior stays readable.`}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button variant="outline" size="md" disabled={busy || !dirty} onClick={() => void save()}>
                  Save the draft
                </Button>
                <Button variant="primary" size="md" disabled={busy} onClick={() => void primary.act()}>
                  {primary.label}
                </Button>
              </div>
            </Card>
          ) : (
            <p style={{ ...metaText, margin: 0 }}>You can read this report. Only {report.kind === 'minutes' ? 'a Board member' : 'its chair'} writes it.</p>
          )}
        </div>

        <div style={{ flex: '2 1 360px', display: 'grid', gap: 20, alignContent: 'start', minWidth: 0 }}>
          <div>
            <Eyebrow size="sm" style={{ marginBottom: 10 }}>As it will be filed and printed</Eyebrow>
            <PrintedReport page={preview} footer={footerFor({ ...report, payload }, lastRevision ?? null)} />
          </div>
          <Card radius="card" pad="22px 24px" style={{ display: 'grid', gap: 10 }}>
            <Eyebrow size="sm">Versions · nothing overwrites</Eyebrow>
            {versions.length === 0 ? (
              <p style={{ ...bodyText, margin: 0 }}>Not published yet. Publishing writes version one.</p>
            ) : (
              <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
                {versions.map((v) => (
                  <div key={v.id} style={{ padding: '10px 2px', background: 'var(--surface-card)' }}>
                    <p style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>Version {v.versionNo}</p>
                    <p style={{ ...metaText, margin: '2px 0 0' }}>
                      {v.versionNo === 1 ? 'Published' : 'Revised'} {formatShort(parseDate(v.publishedAt.slice(0, 10)))} by {(v.createdBy && data.names[v.createdBy]) || '—'} · still readable, still printable
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p style={{ ...metaText, margin: 0 }}>An edit after publication creates a new version and leaves the prior one readable. That is what lets the edit button exist at all.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function LifecycleStrip({ status }: { status: Report['status'] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, background: 'var(--border-hairline)', border: '1px solid var(--border-card)', borderRadius: 'var(--mbc-radius-card)', overflow: 'hidden' }}>
      {STATUS_STEPS.map((step, index) => {
        const current = step.key === status
        return (
          <div key={step.key} style={{ flex: '1 1 190px', minHeight: 104, padding: '18px 22px', display: 'grid', gap: 8, alignContent: 'start', background: current ? 'var(--surface-panel)' : 'var(--surface-card)' }}>
            <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.18em', textTransform: 'uppercase', color: current ? 'var(--text-eyebrow)' : 'var(--text-muted)' }}>Step {index + 1}</span>
            <span style={{ font: '600 22px/1.15 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>{step.label}</span>
            <span style={{ ...metaText }}>{step.means}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ the forms */

function FinanceForm({ payload, onChange, readOnly, asOf }: { payload: FinancePayload; onChange(p: FinancePayload): void; readOnly: boolean; asOf: Date }) {
  const position = budgetPosition(payload, asOf)
  const up = (patch: Partial<FinancePayload>) => onChange({ ...payload, ...patch })
  return (
    <>
      <Section label="One · budget" meta={payload.asOf ? `as of ${payload.asOf}` : 'derivation, not entry'}>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
          <Field label="As of (date, or week)"><input value={payload.asOf} readOnly={readOnly} onChange={(e) => up({ asOf: e.target.value })} placeholder="9/10/2026 (Week 36)" style={fieldStyle} /></Field>
          <MoneyField label="Year-to-date offerings goal" value={payload.budgetAdopted} readOnly={readOnly} onChange={(v) => up({ budgetAdopted: v })} />
          <MoneyField label="Year-to-date actual offerings" value={payload.receivedYtd} readOnly={readOnly} onChange={(v) => up({ receivedYtd: v })} />
          <MoneyField label="Year-to-date actual expenses" value={payload.spentYtd} readOnly={readOnly} onChange={(v) => up({ spentYtd: v })} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingTop: 14, borderTop: '1px solid var(--border-hairline)' }}>
          <p style={{ font: '400 16px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '56ch' }}>{position.sentence}</p>
          <span className="tabular" style={{ font: '600 30px/1 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>{position.position === null ? '—' : money(position.position)}</span>
        </div>
      </Section>
      <Section label="Two · other receipts" meta="building use, designated giving, missions">
        <MoneyLines lines={payload.otherReceipts} readOnly={readOnly} onChange={(otherReceipts) => up({ otherReceipts })} addLabel="Add a receipt line" />
      </Section>
      <Section label="Three · observations and variances" meta="one line, one figure, one sentence">
        <div style={{ display: 'grid', gap: 12 }}>
          {payload.variances.map((v, index) => (
            <div key={index} style={{ background: 'var(--surface-panel)', borderRadius: 14, padding: '16px 18px', display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <input value={v.line} readOnly={readOnly} placeholder="Line" onChange={(e) => up({ variances: replaceAt(payload.variances, index, { ...v, line: e.target.value }) })} style={{ ...fieldStyle, background: 'var(--surface-card)' }} />
                <input value={v.amount} readOnly={readOnly} placeholder="over by $3,410" onChange={(e) => up({ variances: replaceAt(payload.variances, index, { ...v, amount: e.target.value }) })} style={{ ...fieldStyle, background: 'var(--surface-card)' }} />
              </div>
              <textarea rows={2} value={v.note} readOnly={readOnly} placeholder="One sentence." onChange={(e) => up({ variances: replaceAt(payload.variances, index, { ...v, note: e.target.value }) })} style={{ ...fieldStyle, background: 'var(--surface-card)', minHeight: 0, padding: '13px 14px', resize: 'vertical' }} />
              {!readOnly ? <button type="button" style={linkButton} onClick={() => up({ variances: payload.variances.filter((_, i) => i !== index) })}>Remove</button> : null}
            </div>
          ))}
          {!readOnly ? <AddPill onClick={() => up({ variances: [...payload.variances, { line: '', amount: '', note: '' }] })}>Add a line</AddPill> : null}
        </div>
      </Section>
      <Section label="Four · actions the committee took" meta="">
        <Lines lines={payload.actions} readOnly={readOnly} onChange={(actions) => up({ actions })} addLabel="Add an action" />
      </Section>
      <Section label="Five · items for the Board" meta={itemsMeta(payload.items)}>
        <Items items={payload.items} readOnly={readOnly} onChange={(items) => up({ items })} />
      </Section>
    </>
  )
}

function GroundsForm({ payload, onChange, readOnly }: { payload: GroundsPayload; onChange(p: GroundsPayload): void; readOnly: boolean }) {
  const up = (patch: Partial<GroundsPayload>) => onChange({ ...payload, ...patch })
  const monthTotal = payload.expenses.reduce((t, l) => t + (l.amount ?? 0), 0)
  return (
    <>
      <Section label="One · activity for the month" meta={`total ${money(monthTotal)}`}>
        <div style={{ display: 'grid', gap: 10 }}>
          {payload.expenses.map((line, index) => (
            <div key={index} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(120px, 1fr) minmax(200px, 3fr) minmax(120px, 1fr) auto', alignItems: 'center' }}>
              <input value={line.date} readOnly={readOnly} placeholder="8/7" onChange={(e) => up({ expenses: replaceAt(payload.expenses, index, { ...line, date: e.target.value }) })} style={fieldStyle} />
              <input value={line.description} readOnly={readOnly} placeholder="Description" onChange={(e) => up({ expenses: replaceAt(payload.expenses, index, { ...line, description: e.target.value }) })} style={fieldStyle} />
              <input inputMode="decimal" value={line.amount ?? ''} readOnly={readOnly} placeholder="Amount" onChange={(e) => up({ expenses: replaceAt(payload.expenses, index, { ...line, amount: toNumber(e.target.value) }) })} style={fieldStyle} />
              {!readOnly ? <button type="button" style={linkButton} onClick={() => up({ expenses: payload.expenses.filter((_, i) => i !== index) })}>Remove</button> : <span />}
            </div>
          ))}
          {!readOnly ? <AddPill onClick={() => up({ expenses: [...payload.expenses, { date: '', description: '', amount: null }] })}>Add a line</AddPill> : null}
        </div>
      </Section>
      <Section label="Two · budget information" meta={payload.budgetAnnual !== null ? `balance ${money(payload.budgetAnnual - (payload.spentYtd ?? 0))}` : ''}>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
          <MoneyField label="Annual budget" value={payload.budgetAnnual} readOnly={readOnly} onChange={(v) => up({ budgetAnnual: v })} />
          <MoneyField label="Spent year to date" value={payload.spentYtd} readOnly={readOnly} onChange={(v) => up({ spentYtd: v })} />
        </div>
      </Section>
      <Section label="Three · projects" meta="">
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div><p style={{ ...labelText, margin: '0 0 8px' }}>Open</p><Lines lines={payload.projectsOpen} readOnly={readOnly} onChange={(projectsOpen) => up({ projectsOpen })} addLabel="Add a project" /></div>
          <div><p style={{ ...labelText, margin: '0 0 8px' }}>Closed</p><Lines lines={payload.projectsClosed} readOnly={readOnly} onChange={(projectsClosed) => up({ projectsClosed })} addLabel="Add a project" /></div>
        </div>
      </Section>
      <Section label="Four · items for the Board" meta={itemsMeta(payload.items)}>
        <Items items={payload.items} readOnly={readOnly} onChange={(items) => up({ items })} />
      </Section>
    </>
  )
}

function PersonnelForm({ payload, onChange, readOnly }: { payload: PersonnelPayload; onChange(p: PersonnelPayload): void; readOnly: boolean }) {
  const up = (patch: Partial<PersonnelPayload>) => onChange({ ...payload, ...patch })
  return (
    <>
      <Card tone="panel" radius="card" pad="16px 18px">
        <p style={{ ...bodyText, margin: 0, maxWidth: '70ch' }}>
          <strong>No compensation figures.</strong> The Board evaluates the Senior Pastor’s review (Art. II.B §3); it does not need salary detail in a database to do it. The database refuses a dollar amount in this report. Salary decisions live in the committee’s own papers and the Clerk’s copy.
        </p>
      </Card>
      <Section label="One · present" meta="">
        <input value={payload.present} readOnly={readOnly} placeholder="Who met" onChange={(e) => up({ present: e.target.value })} style={fieldStyle} />
      </Section>
      <Section label="Two · reviews completed" meta="">
        <Lines lines={payload.reviewsCompleted} readOnly={readOnly} onChange={(reviewsCompleted) => up({ reviewsCompleted })} addLabel="Add a review" />
      </Section>
      <Section label="Three · staffing actions" meta="">
        <Lines lines={payload.staffingActions} readOnly={readOnly} onChange={(staffingActions) => up({ staffingActions })} addLabel="Add an action" />
      </Section>
      <Section label="Four · items requiring Board action" meta={itemsMeta(payload.items)}>
        <Items items={payload.items} readOnly={readOnly} onChange={(items) => up({ items })} />
      </Section>
    </>
  )
}

function FamilyAssistanceForm({ payload, onChange, readOnly }: { payload: FamilyAssistancePayload; onChange(p: FamilyAssistancePayload): void; readOnly: boolean }) {
  const up = (patch: Partial<FamilyAssistancePayload>) => onChange({ ...payload, ...patch })
  const closing = payload.openingBalance === null ? null : payload.openingBalance + (payload.additions ?? 0) - (payload.expenditures ?? 0)
  return (
    <>
      <Card tone="panel" radius="card" pad="16px 18px">
        <p style={{ ...bodyText, margin: 0, maxWidth: '70ch' }}>
          <strong>No circumstances.</strong> This report carries the fund, the counts and the D002 confirmation. There is no field for why a family needed help, and that is the design.
        </p>
      </Card>
      <Section label="One · the fund" meta={closing === null ? '' : `closing balance ${money(closing)}`}>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
          <MoneyField label="Balance at start of month" value={payload.openingBalance} readOnly={readOnly} onChange={(v) => up({ openingBalance: v })} />
          <MoneyField label="Additions" value={payload.additions} readOnly={readOnly} onChange={(v) => up({ additions: v })} />
          <MoneyField label="Expenditures" value={payload.expenditures} readOnly={readOnly} onChange={(v) => up({ expenditures: v })} />
        </div>
      </Section>
      <Section label="Two · requests" meta="counts only">
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <CountField label="Received" value={payload.received} readOnly={readOnly} onChange={(v) => up({ received: v })} />
          <CountField label="Approved" value={payload.approved} readOnly={readOnly} onChange={(v) => up({ approved: v })} />
          <CountField label="Declined" value={payload.declined} readOnly={readOnly} onChange={(v) => up({ declined: v })} />
        </div>
      </Section>
      <Section label="Three · D002 §6" meta="">
        <TogglePill selected={payload.thirdPartyInvoiceConfirmed} disabled={readOnly} onClick={() => up({ thirdPartyInvoiceConfirmed: !payload.thirdPartyInvoiceConfirmed })}>
          {payload.thirdPartyInvoiceConfirmed ? 'Confirmed · every disbursement was paid to a third party against an invoice' : 'Confirm the third-party invoice rule was followed'}
        </TogglePill>
      </Section>
    </>
  )
}

function TreasurerForm({ data, report, payload, onChange, readOnly }: { data: MeetingsData; report: Report; payload: TreasurerPayload; onChange(p: TreasurerPayload): void; readOnly: boolean }) {
  const up = (patch: Partial<TreasurerPayload>) => onChange({ ...payload, ...patch })
  const previous = data.reports
    .filter((r) => r.kind === 'treasurer' && r.id !== report.id && r.periodStart && report.periodStart && r.periodStart < report.periodStart)
    .sort((a, b) => (b.periodStart ?? '').localeCompare(a.periodStart ?? ''))[0]
  const empty = payload.receipts.length === 0 && payload.disbursements.length === 0
  return (
    <>
      {empty && previous && !readOnly ? (
        <Card tone="panel" radius="card" pad="16px 18px" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ ...bodyText, margin: 0, maxWidth: '56ch' }}>Carry last month’s lines forward so this is an edit rather than a re-entry.</p>
          <Button variant="outline" size="sm" onClick={() => onChange({ receipts: (previous.payload as TreasurerPayload).receipts.map((l) => ({ ...l })), disbursements: (previous.payload as TreasurerPayload).disbursements.map((l) => ({ ...l })) })}>
            Carry forward
          </Button>
        </Card>
      ) : null}
      <Section label="One · receipts" meta={`total ${money(sum(payload.receipts))}`}>
        <MoneyLines lines={payload.receipts} readOnly={readOnly} onChange={(receipts) => up({ receipts })} addLabel="Add a receipt line" />
      </Section>
      <Section label="Two · disbursements" meta={`total ${money(sum(payload.disbursements))}`}>
        <MoneyLines lines={payload.disbursements} readOnly={readOnly} onChange={(disbursements) => up({ disbursements })} addLabel="Add a disbursement line" />
      </Section>
    </>
  )
}

function MinutesForm({ payload, onChange, readOnly }: { payload: MinutesPayload; onChange(p: MinutesPayload): void; readOnly: boolean }) {
  const up = (patch: Partial<MinutesPayload>) => onChange({ ...payload, ...patch })
  return (
    <>
      <Card tone="panel" radius="card" pad="16px 18px" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p style={{ ...bodyText, margin: 0, maxWidth: '60ch' }}>Attendance, the times, the committee reports and the motions come from the record and are already in the preview. These sections are yours.</p>
        <TogglePill selected={payload.draftForReview} disabled={readOnly} onClick={() => up({ draftForReview: !payload.draftForReview })}>
          {payload.draftForReview ? 'Marked “Draft for Secretary Review”' : 'Not marked as a draft'}
        </TogglePill>
      </Card>
      <Section label="Also present" meta="the roll covers the deacons">
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          <Field label="Deacons-in-training present"><input value={payload.deaconsInTrainingPresent} readOnly={readOnly} onChange={(e) => up({ deaconsInTrainingPresent: e.target.value })} style={fieldStyle} /></Field>
          <Field label="Staff present"><input value={payload.staffPresent} readOnly={readOnly} onChange={(e) => up({ staffPresent: e.target.value })} style={fieldStyle} /></Field>
        </div>
      </Section>
      <Section label="I · opening prayer" meta=""><input value={payload.openingPrayerBy} readOnly={readOnly} placeholder="Who opened in prayer" onChange={(e) => up({ openingPrayerBy: e.target.value })} style={fieldStyle} /></Section>
      <Section label="II · chairman remarks" meta=""><textarea rows={3} value={payload.chairmanRemarks} readOnly={readOnly} onChange={(e) => up({ chairmanRemarks: e.target.value })} style={textareaStyle} /></Section>
      <Section label="III · member update & prayer requests" meta="one line each">
        <p style={{ ...metaText, margin: '0 0 10px', maxWidth: '70ch' }}>This is the one section of the minutes that names members’ circumstances, and it is kept because it is the Board’s practice and its record. Nothing here is ever copied from the staff care pipeline. Write what the Board needs to pray, and no more.</p>
        <Lines lines={payload.memberUpdates} readOnly={readOnly} onChange={(memberUpdates) => up({ memberUpdates })} addLabel="Add a line" />
      </Section>
      <Section label="IV · old business" meta="lettered items; carried motions are added from the record">
        <TitledLines items={payload.oldBusiness} readOnly={readOnly} onChange={(oldBusiness) => up({ oldBusiness })} />
      </Section>
      <Section label="V · new business" meta="lettered items; what the reports ask for is added from the record">
        <TitledLines items={payload.newBusiness} readOnly={readOnly} onChange={(newBusiness) => up({ newBusiness })} />
      </Section>
      <Section label="VI · review of previous minutes" meta="leave blank to use the record’s line">
        <input value={payload.previousMinutes} readOnly={readOnly} placeholder="Moved by … seconded by … approved as read." onChange={(e) => up({ previousMinutes: e.target.value })} style={fieldStyle} />
      </Section>
      <Section label="VII · deacon committee reports" meta="a line under each appendix, if wanted">
        <div style={{ display: 'grid', gap: 10 }}>
          {COMMITTEES.map((slug) => (
            <Field key={slug} label={`${APPENDIX[slug]}. ${COMMITTEE_SHORT[slug]}`}>
              <input value={payload.committeeNotes[slug] ?? ''} readOnly={readOnly} onChange={(e) => up({ committeeNotes: { ...payload.committeeNotes, [slug]: e.target.value } })} style={fieldStyle} />
            </Field>
          ))}
        </div>
      </Section>
      <Section label="VIII · pastoral report" meta="one line each">
        <Lines lines={payload.pastoralReport} readOnly={readOnly} onChange={(pastoralReport) => up({ pastoralReport })} addLabel="Add a line" />
      </Section>
      <Section label="IX · key dates" meta="the next deacons meeting is added from the record">
        <Lines lines={payload.keyDates} readOnly={readOnly} onChange={(keyDates) => up({ keyDates })} addLabel="Add a date" />
      </Section>
      <Section label="X · closing prayer" meta=""><textarea rows={2} value={payload.closing} readOnly={readOnly} placeholder="Moved to adjourn by … The meeting closed in prayer by …" onChange={(e) => up({ closing: e.target.value })} style={textareaStyle} /></Section>
    </>
  )
}

/* ------------------------------------------------------- field helpers */

function itemsMeta(items: BoardItem[]): string {
  const n = items.filter((i) => i.text.trim() && i.needsVote).length
  return n === 0 ? 'nothing needs a vote' : n === 1 ? 'One item will be added to the agenda as new business.' : `${n} items will be added to the agenda as new business.`
}

function toNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item))
}

function Section({ label, meta, children }: { label: string; meta: string; children: ReactNode }) {
  return (
    <Card radius="card" pad="26px clamp(22px,2vw,30px)" style={{ display: 'grid', gap: 14 }}>
      <SectionHead label={label} meta={meta} />
      {children}
    </Card>
  )
}

function SectionHead({ label, meta }: { label: string; meta: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-hairline)' }}>
      <span style={{ font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' }}>{label}</span>
      <span className="tabular" style={metaText}>{meta}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <span style={labelText}>{label}</span>
      {children}
    </label>
  )
}

function MoneyField({ label, value, readOnly, onChange }: { label: string; value: number | null; readOnly: boolean; onChange(v: number | null): void }) {
  return (
    <Field label={label}>
      <input className="tabular" inputMode="decimal" value={value ?? ''} readOnly={readOnly} onChange={(e) => onChange(toNumber(e.target.value))} placeholder="$" style={{ ...fieldStyle, font: '400 17px/1.4 var(--mbc-font-sans)' }} />
    </Field>
  )
}

function CountField({ label, value, readOnly, onChange }: { label: string; value: number | null; readOnly: boolean; onChange(v: number | null): void }) {
  return (
    <Field label={label}>
      <input className="tabular" inputMode="numeric" value={value ?? ''} readOnly={readOnly} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value.replace(/\D/g, '')))} style={fieldStyle} />
    </Field>
  )
}

function Lines({ lines, readOnly, onChange, addLabel }: { lines: string[]; readOnly: boolean; onChange(lines: string[]): void; addLabel: string }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {lines.map((line, index) => (
        <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'center' }}>
          <input value={line} readOnly={readOnly} onChange={(e) => onChange(replaceAt(lines, index, e.target.value))} style={fieldStyle} />
          {!readOnly ? <button type="button" style={linkButton} onClick={() => onChange(lines.filter((_, i) => i !== index))}>Remove</button> : <span />}
        </div>
      ))}
      {!readOnly ? <AddPill onClick={() => onChange([...lines, ''])}>{addLabel}</AddPill> : lines.length === 0 ? <p style={{ ...metaText, margin: 0 }}>None.</p> : null}
    </div>
  )
}

function TitledLines({ items, readOnly, onChange }: { items: TitledItem[]; readOnly: boolean; onChange(items: TitledItem[]): void }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((item, index) => (
        <div key={index} style={{ background: 'var(--surface-panel)', borderRadius: 14, padding: '16px 18px', display: 'grid', gap: 10 }}>
          <input value={item.title} readOnly={readOnly} placeholder={`${String.fromCharCode(65 + index)}. Title`} onChange={(e) => onChange(replaceAt(items, index, { ...item, title: e.target.value }))} style={{ ...fieldStyle, background: 'var(--surface-card)' }} />
          <textarea rows={3} value={item.text} readOnly={readOnly} placeholder="What was discussed, and any motion, as it was moved." onChange={(e) => onChange(replaceAt(items, index, { ...item, text: e.target.value }))} style={{ ...textareaStyle, background: 'var(--surface-card)' }} />
          {!readOnly ? <button type="button" style={linkButton} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove</button> : null}
        </div>
      ))}
      {!readOnly ? <AddPill onClick={() => onChange([...items, { title: '', text: '' }])}>Add an item</AddPill> : items.length === 0 ? <p style={{ ...metaText, margin: 0 }}>None.</p> : null}
    </div>
  )
}

function MoneyLines({ lines, readOnly, onChange, addLabel }: { lines: MoneyLine[]; readOnly: boolean; onChange(lines: MoneyLine[]): void; addLabel: string }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {lines.map((line, index) => (
        <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 3fr) minmax(140px, 1fr) auto', gap: 10, alignItems: 'center' }}>
          <input value={line.line} readOnly={readOnly} placeholder="Line" onChange={(e) => onChange(replaceAt(lines, index, { ...line, line: e.target.value }))} style={fieldStyle} />
          <input className="tabular" inputMode="decimal" value={line.amount ?? ''} readOnly={readOnly} placeholder="$" onChange={(e) => onChange(replaceAt(lines, index, { ...line, amount: toNumber(e.target.value) }))} style={fieldStyle} />
          {!readOnly ? <button type="button" style={linkButton} onClick={() => onChange(lines.filter((_, i) => i !== index))}>Remove</button> : <span />}
        </div>
      ))}
      {!readOnly ? <AddPill onClick={() => onChange([...lines, { line: '', amount: null }])}>{addLabel}</AddPill> : lines.length === 0 ? <p style={{ ...metaText, margin: 0 }}>None.</p> : null}
    </div>
  )
}

function Items({ items, readOnly, onChange }: { items: BoardItem[]; readOnly: boolean; onChange(items: BoardItem[]): void }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((item, index) => (
        <div key={index} style={{ background: 'var(--surface-panel)', borderRadius: 14, padding: '16px 18px', display: 'grid', gap: 10 }}>
          <input value={item.text} readOnly={readOnly} placeholder="What the Board is asked to take up" onChange={(e) => onChange(replaceAt(items, index, { ...item, text: e.target.value }))} style={{ ...fieldStyle, background: 'var(--surface-card)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <TogglePill selected={item.needsVote} disabled={readOnly} onClick={() => onChange(replaceAt(items, index, { ...item, needsVote: !item.needsVote }))}>
              {item.needsVote ? 'Needs a vote · goes on as new business' : 'No vote needed'}
            </TogglePill>
            {!readOnly ? <button type="button" style={linkButton} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove</button> : null}
          </div>
        </div>
      ))}
      {!readOnly ? <AddPill onClick={() => onChange([...items, { text: '', needsVote: true }])}>Add an item</AddPill> : items.length === 0 ? <p style={{ ...metaText, margin: 0 }}>None.</p> : null}
    </div>
  )
}

function AddPill({ onClick, children }: { onClick(): void; children: ReactNode }) {
  return (
    <div>
      <button type="button" onClick={onClick} style={{ minHeight: 48, borderRadius: 'var(--mbc-radius-pill)', padding: '0 20px', background: 'transparent', border: '1px solid var(--mbc-border-control)', font: '400 15px/1 var(--mbc-font-sans)', color: 'var(--text-heading)', cursor: 'pointer' }}>
        {children}
      </button>
    </div>
  )
}

function TogglePill({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected} style={{ minHeight: 48, borderRadius: 'var(--mbc-radius-pill)', padding: '0 20px', background: selected ? 'var(--surface-panel)' : 'transparent', border: selected ? '1px solid var(--text-heading)' : '1px solid var(--border-control)', font: selected ? '700 15px/1.3 var(--mbc-font-sans)' : '400 15px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)', cursor: disabled ? 'default' : 'pointer', textAlign: 'left' }}>
      {children}
    </button>
  )
}

const fieldStyle: CSSProperties = { width: '100%', minHeight: 48, background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 10, padding: '0 14px', font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }
const textareaStyle: CSSProperties = { ...fieldStyle, minHeight: 0, padding: '13px 14px', resize: 'vertical', font: '400 16px/1.65 var(--mbc-font-sans)' }
const labelText: CSSProperties = { font: '700 13px/1.3 var(--mbc-font-sans)', letterSpacing: '.04em', color: 'var(--text-heading)' }
const metaText: CSSProperties = { font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const bodyText: CSSProperties = { font: '400 15px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)' }
const linkButton: CSSProperties = { background: 'none', border: 'none', padding: '4px 0', font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer', textAlign: 'left' }

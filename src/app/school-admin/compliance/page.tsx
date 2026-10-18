'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Download,
  FileText,
  IdCard,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'
import ComplianceReadinessCard from '@/components/admin/ComplianceReadinessCard'
import { FormDefinitionHelpButton } from '@/components/admin/FormDefinitionsPanel'

type FormId = 'SF-1010' | 'SF-1256' | 'SF-0259'

type FormRow = {
  id: FormId
  name: string
  status: 'ready' | 'needs_info' | 'blocked'
  missing: string[]
  action: string
}

type ComplianceRollup = FormRow & { ready: number; needsInfo: number; blocked: number }

type StudentSummary = {
  student: {
    id: string
    legal_name: string
    parent_email?: string | null
    driving_hours?: number | null
    classroom_hours?: number | null
  }
  forms: FormRow[]
  readyCount: number
  blockedCount: number
  needsInfoCount: number
}

type MissingItem = { label: string; count: number }

type InstructorCert = {
  key: 'current' | 'expiring' | 'expired' | 'missing' | 'inactive'
  label: string
  tone: 'ready' | 'info' | 'blocked' | 'muted'
}

type Instructor = {
  id: string
  name: string
  email?: string | null
  license_number?: string | null
  license_expiry?: string | null
  active?: boolean | null
  certification: InstructorCert
}

type InstructorRollup = {
  total: number
  current: number
  expiring: number
  expired: number
  missing: number
  inactive: number
}

type Overall = {
  totalStudents: number
  fullyReady: number
  fullyCompletePct: number
  formReadyPct: number
  totalFormChecks: number
  readyChecks: number
  needsInfoChecks: number
  blockedChecks: number
  studentsBlocked: number
  studentsNeedingInfo: number
}

type CompliancePayload = {
  rollup: ComplianceRollup[]
  students: StudentSummary[]
  missingDocuments: MissingItem[]
  instructors: Instructor[]
  instructorRollup: InstructorRollup
  overall: Overall
  demo: boolean
  generatedAt: string
}

function statusClass(status: FormRow['status']) {
  if (status === 'ready') return 'readiness-chip readiness-ready'
  if (status === 'blocked') return 'readiness-chip readiness-blocked'
  return 'readiness-chip readiness-info'
}

function statusLabel(status: FormRow['status']) {
  if (status === 'ready') return 'Ready'
  if (status === 'blocked') return 'Blocked'
  return 'Needs info'
}

function certToneClass(tone: InstructorCert['tone']) {
  if (tone === 'ready') return 'readiness-chip readiness-ready'
  if (tone === 'blocked') return 'readiness-chip readiness-blocked'
  if (tone === 'muted') return 'readiness-chip'
  return 'readiness-chip readiness-info'
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildReportCsv(payload: CompliancePayload): string {
  const lines: string[] = []
  const generated = new Date(payload.generatedAt).toLocaleString()

  lines.push('Section,Field,Value')
  lines.push(`Report,Generated,${csvEscape(generated)}`)
  lines.push(`Report,Mode,${csvEscape(payload.demo ? 'Demo' : 'Live')}`)
  lines.push(`Overall,Total students,${payload.overall.totalStudents}`)
  lines.push(`Overall,Students with all forms ready,${payload.overall.fullyReady}`)
  lines.push(`Overall,% students fully ready,${payload.overall.fullyCompletePct}%`)
  lines.push(`Overall,% form checks ready,${payload.overall.formReadyPct}%`)
  lines.push(`Overall,Students with at least one blocked form,${payload.overall.studentsBlocked}`)
  lines.push(`Overall,Students with at least one needs_info form,${payload.overall.studentsNeedingInfo}`)
  lines.push('')

  lines.push('Form,Ready,Needs info,Blocked')
  for (const form of payload.rollup) {
    lines.push(`${csvEscape(form.id)} — ${csvEscape(form.name)},${form.ready},${form.needsInfo},${form.blocked}`)
  }
  lines.push('')

  lines.push('Missing document,Students affected')
  for (const item of payload.missingDocuments) {
    lines.push(`${csvEscape(item.label)},${item.count}`)
  }
  lines.push('')

  lines.push('Instructor,Email,Status,License #,License expiry,Active')
  for (const instructor of payload.instructors) {
    lines.push(
      [
        csvEscape(instructor.name),
        csvEscape(instructor.email ?? ''),
        csvEscape(instructor.certification.label),
        csvEscape(instructor.license_number ?? ''),
        csvEscape(instructor.license_expiry ?? ''),
        instructor.active === false ? 'No' : 'Yes',
      ].join(','),
    )
  }
  lines.push('')

  lines.push('Student,Parent email,Driving hours,Classroom hours,SF-1010,SF-1256,SF-0259,Next action,Missing items')
  for (const summary of payload.students) {
    const byForm = (id: FormId) => summary.forms.find((form) => form.id === id)
    const next = summary.forms.find((form) => form.status !== 'ready') ?? summary.forms[0]
    const missing = summary.forms.flatMap((form) => form.missing).join('; ')
    lines.push(
      [
        csvEscape(summary.student.legal_name || 'Student'),
        csvEscape(summary.student.parent_email ?? ''),
        csvEscape(summary.student.driving_hours ?? 0),
        csvEscape(summary.student.classroom_hours ?? 0),
        csvEscape(statusLabel(byForm('SF-1010')?.status ?? 'needs_info')),
        csvEscape(statusLabel(byForm('SF-1256')?.status ?? 'needs_info')),
        csvEscape(statusLabel(byForm('SF-0259')?.status ?? 'needs_info')),
        csvEscape(next?.action ?? 'Review record'),
        csvEscape(missing),
      ].join(','),
    )
  }

  return lines.join('\n')
}

function downloadReport(payload: CompliancePayload) {
  const csv = buildReportCsv(payload)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `roadsmith-compliance-report-${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function CompliancePage() {
  const [payload, setPayload] = useState<CompliancePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/school-admin/compliance/summary')
        if (!res.ok) throw new Error('Could not load compliance summary')
        const data: CompliancePayload = await res.json()
        setPayload(data)
      } catch {
        setError('Could not load compliance readiness.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const overall = payload?.overall
  const students = payload?.students ?? []
  const rollup = payload?.rollup ?? []
  const missingDocuments = payload?.missingDocuments ?? []
  const instructors = payload?.instructors ?? []
  const instructorRollup = payload?.instructorRollup

  const progressDegrees = useMemo(() => {
    const pct = overall?.fullyCompletePct ?? 0
    return Math.max(0, Math.min(100, pct)) * 3.6
  }, [overall?.fullyCompletePct])

  return (
    <div className="command-page">
      <header className="command-page-head">
        <div>
          <p className="command-eyebrow">Tennessee compliance</p>
          <h1 className="command-page-title">Compliance overview</h1>
          <p className="command-page-subtitle">
            Track SF-1010, SF-1256, and SF-0259 readiness and instructor certification across the school.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {payload && (
            <button
              type="button"
              className="command-button"
              onClick={() => downloadReport(payload)}
              style={{ background: 'rgba(166,255,63,0.12)', color: 'var(--command-accent)' }}
            >
              <Download style={{ width: 14, height: 14, marginRight: 6, verticalAlign: '-2px' }} />
              Export compliance report
            </button>
          )}
          <Link className="command-button command-button-primary" href="/school-admin/students">
            Open student records
          </Link>
        </div>
      </header>

      {error && (
        <section className="command-card">
          <p className="readiness-chip readiness-blocked">{error}</p>
        </section>
      )}

      {loading ? (
        <section className="command-card">
          <p className="command-muted">Loading compliance...</p>
        </section>
      ) : payload ? (
        <>
          {/* Hero stats: % complete + form rollup */}
          <section className="command-card">
            <div className="command-section-head">
              <div>
                <p className="command-eyebrow">School-wide readiness</p>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  Tennessee teen driver forms
                  <FormDefinitionHelpButton formId="SF-1010" size="sm" label="What are these forms?" variant="filled" />
                </h2>
              </div>
              <ShieldCheck style={{ width: 18, height: 18, color: 'var(--command-muted)' }} />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(220px, 1fr) minmax(0, 2fr)',
                gap: 24,
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div
                  style={{
                    position: 'relative',
                    width: 132,
                    height: 132,
                    borderRadius: '50%',
                    background: `conic-gradient(var(--command-accent) ${progressDegrees}deg, rgba(255,255,255,0.08) ${progressDegrees}deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  aria-label={`${overall?.fullyCompletePct ?? 0}% of students have all forms ready`}
                >
                  <div
                    style={{
                      width: 108,
                      height: 108,
                      borderRadius: '50%',
                      background: 'rgba(23,26,20,0.95)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--command-text)' }}>
                      {overall?.fullyCompletePct ?? 0}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--command-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      all forms ready
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users style={{ width: 14, height: 14, color: 'var(--command-muted)' }} />
                    <span style={{ color: 'var(--command-muted)', fontSize: 12 }}>Students</span>
                    <strong style={{ marginLeft: 4 }}>{overall?.totalStudents ?? 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--command-accent)' }} />
                    <span style={{ color: 'var(--command-muted)', fontSize: 12 }}>Fully ready</span>
                    <strong style={{ marginLeft: 4 }}>{overall?.fullyReady ?? 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: '#fbbf24' }} />
                    <span style={{ color: 'var(--command-muted)', fontSize: 12 }}>Need info</span>
                    <strong style={{ marginLeft: 4 }}>{overall?.studentsNeedingInfo ?? 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <XCircle style={{ width: 14, height: 14, color: '#fca5a5' }} />
                    <span style={{ color: 'var(--command-muted)', fontSize: 12 }}>Blocked</span>
                    <strong style={{ marginLeft: 4 }}>{overall?.studentsBlocked ?? 0}</strong>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div>
                    <div className="command-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Form checks across all students
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--command-text)' }}>
                      {overall?.formReadyPct ?? 0}% ready
                    </div>
                  </div>
                  <div className="command-muted" style={{ fontSize: 12 }}>
                    {overall?.readyChecks ?? 0} ready / {overall?.needsInfoChecks ?? 0} info / {overall?.blockedChecks ?? 0} blocked
                  </div>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      width: `${overall && overall.totalFormChecks ? (overall.readyChecks / overall.totalFormChecks) * 100 : 0}%`,
                      background: 'var(--command-accent)',
                    }}
                  />
                  <div
                    style={{
                      width: `${overall && overall.totalFormChecks ? (overall.needsInfoChecks / overall.totalFormChecks) * 100 : 0}%`,
                      background: 'rgba(251,191,36,0.6)',
                    }}
                  />
                  <div
                    style={{
                      width: `${overall && overall.totalFormChecks ? (overall.blockedChecks / overall.totalFormChecks) * 100 : 0}%`,
                      background: 'rgba(248,113,113,0.7)',
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Per-form rollup (existing) + missing documents breakdown */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 14,
            }}
          >
            <ComplianceReadinessCard rollups={rollup} />

            <section className="command-card">
              <div className="command-section-head">
                <div>
              <p className="command-eyebrow">What&apos;s missing</p>
                  <h2>Missing documents breakdown</h2>
                </div>
                <FileText style={{ width: 18, height: 18, color: 'var(--command-muted)' }} />
              </div>
              {missingDocuments.length === 0 ? (
                <p className="command-muted" style={{ marginTop: 12 }}>
                  No missing documents. Every student is fully ready across all three forms.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {missingDocuments.map((item) => {
                    const total = Math.max(1, overall?.totalStudents ?? 1)
                    const pct = Math.round((item.count / total) * 100)
                    return (
                      <li key={item.label}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ color: 'var(--command-text)', fontSize: 13 }}>{item.label}</span>
                          <span style={{ color: 'var(--command-muted)', fontSize: 12 }}>
                            {item.count} student{item.count === 1 ? '' : 's'} · {pct}%
                          </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'rgba(251,191,36,0.7)' }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Instructor certification status */}
          <section className="command-card">
            <div className="command-section-head">
              <div>
                <p className="command-eyebrow">Instructors</p>
                <h2>Certification status</h2>
              </div>
              <IdCard style={{ width: 18, height: 18, color: 'var(--command-muted)' }} />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 10,
                marginTop: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(166,255,63,0.08)', border: '1px solid rgba(166,255,63,0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--command-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--command-accent)' }}>{instructorRollup?.current ?? 0}</div>
                <div style={{ fontSize: 11, color: 'var(--command-muted)' }}>of {instructorRollup?.total ?? 0} active</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--command-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expiring soon</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#fbbf24' }}>{instructorRollup?.expiring ?? 0}</div>
                <div style={{ fontSize: 11, color: 'var(--command-muted)' }}>within 60 days</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--command-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expired</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#fca5a5' }}>{instructorRollup?.expired ?? 0}</div>
                <div style={{ fontSize: 11, color: 'var(--command-muted)' }}>needs renewal</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <div style={{ fontSize: 11, color: 'var(--command-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>License missing</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#fca5a5' }}>{instructorRollup?.missing ?? 0}</div>
                <div style={{ fontSize: 11, color: 'var(--command-muted)' }}>add a license #</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: 'var(--command-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Inactive</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--command-muted)' }}>{instructorRollup?.inactive ?? 0}</div>
                <div style={{ fontSize: 11, color: 'var(--command-muted)' }}>not currently teaching</div>
              </div>
            </div>

            {instructors.length === 0 ? (
              <p className="command-muted">No instructors on file. Add instructors to track certification status.</p>
            ) : (
              <table className="command-table">
                <thead>
                  <tr>
                    <th>Instructor</th>
                    <th>License #</th>
                    <th>Expires</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {instructors.map((instructor) => (
                    <tr key={instructor.id}>
                      <td>
                        <strong>{instructor.name}</strong>
                        {instructor.email ? (
                          <>
                            <br />
                            <span className="command-muted">{instructor.email}</span>
                          </>
                        ) : null}
                      </td>
                      <td>{instructor.license_number || <span className="command-muted">Not on file</span>}</td>
                      <td>{instructor.license_expiry || <span className="command-muted">No expiry</span>}</td>
                      <td>
                        <span className={certToneClass(instructor.certification.tone)}>
                          <Award style={{ width: 12, height: 12, marginRight: 4, verticalAlign: '-2px' }} />
                          {instructor.certification.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Per-student readiness table (kept from existing) */}
          <section className="command-card">
            <div className="command-section-head">
              <div>
                <p className="command-eyebrow">Student by student</p>
                <h2>Readiness table</h2>
              </div>
            </div>
            {students.length === 0 ? (
              <p className="command-muted" style={{ marginTop: 12 }}>
                No students on file yet.
              </p>
            ) : (
              <table className="command-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Hours</th>
                    <th>Forms</th>
                    <th>Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((summary) => {
                    const next = summary.forms.find((form) => form.status !== 'ready') ?? summary.forms[0]
                    return (
                      <tr key={summary.student.id}>
                        <td>
                          <strong>{summary.student.legal_name || 'Student'}</strong>
                          <br />
                          <span className="command-muted">{summary.student.parent_email || 'No parent email'}</span>
                        </td>
                        <td>
                          {summary.student.driving_hours ?? 0} driving / {summary.student.classroom_hours ?? 0} classroom
                        </td>
                        <td>
                          <div className="compliance-chip-row">
                            {summary.forms.map((form) => (
                              <span className={statusClass(form.status)} key={form.id}>
                                {form.id}: {statusLabel(form.status)}
                                <FormDefinitionHelpButton
                                  formId={form.id}
                                  size="sm"
                                  label="?"
                                />
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong>{next?.action ?? 'Review record'}</strong>
                          {next?.missing?.length ? (
                            <div className="compliance-chip-row" style={{ marginTop: 4 }}>
                              {next.missing.slice(0, 4).map((item) => (
                                <span className="readiness-chip readiness-info" key={item}>
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

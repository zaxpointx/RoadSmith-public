import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { resolveSchoolAdminContext } from '@/lib/school-admin/auth'
import {
  getComplianceRollup,
  getStudentComplianceSummary,
  TENNESSEE_TEEN_DRIVER_FORMS,
} from '@/lib/compliance/tennessee-teen-driver-forms'
import type { ComplianceStudent } from '@/lib/compliance/tennessee-teen-driver-forms'

export const dynamic = 'force-dynamic'

type InstructorRow = {
  id: string
  name: string
  email?: string | null
  license_number?: string | null
  license_expiry?: string | null
  active?: boolean | null
}

function daysUntil(dateIso: string | null | undefined) {
  if (!dateIso) return null
  const target = new Date(dateIso)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const ms = target.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function instructorCertificationStatus(instructor: InstructorRow) {
  const hasLicense = Boolean(instructor.license_number && instructor.license_number.trim().length > 0)
  const days = daysUntil(instructor.license_expiry)
  const isExpired = days !== null && days < 0
  const expiringSoon = days !== null && days >= 0 && days <= 60

  if (!instructor.active) {
    return {
      key: 'inactive' as const,
      label: 'Inactive',
      tone: 'muted' as const,
    }
  }
  if (!hasLicense) {
    return {
      key: 'missing' as const,
      label: 'License # missing',
      tone: 'blocked' as const,
    }
  }
  if (isExpired) {
    return {
      key: 'expired' as const,
      label: `Expired ${Math.abs(days ?? 0)}d ago`,
      tone: 'blocked' as const,
    }
  }
  if (expiringSoon) {
    return {
      key: 'expiring' as const,
      label: `Expires in ${days}d`,
      tone: 'info' as const,
    }
  }
  return {
    key: 'current' as const,
    label: days === null ? 'Current' : `Current (${days}d)`,
    tone: 'ready' as const,
  }
}

export async function GET(request: Request) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin() as unknown as SupabaseClient

  const [studentsResult, instructorsResult] = await Promise.all([
    admin
      .from('students_driver_ed')
      .select('id, legal_name, dob, permit_number, parent_email, classroom_hours, driving_hours, night_hours, certificate_issued_at, enrollment_date, status')
      .eq('school_id', context.schoolId),
    admin
      .from('instructors')
      .select('id, name, email, license_number, license_expiry, active')
      .eq('school_id', context.schoolId)
      .order('name', { ascending: true }),
  ])

  const students = (studentsResult.data ?? []) as unknown as ComplianceStudent[]
  const instructors = ((instructorsResult.data ?? []) as InstructorRow[]).map((instructor) => ({
    ...instructor,
    certification: instructorCertificationStatus(instructor),
  }))

  const summaries = students.map((student) => getStudentComplianceSummary(student))
  const rollup = getComplianceRollup(summaries)

  // % of students with all forms ready
  const totalStudents = summaries.length
  const fullyReady = summaries.filter((s) => s.readyCount === TENNESSEE_TEEN_DRIVER_FORMS.length).length
  const fullyCompletePct = totalStudents > 0 ? Math.round((fullyReady / totalStudents) * 100) : 0

  // Missing documents breakdown — count frequency of each missing item across all forms
  const missingCounts = new Map<string, number>()
  for (const summary of summaries) {
    for (const form of summary.forms) {
      for (const item of form.missing) {
        missingCounts.set(item, (missingCounts.get(item) ?? 0) + 1)
      }
    }
  }
  const missingDocuments = Array.from(missingCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  // Instructor certification rollup
  const instructorRollup = {
    total: instructors.length,
    current: instructors.filter((i) => i.certification.key === 'current').length,
    expiring: instructors.filter((i) => i.certification.key === 'expiring').length,
    expired: instructors.filter((i) => i.certification.key === 'expired').length,
    missing: instructors.filter((i) => i.certification.key === 'missing').length,
    inactive: instructors.filter((i) => i.certification.key === 'inactive').length,
  }

  // Form submission totals (across all students)
  const formTotals = rollup.reduce(
    (acc, form) => {
      acc.ready += form.ready
      acc.needsInfo += form.needsInfo
      acc.blocked += form.blocked
      return acc
    },
    { ready: 0, needsInfo: 0, blocked: 0 },
  )
  const totalFormChecks = formTotals.ready + formTotals.needsInfo + formTotals.blocked
  const formReadyPct = totalFormChecks > 0 ? Math.round((formTotals.ready / totalFormChecks) * 100) : 0

  // Students with at least one blocked form
  const studentsBlocked = summaries.filter((s) => s.blockedCount > 0).length
  const studentsNeedingInfo = summaries.filter((s) => s.needsInfoCount > 0).length

  return NextResponse.json({
    rollup,
    students: summaries,
    missingDocuments,
    instructors,
    instructorRollup,
    overall: {
      totalStudents,
      fullyReady,
      fullyCompletePct,
      formReadyPct,
      totalFormChecks,
      readyChecks: formTotals.ready,
      needsInfoChecks: formTotals.needsInfo,
      blockedChecks: formTotals.blocked,
      studentsBlocked,
      studentsNeedingInfo,
    },
    demo: context.demo,
    generatedAt: new Date().toISOString(),
  })
}

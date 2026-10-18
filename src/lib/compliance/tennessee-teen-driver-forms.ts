export type TeenDriverFormId = 'SF-1010' | 'SF-1256' | 'SF-0259'
export type FormReadinessStatus = 'ready' | 'needs_info' | 'blocked'

export type ComplianceStudent = {
  id: string
  legal_name: string
  dob?: string | null
  permit_number?: string | null
  parent_email?: string | null
  classroom_hours?: number | null
  driving_hours?: number | null
  night_hours?: number | null
  certificate_issued_at?: string | null
  enrollment_date?: string | null
  parent_legal_name?: string | null
  guardian_address?: string | null
  guardian_signature_state?: string | null
}

export type FormDefinition = {
  id: TeenDriverFormId
  name: string
  description: string
}

export type FormReadiness = FormDefinition & {
  status: FormReadinessStatus
  missing: string[]
  action: string
}

export type StudentComplianceSummary = {
  student: ComplianceStudent
  forms: FormReadiness[]
  readyCount: number
  blockedCount: number
  needsInfoCount: number
}

export const TENNESSEE_TEEN_DRIVER_FORMS: FormDefinition[] = [
  {
    id: 'SF-1010',
    name: 'Certificate of Compulsory School Attendance',
    description: 'Proof of school attendance for teen permit/license workflow.',
  },
  {
    id: 'SF-1256',
    name: 'Certification of 50 Hours Behind the Wheel',
    description: 'Parent, guardian, or instructor certification of 50 total driving hours, including 10 night hours.',
  },
  {
    id: 'SF-0259',
    name: 'Minor/Teenage Affidavit and Cancellation',
    description: 'Parent or guardian financial responsibility affidavit for a minor driver.',
  },
]

function hasValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined
}

function cleanPermit(value: string | null | undefined) {
  if (!value) return ''
  if (value === 'PENDING') return ''
  return value.trim()
}

function attendanceCertificateIsCurrent(value: string | null | undefined, now = new Date()) {
  if (!value) return false
  const issuedAt = new Date(value)
  if (Number.isNaN(issuedAt.getTime()) || issuedAt.getTime() > now.getTime()) return false
  const ageDays = (now.getTime() - issuedAt.getTime()) / (1000 * 60 * 60 * 24)
  return ageDays <= 30
}

function readinessForForm(student: ComplianceStudent, form: FormDefinition): FormReadiness {
  const missing: string[] = []
  if (!hasValue(student.legal_name)) missing.push('student legal name')
  if (!hasValue(student.dob)) missing.push('date of birth')

  if (form.id === 'SF-1010') {
    if (!hasValue(student.enrollment_date)) missing.push('enrollment date')
    if (!attendanceCertificateIsCurrent(student.certificate_issued_at)) {
      missing.push(student.certificate_issued_at ? 'current attendance certificate' : 'attendance certificate')
    }
    return {
      ...form,
      status: missing.length ? 'needs_info' : 'ready',
      missing,
      action: missing.length ? 'Complete student school/enrollment details' : 'Review attendance certificate',
    }
  }

  if (form.id === 'SF-1256') {
    if (!cleanPermit(student.permit_number)) missing.push('permit number')
    const totalHours = Number(student.driving_hours ?? 0)
    const nightHours = Number(student.night_hours ?? 0)
    if (totalHours < 50) missing.push(`${Math.max(0, 50 - totalHours)} more total driving hours`)
    if (nightHours < 10) missing.push(`${Math.max(0, 10 - nightHours)} more night hours`)

    const status: FormReadinessStatus = missing.length > 0 ? 'blocked' : 'ready'
    return {
      ...form,
      status,
      missing,
      action: status === 'ready' ? 'Review 50-hour certification form' : 'Complete required hours before generating this form',
    }
  }

  if (!hasValue(student.parent_email)) missing.push('parent/guardian contact')
  if (!cleanPermit(student.permit_number)) missing.push('permit number')
  if (!hasValue(student.parent_legal_name)) missing.push('parent/guardian legal name')
  if (!hasValue(student.guardian_address)) missing.push('parent/guardian address')
  if (!hasValue(student.guardian_signature_state)) missing.push('parent/guardian signature state')

  return {
    ...form,
    status: missing.length ? 'needs_info' : 'ready',
    missing,
    action: missing.length ? 'Complete guardian and permit details' : 'Review minor affidavit',
  }
}

export function getStudentComplianceSummary(student: ComplianceStudent): StudentComplianceSummary {
  const forms = TENNESSEE_TEEN_DRIVER_FORMS.map((form) => readinessForForm(student, form))

  return {
    student,
    forms,
    readyCount: forms.filter((form) => form.status === 'ready').length,
    blockedCount: forms.filter((form) => form.status === 'blocked').length,
    needsInfoCount: forms.filter((form) => form.status === 'needs_info').length,
  }
}

export function getComplianceRollup(summaries: StudentComplianceSummary[]) {
  return TENNESSEE_TEEN_DRIVER_FORMS.map((form) => {
    const formRows = summaries.map((summary) => summary.forms.find((item) => item.id === form.id)).filter(Boolean) as FormReadiness[]

    return {
      ...form,
      ready: formRows.filter((row) => row.status === 'ready').length,
      needsInfo: formRows.filter((row) => row.status === 'needs_info').length,
      blocked: formRows.filter((row) => row.status === 'blocked').length,
    }
  })
}

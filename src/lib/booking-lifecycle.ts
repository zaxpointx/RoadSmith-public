import { auditLog, encryptField, decryptField } from '@/lib/security'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { StudentsDriverEd } from '@/lib/supabase/types'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>
type StudentLookup = Pick<StudentsDriverEd, 'id' | 'legal_name' | 'parent_email'>

type BookingStudentInput = {
  bookingId: string
  schoolId: string
  studentName: string
  studentEmail: string
  studentPhone?: string | null
  instructorId?: string | null
}

/**
 * Outcome of trying to link a booking to a student record.
 *  - 'linked'    → exact email+name match found; booking.student_id is set
 *  - 'created'   → no match found; a new students_driver_ed row was created
 *  - 'ambiguous' → partial match (email matches but name differs, or multiple
 *                  name-only matches in same school). Booking is intentionally
 *                  left WITHOUT student_id so an admin can pick the right one.
 *  - 'failed'    → unexpected error during matching/creation. See audit log.
 */
export type StudentLinkResult =
  | { status: 'linked'; studentId: string }
  | { status: 'created'; studentId: string }
  | { status: 'ambiguous'; reason: string; candidateIds: string[] }
  | { status: 'failed'; reason: string }

/**
 * Normalize a name for fuzzy comparison.
 * - lowercases
 * - collapses whitespace
 * - strips trailing/leading punctuation
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compare two names allowing for small typos and minor differences.
 * Returns true if they look like the same person.
 */
function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  if (na === nb) return true

  // Allow "last, first" vs "first last" reordering
  const aParts = na.split(' ').filter(Boolean).sort()
  const bParts = nb.split(' ').filter(Boolean).sort()
  if (aParts.length >= 2 && bParts.length >= 2) {
    if (aParts.join(' ') === bParts.join(' ')) return true
  }

  // Allow substring containment (handles "Alex Smith" vs "Alexander Smith")
  // only if both parts are at least 3 chars
  if (na.length >= 5 && nb.length >= 5) {
    if (na.includes(nb) || nb.includes(na)) return true
  }

  return false
}

/**
 * Auto-link a booking to a student record.
 *
 * Strategy (ROA-13):
 *  1. Try exact email match within the school.
 *     - If exactly one match and names agree → LINK.
 *     - If exactly one match but names disagree → AMBIGUOUS.
 *     - If multiple matches → AMBIGUOUS.
 *  2. If no email match, try name match within the school (decrypted).
 *     - If exactly one strong match → LINK.
 *     - If multiple → AMBIGUOUS.
 *  3. If still no match → CREATE a new student with a placeholder DOB.
 *
 * The booking's `student_id` is set for `linked` and `created` cases.
 * For `ambiguous`, the booking is intentionally left without a student_id
 * so an admin can resolve it from the dashboard.
 */
export async function ensureStudentForConfirmedBooking(
  admin: SupabaseAdmin,
  booking: BookingStudentInput
): Promise<StudentLinkResult> {
  if (!booking.schoolId || !booking.studentName || !booking.studentEmail) {
    return { status: 'failed', reason: 'Missing schoolId/studentName/studentEmail' }
  }

  // ── 1) Email match ──────────────────────────────────────────────────
  const { data: emailMatches, error: emailErr } = await admin
    .from('students_driver_ed')
    .select('id, legal_name, parent_email')
    .eq('school_id', booking.schoolId)
    .eq('parent_email', booking.studentEmail)
    .limit(10)

  if (emailErr) {
    return { status: 'failed', reason: `email lookup failed: ${emailErr.message}` }
  }

  if (Array.isArray(emailMatches) && emailMatches.length > 0) {
    // Decrypt names to compare
    const decrypted = await Promise.all(
      emailMatches.map(async (m: StudentLookup) => ({
        id: m.id as string,
        name: (await decryptField(m.legal_name ?? '')) ?? '',
      }))
    )

    // Find matches where name agrees
    const nameMatched = decrypted.filter((m) => namesMatch(m.name, booking.studentName))

    if (nameMatched.length === 1) {
      return await linkToExisting(
        admin,
        booking,
        nameMatched[0].id,
        'email+name exact match'
      )
    }

    if (nameMatched.length > 1) {
      return await flagAmbiguous(admin, booking, decrypted.map((d) => d.id), 'multiple email+name matches')
    }

    // Email matches but name disagrees (or all names are empty)
    return await flagAmbiguous(
      admin,
      booking,
      decrypted.map((d) => d.id),
      'email matches but name differs'
    )
  }

  // ── 2) Name-only match (same school) ───────────────────────────────
  // Fetch a small batch of students in the same school, decrypt names,
  // and look for an exact name match. We can't query by encrypted name,
  // so we do this in JS over a bounded set. For larger schools this could
  // be replaced with a trigram index, but demo-scale this is fine.
  const { data: schoolStudents, error: nameErr } = await admin
    .from('students_driver_ed')
    .select('id, legal_name, parent_email')
    .eq('school_id', booking.schoolId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (nameErr) {
    return { status: 'failed', reason: `name lookup failed: ${nameErr.message}` }
  }

  if (Array.isArray(schoolStudents) && schoolStudents.length > 0) {
    const decrypted = await Promise.all(
      schoolStudents.map(async (s: StudentLookup) => ({
        id: s.id as string,
        email: (s.parent_email ?? '') as string,
        name: (await decryptField(s.legal_name ?? '')) ?? '',
      }))
    )

    const nameMatched = decrypted.filter((s) => namesMatch(s.name, booking.studentName))

    if (nameMatched.length === 1) {
      return await linkToExisting(
        admin,
        booking,
        nameMatched[0].id,
        'name-only match (no email record)'
      )
    }

    if (nameMatched.length > 1) {
      return await flagAmbiguous(
        admin,
        booking,
        nameMatched.map((d) => d.id),
        'multiple name matches in school'
      )
    }
  }

  // ── 3) No match — create new student ────────────────────────────────
  return await createStudentFromBooking(admin, booking)
}

// ── Internal helpers ─────────────────────────────────────────────────

async function linkToExisting(
  admin: SupabaseAdmin,
  booking: BookingStudentInput,
  studentId: string,
  reason: string
): Promise<StudentLinkResult> {
  await admin.from('audit_logs').insert(
    auditLog('BOOKING_LINKED_TO_EXISTING_STUDENT', booking.studentEmail, {
      booking_id: booking.bookingId,
      student_id: studentId,
      school_id: booking.schoolId,
      reason,
    })
  )
  // Store student_id and link_status on the booking
  await admin
    .from('bookings')
    .update({ student_id: studentId, link_status: 'linked' })
    .eq('id', booking.bookingId)
  return { status: 'linked', studentId }
}

async function flagAmbiguous(
  admin: SupabaseAdmin,
  booking: BookingStudentInput,
  candidateIds: string[],
  reason: string
): Promise<StudentLinkResult> {
  await admin.from('audit_logs').insert(
    auditLog('BOOKING_STUDENT_AMBIGUOUS', booking.studentEmail, {
      booking_id: booking.bookingId,
      school_id: booking.schoolId,
      reason,
      candidate_student_ids: candidateIds,
      booking_name: booking.studentName,
      booking_email: booking.studentEmail,
    })
  )
  // Mark booking as needing review. student_id is left null so the
  // dashboard can surface these for manual resolution.
  await admin
    .from('bookings')
    .update({ link_status: 'ambiguous' })
    .eq('id', booking.bookingId)
  return { status: 'ambiguous', reason, candidateIds }
}

async function createStudentFromBooking(
  admin: SupabaseAdmin,
  booking: BookingStudentInput
): Promise<StudentLinkResult> {
  const fallbackDob = '2008-01-01'
  const encryptedName = await encryptField(booking.studentName)
  const encryptedPhone = booking.studentPhone ? await encryptField(booking.studentPhone) : null

  const { data: student, error } = await admin
    .from('students_driver_ed')
    .insert({
      school_id: booking.schoolId,
      legal_name: encryptedName,
      dob: fallbackDob,
      permit_number: 'PENDING',
      parent_email: booking.studentEmail,
      emergency_contact_name: '',
      emergency_contact_phone: encryptedPhone,
      classroom_hours: 0,
      driving_hours: 0,
      enrollment_date: new Date().toISOString().split('T')[0],
      instructor_id: booking.instructorId ?? null,
    })
    .select('id')
    .single()

  if (error || !student?.id) {
    await admin.from('audit_logs').insert(
      auditLog('BOOKING_STUDENT_LINK_FAILED', booking.studentEmail, {
        booking_id: booking.bookingId,
        school_id: booking.schoolId,
        error: error?.message ?? 'Student insert failed',
      })
    )
    return { status: 'failed', reason: error?.message ?? 'Student insert failed' }
  }

  await admin.from('audit_logs').insert(
    auditLog('STUDENT_CREATED_FROM_BOOKING', booking.studentEmail, {
      booking_id: booking.bookingId,
      student_id: student.id,
      school_id: booking.schoolId,
    })
  )

  // Store student_id and link_status on the booking
  await admin
    .from('bookings')
    .update({ student_id: student.id, link_status: 'created' })
    .eq('id', booking.bookingId)

  return { status: 'created', studentId: student.id as string }
}

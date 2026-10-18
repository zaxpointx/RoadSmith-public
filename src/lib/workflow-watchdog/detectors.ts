import type {
  BookingReviewSnapshot,
  BookingRecordSnapshot,
  DetectorResult,
  EvidenceReference,
  SessionRecordSnapshot,
} from './types'

const DETECTOR_VERSION = '1.0.0'
const BOOKING_STATUSES = new Set(['pending', 'confirmed', 'cancelled'])
const PAYMENT_STATUSES = new Set(['pending', 'paid', 'refunded', 'failed'])

function base(id: string, result: DetectorResult['result'], severity: DetectorResult['severity'], explanation: string, evidence: EvidenceReference[], constraints: string[], missingEvidence: string[] = []): DetectorResult {
  return { detectorId: id, detectorVersion: DETECTOR_VERSION, result, severity, explanation, evidence, constraints, missingEvidence }
}

function missing(id: string, fields: string[], explanation: string): DetectorResult {
  return base(id, 'needs_information', 'medium', explanation, [], [], fields)
}

function parseMinutes(value: string | null | undefined): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function interval(record: BookingRecordSnapshot, session: SessionRecordSnapshot | undefined, duration: number | null): { start: number; end: number } | null {
  const date = record.sessionDate ?? session?.startDate
  const time = record.sessionTime ?? session?.startTime
  const start = parseMinutes(time)
  if (!date || start === null || duration === null || !Number.isInteger(duration) || duration <= 0) return null
  return { start, end: start + duration }
}

function sameDay(a: BookingRecordSnapshot, b: BookingRecordSnapshot, sa?: SessionRecordSnapshot, sb?: SessionRecordSnapshot): boolean {
  return (a.sessionDate ?? sa?.startDate) !== undefined && (a.sessionDate ?? sa?.startDate) === (b.sessionDate ?? sb?.startDate)
}

export function detectTravelConflict(snapshot: BookingReviewSnapshot): DetectorResult {
  const id = 'travel-conflict'
  const travel = snapshot.travel
  const prior = travel?.priorLesson
  const candidate = travel?.candidateLesson
  if (!prior || !candidate || !prior.endsAt || !candidate.startsAt || !prior.location || !candidate.location || travel.requiredTravelMinutes == null || !travel.assumption) {
    return missing(id, ['travel.priorLesson.endsAt', 'travel.priorLesson.location', 'travel.candidateLesson.startsAt', 'travel.candidateLesson.location', 'travel.requiredTravelMinutes', 'travel.assumption'], 'Travel safety cannot be determined because the route, times, and explicit travel assumption are incomplete.')
  }
  const priorEnd = Date.parse(prior.endsAt)
  const candidateStart = Date.parse(candidate.startsAt)
  const required = travel.requiredTravelMinutes
  if (!Number.isFinite(priorEnd) || !Number.isFinite(candidateStart) || !Number.isFinite(required) || required < 0) {
    return missing(id, ['travel.priorLesson.endsAt', 'travel.candidateLesson.startsAt', 'travel.requiredTravelMinutes'], 'Travel safety cannot be determined because the supplied travel evidence is malformed.')
  }
  const available = Math.floor((candidateStart - priorEnd) / 60000)
  const evidence = [
    { source: 'travel-fixture', recordId: prior.recordId, field: 'endsAt', value: prior.endsAt },
    { source: 'travel-fixture', recordId: candidate.recordId, field: 'startsAt', value: candidate.startsAt },
    { source: 'travel-fixture', recordId: candidate.recordId, field: 'requiredTravelMinutes', value: required },
  ]
  const constraints = [`available travel time must be at least ${required} minutes`, travel.assumption]
  if (available < required) return base(id, 'blocked', 'high', `The candidate lesson is ${required - available} minutes short of the required travel time; operator approval is not currently safe.`, evidence, constraints)
  return base(id, 'clear', 'info', `The candidate lesson leaves ${available} minutes for travel against a ${required}-minute requirement.`, evidence, constraints)
}

export function detectDuplicateBooking(snapshot: BookingReviewSnapshot): DetectorResult {
  const id = 'duplicate-booking'
  const booking = snapshot.booking
  const duration = snapshot.sessionDurationMinutes ?? snapshot.session?.durationMinutes ?? null
  const current = interval(booking, snapshot.session ?? undefined, duration)
  const related = snapshot.relatedBookings ?? []
  const instructorId = booking.instructorId ?? snapshot.session?.instructorId ?? null
  if (!booking.schoolId || !instructorId || !current) return missing(id, ['booking.instructorId or session.instructorId', 'booking.sessionDate/sessionTime', 'sessionDurationMinutes'], 'Duplicate booking risk cannot be determined without a school-scoped instructor and complete time window.')
  for (const other of related) {
    const otherSession = (snapshot.relatedSessions ?? []).find((session) => session.id === other.sessionId)
    const otherInstructorId = other.instructorId ?? otherSession?.instructorId ?? null
    if (other.id === booking.id || other.schoolId !== snapshot.schoolId || otherInstructorId !== instructorId) continue
    const otherInterval = interval(other, otherSession, duration ?? otherSession?.durationMinutes ?? null)
    if (!otherInterval || !sameDay(booking, other, snapshot.session ?? undefined, otherSession)) continue
    if (current.start < otherInterval.end && otherInterval.start < current.end) {
      const evidence = [
        { source: 'booking', recordId: booking.id, field: 'instructorId', value: instructorId },
        { source: 'booking', recordId: other.id, field: 'instructorId', value: otherInstructorId },
        { source: 'booking', recordId: booking.id, field: 'sessionTime', value: booking.sessionTime ?? null },
        { source: 'booking', recordId: other.id, field: 'sessionTime', value: other.sessionTime ?? null },
      ]
      return base(id, 'blocked', 'high', `The instructor is assigned to overlapping bookings ${booking.id} and ${other.id}; operator review is required.`, evidence, ['same school', 'same instructor', 'time windows must not overlap'])
    }
  }
  return base(id, 'clear', 'info', 'No overlapping same-school booking was found for the known instructor and time window.', [{ source: 'booking', recordId: booking.id, field: 'instructorId', value: instructorId }], ['same school', 'same instructor', 'non-overlapping time windows'])
}

export function detectPaymentStall(snapshot: BookingReviewSnapshot): DetectorResult {
  const id = 'payment-stall'
  const { status, paymentStatus } = snapshot.booking
  if (!status || !paymentStatus) return missing(id, ['booking.status', 'booking.paymentStatus'], 'Payment progress cannot be determined because booking or payment status is missing.')
  if (!BOOKING_STATUSES.has(status) || !PAYMENT_STATUSES.has(paymentStatus)) return missing(id, ['booking.status', 'booking.paymentStatus'], `Payment progress is unknown for unsupported statuses ${status}/${paymentStatus}.`)
  const evidence = [
    { source: 'booking', recordId: snapshot.booking.id, field: 'status', value: status },
    { source: 'booking', recordId: snapshot.booking.id, field: 'payment_status', value: paymentStatus },
  ]
  if (status === 'pending' && (paymentStatus === 'pending' || paymentStatus === 'failed')) return base(id, 'warning', 'high', `Booking ${snapshot.booking.id} is still pending while payment is ${paymentStatus}; operator attention is required.`, evidence, ['pending booking requires completed payment before confirmation'])
  return base(id, 'clear', 'info', `Booking and payment statuses are not stalled (${status}/${paymentStatus}).`, evidence, ['known booking and payment statuses'])
}

export function detectUnexpectedBookingState(snapshot: BookingReviewSnapshot): DetectorResult {
  const id = 'unexpected-booking-state'
  const b = snapshot.booking
  const evidence: EvidenceReference[] = []
  if (!b.status || !b.paymentStatus) return missing(id, ['booking.status', 'booking.paymentStatus'], 'The booking state cannot be normalized because status evidence is incomplete.')
  if (!BOOKING_STATUSES.has(b.status) || !PAYMENT_STATUSES.has(b.paymentStatus)) return missing(id, ['booking.status', 'booking.paymentStatus'], `The booking uses an undocumented status combination (${b.status}/${b.paymentStatus}).`)
  if (b.sessionId && !snapshot.session) return base(id, 'blocked', 'high', `Booking ${b.id} references missing session ${b.sessionId}.`, [{ source: 'booking', recordId: b.id, field: 'session_id', value: b.sessionId }], ['booking.session_id must resolve to a same-school session'])
  if (snapshot.session && snapshot.session.schoolId !== b.schoolId) return base(id, 'blocked', 'high', `Booking ${b.id} and session ${snapshot.session.id} belong to different schools.`, [{ source: 'booking', recordId: b.id, field: 'school_id', value: b.schoolId }, { source: 'session', recordId: snapshot.session.id, field: 'school_id', value: snapshot.session.schoolId }], ['booking and session school IDs must match'])
  if (b.status === 'cancelled' && !b.cancelledAt && !b.cancellationReason) return missing(id, ['booking.cancelledAt or booking.cancellationReason'], 'The booking is cancelled but has no cancellation evidence.')
  if (b.status !== 'cancelled' && (b.cancelledAt || b.cancellationReason)) return base(id, 'blocked', 'high', `Booking ${b.id} has cancellation evidence while its status is ${b.status}.`, [{ source: 'booking', recordId: b.id, field: 'status', value: b.status }, { source: 'booking', recordId: b.id, field: 'cancelled_at', value: b.cancelledAt ?? null }, { source: 'booking', recordId: b.id, field: 'cancellation_reason', value: b.cancellationReason ?? null }], ['cancellation fields must agree with booking status'])
  return base(id, 'clear', 'info', 'The booking relationships and documented state fields are internally consistent.', evidence, ['documented booking/payment statuses', 'same-school session relationship'])
}

export function runDetectors(snapshot: BookingReviewSnapshot): DetectorResult[] {
  return [detectTravelConflict(snapshot), detectDuplicateBooking(snapshot), detectPaymentStall(snapshot), detectUnexpectedBookingState(snapshot)]
}

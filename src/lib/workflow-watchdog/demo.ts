// @ts-expect-error Node's strip-types runner needs the explicit extension for local demo execution.
import { runDetectors } from './detectors.ts'
// @ts-expect-error Node's strip-types runner needs the explicit extension for local demo execution.
import { createReviewRecord, normalizeReviewSnapshot } from './review.ts'
import type {
  BookingReviewSnapshot,
  EvidenceReference,
  ReviewOutcome,
  ReviewRecord,
} from './types'

export type DemoEventSource = 'demo-sms' | 'demo-calendar' | 'demo-payment' | 'demo-booking'

export interface DemoRawEvent {
  eventId: string
  source: DemoEventSource
  sourceEventId: string
  eventType: string
  schoolId: string
  occurredAt: string
  observedAt: string
  fixtureMode: 'demo' | 'local'
  payload: Record<string, unknown>
}

export interface DemoIntake {
  inquiryId: string
  parentContact: string | null
  studentId: string | null
  serviceType: string | null
  pickupLocation: string | null
  availabilityWindows: string[]
  missing: string[]
}

export interface DemoCandidate {
  candidateId: string
  instructorId: string | null
  startsAt: string | null
  endsAt: string | null
  location: string | null
  price: number | null
}

export interface DemoRecommendation {
  recommendationId: string
  normalizedState: ReturnType<typeof normalizeReviewSnapshot>['state']
  intake: DemoIntake
  candidate: DemoCandidate
  detectors: ReturnType<typeof runDetectors>
  evidence: EvidenceReference[]
  missingEvidence: string[]
}

export interface DemoRun {
  rawEvents: DemoRawEvent[]
  replayedEventIds: string[]
  conflictingEventIds: string[]
  snapshot: BookingReviewSnapshot
  recommendation: DemoRecommendation
  review: ReviewRecord | null
}

const DEMO_TIME = '2026-09-21T12:00:00Z'
const SCHOOL_ID = 'demo-school'

const text = (payload: Record<string, unknown>, key: string): string | null => {
  const value = payload[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

const number = (payload: Record<string, unknown>, key: string): number | null => {
  const value = payload[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function makeDemoEvent(input: {
  eventId: string
  source: DemoEventSource
  sourceEventId?: string
  eventType: string
  schoolId?: string
  payload: Record<string, unknown>
}): DemoRawEvent {
  return {
    eventId: input.eventId,
    source: input.source,
    sourceEventId: input.sourceEventId ?? input.eventId,
    eventType: input.eventType,
    schoolId: input.schoolId ?? SCHOOL_ID,
    occurredAt: DEMO_TIME,
    observedAt: DEMO_TIME,
    fixtureMode: 'demo',
    payload: input.payload,
  }
}

export function happyPathEvents(): DemoRawEvent[] {
  return [
    makeDemoEvent({
      eventId: 'evt-inquiry-1', source: 'demo-sms', eventType: 'inquiry.received',
      payload: { inquiryId: 'inquiry-1', threadId: 'thread-1', senderContact: 'parent@example.test', messageText: 'Can I book a 60 minute lesson for Sam this Saturday?', studentId: 'student-1' },
    }),
    makeDemoEvent({
      eventId: 'evt-intake-1', source: 'demo-sms', eventType: 'intake.updated',
      payload: { inquiryId: 'inquiry-1', studentId: 'student-1', serviceType: 'behind-the-wheel', pickupLocation: '123 Oak Lane', availabilityWindows: ['Saturday morning'] },
    }),
    makeDemoEvent({
      eventId: 'evt-calendar-1', source: 'demo-calendar', eventType: 'calendar.availability.observed',
      payload: { calendarRecordId: 'calendar-1', instructorId: 'instructor-1', startsAt: '2026-09-26T15:40:00Z', endsAt: '2026-09-26T16:40:00Z', location: '123 Oak Lane', availabilityStatus: 'available', priorEndsAt: '2026-09-26T15:00:00Z', priorLocation: 'School', requiredTravelMinutes: 30 },
    }),
    makeDemoEvent({
      eventId: 'evt-candidate-1', source: 'demo-calendar', eventType: 'candidate.slot.proposed',
      payload: { inquiryId: 'inquiry-1', candidateId: 'candidate-1', instructorId: 'instructor-1', startsAt: '2026-09-26T15:40:00Z', endsAt: '2026-09-26T16:40:00Z', location: '123 Oak Lane', price: 75, proposalVersion: 1 },
    }),
    makeDemoEvent({
      eventId: 'evt-booking-1', source: 'demo-booking', eventType: 'booking.status.observed',
      payload: { bookingId: 'booking-1', candidateId: 'candidate-1', sessionId: 'session-1', bookingStatus: 'pending', paymentStatus: 'pending', instructorId: 'instructor-1', sessionDate: '2026-09-26', sessionTime: '15:40', durationMinutes: 60 },
    }),
  ]
}

function eventPayload(events: DemoRawEvent[], eventType: string): Record<string, unknown> {
  return events.find((event) => event.eventType === eventType)?.payload ?? {}
}

export function normalizeDemoEvents(events: DemoRawEvent[]): { intake: DemoIntake; candidate: DemoCandidate; snapshot: BookingReviewSnapshot } {
  const inquiry = eventPayload(events, 'inquiry.received')
  const intakePayload = eventPayload(events, 'intake.updated')
  const candidatePayload = eventPayload(events, 'candidate.slot.proposed')
  const calendar = eventPayload(events, 'calendar.availability.observed')
  const bookingPayload = eventPayload(events, 'booking.status.observed')
  const schoolId = events[0]?.schoolId ?? SCHOOL_ID
  const missing: string[] = []
  const pickupLocation = text(intakePayload, 'pickupLocation')
  const availabilityWindows = Array.isArray(intakePayload.availabilityWindows) ? intakePayload.availabilityWindows.filter((value): value is string => typeof value === 'string') : []
  if (!text(intakePayload, 'studentId') && !text(inquiry, 'studentId')) missing.push('intake.studentId')
  if (!pickupLocation) missing.push('intake.pickupLocation')
  if (availabilityWindows.length === 0) missing.push('intake.availabilityWindows')

  const intake: DemoIntake = {
    inquiryId: text(intakePayload, 'inquiryId') ?? text(inquiry, 'inquiryId') ?? 'unknown-inquiry',
    parentContact: text(inquiry, 'senderContact'),
    studentId: text(intakePayload, 'studentId') ?? text(inquiry, 'studentId'),
    serviceType: text(intakePayload, 'serviceType'),
    pickupLocation,
    availabilityWindows,
    missing,
  }
  const candidate: DemoCandidate = {
    candidateId: text(candidatePayload, 'candidateId') ?? 'unknown-candidate',
    instructorId: text(candidatePayload, 'instructorId') ?? text(bookingPayload, 'instructorId'),
    startsAt: text(candidatePayload, 'startsAt'),
    endsAt: text(candidatePayload, 'endsAt'),
    location: text(candidatePayload, 'location'),
    price: number(candidatePayload, 'price'),
  }

  const bookingId = text(bookingPayload, 'bookingId') ?? candidate.candidateId
  const sessionId = text(bookingPayload, 'sessionId')
  const booking = {
    id: bookingId,
    schoolId,
    status: text(bookingPayload, 'bookingStatus'),
    paymentStatus: text(bookingPayload, 'paymentStatus'),
    sessionId,
    instructorId: candidate.instructorId,
    sessionDate: text(bookingPayload, 'sessionDate') ?? candidate.startsAt?.slice(0, 10) ?? null,
    sessionTime: text(bookingPayload, 'sessionTime') ?? candidate.startsAt?.slice(11, 16) ?? null,
  }
  const session = sessionId ? {
    id: sessionId,
    schoolId,
    status: 'scheduled',
    instructorId: candidate.instructorId,
    startDate: booking.sessionDate,
    startTime: booking.sessionTime,
    durationMinutes: number(bookingPayload, 'durationMinutes'),
    location: candidate.location,
  } : null
  const priorEndsAt = text(calendar, 'priorEndsAt')
  const priorLocation = text(calendar, 'priorLocation')
  const requiredTravelMinutes = number(calendar, 'requiredTravelMinutes')
  const snapshot: BookingReviewSnapshot = {
    schoolId,
    booking,
    session,
    sessionDurationMinutes: number(bookingPayload, 'durationMinutes'),
    travel: {
      priorLesson: priorEndsAt && priorLocation ? { recordId: 'prior-lesson', location: priorLocation, endsAt: priorEndsAt } : null,
      candidateLesson: candidate.startsAt && candidate.location ? { recordId: candidate.candidateId, location: candidate.location, startsAt: candidate.startsAt } : null,
      requiredTravelMinutes,
      assumption: requiredTravelMinutes !== null ? 'synthetic route estimate; not a maps or traffic result' : '',
    },
    evidence: events.map((event) => ({ source: event.source, recordId: event.eventId, field: 'payload', value: event.eventType })),
  }
  return { intake, candidate, snapshot }
}

function recommendationId(events: DemoRawEvent[], detectors: ReturnType<typeof runDetectors>): string {
  const material = `${events.map((event) => `${event.schoolId}:${event.source}:${event.sourceEventId}`).join('|')}|${detectors.map((detector) => `${detector.detectorId}:${detector.detectorVersion}:${detector.result}`).join('|')}`
  let hash = 0
  for (const character of material) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return `demo-recommendation-${Math.abs(hash)}`
}

export function runBookingOperatorDemo(events: DemoRawEvent[], review?: { reviewId: string; outcome: ReviewOutcome; reviewerId?: string; note?: string; reasonCode?: string }): DemoRun {
  const seen = new Map<string, DemoRawEvent>()
  const rawEvents: DemoRawEvent[] = []
  const replayedEventIds: string[] = []
  const conflictingEventIds: string[] = []
  for (const event of events) {
    const identity = `${event.schoolId}:${event.source}:${event.sourceEventId}`
    const previous = seen.get(identity)
    if (previous) {
      if (JSON.stringify(previous.payload) === JSON.stringify(event.payload)) replayedEventIds.push(event.eventId)
      else conflictingEventIds.push(event.eventId)
      continue
    }
    seen.set(identity, event)
    rawEvents.push(event)
  }
  const normalized = normalizeDemoEvents(rawEvents)
  if (conflictingEventIds.length > 0) normalized.snapshot.unavailableEvidence = conflictingEventIds.map((id) => `conflicting replay payload: ${id}`)
  const detectors = runDetectors(normalized.snapshot)
  const reviewSnapshot = normalizeReviewSnapshot(normalized.snapshot, detectors)
  if (normalized.intake.missing.length > 0 || conflictingEventIds.length > 0) reviewSnapshot.state = 'needs_information'
  const recommendation: DemoRecommendation = {
    recommendationId: recommendationId(rawEvents, detectors),
    normalizedState: reviewSnapshot.state,
    intake: normalized.intake,
    candidate: normalized.candidate,
    detectors,
    evidence: [...normalized.snapshot.evidence ?? [], ...reviewSnapshot.evidence],
    missingEvidence: [...new Set([...normalized.intake.missing, ...reviewSnapshot.unavailableEvidence])],
  }
  const reviewRecord = review ? createReviewRecord(reviewSnapshot, detectors, { ...review, reviewedAt: DEMO_TIME }) : null
  return { rawEvents, replayedEventIds, conflictingEventIds, snapshot: normalized.snapshot, recommendation, review: reviewRecord }
}

export function runHappyPathDemo(outcome: ReviewOutcome = 'approve'): DemoRun {
  return runBookingOperatorDemo(happyPathEvents(), { reviewId: `demo-review-${outcome}`, outcome, note: outcome === 'override' ? 'Owner accepts this known synthetic exception for demonstration.' : undefined })
}

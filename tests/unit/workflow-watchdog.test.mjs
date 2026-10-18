import assert from 'node:assert/strict'
import test from 'node:test'
import { detectDuplicateBooking, detectPaymentStall, detectTravelConflict, detectUnexpectedBookingState, runDetectors } from '../../src/lib/workflow-watchdog/detectors.ts'
import { createReviewRecord, normalizeReviewSnapshot, reviewSnapshot } from '../../src/lib/workflow-watchdog/review.ts'
import { happyPathEvents, makeDemoEvent, runBookingOperatorDemo, runHappyPathDemo } from '../../src/lib/workflow-watchdog/demo.ts'

const baseBooking = {
  id: 'booking-1', schoolId: 'school-1', status: 'pending', paymentStatus: 'pending', sessionId: 'session-1',
  instructorId: 'instructor-1', sessionDate: '2026-09-20', sessionTime: '15:30',
}
const baseSession = {
  id: 'session-1', schoolId: 'school-1', status: 'scheduled', instructorId: 'instructor-1',
  startDate: '2026-09-20', startTime: '15:30', durationMinutes: 60, location: 'North campus',
}
const clearTravel = {
  priorLesson: { recordId: 'prior-1', location: 'A', endsAt: '2026-09-20T15:00:00Z' },
  candidateLesson: { recordId: 'candidate-1', location: 'B', startsAt: '2026-09-20T15:40:00Z' },
  requiredTravelMinutes: 30, assumption: 'local fixture route estimate',
}

function snapshot(overrides = {}) {
  return { schoolId: 'school-1', booking: baseBooking, session: baseSession, sessionDurationMinutes: 60, ...overrides }
}

test('workflow watchdog travel conflict blocks an infeasible candidate', () => {
  const result = detectTravelConflict(snapshot({ travel: { ...clearTravel, candidateLesson: { ...clearTravel.candidateLesson, startsAt: '2026-09-20T15:20:00Z' } } }))
  assert.equal(result.result, 'blocked')
  assert.match(result.explanation, /short of the required travel time/)
  assert.equal(result.evidence.length, 3)
})

test('workflow watchdog travel detector needs information without route evidence', () => {
  const result = detectTravelConflict(snapshot())
  assert.equal(result.result, 'needs_information')
  assert.ok(result.missingEvidence.includes('travel.requiredTravelMinutes'))
})

test('workflow watchdog travel detector clears a feasible fixture', () => {
  const result = detectTravelConflict(snapshot({ travel: clearTravel }))
  assert.equal(result.result, 'clear')
})

test('workflow watchdog duplicate detector blocks overlapping instructor bookings', () => {
  const other = { ...baseBooking, id: 'booking-2', sessionId: 'session-2', sessionTime: '16:00' }
  const otherSession = { ...baseSession, id: 'session-2', startTime: '16:00' }
  const result = detectDuplicateBooking(snapshot({ relatedBookings: [other], relatedSessions: [otherSession] }))
  assert.equal(result.result, 'blocked')
  assert.match(result.explanation, /overlapping bookings/)
})

test('workflow watchdog duplicate detector leaves non-overlapping bookings clear', () => {
  const other = { ...baseBooking, id: 'booking-2', sessionId: 'session-2', sessionTime: '17:00' }
  const otherSession = { ...baseSession, id: 'session-2', startTime: '17:00' }
  assert.equal(detectDuplicateBooking(snapshot({ relatedBookings: [other], relatedSessions: [otherSession] })).result, 'clear')
})

test('workflow watchdog duplicate detector needs information when time evidence is incomplete', () => {
  assert.equal(detectDuplicateBooking(snapshot({ booking: { ...baseBooking, sessionTime: null }, session: { ...baseSession, startTime: null } })).result, 'needs_information')
})

test('workflow watchdog payment detector flags a pending payment stall', () => {
  const result = detectPaymentStall(snapshot())
  assert.equal(result.result, 'warning')
  assert.match(result.explanation, /still pending/)
})

test('workflow watchdog payment detector does not stall a paid confirmed booking', () => {
  assert.equal(detectPaymentStall(snapshot({ booking: { ...baseBooking, status: 'confirmed', paymentStatus: 'paid' } })).result, 'clear')
})

test('workflow watchdog payment detector fails closed for undocumented values', () => {
  assert.equal(detectPaymentStall(snapshot({ booking: { ...baseBooking, status: 'approved' } })).result, 'needs_information')
})

test('workflow watchdog unexpected-state detector blocks a missing linked session', () => {
  const result = detectUnexpectedBookingState(snapshot({ session: null }))
  assert.equal(result.result, 'blocked')
  assert.match(result.explanation, /references missing session/)
})

test('workflow watchdog unexpected-state detector clears a consistent booking', () => {
  const result = detectUnexpectedBookingState(snapshot({ booking: { ...baseBooking, status: 'confirmed', paymentStatus: 'paid' } }))
  assert.equal(result.result, 'clear')
})

test('workflow watchdog unexpected-state detector blocks cross-school relationships', () => {
  const result = detectUnexpectedBookingState(snapshot({ session: { ...baseSession, schoolId: 'school-2' } }))
  assert.equal(result.result, 'blocked')
  assert.match(result.explanation, /different schools/)
})

test('workflow watchdog unexpected-state detector reports contradictory cancellation evidence', () => {
  const result = detectUnexpectedBookingState(snapshot({ booking: { ...baseBooking, status: 'confirmed', cancelledAt: '2026-09-20T12:00:00Z' } }))
  assert.equal(result.result, 'blocked')
  assert.match(result.explanation, /cancellation evidence/)
})

test('workflow watchdog normalization and review are pure and side-effect free', () => {
  const before = JSON.stringify(snapshot({ travel: clearTravel }))
  const result = reviewSnapshot(snapshot({ travel: clearTravel }), runDetectors(snapshot({ travel: clearTravel })), { reviewId: 'review-1', reviewerId: 'operator-1', outcome: 'override', note: 'Known school exception', reviewedAt: '2026-09-20T12:00:00Z' })
  assert.equal(JSON.stringify(snapshot({ travel: clearTravel })), before)
  assert.equal(result.review?.normalizedState, 'overridden')
  assert.deepEqual(result.review?.sideEffects, [])
  assert.equal(result.review?.bookingId, 'booking-1')
})

test('workflow watchdog review records reject, approve, dismiss, and needs-information outcomes', () => {
  const detectors = runDetectors(snapshot())
  const normalized = normalizeReviewSnapshot(snapshot(), detectors)
  const rejected = createReviewRecord(normalized, detectors, { reviewId: 'review-2', outcome: 'reject', reviewedAt: '2026-09-20T12:00:00Z' })
  const approved = createReviewRecord(normalized, detectors, { reviewId: 'review-3', outcome: 'approve', reviewedAt: '2026-09-20T12:01:00Z' })
  const dismissed = createReviewRecord(normalized, detectors, { reviewId: 'review-4', outcome: 'dismiss', reviewedAt: '2026-09-20T12:02:00Z' })
  const needsInformation = createReviewRecord(normalized, detectors, { reviewId: 'review-5', outcome: 'needs_information', reviewedAt: '2026-09-20T12:03:00Z' })
  assert.equal(rejected.normalizedState, 'rejected')
  assert.equal(approved.normalizedState, 'approved')
  assert.equal(dismissed.normalizedState, 'dismissed')
  assert.equal(needsInformation.normalizedState, 'needs_information')
  assert.throws(() => createReviewRecord(normalized, detectors, { reviewId: 'review-6', outcome: 'override', reviewedAt: '2026-09-20T12:00:00Z' }), /override requires/)
})

test('local demo happy path normalizes intake, runs exactly four detectors, and records approval without effects', () => {
  const run = runHappyPathDemo('approve')
  assert.equal(run.recommendation.normalizedState, 'reviewable')
  assert.deepEqual(run.recommendation.detectors.map((detector) => detector.detectorId), ['travel-conflict', 'duplicate-booking', 'payment-stall', 'unexpected-booking-state'])
  assert.equal(run.review?.normalizedState, 'approved')
  assert.deepEqual(run.review?.sideEffects, [])
  assert.ok(run.recommendation.detectors.every((detector) => detector.explanation && (detector.evidence.length > 0 || detector.missingEvidence.length > 0 || detector.constraints.length > 0)))
})

test('local demo preserves missing intake evidence and cannot make it reviewable', () => {
  const events = happyPathEvents().filter((event) => event.eventType !== 'intake.updated')
  const run = runBookingOperatorDemo(events)
  assert.equal(run.recommendation.normalizedState, 'needs_information')
  assert.ok(run.recommendation.missingEvidence.includes('intake.pickupLocation'))
  assert.equal(run.review, null)
})

test('local demo preserves ambiguous changed pickup replay and asks for information', () => {
  const events = happyPathEvents()
  events.push(makeDemoEvent({ eventId: 'evt-intake-2', source: 'demo-sms', sourceEventId: 'evt-intake-1', eventType: 'intake.updated', payload: { inquiryId: 'inquiry-1', studentId: 'student-1', serviceType: 'behind-the-wheel', pickupLocation: '999 Changed Lane', availabilityWindows: ['Saturday morning'] } }))
  const run = runBookingOperatorDemo(events)
  assert.deepEqual(run.conflictingEventIds, ['evt-intake-2'])
  assert.equal(run.recommendation.normalizedState, 'needs_information')
  assert.ok(run.snapshot.unavailableEvidence?.some((value) => value.includes('evt-intake-2')))
})

test('local demo deduplicates exact replay without creating a second recommendation or effect', () => {
  const events = happyPathEvents()
  const run = runBookingOperatorDemo([...events, events[0]])
  assert.deepEqual(run.replayedEventIds, ['evt-inquiry-1'])
  assert.equal(run.rawEvents.length, events.length)
  assert.deepEqual(run.review, null)
})

test('local demo supports intentional owner override only with a note', () => {
  const run = runHappyPathDemo('override')
  assert.equal(run.review?.normalizedState, 'overridden')
  assert.match(run.review?.note ?? '', /known synthetic exception/)
  assert.deepEqual(run.review?.sideEffects, [])
})

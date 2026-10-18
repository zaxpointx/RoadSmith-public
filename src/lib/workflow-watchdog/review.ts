import type {
  BookingReviewSnapshot,
  DetectorResult,
  NormalizedReviewSnapshot,
  NormalizedReviewState,
  ReviewOutcome,
  ReviewRecord,
} from './types'
export function normalizeReviewSnapshot(snapshot: BookingReviewSnapshot, detectors: DetectorResult[]): NormalizedReviewSnapshot {
  const state: NormalizedReviewState = detectors.some((result) => result.result === 'blocked')
    ? 'blocked'
    : detectors.some((result) => result.result === 'needs_information')
      ? 'needs_information'
      : 'reviewable'
  return {
    snapshot,
    state,
    evidence: detectors.flatMap((result) => result.evidence),
    unavailableEvidence: [
      ...(snapshot.unavailableEvidence ?? []),
      ...detectors.flatMap((result) => result.missingEvidence),
    ].filter((field, index, fields) => fields.indexOf(field) === index),
  }
}

export function createReviewRecord(
  normalized: NormalizedReviewSnapshot,
  detectors: DetectorResult[],
  input: {
    reviewId: string
    reviewerId?: string | null
    outcome: ReviewOutcome
    reviewedAt: string
    reasonCode?: string
    note?: string
  },
): ReviewRecord {
  const note = input.note?.trim()
  if (!input.reviewId || !input.reviewedAt) throw new Error('reviewId and reviewedAt are required')
  if (input.outcome === 'override' && !note) throw new Error('override requires an operator note')
  if (note && note.length > 1000) throw new Error('review note must be 1000 characters or fewer')
  const state: NormalizedReviewState = input.outcome === 'approve'
    ? 'approved'
    : input.outcome === 'reject'
      ? 'rejected'
      : input.outcome === 'override'
        ? 'overridden'
        : input.outcome === 'dismiss'
          ? 'dismissed'
          : 'needs_information'
  return {
    reviewId: input.reviewId,
    bookingId: normalized.snapshot.booking.id,
    schoolId: normalized.snapshot.schoolId,
    reviewerId: input.reviewerId ?? 'demo',
    normalizedState: state,
    outcome: input.outcome,
    ...(input.reasonCode ? { reasonCode: input.reasonCode } : {}),
    ...(note ? { note } : {}),
    detectorIds: detectors.map((detector) => detector.detectorId),
    detectorVersions: detectors.map((detector) => detector.detectorVersion),
    evidence: normalized.evidence,
    reviewedAt: input.reviewedAt,
    sideEffects: [],
  }
}

export function reviewSnapshot(
  snapshot: BookingReviewSnapshot,
  detectors: DetectorResult[],
  input?: Parameters<typeof createReviewRecord>[2],
): { normalized: NormalizedReviewSnapshot; detectors: DetectorResult[]; review: ReviewRecord | null } {
  const normalized = normalizeReviewSnapshot(snapshot, detectors)
  return { normalized, detectors, review: input ? createReviewRecord(normalized, detectors, input) : null }
}

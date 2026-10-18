export type DetectorResultCode = 'clear' | 'warning' | 'blocked' | 'needs_information'
export type DetectorSeverity = 'info' | 'low' | 'medium' | 'high'

export type NormalizedReviewState =
  | 'candidate'
  | 'needs_information'
  | 'blocked'
  | 'reviewable'
  | 'approved'
  | 'rejected'
  | 'overridden'
  | 'dismissed'

export type ReviewOutcome =
  | 'approve'
  | 'reject'
  | 'override'
  | 'dismiss'
  | 'needs_information'

export interface EvidenceReference {
  source: string
  recordId: string
  field: string
  value?: string | number | boolean | null
}

export interface BookingRecordSnapshot {
  id: string
  schoolId: string
  status: string | null
  paymentStatus: string | null
  sessionId?: string | null
  instructorId?: string | null
  sessionDate?: string | null
  sessionTime?: string | null
  studentId?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
}

export interface SessionRecordSnapshot {
  id: string
  schoolId: string
  status: string | null
  instructorId?: string | null
  startDate?: string | null
  startTime?: string | null
  durationMinutes?: number | null
  location?: string | null
}

export interface TravelLegEvidence {
  recordId: string
  location: string | null
  startsAt?: string | null
  endsAt?: string | null
}

export interface TravelEvidence {
  priorLesson?: TravelLegEvidence | null
  candidateLesson?: TravelLegEvidence | null
  nextLesson?: TravelLegEvidence | null
  requiredTravelMinutes?: number | null
  assumption: string
}

export interface BookingReviewSnapshot {
  schoolId: string
  operatorId?: string | null
  booking: BookingRecordSnapshot
  session?: SessionRecordSnapshot | null
  sessionDurationMinutes?: number | null
  relatedBookings?: BookingRecordSnapshot[]
  relatedSessions?: SessionRecordSnapshot[]
  evidence?: EvidenceReference[]
  unavailableEvidence?: string[]
  travel?: TravelEvidence | null
}

export interface DetectorResult {
  detectorId: string
  detectorVersion: string
  result: DetectorResultCode
  severity: DetectorSeverity
  explanation: string
  evidence: EvidenceReference[]
  constraints: string[]
  missingEvidence: string[]
}

export interface NormalizedReviewSnapshot {
  snapshot: BookingReviewSnapshot
  state: NormalizedReviewState
  evidence: EvidenceReference[]
  unavailableEvidence: string[]
}

export interface ReviewRecord {
  reviewId: string
  bookingId: string
  schoolId: string
  reviewerId: string
  normalizedState: NormalizedReviewState
  outcome: ReviewOutcome
  reasonCode?: string
  note?: string
  detectorIds: string[]
  detectorVersions: string[]
  evidence: EvidenceReference[]
  reviewedAt: string
  sideEffects: []
}

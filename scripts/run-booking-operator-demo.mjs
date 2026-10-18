import { runHappyPathDemo } from '../src/lib/workflow-watchdog/demo.ts'

const outcome = process.argv[2] ?? 'approve'
const allowed = new Set(['approve', 'reject', 'override', 'dismiss', 'needs_information'])
if (!allowed.has(outcome)) {
  console.error(`Usage: node --experimental-strip-types scripts/run-booking-operator-demo.mjs [${[...allowed].join('|')}]`)
  process.exitCode = 1
} else {
  const run = runHappyPathDemo(outcome)
  console.log(JSON.stringify({
    mode: 'local synthetic fixture; read-only',
    flow: ['parent inquiry', 'normalized intake/candidate', 'four watchdog detectors', 'evidence-rich recommendation', 'simulated owner review'],
    rawEvents: run.rawEvents,
    intake: run.recommendation.intake,
    candidate: run.recommendation.candidate,
    normalizedState: run.recommendation.normalizedState,
    detectors: run.recommendation.detectors.map(({ detectorId, result, severity, explanation, evidence, missingEvidence }) => ({ detectorId, result, severity, explanation, evidence, missingEvidence })),
    recommendationId: run.recommendation.recommendationId,
    review: run.review,
    replayedEventIds: run.replayedEventIds,
    conflictingEventIds: run.conflictingEventIds,
    sideEffects: [],
    exclusions: ['Twilio', 'Google Calendar', 'Stripe', 'Discord', 'Maps', 'Supabase', 'send', 'charge', 'book', 'cancel', 'reschedule', 'mutate'],
  }, null, 2))
}

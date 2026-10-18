# Engineering highlights

These are the design decisions most useful for a technical review.

## Approval is a safety boundary

Roadsmith separates a scheduling recommendation from a confirmed booking. The
system can evaluate a candidate slot, but an operator must review the evidence
before a decision is recorded. Payment and email states are represented
explicitly rather than inferred from a UI action. This keeps automation
explainable and leaves a human accountable for consequential decisions.

## Duplicate and replay protection

The workflow-watchdog model normalizes incoming events, tracks source event
identifiers, and distinguishes an exact replay from a changed replay. Duplicate
booking detection checks the known school, instructor, and time window. When
evidence is incomplete or contradictory, the system asks for information or
blocks the candidate instead of guessing.

## Evidence and activity records

Detector results carry an explanation, source record, field, and value. Review
records retain the detector versions, evidence, reviewer, outcome, and side
effects. That structure makes an approval auditable: a reviewer can understand
what the system knew and what it did not know at the time.

## Compliance means readiness, not fake submission

Tennessee compliance is represented as readiness tracking: the application
checks whether the required evidence is present and current. It does not claim
to generate, sign, or submit government forms automatically. This boundary is
intentional because legal-form correctness and submission authority require
separate verification.

## First production hardening priorities

Before production use, I would prioritize:

1. Reconcile hosted Supabase migration history with the repository and verify
   tenant isolation/RLS in a disposable environment.
2. Add end-to-end coverage for payment webhooks, booking idempotency, provider
   failures, and authorization boundaries.
3. Resolve dependency alerts and existing lint warnings that obscure defects.
4. Establish one canonical Vercel project, environment ownership model, and
   operational monitoring path.

The project is deliberately documented as a release candidate rather than
claiming these production gates are already complete.

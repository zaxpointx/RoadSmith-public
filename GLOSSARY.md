# Glossary

- **Candidate finding** — A detector result offered for review, not an unquestionable truth or confirmed booking.
- **Detector** — A bounded check over a normalized workflow snapshot, such as travel feasibility or duplicate booking.
- **Evidence reference** — A pointer to the source record, field, and observed value supporting a result.
- **Fail closed** — When evidence is missing or contradictory, return `needs_information` or `blocked` instead of guessing.
- **Normalized workflow state** — A consistent review state reconstructed from related events and records.
- **Replay protection** — Recognition of an exact repeated event and separate handling of a changed payload with the same source identity.
- **Review record** — The durable-shaped record of detector versions, evidence, reviewer, outcome, time, and side effects.
- **Side effect** — An external mutation or provider action. The synthetic demo records `sideEffects: []`.
- **Workflow watchdog** — Roadsmith’s small module for state normalization, bounded detectors, and operator review.

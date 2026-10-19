# HIT-HD influence on Roadsmith

This note explains a research influence on the Roadsmith workflow-watchdog
design. It is a translation of a general engineering pattern, not a claim that
the two systems or domains are equivalent.

## What HIT-HD was

HIT-HD (Health Information Technology Hazard Detection) was studied as a
safety-surveillance and anomaly-detection project for health-information-
technology workflows. The published description presents a pipeline with data
extraction and preprocessing, hazard monitoring and detection, and report
generation with feedback. Its setting is electronic-health-record and health-IT
safety; Roadsmith is not a health-IT system. See the primary technical
description, [Advanced Health Information Technology Analytic](https://www.osti.gov/servlets/purl/1798608).

## Transferable pattern

The useful influence was the shape of the work:

`raw events → reconstructed workflow state → modular detectors → evidence-backed candidate finding → human review → recorded feedback/history`

That pattern encourages bounded checks, explicit context, evidence attached to
each result, and a human decision boundary when the system cannot establish a
safe conclusion. It does not imply that Roadsmith uses HIT-HD algorithms,
clinical data, or a healthcare safety model.

## Roadsmith translation

Roadsmith adapts the pattern to driving-school operations:

| Research-shaped idea | Roadsmith implementation |
| --- | --- |
| Incoming observations | `src/lib/workflow-watchdog/demo.ts` defines synthetic inquiry, intake, calendar, candidate, and booking events. |
| Reconstructed state | `normalizeDemoEvents` creates a school-scoped booking/session/travel snapshot; replay handling distinguishes exact duplicates from changed payloads. |
| Modular detection | `src/lib/workflow-watchdog/detectors.ts` runs four bounded checks: travel conflict, duplicate booking, payment stall, and unexpected booking state. |
| Candidate finding with context | `DetectorResult` includes result/severity, explanation, evidence, constraints, and missing evidence in `src/lib/workflow-watchdog/types.ts`. |
| Human analyst review | `src/lib/workflow-watchdog/review.ts` normalizes findings and records approve, reject, override, dismiss, or needs-information outcomes. |
| Feedback/history boundary | `ReviewRecord` records detector IDs/versions, evidence, reviewer, outcome, timestamp, and explicit `sideEffects: []`. |

The focused tests in
[`tests/unit/workflow-watchdog.test.mjs`](../../tests/unit/workflow-watchdog.test.mjs)
demonstrate the translation: missing or contradictory evidence fails closed,
changed replays require information, exact replays are deduplicated, detector
coverage stays at four named checks, and an owner override requires a note.
The synthetic walkthrough is also described in [`DEMO.md`](../../DEMO.md).

## Scope and limits

Nothing from HIT-HD source code was copied into Roadsmith, and Roadsmith does
not claim to reproduce HIT-HD, its clinical setting, its data, or its research
results. The Roadsmith implementation is a small, rule-based, synthetic
workflow-watchdog slice. The demo does not call providers, mutate production
data, or create real bookings; `sideEffects: []` is intentional. Live provider
reconciliation, production observability, complete automation, and external
validation remain partial or release-gated as described in
[`docs/PUBLIC-RELEASE-BOUNDARY.md`](../PUBLIC-RELEASE-BOUNDARY.md).

For the current design rationale, see
[`docs/ENGINEERING-HIGHLIGHTS.md`](../ENGINEERING-HIGHLIGHTS.md),
[`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), and
[`DESIGN_DECISIONS.md`](../../DESIGN_DECISIONS.md).

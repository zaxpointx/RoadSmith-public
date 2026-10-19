# Technical review guide

This guide gives reviewers a short path through Roadsmith’s implementation,
design decisions, verification strategy, and known limitations. It is written
for internship reviewers, educators, and engineers who want evidence of the
work without treating a pre-release project as a production deployment.

## Reading path

1. [`../README.md`](../README.md) — product purpose, current status, local setup,
   and the reviewer quick start.
2. [`../DEMO.md`](../DEMO.md) — the synthetic operator-review walkthrough and
   its simulated-versus-real boundary.
3. [`ENGINEERING-HIGHLIGHTS.md`](ENGINEERING-HIGHLIGHTS.md) — the main design
   decisions and the questions they raise.



4. [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime modules and integration seams.
5. [`REPOSITORY-MAP.md`](REPOSITORY-MAP.md) — where product behavior and tests
   live.
6. [`../ACTUAL_SCHEMA.md`](../ACTUAL_SCHEMA.md) — application-facing schema
   reference.
7. [`PUBLIC-RELEASE-BOUNDARY.md`](PUBLIC-RELEASE-BOUNDARY.md) — what is in the
   public review surface and what remains release-gated.

## Repository inventory

| Area | Location | Review treatment |
| --- | --- | --- |
| Product runtime | `src/app/`, `src/components/`, `src/lib/`, `public/` | Current implementation; trace behavior through routes, modules, and tests. |
| Database boundary | `supabase/`, `ACTUAL_SCHEMA.md`, `src/lib/supabase/` | Application reference plus an explicitly open hosted-parity decision. |
| Legacy migration context | `src/lib/migrations/` | Historical/application migration material; not an instruction to change production. |
| Product tests | `tests/`, `e2e/`, `scripts/run-booking-operator-demo.mjs` | Verification seams for unit, browser, and operator-review flows. |
| Review helpers | `scripts/verify-*.sh`, `e2e/` | Local verification helpers; not product runtime and not for production without approval. |
| Engineering docs | `README.md`, `docs/`, `CONTRIBUTING.md`, `SECURITY.md` | Reviewer-facing guidance; follow the reading path above when documents overlap. |
| CI and repository policy | `.github/`, `package.json`, config files | Current workflow and safety controls. |
| Product planning and historical material | `SPEC.md`, `night-hours-spec.md`, `archive/`, `docs/archived/` | Context only; do not treat every proposal as a current product claim. |
| Local/generated state | `.env.local`, `.next/`, `.vercel/`, `playwright-report/`, `test-results/`, `*.tsbuildinfo` | Local state; never commit or use as product evidence. |

## Demo-data boundary

The operator-review demo uses fictional identities, reserved example domains,
and synthetic booking evidence. Reviewers should use the demo fixtures only;
they should not enter real student, parent, instructor, school, payment, or
booking-token data into local or hosted forms.

## Incomplete or unresolved

- Hosted Supabase migration history is not reconciled with local files. Do not
  apply migrations from this review branch.
- Live RLS and tenant-isolation verification requires an approved
  non-production environment and credentials.
- The canonical Vercel project/hostname relationship remains an owner decision.
- SMS reminders, complete instructor availability management, government-form
  submission, and production-grade automation are not claimed complete.
- The local E2E/demo path may require environment setup; a missing credential or
  hosted dependency must be reported as blocked, not silently bypassed.

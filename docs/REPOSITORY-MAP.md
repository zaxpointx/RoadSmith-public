# Roadsmith repository map

This is the short navigation guide for bounded product work. It describes
where behavior lives; it does not replace the current product specification or
the actual-schema reference.

## Product areas

| Area | Primary locations | Verification seam |
|---|---|---|
| Public booking | `src/app/book/`, `src/app/api/bookings/`, `src/app/api/booking-links/`, `src/app/api/slots/` | public booking routes and `e2e/booking-loop.spec.ts` |
| School administration | `src/app/school-admin/`, `src/app/api/school-admin/`, `src/components/admin/` | authenticated admin routes, demo mode, and dashboard/compliance behavior |
| Instructors | `src/app/instructor/`, `src/app/api/instructor/`, `src/app/api/instructors/` | instructor schedule, student, availability, and booking routes |
| Students and compliance | `src/app/api/students/`, `src/app/api/demo/students/`, `src/lib/compliance/` | student API boundaries and Tennessee readiness helpers |
| Identity and tenant access | `src/middleware.ts`, `src/app/auth/`, `src/lib/school-admin/auth.ts`, `src/lib/security.ts` | authorized, unauthorized, and cross-school cases |
| Billing and messaging | `src/app/api/stripe/`, `src/app/api/webhooks/stripe/`, `src/lib/email.ts`, `src/lib/email-templates/` | signature/state-transition tests and integration boundaries; no live production writes |
| Demo and operator review | `src/app/demo/`, `src/lib/workflow-watchdog/`, `scripts/run-booking-operator-demo.mjs` | unit tests and local demo flow |

## Data and integration boundaries

- `src/lib/supabase/` contains browser/server clients and the application-facing
  TypeScript database surface.
- `ACTUAL_SCHEMA.md` at the repository root is the required schema reference for
  application queries and migrations. It records known gaps and does not prove
  hosted parity.
- `supabase/migrations/` contains the local migration inventory. `supabase/SCHEMA_DRIFT.md`
  records the unresolved hosted-history mismatch.
- `src/lib/migrations/` contains legacy/application migration material kept for
  compatibility context; do not assume it is the hosted migration source of
  truth.
- `.env.example` documents names and local setup only. Values, customer data,
  provider accounts, and hosted configuration stay outside the repository.

## Verification and delivery

- Unit tests live in `tests/unit/`; browser tests live in `e2e/`.
- Repository checks are exposed through `package.json`: lint, typecheck, unit,
  E2E, build, public-tree, history, migration metadata, and completion checks.
- `docs/INTERNSHIP_REVIEW.md` defines the reviewer reading path and unresolved
  decisions.
- `docs/SPEC-TEMPLATE.md`, `docs/TASK-CONTRACT-TEMPLATE.md`, and
  `docs/VERIFICATION-MATRIX.md` provide reusable planning and evidence
  contracts.
- Use a branch or isolated worktree for implementation. Keep one outcome per
  task and one reviewed outcome per pull request.

## Rules for future sessions

1. Read `AGENTS.md`, `README.md`, and the relevant current product/schema docs.
2. Capture `git status --short --branch`; preserve existing changes and files.
3. Trace the requested behavior to its route, domain module, integration, and
   test seam before editing.
4. Keep tenant isolation, authorization, PII handling, payments, email, and
   database changes explicit in the task contract.
5. Stop for approval before hosted changes, production data, migrations,
   credentials, billing, repository visibility, history changes, or deletion.

For unresolved release and ownership decisions, see the release-boundary and
current review notes in [`CHANGE-REVIEW-2026-10-10.md`](CHANGE-REVIEW-2026-10-10.md)
and [`PUBLIC-RELEASE-BOUNDARY.md`](PUBLIC-RELEASE-BOUNDARY.md).

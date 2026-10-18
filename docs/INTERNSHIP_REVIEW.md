# Internship review guide

This is the reviewer-facing entry point for the repository cleanup. It records
what is in the checkout, what is product code, what is historical or agent
state, and what still requires an owner decision.

## Reading path

1. [`../README.md`](../README.md) — product purpose, current status, local setup,
   and the critical demo path.
2. [`../SPEC.md`](../SPEC.md) — current product intent and explicitly deferred
   work. Historical specifications under `archive/` are context only.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime modules and integration seams.
4. [`REPOSITORY-MAP.md`](REPOSITORY-MAP.md) — where product behavior and tests
   live.
5. [`../ACTUAL_SCHEMA.md`](../ACTUAL_SCHEMA.md) — application-facing schema
   reference.
6. [`../supabase/SCHEMA_DRIFT.md`](../supabase/SCHEMA_DRIFT.md) — unresolved
   hosted migration history and the safe reconciliation path.
7. [`PUBLIC-RELEASE-BOUNDARY.md`](PUBLIC-RELEASE-BOUNDARY.md) — what must not
   be treated as public or production-ready.

## Repository inventory

| Area | Location | Review treatment |
| --- | --- | --- |
| Product runtime | `src/app/`, `src/components/`, `src/lib/`, `public/` | Current implementation; preserve and review through routes, modules, and tests. |
| Database boundary | `supabase/`, `ACTUAL_SCHEMA.md`, `src/lib/supabase/` | Current application reference plus an explicitly open hosted-parity decision. |
| Legacy migration context | `src/lib/migrations/` | Historical/application migration material; not an instruction to change production. |
| Product tests | `tests/`, `e2e/`, `scripts/run-booking-operator-demo.mjs` | Verification seams for unit, browser, and operator-review flows. |
| Review harnesses | `scripts/shoot*.mjs`, `scripts/verify-live.mjs` | Manual or hosted-review helpers; not product runtime and not for production without approval. |
| Engineering docs | `README.md`, `SPEC.md`, `docs/`, `CONTRIBUTING.md`, `SECURITY.md` | Reviewer-facing guidance; follow the reading path above when documents overlap. |
| CI and repository policy | `.github/`, `AGENTS.md`, `package.json`, config files | Current local workflow and safety controls. |
| Historical material | `archive/`, `SPEC_ARCHIVE/`, `docs/archived/`, `research/`, `night-hours-spec.md` | Retained for provenance; not current product requirements. |
| Agent/harness state | `.claude/`, `.hermes/`, `.openclaw/`, `memory/`, `scout-reports/`, `AGENT_RUN_LOG.md`, `WORKFLOW_LOG*`, `CLAUDE*`, `MEMORY.md` | Operational context, not product code. Excluded from this branch; `archive/quarantine/` records the boundary without retaining the payloads. |
| Local/generated state | `.env.local`, `.next/`, `.vercel/`, `graphify-out/`, `playwright-report/`, `test-results/`, `*.tsbuildinfo` | Ignored local state; never commit or use as product evidence. |

## Sanitization record

The review branch replaces person-specific or realistic demo identities with
obviously synthetic values in the product-facing demo surfaces:

- `src/components/marketing/OperatorLanding.tsx`: removes the local operator's
  name from the greeting.
- `src/lib/seed.sql` and `src/app/api/seed/route.ts`: use fictional role-based
  demo identities, reserved example domains, and non-realistic phone/license
  placeholders.
- `src/app/api/demo/emails/route.ts`: uses synthetic recipients and neutral
  message copy.
- `scripts/shoot-auth.mjs`: is a local-only harness and no longer contains a
  person-specific email or hosted URL.
- Provider-admin setup helpers and private audit/agent payloads are excluded
  from the review branch rather than retained as runnable repository content.

The repository still contains intentional placeholders such as
`support@example.com`, form examples, and legal ownership text. Those are not
customer records; changing them would be a separate product/legal decision.

## Incomplete or unresolved

- Hosted Supabase migration history is not reconciled with local files. Do not
  push or apply migrations from this branch.
- Live RLS/tenant-isolation verification requires an approved non-production
  environment and credentials.
- The canonical Vercel project/hostname relationship remains an owner decision.
- SMS reminders, complete instructor availability management, government-form
  submission, and production-grade automation are not claimed complete.
- The E2E/demo path may require local environment setup; a missing credential or
  hosted dependency must be reported as blocked, not silently bypassed.

## Change accounting

This branch was assembled from a previously dirty development checkout, then
reviewed and committed from this isolated worktree. Product code and useful
history were preserved; agent, audit, and machine-local material was retained
under `archive/quarantine/` rather than left in the reviewer-facing path.

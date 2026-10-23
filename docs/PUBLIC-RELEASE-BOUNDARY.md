# Public-release boundary

This repository is being prepared for a future public GitHub release. GitHub remains private until the release gate passes.

## Public by default

Product source, tests, safe schema documentation, reconciled migrations, public workflow and architecture documentation, CI, safe examples, and screenshots verified to contain no private information belong in the public tree.

## Candidate classification

| Material | Candidate treatment | Reason |
| --- | --- | --- |
| `src/`, `tests/`, `e2e/`, `.github/`, `scripts/verify-public-release.sh`, and safe `supabase/` material | Keep | Product implementation, reproducible verification, CI, and reviewed schema/workflow evidence. |
| `scripts/fixtures/student-import.csv` | Keep as synthetic fixture | Values use reserved `.test` domains, example permit identifiers, and documentation-only phone numbers. It must not be presented as customer data. |
| `README.md`, `docs/STEM_ACADEMY_REVIEW.md`, `docs/INTERNSHIP_REVIEW.md`, `docs/PROJECT_STATUS.md`, `docs/WORKFLOWS.md`, `docs/ARCHITECTURE.md`, and `docs/public-website-routes.md` | Keep | Reviewer-facing product story and technical evidence. |
| Reviewed historical planning, research, audit, and design files formerly under `archive/`, `docs/audits/`, `docs/research/`, `docs/MATT_DEMO_*`, and `night-hours-spec.md` | Preserve outside candidate | Useful context, but not part of the runtime contract or STEM Academy evidence. They are held outside the repository for recovery; no content was destroyed or history rewritten. |
| Reviewed generated-looking PNGs formerly under `public/` | Preserve outside candidate | Several contained unrelated product references and realistic-looking personal/customer-like values. They are held outside the repository for recovery and are not release assets. |
| `.env*` except `.env.example`, local provider state, reports, prompts, agent state, and customer-like exports | Exclude | Private, machine-specific, credential-bearing, or operational material. |

## Private or excluded

Environment files, provider credentials, production exports, customer data, booking tokens, private agent state, personal memory, internal prompts, operational logs, generated reports, local provider state, and unreviewed administrative or experimental routes do not belong in the public release tree.

The boundary pass preserved the reviewed historical and ambiguous material outside this repository under `/tmp/roadsmith-boundary-review-2026-10-22/` for this working session. It was not copied into the repository. That session-local path is not a repository dependency or release artifact.

## Review-required material

Historical Mission Control migrations and demo routes still require a final product/runtime review. Internal audit reports, working research, agent workflows, generated diagrams, ambiguous historical specs, and unreviewed design assets were moved outside this candidate during the boundary pass. They are not repository dependencies or release evidence. The dated completion contract was also preserved outside the candidate; the public hygiene check remains the reproducible release gate.

## Approval-gated external blockers

These items require owner approval and access to hosted systems; no external action is performed by local cleanup:

- GitHub: review repository visibility and branch protection, review open dependency alerts, and handle any provider-like credentials found in history through the provider owners and an approved history-rotation procedure.
- Supabase: reconcile live migration history and schema drift, then verify authentication, tenant isolation, and RLS against the linked project before any migration or production-data change.
- Vercel and Stripe: verify the canonical project/hostname, environment-variable ownership, deployment health, and Stripe API/version compatibility before release or billing changes.

## Historical credentials

Repository history contains provider-like credential references identified during the audit. No values are reproduced here. Affected providers must be reviewed and rotated by their owner before visibility changes; history rewriting is a separate approved security procedure.

# Public-release boundary

This repository is being prepared for a future public GitHub release. GitHub remains private until the release gate passes.

## Public by default

Product source, tests, safe schema documentation, reconciled migrations, public workflow and architecture documentation, CI, safe examples, and screenshots verified to contain no private information belong in the public tree.

## Private or excluded

Environment files, provider credentials, production exports, customer data, booking tokens, private agent state, personal memory, internal prompts, operational logs, generated reports, local provider state, and unreviewed administrative or experimental routes do not belong in the public release tree.

The cleanup preserved pre-existing private and ambiguous material outside this repository under `/tmp/roadsmith-cleanup-baseline/preserved-private/` for this working session. It was not copied into the repository. That session-local path is not a repository dependency or release artifact.

## Review-required material

Historical Mission Control migrations, demo routes, and generated-looking public images still require a final public-content review. They are not automatically declared safe merely because they are tracked or build successfully. Internal audit reports, working research, agent workflows, generated diagrams, and most ambiguous historical specs were preserved outside the repository for review. The retained `archive/SPEC_FULL_REDESIGN.md` is an explicit review candidate: it contains product/design history, but is not required by the runtime and is not declared part of the public release until reviewed. The dated completion contract remains only to support the required local verifier.

## Approval-gated external blockers

These items require owner approval and access to hosted systems; no external action is performed by local cleanup:

- GitHub: review repository visibility and branch protection, review open dependency alerts, and handle any provider-like credentials found in history through the provider owners and an approved history-rotation procedure.
- Supabase: reconcile live migration history and schema drift, then verify authentication, tenant isolation, and RLS against the linked project before any migration or production-data change.
- Vercel and Stripe: verify the canonical project/hostname, environment-variable ownership, deployment health, and Stripe API/version compatibility before release or billing changes.

## Historical credentials

Repository history contains provider-like credential references identified during the audit. No values are reproduced here. Affected providers must be reviewed and rotated by their owner before visibility changes; history rewriting is a separate approved security procedure.

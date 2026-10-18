# Public-release boundary

This repository is a reviewer-facing public release candidate. Production use,
hosted-service changes, and any broader release remain gated until the checks
below are resolved.

## Public by default

Product source, tests, safe schema documentation, reconciled migrations, public workflow and architecture documentation, CI, safe examples, and screenshots verified to contain no private information belong in the public tree.

## Private or excluded

Environment files, provider credentials, production exports, customer data, booking tokens, private agent state, personal memory, internal prompts, operational logs, generated reports, local provider state, and unreviewed administrative or experimental routes do not belong in the public release tree.

Private and ambiguous material from the source worktree was not copied into this release repository. No local backup path is part of the release artifact.

## Review-required material

Historical migrations, demo routes, and generated-looking public images still
require a final public-content review. They are not automatically declared safe
merely because they are tracked or build successfully. Ambiguous historical
specifications are context only and are not part of the primary reviewer path.

## Approval-gated external blockers

These items require owner approval and access to hosted systems; no external action is performed by local cleanup:

- GitHub: review repository visibility, branch protection, and dependency alerts as part of ongoing maintenance.
- Supabase: reconcile live migration history and schema drift, then verify authentication, tenant isolation, and RLS against the linked project before any migration or production-data change.
- Vercel and Stripe: verify the canonical project/hostname, environment-variable ownership, deployment health, and Stripe API/version compatibility before release or billing changes.

## History and provider review

A clean local scan is useful evidence, but it does not replace provider-owner
review of credentials, access, deployment settings, or historical commits.
Environment variable names in `.env.example` are placeholders only; no
credential values are included. Hosted credentials and provider administration
remain outside this repository.

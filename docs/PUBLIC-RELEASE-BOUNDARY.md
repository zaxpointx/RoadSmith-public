# Public-release boundary

This repository is being prepared for a future public GitHub release. GitHub remains private until the release gate passes.

## Public by default

Product source, tests, safe schema documentation, reconciled migrations, public workflow and architecture documentation, CI, safe examples, and screenshots verified to contain no private information belong in the public tree.

## Private or excluded

Environment files, provider credentials, production exports, customer data, booking tokens, private agent state, personal memory, internal prompts, operational logs, generated reports, local provider state, and unreviewed administrative or experimental routes do not belong in the public release tree.

Private and ambiguous material from the source worktree was not copied into this release repository. No local backup path is part of the release artifact.

## Review-required material

Historical Mission Control migrations, demo routes, and generated-looking public images still require a final public-content review. They are not automatically declared safe merely because they are tracked or build successfully. Internal audit reports, working research, agent workflows, generated diagrams, and most ambiguous historical specs were preserved outside the repository for review. The retained `archive/SPEC_FULL_REDESIGN.md` is an explicit review candidate: it contains product/design history, but is not required by the runtime and is not declared part of the public release until reviewed. The dated completion contract remains only to support the required local verifier.

## Approval-gated external blockers

These items require owner approval and access to hosted systems; no external action is performed by local cleanup:

- GitHub: review repository visibility, branch protection, and dependency alerts before publication.
- Supabase: reconcile live migration history and schema drift, then verify authentication, tenant isolation, and RLS against the linked project before any migration or production-data change.
- Vercel and Stripe: verify the canonical project/hostname, environment-variable ownership, deployment health, and Stripe API/version compatibility before release or billing changes.

## Credential status

This fresh-history release contains no credential-shaped values. Environment variable names in `.env.example` are placeholders only; no credential values are included. Hosted credentials and provider administration remain outside this repository.

# Release-readiness follow-up contracts

This document turns the unresolved release-review items into approval-ready
work contracts. It does not authorize hosted changes, production data access,
credential handling, or product behavior changes.

## Contract A — hosted schema and migration reconciliation

**Destination:** establish whether the local migration inventory and the
intended hosted schema can be reconciled safely.

**Allowed paths:** a private maintenance workspace, the approved schema
review, and sanitized updates to `supabase/SCHEMA_DRIFT.md` or
`docs/INTERNSHIP_REVIEW.md`.

**Required evidence:** owner-confirmed project, backup and rollback plan,
remote migration inventory, schema/RLS/auth review, and an explicit decision
on the ambiguous `public.safe_increment_seats` function.

**Forbidden:** production migrations, policy/auth/data changes, credentials or
production exports in this repository, and speculative local SQL changes.

**Approval:** database owner approval before any hosted read/write action.

## Contract B — Supabase type-source decision

**Destination:** decide whether `src/lib/supabase/types.ts` remains a reviewed
application-facing type surface or is replaced from an approved schema source.

**Allowed paths:** `src/lib/supabase/types.ts`, affected route tests, and a
sanitized decision record after Contract A has evidence.

**Acceptance:** every changed type has a reviewed schema source; tenant,
authorization, and nullable-field assumptions are tested; no type is inferred
from an unresolved hosted mismatch.

**Forbidden:** generating replacement types from an unverified production
schema or changing RLS/auth behavior as a side effect.

## Contract C — credential-dependent browser coverage

**Destination:** obtain approved non-production runtime access and convert the
currently unavailable booking/admin flows into meaningful browser evidence.

**Allowed paths:** local Playwright configuration, `e2e/`, and sanitized test
fixtures. Credentials must come from the approved secret mechanism.

**Acceptance:** Chromium can launch in the authorized environment; the six
discovered tests report explicit pass/skip/fail counts; credential-dependent
failures are distinguishable from harness failures.

**Forbidden:** production credentials, customer data, hosted writes, or
weakening/skipping assertions to make the gate pass.

## Contract D — dependency and historical-content review

**Destination:** owner-approved disposition for dependency alerts and
credential-like content reachable in Git history.

**Allowed paths:** private GitHub/security review and sanitized updates to the
owner ledger.

**Acceptance:** each alert has an owner and remediation decision; any history
remediation has a backup, communication, and rollback plan.

**Forbidden:** dependency downgrades, weakened scanners, history rewriting in
this worktree, force-pushes, or public release before the decision is recorded.

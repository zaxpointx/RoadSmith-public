# Schema drift — hosted migration history is not fully represented locally

**Status:** open. Repo is not the source of truth for schema.

## What is in production

The hosted database has migrations that are not represented in this checkout:

| Version | Name |
|---|---|
| 20260605155305 | multi_school_architecture |
| 20260605204414 | roa_206_tenant_isolation_rls |
| 20260611021842 | add_project_and_status_columns_to_mc_tasks |
| 20260617192116 | mc_goals_table |
| 20260625220825 | tighten_mc_table_rls |
| 20260625220843 | tighten_mc_insert_policies |
| 20260702142029 | school_growth_metrics_view |
| 20260714204209 | fix_tenant_users_auth_exposure |
| 20260714204319 | fix_security_definer_views_and_functions |
| 20260714204326 | fix_membership_audit_insert_and_stripe_events_rls |
| 20260714204357 | revoke_public_function_execute_and_rls_stripe_events |
| 20260714204422 | switch_helper_functions_to_invoker |

## What is in the repo

`supabase/migrations/` has only:

```
20260701120000_pricing_tier_count_helpers.sql
```

This is a helper function, not a real schema migration. The Supabase CLI
warns on every operation:

> The remote database's migration history does not match local files in
> supabase/migrations directory.

> The "MIGRATIONS_FAILED" status on the production branch is the visible
> symptom. The DB itself is healthy.

## How to fix

Reconcile the hosted migration history in a private, owner-approved
maintenance session. Use a temporary database connection supplied through the
approved secret store, back up the local migration directory, reconstruct the
missing migration files, review them, and only then decide whether a migration
push is appropriate. Do not place connection strings, passwords, service-role
keys, or production exports in this repository.

## Why this happened

The 11 missing migrations were applied to production during live work
between 2026-06-05 and 2026-07-14 (mostly the multi-school architecture
and the 2026-07-14 tenant-isolation/RCS hardening). The migration files
were never committed to this repo. The author at the time was working
in a different environment (likely the `feature/agent-scott-llm` branch
or another worktree) and the migration files were not in the snapshot
that landed on `main`.

## Prevention

- Add a CI check that runs `supabase migration list --linked` and fails
  if the remote has versions not present locally.
- Add a reviewed migration verification step to the deploy pipeline.
- Keep migrations one-PR-per-file. Do not bundle schema changes with
  feature work.

# Database

Roadsmith uses Supabase (Postgres, Auth, Row Level Security). The hosted database is currently the schema source of
truth while migration history is reconciled; see [`supabase/SCHEMA_DRIFT.md`](../supabase/SCHEMA_DRIFT.md).

## Where schema information lives

| Location | Purpose |
| --- | --- |
| [`ACTUAL_SCHEMA.md`](../ACTUAL_SCHEMA.md) | Fields the runtime expects. Read before writing any query. |
| `src/lib/supabase/` | Supabase clients and generated TypeScript types |
| `supabase/migrations/` | Current migration folder (helper functions and a historical schema kept for reconciliation) |
| `src/lib/migrations/` | Legacy numbered history, kept for reference and not applied automatically |
| `supabase/scripts/pending/` | Reviewed SQL not yet applied |
| `supabase/functions/` | Supabase Edge Functions |

## Rules for schema work

- New migrations go in `supabase/migrations/` as `YYYYMMDDHHMMSS_name.sql`, one migration per pull request, with no
  feature code bundled.
- Every new tenant table has `school_id UUID NOT NULL` and RLS scoped to school membership.
- Do not run migrations against a hosted database from a contributor machine, and never commit connection strings.
- Tables prefixed `mc_` are leftovers from an abandoned experiment and are not part of the product. Do not build on them.

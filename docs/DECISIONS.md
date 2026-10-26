# Decisions log

Short records of choices a future contributor would otherwise have to rediscover. Newest first. Website visual rules
live in [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md).

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10 | Engineering docs live under `docs/` (Development, Testing, Deployment, Database, this log); the root keeps README, CONTRIBUTING, SECURITY, CHANGELOG, LICENSE, SPEC, ACTUAL_SCHEMA. | One predictable place to look; root files stay where tools expect them. |
| 2026-10 | `docs/TESTING.md` is the single list of required checks and mirrors CI. | Avoids command lists drifting apart across docs. |
| 2026-10 | Merging to `main` is the production deploy; only the maintainer merges. | Keeps releases deliberate and reviewable. |
| 2026-10 | The hosted database is the schema source of truth until migration drift is reconciled. | See `supabase/SCHEMA_DRIFT.md`. |
| 2026-10 | Operator approval is required before a scheduling proposal becomes a booking. | Product safety boundary (see WORKFLOWS.md). |
| 2026-10 | Software is proprietary (all rights reserved). | See LICENSE. |

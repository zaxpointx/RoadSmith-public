# Decisions log

Short records of choices a future contributor would otherwise have to rediscover. Newest first. Website visual rules
live in [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md).

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11 | The product's core is Roadsmith OS: an SMS-first assistant plus an owner Control Center, in a separate `rs` Postgres schema with server-only access. | Matches the founder's intent (results, not another tool); a clean schema avoids the unresolved drift in the earlier tables. |
| 2026-11 | AI only converses; scheduling, money, permissions and records are deterministic code behind permission-checked tools. Replies are grounding-checked. | Agents must not invent availability, double-book, misstate payments or leak data. |
| 2026-11 | The local sandbox runs PGlite (Postgres in WASM) with the same migration as production. | Real constraints (exclusion, row locks) in a zero-setup demo; no Docker or hosted project needed. |
| 2026-11 | Claude via a self-hosted Messages API tool loop (default `claude-opus-5-5`, low effort), with a deterministic interpreter when no key is set. | Tools must run inside our tenant boundary and replies must pass the grounding check; the demo must work without keys. |
| 2026-11 | Every outbound text goes through a transactional outbox; STOP/START/HELP and quiet hours are handled by code. | No texts from rolled-back work; carrier compliance can't depend on a model. |
| 2026-10 | Engineering docs live under `docs/` (Development, Testing, Deployment, Database, this log); the root keeps README, CONTRIBUTING, SECURITY, CHANGELOG, LICENSE, SPEC, ACTUAL_SCHEMA. | One predictable place to look; root files stay where tools expect them. |
| 2026-10 | `docs/TESTING.md` is the single list of required checks and mirrors CI. | Avoids command lists drifting apart across docs. |
| 2026-10 | Merging to `main` is the production deploy; only the maintainer merges. | Keeps releases deliberate and reviewable. |
| 2026-10 | The hosted database is the schema source of truth until migration drift is reconciled. | See `supabase/SCHEMA_DRIFT.md`. |
| 2026-10 | Operator approval is required before a scheduling proposal becomes a booking. | Product safety boundary (see WORKFLOWS.md). |
| 2026-10 | Software is proprietary (all rights reserved). | See LICENSE. |

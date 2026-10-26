# Roadsmith documentation

This directory is the starting point for reviewers and contributors. Use this
index to find the current authority for a question.

## Start here

1. [`../README.md`](../README.md) — product overview, reviewer quick start, and local demo.
2. [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution and verification workflow.
3. [`INTERNSHIP_REVIEW.md`](INTERNSHIP_REVIEW.md) — reviewer reading path, inventory, sanitization record, and unresolved decisions.
4. [`REPOSITORY-MAP.md`](REPOSITORY-MAP.md) — current repository map.
5. [`../AGENTS.md`](../AGENTS.md) — short guide for coding agents (setup, checks, where code goes).

## Engineering guides

| Doc | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System diagram, code layout, integration boundaries |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local setup, scripts, environment variable names, conventions |
| [TESTING.md](TESTING.md) | Required checks (mirrors CI), unit and end-to-end tests |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Preview and production flow |
| [DATABASE.md](DATABASE.md) | Schema sources and rules for migrations |
| [DECISIONS.md](DECISIONS.md) | Short log of architecture and process decisions |
| [WORKFLOWS.md](WORKFLOWS.md) | Product workflows |

## Authority map

| Question | Current authority | Status |
| --- | --- | --- |
| Repository safety and public boundary | [`PUBLIC-RELEASE-BOUNDARY.md`](PUBLIC-RELEASE-BOUNDARY.md) and [`../SECURITY.md`](../SECURITY.md) | Current guidance |
| Human contribution workflow | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Authoritative |
| Application architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) | Current guidance |
| Repository navigation | [`REPOSITORY-MAP.md`](REPOSITORY-MAP.md) | Current guidance; verify paths before relying on them |
| Product workflows | [`WORKFLOWS.md`](WORKFLOWS.md) | Current product guidance |
| Verification expectations | [`TESTING.md`](TESTING.md) (commands) and [`VERIFICATION-MATRIX.md`](VERIFICATION-MATRIX.md) | Current guidance |
| Security and public-release boundary | [`PUBLIC-RELEASE-BOUNDARY.md`](PUBLIC-RELEASE-BOUNDARY.md) and [`../SECURITY.md`](../SECURITY.md) | Current security guidance |
| Database schema and migrations | [`../ACTUAL_SCHEMA.md`](../ACTUAL_SCHEMA.md), [`../supabase/SCHEMA_DRIFT.md`](../supabase/SCHEMA_DRIFT.md), and tracked migrations | Owner decision required; currently divergent |
| Review inventory and open decisions | [`INTERNSHIP_REVIEW.md`](INTERNSHIP_REVIEW.md) | Current review record |

## Document status labels

- **Authoritative** — agents should follow this unless a newer approved decision supersedes it.
- **Current guidance** — useful operating guidance, but verify it against code and configuration.
- **Read-only audit** — evidence and recommendations; not an implementation authorization.
- **Historical** — context only; do not treat it as current requirements.
- **Owner decision required** — unresolved and unsafe to infer.

## Important rule

If two documents disagree, do not guess. Identify the conflict and stop for an
owner decision when resolving it would change application behavior, database
behavior, hosted settings, credentials, billing, or production operations.

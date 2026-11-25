# Changelog

## Unreleased

- Roadsmith OS: SMS-first assistant for families, instructors and owners; travel-aware scheduling engine with database-enforced no-double-booking; course seats with next-class offers; payment holds, test checkout and Stripe Checkout; reminders, hold expiry, quiet hours and 7am briefs; cohort drive-time planning; owner inbox with approvals; Control Center (Today, Conversations, Schedule, Students, Playbook, Activity); audit log; Twilio and Stripe webhooks; local PGlite sandbox and phone simulator. See docs/OS.md.
- New marketing site centred on the text-message front desk.
- Industry, competitor and compliance research (docs/research/).
- Fixed the completion verifier's broken evidence references (8 failing unit tests).

- Docs: engineering guides for development, testing, deployment, database, and decisions; architecture diagram and code map; docs index and README quickstart updated; CONTRIBUTING points to a single check list.
- Marked reserved environment variables in `.env.example`.
- Repository boundary cleanup for a reviewer-facing public release candidate.
- Public documentation for architecture, workflows, local setup, security, and contribution guidance.
- Public-release checks for tracked private paths, environment files, credential-shaped values, and diff hygiene.

Roadsmith is still pre-release. Product capabilities and deployment identity remain subject to verification; see the README and `docs/PUBLIC-RELEASE-BOUNDARY.md`.

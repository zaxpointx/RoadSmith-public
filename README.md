# Roadsmith

Roadsmith is a white-label booking and operations platform for driving schools. It helps a school collect parent-first intake, account for time and travel, route feasible scheduling proposals to an operator for approval, collect payment, confirm bookings, send reminders, handle rescheduling, and record post-lesson notes.

> Roadsmith is pre-release software. The public demo uses synthetic data and does not represent production readiness.

## Start here: the reviewer path

1. [Open the live synthetic operator-review demo](https://roadsmith-phi.vercel.app/demo/operator-review).
2. Inspect the evidence, switch to incomplete evidence, and choose a simulated outcome.
3. Read the [technical review handoff](docs/INTERNSHIP_REVIEW.md) and [STEM Academy project brief](docs/STEM_ACADEMY_REVIEW.md).
4. Use the [current capability status](docs/PROJECT_STATUS.md) to separate implemented, simulated, integration-present, experimental, planned, and blocked work.

The fastest way to understand Roadsmith is to follow that sequence, then read the implementation behind the `src/lib/workflow-watchdog/` boundary. The demo is synthetic and side-effect-free; it does not prove production payment correctness, tenant isolation, provider delivery, or government-form submission.

## Live demo

Open the hosted synthetic operator-review demo: [roadsmith-phi.vercel.app/demo/operator-review](https://roadsmith-phi.vercel.app/demo/operator-review).

No installation, account, API key, or localhost server is required. The demo shows how Roadsmith evaluates a proposed lesson, presents evidence to an operator, and records simulated decisions without sending messages, charging cards, creating bookings, or writing to a database.

## What it solves

Small driving schools often coordinate instructors, pickup locations, student records, deposits, reminders, and compliance work across calendars, forms, spreadsheets, and payment links. Roadsmith brings those operational steps into one school-scoped workflow while keeping approval and side effects explicit.

## Product workflow

The intended flow is:

1. Parent or student starts intake.
2. Roadsmith captures service, location, availability, and contact information.
3. Travel-aware scheduling evaluates instructor availability and route feasibility.
4. A school operator reviews and approves a proposal.
5. Payment or deposit state is recorded.
6. The appointment becomes a confirmed booking.
7. Reminders, cancellation, and rescheduling use scoped server-side flows.
8. The operator records the lesson outcome and notes.

The operator-approval boundary is intentional: a recommendation is not a confirmed booking, and a payment or email side effect is not assumed to have succeeded without evidence.

## Current status

Implemented areas include the public booking flow, school onboarding, school-admin dashboard, instructors, sessions, calendar, student records, CSV import, Tennessee compliance tracking, demo mode, Stripe integration points, transactional email integration points, and workflow-watchdog tests.

Experimental or review-required areas include newer scheduling and payment orchestration, production migration reconciliation, live RLS verification, and the exact canonical Vercel project/hostname relationship. Historical agent-operator migrations remain for reconciliation but are not part of the public runtime. SMS reminders, complete instructor availability management, government-form submission, and production-grade automation are not claimed as complete.

The repository is being prepared for public review. Public visibility, credential rotation, hosted-service verification, and any Git-history remediation remain approval-gated release work. See [docs/PUBLIC-RELEASE-BOUNDARY.md](docs/PUBLIC-RELEASE-BOUNDARY.md).

## Stack

| Layer | Technology |
| --- | --- |
| Web application | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Data and auth | Supabase, Postgres, RLS, magic-link auth |
| Payments | Stripe |
| Email | Resend |
| Hosting | Vercel |
| Tests | Node unit tests and Playwright/HTTP smoke checks |

## Local setup

Requirements: Node.js 22 or newer, npm, and—when running local Supabase services—Docker.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Put only disposable or approved development credentials in `.env.local`; never commit it. The safe variable names and placeholders are documented in `.env.example`.

Useful checks:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run check:public
```

The end-to-end smoke runner requires a controlled local server and is not a production test:

```bash
npm run test:e2e
```

## Environments and demo

Local, preview, demo, and production credentials must remain separate. The hosted demo is [roadsmith-phi.vercel.app](https://roadsmith-phi.vercel.app/). Do not enter real student, parent, instructor, school, payment, or booking-token data into the demo.

The hosted reviewer path is intentionally limited to `/demo/operator-review`; authenticated product routes may require configured services and are not part of the public demo contract.

## Repository layout

```text
src/                 Next.js application, routes, APIs, domain logic
supabase/             Current migration and function boundary
tests/                Unit and integration-oriented tests
e2e/                  Browser/HTTP smoke checks
scripts/              Verification and product maintenance scripts
docs/                 Architecture, workflows, routes, and product notes
public/               Public assets reviewed for release safety
.github/              CI, issue templates, and pull-request guidance
```

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/WORKFLOWS.md](docs/WORKFLOWS.md), [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md), [docs/PUBLIC-RELEASE-BOUNDARY.md](docs/PUBLIC-RELEASE-BOUNDARY.md), and [docs/INTERNSHIP_REVIEW.md](docs/INTERNSHIP_REVIEW.md) for more detail. The authoritative-file map is in [docs/REPOSITORY_GUIDE.md](docs/REPOSITORY_GUIDE.md).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and verification expectations. See [SECURITY.md](SECURITY.md) before reporting a security issue. Customer data, credentials, provider state, and private agent material do not belong in this repository.

## License

Roadsmith is proprietary software. See [LICENSE](LICENSE). Public visibility, if approved later, does not grant permission to use, copy, modify, or redistribute the software.

# RoadSmith

RoadSmith is a white-label booking and operations platform for driving schools. It helps a school collect parent-first intake, account for time and travel, route feasible scheduling proposals to an operator for approval, collect payment, confirm bookings, send reminders, handle rescheduling, and record post-lesson notes.

> RoadSmith is pre-release software. This public repository is a reviewer-facing release candidate, not a production deployment.

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

This repository is an internship-review release candidate, not a production-ready deployment.

### Working now

Implemented areas include the public booking flow, school onboarding, school-admin dashboard, instructors, sessions, calendar, student records, CSV import, Tennessee compliance readiness tracking, demo mode, Stripe integration points, transactional email integration points, and workflow-watchdog tests.

### Demonstrable locally

The operator-review demo runs against synthetic fixtures, evaluates four safety detectors, records an approval decision, and produces no external side effects. See [DEMO.md](DEMO.md) for the five-minute path.

The reviewer story is intentionally ordered as: parent inquiry → travel-aware lesson proposal → evidence review → owner decision → explicitly simulated handoff. The homepage links directly into that walkthrough at `/demo`.

### Experimental

Newer scheduling and payment orchestration, production migration reconciliation, live RLS verification, and the exact canonical Vercel project/hostname relationship require review.

### Not implemented or partial

Government-form generation and submission, SMS reminders, complete instructor availability management, and production-grade automation are not claimed as complete. Historical agent-operator migrations remain for reconciliation but are not part of the public runtime.

### Requires production hardening

Hosted schema parity, tenant-isolation verification, dependency remediation, provider failure handling, observability, and deployment ownership must be resolved before production use.

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

## Hosted reviewer path

Start here—no install, credentials, or local services are required:

- [Open the verified live homepage](https://roadsmith-phi.vercel.app/)
- [Open the verified live operator-review demo](https://roadsmith-phi.vercel.app/demo/operator-review)

The hosted operator-review path uses synthetic fixtures and is side-effect-free. It walks through parent intake, a travel-aware candidate lesson, four bounded detectors, evidence review, an owner decision, and an explicitly simulated handoff. It does not send messages, charge cards, change calendars, create bookings, call Maps or other providers, mutate Supabase, or persist production data. Approval and follow-up controls update only local page state and show `sideEffects: []`.

The hosted URL is the current deployed state. This repository change does not update or deploy that hosted page.

## Optional local developer path

Requirements: Node.js 22.6 or newer, npm, and Docker only when running local Supabase services.

```bash
npm ci
cp .env.example .env.local   # variable names only; fill with development values if needed
npm run dev                  # http://localhost:3000
```

Put only disposable development credentials in `.env.local`; never commit it.

Required checks are listed once in [docs/TESTING.md](docs/TESTING.md) and match CI. Scripts and environment variable groups are in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

**Engineering docs:** [Index](docs/README.md) · [Architecture](docs/ARCHITECTURE.md) · [Development](docs/DEVELOPMENT.md) · [Testing](docs/TESTING.md) · [Deployment](docs/DEPLOYMENT.md) · [Database](docs/DATABASE.md) · [Decisions](docs/DECISIONS.md)

## Environments and demo

Local, preview, demo, and production credentials must remain separate. For
review, use the hosted path above and [DEMO.md](DEMO.md). Local setup is only
for developers who need to inspect or change the code. Do not enter real
student, parent, instructor, school, payment, address, or booking-token data
into the hosted or local demo.

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

For the complete reviewer path, start with [DEMO.md](DEMO.md), then
[docs/ENGINEERING-HIGHLIGHTS.md](docs/ENGINEERING-HIGHLIGHTS.md),
[docs/INTERNSHIP_REVIEW.md](docs/INTERNSHIP_REVIEW.md),
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/WORKFLOWS.md](docs/WORKFLOWS.md), and
[docs/PUBLIC-RELEASE-BOUNDARY.md](docs/PUBLIC-RELEASE-BOUNDARY.md). `SPEC.md`
and historical specifications are planning context, not a list of completed
product claims.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and verification expectations. See [SECURITY.md](SECURITY.md) before reporting a security issue. Customer data, credentials, provider state, and private agent material do not belong in this repository.

## License

Roadsmith is proprietary software. See [LICENSE](LICENSE). Public visibility does not grant permission to use, copy, modify, or redistribute the software.

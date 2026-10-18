# Roadsmith

Roadsmith is a white-label booking and operations platform for driving schools. It helps a school collect parent-first intake, account for time and travel, route feasible scheduling proposals to an operator for approval, collect payment, confirm bookings, send reminders, handle rescheduling, and record post-lesson notes.

> Roadsmith is pre-release software. This public repository is a reviewer-facing release candidate, not a production deployment.

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

Local, preview, demo, and production credentials must remain separate. The
reproducible review path is the local operator-review demo in [DEMO.md](DEMO.md);
no hosted demo is required. Do not enter real student, parent, instructor,
school, payment, or booking-token data into the demo.

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

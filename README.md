# Roadsmith

Roadsmith is a white-label booking and operations platform for driving schools. It helps a school collect parent-first intake, account for time and travel, route feasible scheduling proposals to an operator for approval, collect payment, confirm bookings, send reminders, handle rescheduling, and record post-lesson notes.

> Roadsmith is pre-release software. The repository is private while security, hosted-service alignment, and public-content review are completed.

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

Implemented areas include the public booking flow, school onboarding, school-admin dashboard, instructors, sessions, calendar, student records, CSV import, Tennessee compliance readiness tracking, demo mode, Stripe integration points, transactional email integration points, and workflow-watchdog tests. Government-form generation and submission remain partial.

Experimental or review-required areas include newer scheduling and payment orchestration, production migration reconciliation, live RLS verification, and the exact canonical Vercel project/hostname relationship. Historical agent-operator migrations remain for reconciliation but are not part of the public runtime. SMS reminders, complete instructor availability management, government-form submission, and production-grade automation are not claimed as complete.

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

Local, preview, demo, and production credentials must remain separate. The preferred disposable demo hostname is [roadsmith-phi.vercel.app](https://roadsmith-phi.vercel.app/). Do not enter real student, parent, instructor, school, payment, or booking-token data into the demo.

The canonical Vercel project and hostname are still release-gate decisions. The `roadsmith-ebqr` project is treated as secondary until its role is verified.

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

For the complete reviewer path, start with [docs/INTERNSHIP_REVIEW.md](docs/INTERNSHIP_REVIEW.md), then read [SPEC.md](SPEC.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/WORKFLOWS.md](docs/WORKFLOWS.md), and [docs/PUBLIC-RELEASE-BOUNDARY.md](docs/PUBLIC-RELEASE-BOUNDARY.md). Historical specifications are retained under `archive/`.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and verification expectations. See [SECURITY.md](SECURITY.md) before reporting a security issue. Customer data, credentials, provider state, and private agent material do not belong in this repository.

## License

Roadsmith is proprietary software. See [LICENSE](LICENSE). Public visibility, if approved later, does not grant permission to use, copy, modify, or redistribute the software.

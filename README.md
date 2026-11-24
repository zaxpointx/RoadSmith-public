# Roadsmith

Roadsmith is an AI front desk for driving schools that works by text message. Parents, students, instructors and the owner text the school's number in plain English. Roadsmith answers questions, enrolls students, books lessons around real drive times, collects payments, sends reminders, reschedules and keeps instructors on schedule. The owner gets results and a short list of decisions, not another dashboard to operate.

> Pre-release. Everything below runs locally in a synthetic sandbox; going live needs the accounts listed under [Before onboarding a real school](docs/OS.md#before-onboarding-a-real-school).

## Try it in two minutes

```bash
npm ci
npm run dev
```

- **http://localhost:3000/sandbox** — text the demo school as a parent, student, instructor or owner
- **http://localhost:3000/app** — the owner's Control Center (one click into the demo)

No keys, accounts or database are needed: the sandbox runs real Postgres in-process (PGlite) with a fictional school, and nothing leaves your machine. Follow [DEMO.md](DEMO.md) for the 10-minute journey from a parent's first text to payment, instructor coordination and the owner's approvals.

## How it works

- **AI for conversation, ordinary software for anything exact.** The assistant (Claude when `ANTHROPIC_API_KEY` is set, otherwise a built-in interpreter) can act only through permission-checked tools bound to one school and one person.
- **Scheduling is deterministic and travel-aware.** It checks instructor hours, time off, classes and holidays, plus the drive from the previous pickup. Postgres exclusion constraints make double-booking impossible.
- **Nothing is "paid" until the payment provider says so.** Holds expire on their own; late payments go to the owner.
- **Owners set the autonomy.** Each kind of decision is set to handle it, ask me first or send to me. Refunds, late changes and anything sensitive come to the owner.
- **Everything is audited.** Every action records who or what did it.

Architecture, safety model, verification status and go-live checklist: **[docs/OS.md](docs/OS.md)**. Industry and compliance research: [docs/research/INDUSTRY-RESEARCH.md](docs/research/INDUSTRY-RESEARCH.md).

## Earlier modules

The repository also contains the earlier Supabase-backed school-admin dashboard (`/school-admin`), public booking pages (`/book`), instructor pages and the operator-review demo (`/demo`). They need a configured hosted Supabase project and are not part of the new Roadsmith OS runtime; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Stack

| Layer | Technology |
| --- | --- |
| Web application | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Data and auth | Postgres (`rs` schema; Supabase in production, PGlite in the local sandbox), signed sessions, Supabase magic-link auth |
| Conversation | Claude via the Anthropic Messages API (tool use), with a built-in rule-based fallback |
| Texting | Twilio Messaging (sandbox outbox locally) |
| Payments | Stripe Checkout (test checkout locally) |
| Email | Resend (earlier modules) |
| Hosting | Vercel |
| Tests | Node unit tests and Playwright/HTTP smoke checks |

## Earlier hosted demo

The previously deployed operator-review demo (it predates Roadsmith OS and is not updated by this repository):

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

**Engineering docs:** [Index](docs/README.md) · [Roadsmith OS](docs/OS.md) · [Architecture](docs/ARCHITECTURE.md) · [Development](docs/DEVELOPMENT.md) · [Testing](docs/TESTING.md) · [Deployment](docs/DEPLOYMENT.md) · [Database](docs/DATABASE.md) · [Decisions](docs/DECISIONS.md)

## Environments and demo

Local, preview, demo, and production credentials must remain separate. For
review, use the local sandbox and [DEMO.md](DEMO.md). Local setup is only
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

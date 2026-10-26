# Development

## Requirements

- Node.js 22.6 or newer (`engines` in package.json; CI uses Node 22). Unit tests use `--experimental-strip-types`, which older Node versions lack.
- npm. The lockfile is `package-lock.json`; use `npm ci` for reproducible installs.
- Docker only if you run local Supabase services. It is not needed for lint, typecheck, tests, or build.

## Setup

```bash
npm ci
cp .env.example .env.local   # optional for checks; needed for a working dev server
npm run dev                  # http://localhost:3000
```

Lint, typecheck, unit tests, and build need no environment values. Public pages render without them;
authenticated routes, booking, payments, and email need Supabase, Stripe, and Resend values in `.env.local`.
Use disposable development credentials only, and never commit `.env.local`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build (`next build --webpack`) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint over `src`, `e2e`, `scripts` |
| `npm run typecheck` | `next typegen` then `tsc --noEmit` |
| `npm test` / `npm run test:unit` | Node test runner over `tests/unit/*.test.mjs` |
| `npm run test:e2e` | Playwright smoke tests in `e2e/` (starts its own server) |
| `npm run check:public` | Public-release hygiene scan (private paths, env files, credential-shaped values) |
| `npm run check:docs` | Fails on broken relative links in tracked Markdown files |
| `npm run check:history` | Scans Git history for credential-shaped values |
| `npm run check:dependencies` | Development-dependency security monitor |
| `npm run verify:completion` | Completion verifier (`scripts/reliability/`) |

## Environment variables

Names and safe placeholders live in [`.env.example`](../.env.example). When code reads a new
`process.env.X`, add `X` to `.env.example` in the same pull request.

| Group | Variables |
| --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STARTER_PRICE_ID` (plus reserved `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_GROWTH_PRICE_ID`) |
| Email (Resend) | `RESEND_API_KEY`, `CONTACT_EMAIL`, `SUPPORT_EMAIL` |
| Google Calendar | `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI` |
| App | `NEXT_PUBLIC_APP_URL`, `ENCRYPTION_KEY`, `CRON_SECRET`, `SEED_SECRET`, `DEMO_MODE`, `DEMO_SCHOOL_ID` |
| Test only | `BASE_URL`, `RUN_DEMO_E2E` (Playwright) |

## Conventions

- Branch off `main`; keep one focused change per pull request and use the PR template.
- TypeScript strict. Use the server-side Supabase client (`src/lib/supabase/`) for privileged reads.
- Next.js 16 has breaking changes; check the bundled docs in `node_modules/next/dist/docs/` before using framework APIs.
- The build notes that `middleware.ts` is called "Proxy" in Next.js 16. The rename is a planned follow-up.

# Roadsmith: guide for coding agents

Roadsmith is a scheduling, booking, and compliance-tracking app for driving schools
(Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Supabase, Stripe, Resend).
This file is a short map. The docs in `docs/` are the system of record; start at
[docs/README.md](docs/README.md).

## Where things are
- Code layout and integration boundaries: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Which folder owns which product area: [docs/REPOSITORY-MAP.md](docs/REPOSITORY-MAP.md)
- Setup, scripts, env var names: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- Required checks (mirrors CI): [docs/TESTING.md](docs/TESTING.md)
- Schema: [ACTUAL_SCHEMA.md](ACTUAL_SCHEMA.md) and [docs/DATABASE.md](docs/DATABASE.md)
- What may and may not be in this public repo: [docs/PUBLIC-RELEASE-BOUNDARY.md](docs/PUBLIC-RELEASE-BOUNDARY.md)

## Setup
Node 22.6+ (`engines` in package.json), npm.

    npm ci
    cp .env.example .env.local   # optional; only needed for a working dev server
    npm run dev                  # http://localhost:3000

Lint, typecheck, unit tests, and build need no env values.

## Checks (run before you say done; CI runs all of them)
    npm run typecheck
    npm run lint
    npm test                # unit tests in tests/unit/*.test.mjs
    npm run build
    npm run check:public    # public-tree hygiene and credential-shaped values
    npm run check:history   # credential scan of Git history
    npm run check:docs      # broken relative links in Markdown
    npm run check:dependencies
    npm run test:e2e        # Playwright; run `npx playwright install chromium` once
If you can't run a check, say so. A test command that finds zero tests is a failure.

## Adding an API route
Route handlers live in `src/app/api/<name>/route.ts` (App Router). Put business logic in
`src/lib/`, validate input, keep school (tenant) scoping explicit, and add a unit test in
`tests/unit/`. `src/app/api/contact/route.ts` with `tests/unit/contact.test.mjs` is a small example.
Next.js 16 differs from older versions; read `node_modules/next/dist/docs/` before using framework APIs.

## Rules
- Work on a branch off `main`, one focused change per PR, fill in the PR template.
- Never commit `.env*` files, keys, customer data, or real hosted-project identifiers.
- New `process.env.X` reads need `X` added to `.env.example` in the same PR.
- New migrations go in `supabase/migrations/`; don't run them against a hosted database.
- Before reporting: `git diff --check`, review the full diff, `git status --short`.

# Testing

This is the single list of checks. Other docs link here.

## Required before a pull request

These match `.github/workflows/ci.yml`:

```bash
npm ci
npm run typecheck
npm run check:public                      # public-release hygiene scan
npm run check:docs                        # broken relative links in Markdown docs
npm run check:history                     # credential scan of Git history
npm audit --omit=dev --audit-level=high   # runtime dependencies only
npm run check:dependencies                # development-dependency monitor
npm run lint                              # CI uses --max-warnings=0 on files the PR changes
npm run test:unit
npm run build
npx playwright install chromium           # first time only
npm run test:e2e
git diff --check
```

None of the required checks need real environment values (the optional booking E2E does; see below). CI builds with placeholder Supabase values.

## Unit tests

Plain Node test runner (`node --test`) with `--experimental-strip-types`, files in `tests/unit/*.test.mjs`.
Suites cover the completion verifier, compliance rules, contact handling, signed requests, the workflow watchdog, and Roadsmith OS (`os-engine.test.mjs`: scheduling, travel, double-booking, seats, payments, holds, drive plans, quiet hours; `os-review-fixes.test.mjs`: regressions for the independent review; `os-agent.test.mjs`: tenant and family isolation, role limits, offered-options-only booking, STOP/HELP, escalation, grounding, the Claude loop with a fake client). OS tests run against an in-memory Postgres (PGlite) — no services needed.

## End-to-end

`npm run test:e2e` runs the Playwright specs in `e2e/`. Locally it starts `npm run dev`; in CI it serves the built
app. `e2e/homepage-smoke.spec.ts` and `e2e/os-journey.spec.ts` (parent books and pays by text; owner sees it — resets the local sandbox) always run. If Playwright's own Chromium isn't downloaded, set `PLAYWRIGHT_CHROMIUM_PATH` to a local Chromium binary. `e2e/booking-loop.spec.ts` creates demo records and runs only with
`RUN_DEMO_E2E=1` against a configured demo environment. Never point e2e at production data. Set `BASE_URL` to test a
preview deployment.

## Conversation drills

`npm run os:drill -- newparent|course|existing|staff` replays realistic text conversations through the real router against a fresh in-memory sandbox and prints the transcript with the tools each reply used. `npm run os:smoke` prints offered slots, class fill and the owner brief.

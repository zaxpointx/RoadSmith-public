# Testing

This is the single list of checks. Other docs link here.

## Required before a pull request

These match `.github/workflows/ci.yml`:

```bash
npm ci
npm run typecheck
npm run check:public                      # public-release hygiene scan
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

None of these need real environment values. CI builds with placeholder Supabase values.

## Unit tests

Plain Node test runner (`node --test`) with `--experimental-strip-types`, files in `tests/unit/*.test.mjs`.
Suites cover the completion verifier, compliance rules, contact handling, signed requests, and the workflow watchdog.

## End-to-end

`npm run test:e2e` runs the Playwright specs in `e2e/`. Locally it starts `npm run dev`; in CI it serves the built
app. `e2e/homepage-smoke.spec.ts` always runs. `e2e/booking-loop.spec.ts` creates demo records and runs only with
`RUN_DEMO_E2E=1` against a configured demo environment. Never point e2e at production data. Set `BASE_URL` to test a
preview deployment.

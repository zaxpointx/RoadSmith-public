# Verification matrix

Use this matrix to choose evidence for a change. Add focused checks when a behavior is not covered by the existing suite.

## Application behavior

- API behavior: route or integration test through the public request boundary.
- Domain behavior: unit or integration test with independent expected values.
- Authentication and authorization: authorized and unauthorized cases.
- Tenant isolation: non-production database or integration checks; local types are not proof.
- Booking and scheduling: state-transition tests plus browser coverage for critical user paths.
- Payments and webhooks: signature and state-transition tests without live production writes.
- Email and notifications: payload and trigger tests at the integration boundary.

## UI behavior

- Typecheck and lint.
- Browser test for the critical interaction where the harness supports it.
- Rendered-page inspection for layout, responsive behavior, accessibility, and loading or error states.
- Report browser or credential limitations as blocked rather than passing.

## Repository gates

```text
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
npm run check:public
git diff --check
```

`npm run check:migrations` is not currently defined in `package.json`; migration
parity remains a documented owner decision in `supabase/SCHEMA_DRIFT.md`.

Run only relevant checks during a focused change, but run the complete applicable set before declaring the change ready for review. A skipped test is not a pass, and a build does not prove hosted health or tenant isolation.

## Hosted systems

- Vercel: inspect deployment, branch, domain, and environment-target metadata without exposing values.
- Supabase: compare migration and schema metadata; use a safe non-production environment for authenticated and RLS checks.
- Production changes: require explicit approval, a rollback plan, and an exact read-back verification.

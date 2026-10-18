# Roadsmith architecture

Roadsmith is a Next.js application with a single product repository and explicit integration boundaries.

## Runtime boundaries

- `src/app/` contains App Router pages, layouts, and API handlers.
- `src/components/` contains shared UI and domain-facing components.
- `src/lib/` contains domain logic, validation, Supabase clients, payment helpers, email helpers, and security utilities.
- `supabase/` contains the newer migration/function boundary; legacy migration history under `src/lib/migrations/` is retained for reconciliation and must not be treated as automatically applied.
- `tests/` contains unit and integration-oriented checks; `e2e/` contains browser or HTTP smoke checks.
- `scripts/` contains repository verification and product maintenance scripts only.

## Product flow

The intended workflow is parent-first intake → travel-aware scheduling proposal → operator approval → payment → booking → reminders and rescheduling → post-lesson notes. The public booking surface must not imply that an automated proposal is an approved booking until the operator and payment states are explicit.

## Integration boundaries

- Supabase stores tenant-scoped product data and enforces access through authenticated server flows and RLS.
- Stripe handles deposits and subscription billing. Webhooks must verify signatures and remain idempotent.
- Resend handles transactional email. Provider errors must not expose credentials or internal details to callers.
- Vercel hosts the Next.js application. The canonical project and hostname are documented as a deployment decision, not inferred from a successful local build.

## Public-release constraints

Customer data, service-role access, payment secrets, provider state, internal agent operations, and production-only routes are not public documentation. See `SECURITY.md` and `docs/PUBLIC-RELEASE-BOUNDARY.md` for the release boundary and unresolved verification items.

# Security policy

Roadsmith is not yet a public production security program. Until the public-release gate is complete, treat the repository and hosted services as private.

## Do not commit

- `.env` files or secret values
- Supabase service-role or secret keys
- Stripe secret or webhook keys
- Resend credentials
- Customer, student, parent, instructor, or school data
- Booking or confirmation tokens
- Production database exports
- Private agent state, operational logs, or provider configuration

The safe template is `.env.example`. Local credentials belong in an ignored `.env.local` file or the provider's secret store.

## Reporting a vulnerability

Do not open a public issue for a suspected secret, customer-data exposure, authentication bypass, tenant-isolation failure, payment flaw, webhook flaw, or unsafe administrative route. Contact the repository owner privately with a minimal description, affected path or commit, reproduction steps that do not access real data, and the proposed containment.

If a credential may have entered Git history, stop using it and report it for provider-side rotation. Removing the current file does not invalidate a historical credential.

## Security boundaries

Roadsmith uses Supabase RLS, server-side privileged clients, Stripe signature verification, and server-side email integrations. These controls require live configuration review before a public release; a passing local build is not evidence that production tenant isolation or provider configuration is safe.

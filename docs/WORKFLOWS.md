# Public product workflows

## Parent-first booking

1. A parent or student begins intake through a school booking surface.
2. Roadsmith captures the service, location, availability, and contact details required to evaluate a feasible appointment.
3. Travel-aware scheduling considers time, location, instructor availability, and route evidence.
4. The school operator reviews and approves a proposal.
5. Payment or deposit state is recorded before the booking is treated as confirmed.
6. Confirmation, reminder, cancellation, and rescheduling links use scoped tokens and safe server-side validation.
7. The operator records the post-lesson outcome and notes in the authenticated school context.

## Environment separation

Local development uses `.env.local`, which is ignored and must contain disposable or approved development credentials only. `.env.example` contains names and placeholders. Preview and production values belong in the hosting provider's secret store and are not copied into the repository.

## Demo expectations

The demo must use disposable data and a controlled demo session. It must not
expose production students, parents, instructors, booking tokens, Stripe
credentials, Resend credentials, or service-role keys. The supported review
path is the local operator-review demo documented in [`DEMO.md`](../DEMO.md);
no hosted demo is required.

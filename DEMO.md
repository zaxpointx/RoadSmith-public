# Roadsmith demo

This is the fastest way for a reviewer to understand the project. The demo is
read-only with synthetic fixtures: it does not send messages, charge cards,
create bookings, mutate Supabase, call Maps, or contact any provider.

## Local setup

Requirements: Node.js 22 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000/demo/operator-review](http://localhost:3000/demo/operator-review).
No real credentials are required for the synthetic operator-review flow.

## Five-minute walkthrough

1. Open the operator-review page from the homepage, or go directly to the
   route above.
2. Review the normalized parent inquiry: student, pickup location, and
   availability.
3. Review the travel-aware proposed lesson. It is a candidate slot, never a
   booking or confirmation.
4. Inspect the four detector results: travel conflict, duplicate booking,
   payment stall, and unexpected booking state.
5. Review the evidence attached to each result, including any missing
   information and the payment-stall warning.
6. Choose an owner decision. Approval, rejection, dismissal, needs-information,
   and override are all local review outcomes.
7. Inspect the explicitly simulated handoff: payment and booking remain
   unwritten, reminders are only queued in local UI state, and post-lesson notes
   are saved only in the page state.
8. Confirm that the simulated owner approval records a decision while the
   side-effects list remains empty.

The command-line equivalent is:

```bash
node scripts/run-booking-operator-demo.mjs
```

The expected result is four detectors and zero side effects. Unit tests also
cover missing evidence, changed replay input, exact replay deduplication, and
owner overrides.

## What is real and what is simulated

- **Real locally:** the intake normalization, detector logic, evidence model,
  review decision model, and tests.
- **Simulated:** provider events and the demo approval; no real Twilio, Google
  Calendar, Stripe, Maps, Resend, or Supabase calls occur in this path.
- **Partial:** live booking, payments, reminders, compliance submission, hosted
  RLS verification, and production automation require configured non-production
  services and additional hardening.

Do not enter real student, parent, instructor, school, payment, address, or
booking-token data into the demo. Use only synthetic fixtures and disposable
development credentials.

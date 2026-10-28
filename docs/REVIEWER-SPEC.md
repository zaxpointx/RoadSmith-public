# Reviewer-first synthetic demo specification

## Reviewer and one story

The reviewer is an owner-operator or technical reviewer who needs to understand one safe workflow: a parent sends an inquiry, Roadsmith gathers the relevant details, Roadsmith proposes a feasible lesson using travel-aware information, and the owner decides what happens next.

## Fixed vocabulary

- Parent inquiry (never “internal intake record”)
- Roadsmith proposal (never “booking”)
- Owner decision (never “autonomous approval”)
- Needs information (never “incomplete evidence”)
- Enough to review (never “reviewable candidate”)
- Synthetic / no side effects

## Page order and states

1. State the synthetic boundary and the one-sentence story.
2. Show the parent inquiry and the information Roadsmith gathered.
3. Show the Roadsmith proposal and travel-aware feasibility context.
4. Keep supporting evidence collapsed by default; expand it for technical review.
5. Let the owner choose a simulated decision and show the explicit no-side-effect result.
6. Let the reviewer switch to the needs-information state, where Roadsmith asks instead of guessing.

## Fake-data and mobile boundary

All fixtures are synthetic, page state is temporary, and the route must not call payment, calendar, messaging, database, booking, or production providers. The same story must remain legible at narrow/mobile widths with no horizontal overflow and controls large enough to tap.

## Acceptance checks

- Homepage links directly to `/demo/operator-review`.
- The demo visibly names the parent inquiry, Roadsmith proposal, owner decision, and synthetic/no-side-effects boundary.
- The needs-information state is reachable and says Roadsmith is asking instead of guessing.
- A simulated owner decision records locally and visibly keeps side effects empty.
- Supporting evidence is collapsed on first render.
- Desktop and mobile browser checks pass.

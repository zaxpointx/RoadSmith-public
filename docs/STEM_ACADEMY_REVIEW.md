# STEM Academy project brief

Status: reviewer handoff
Updated: 2026-10-20

## Project summary

Roadsmith is a student-led software engineering project that explores how a small driving school could replace disconnected calendars, forms, spreadsheets, payment links, and reminder workflows with one school-scoped operations platform.

The project combines product design, application engineering, data modeling, workflow automation, security boundaries, testing, and deployment. Its public prototype demonstrates an operator reviewing a scheduling recommendation with evidence before a simulated decision is recorded.

## Problem and users

Small driving schools often coordinate parents, students, instructors, lesson capacity, payments, reminders, and compliance paperwork across tools that do not share context. Roadsmith is designed for school owners and operators, with supporting workflows for instructors and parents/students.

The core product question is: how can software make a recommendation useful without pretending that an external side effect has already happened?

## STEM and engineering work demonstrated

- **Computer science:** Next.js routing, React interfaces, TypeScript domain logic, API handlers, authentication boundaries, and test automation.
- **Data and systems:** school-scoped records, booking lifecycle state, Supabase/Postgres integration points, migrations, schema reconciliation, and RLS-aware boundaries.
- **Applied problem solving:** travel-aware scheduling concepts, capacity management, approval seams, compliance readiness, and operational dashboards.
- **Engineering communication:** architecture documentation, workflow descriptions, schema references, release boundaries, tests, and an externally accessible prototype.
- **Iteration:** the repository preserves a progression from product concept and prototype work toward a more explicit, testable operations model.

## Reviewer walkthrough

1. Open the [live synthetic prototype](https://roadsmith-phi.vercel.app/demo/operator-review).
2. Inspect the proposed lesson, bounded detector evidence, and payment-stall warning.
3. Switch to **Incomplete evidence** to see the workflow ask for information instead of guessing.
4. Choose a simulated operator outcome and try the local reminder/note controls.
5. Confirm the persistent disclosure that the experience uses synthetic data and has no external side effects.
6. Read the implementation in `src/lib/workflow-watchdog/` and its unit tests.
7. Read [INTERNSHIP_REVIEW.md](INTERNSHIP_REVIEW.md) for the broader technical walkthrough.
8. Read [PROJECT_STATUS.md](PROJECT_STATUS.md) to distinguish demonstrated behavior from integrations and planned work.

## Evidence and honest limits

The repository provides source code, tests, CI configuration, schema documentation, workflow documentation, and a hosted prototype. These demonstrate engineering work and a coherent product direction.

The project does not claim that the public demo proves production tenant isolation, live payment correctness, provider delivery, government-form submission, or operational readiness. Those require private hosted-system verification and remain release-gated.

Roadsmith is not affiliated with or endorsed by the Appalachian Regional Commission, Oak Ridge National Laboratory, Oak Ridge Associated Universities, or the Appalachian STEM Academy. This document describes the project being submitted for review.

## Questions for an advisor

- Is the operator-approval boundary the right place to separate recommendation from side effect?
- Which domain should be deepened next: scheduling, compliance, payments, or student lifecycle?
- Are the current tests focused on the highest-risk workflows?
- Which evidence would make the project’s technical learning and iteration clearer?
- What should be proven before the product is described as production-ready?

# Contributing to Roadsmith

Roadsmith is a white-label operations platform for driving schools. Contributions should improve the product or its reproducibility without expanding the repository into private agent operations, customer data, or provider administration.

## Before opening a pull request

1. Read `AGENTS.md` and the applicable product or architecture documentation.
2. Confirm the change is based on the actual schema in `ACTUAL_SCHEMA.md` and the tracked migrations.
3. Keep secrets, customer data, provider exports, local agent state, and generated output out of the repository.
4. Update `.env.example` when adding an environment variable. Include names and safe placeholders only.

## Verification

Run the checks relevant to the change. For application or repository-boundary changes, run:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
npm run check:public
npm audit --audit-level=high
git diff --check
```

The Playwright end-to-end runner starts a local development server by default. In CI it starts the built app after the build step. Keep demo-flow coverage opt-in with `RUN_DEMO_E2E=1`, and never point it at production data.

## Pull requests

Keep each pull request focused. Explain the user or maintenance problem, the scope, verification commands, environment assumptions, and any follow-up work. Do not merge dependency, schema, hosted-service, or credential changes without a separate review of their operational impact.

# Roadsmith agent contract

This file is the engineering contract for the Roadsmith repository. It applies to contributors and coding agents.

## Project

Roadsmith is a white-label driving-school SaaS. The stack is Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase, Stripe, Resend, and Vercel. Private product knowledge, credentials, customer data, and agent operations do not belong in this repository.

Important directories:

- `src/` application code and API routes
- `e2e/` end-to-end tests
- `tests/` unit/integration tests when present
- `scripts/` verification and maintenance scripts
- `docs/` engineering and workflow documentation
- `supabase/` schema and migration documentation

## Scope and safety

- Work only in this repository unless the task explicitly names another path.
- Do not modify the prototype, Obsidian vault, other repositories, or Codex worktrees from a Roadsmith code task.
- Never deploy, push, alter production data, change billing, change credentials, or edit secrets unless the user explicitly authorizes that exact action.
- Never delete, reset, clean, rebase, merge, or remove worktrees.
- Never print secret values. Treat `.env*` files as sensitive.

## Before acting

1. Run `pwd`, `git branch --show-current`, `git worktree list`, and `git status --short --branch`.
2. Read this file and task-specific documentation.
3. For database work, read `ACTUAL_SCHEMA.md` before writing queries or migrations.
4. For UI work, read applicable design guidance and verify rendered browser output.
5. Optional, for multi-file features or risky changes: write a task contract (see below).

## Task contract (optional)

Use a task contract only for multi-file features or risky changes. When you use one, record:

- current working directory
- branch and worktree
- initial Git status
- one objective
- explicit in-scope files/directories
- files and repositories that must not change
- measurable acceptance criteria
- exact verification commands
- a baseline captured before implementation; completion must prove expected files changed after that baseline, not merely that they are dirty now
- final diff and status review

## Verification

Available project commands:

- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run build`

Run the narrowest relevant checks and `npm run build` for code changes. For UI changes, check `lsof -ti:3000` before starting a server and inspect the rendered page in a browser. A successful build or server start alone is not completion evidence. A test command that discovers zero tests is not a pass; report it as a verification failure.

## Git and definition of done

- Preserve all pre-existing modifications and untracked files.
- Keep the diff scoped to the task.
- Review `git diff --check`, the complete diff, and `git status --short` before reporting.
- Do not commit or push by default; obtain explicit authorization if requested.
- Completion requires acceptance criteria and verification commands to have actually passed, with failures and untested claims reported plainly.
- Optional, when a task contract exists: run `npm run verify:completion -- <contract.json>` for an extra check. A COMPLETE result requires changed expected files, matching content, positive test discovery, and passing execution evidence.

Use a new task when the project, repository, objective, or risk boundary changes. Follow the inspect → plan → implement → verify lifecycle described in `CONTRIBUTING.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Public repository boundary

Private agent state, personal memory, customer data, provider credentials, generated reports, and local provider state do not belong in this repository.

## Canonical project identity

This is the Roadsmith repository. It is the white-label driving-school SaaS
application repository, not a workflow lab, Hermes harness, audit workspace, or
scratch directory.

#!/usr/bin/env bash
set -euo pipefail

forbidden='(^|/)(\.claude|\.hermes|\.openclaw|\.herenow|\.codex|\.learnings|memory|scout-reports|MEMORY\.md|AGENT_RUN_LOG\.md|WORKFLOW_LOG(\.md|_HEADER\.md)?|TDC_BOOTSTRAP\.md|CLAUDE(_CODEX_CONTEXT)?\.md|prompts)(/|$)'

existing_tracked=$(git ls-files | while IFS= read -r path; do test -e "$path" && printf '%s\n' "$path"; done)
tracked_private=$(printf '%s\n' "$existing_tracked" | rg -n "$forbidden" || true)
if [[ -n "$tracked_private" ]]; then
  echo "Tracked private or agent-only paths found:"
  echo "$tracked_private"
  exit 1
fi

filesystem_paths=$(find . \
  -path './.git' -prune -o \
  -path './node_modules' -prune -o \
  -path './.next' -prune -o \
  -path './.vercel' -prune -o \
  -path './playwright-report' -prune -o \
  -path './test-results' -prune -o \
  -print | sed 's#^\./##')
filesystem_private=$(printf '%s\n' "$filesystem_paths" | rg -n "$forbidden" || true)
if [[ -n "$filesystem_private" ]]; then
  echo "Private or agent-only paths found in the repository tree:"
  echo "$filesystem_private"
  exit 1
fi

if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
  echo '.env.local is tracked.'
  exit 1
fi

credential_matches=$(git grep -n -I -E 'sk_(live|test)_[A-Za-z0-9]+|rk_(live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|re_[A-Za-z0-9]{20,}' -- ':!package-lock.json' ':!*.lock' || true)
if [[ -n "$credential_matches" ]]; then
  echo 'Credential-shaped values found in tracked files:'
  echo "$credential_matches"
  exit 1
fi

git diff --check
echo 'Public-release hygiene checks passed.'

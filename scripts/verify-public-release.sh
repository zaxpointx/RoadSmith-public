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

# Only a root AGENTS.md (public contributor guide) is allowed, and it must stay free of private context.
nested_agents=$(git ls-files | rg "/AGENTS\.md$" || true)
if [[ -n "$nested_agents" ]]; then
  echo "Only a root AGENTS.md is allowed:"
  echo "$nested_agents"
  exit 1
fi
if [[ -f AGENTS.md ]] && rg -n -i "hermes|mac ?mini|tailscale|vercel\.app|supabase\.co|private repo|~/|evswdlsql|@gmail\.com|@outlook\.com|/Users/|Projects/|roadsmith-(ebqr|public-hosted)|price_1|sk_(live|test)_|ghp_|github_pat_" AGENTS.md; then
  echo "AGENTS.md mentions private infrastructure or hosted identifiers."
  exit 1
fi

if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
  echo '.env.local is tracked.'
  exit 1
fi

# Hosted-project identifiers must not appear anywhere in the public tree.
hosted_ids=$(git grep -n -I -E "evswdlsql|price_1[A-Za-z0-9]{8,}" -- ":!scripts/verify-public-release.sh" ":!package-lock.json" || true)
if [[ -n "$hosted_ids" ]]; then
  echo "Hosted-project identifiers found in tracked files:"
  echo "$hosted_ids"
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

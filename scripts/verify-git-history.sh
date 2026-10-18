#!/usr/bin/env bash
set -uo pipefail

# Non-printing history gate. It reports counts only; never emit matched content.
# Search the diffs that introduced or changed matching lines instead of
# checking every pattern against every commit tree. This keeps the scan
# complete for reachable history while avoiding one git process per pattern.
history_pattern='sk_(live|test)_[A-Za-z0-9]{16,}|rk_(live|test)_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|re_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{30,}'
total=$(git log --all --full-history --extended-regexp --format='%H' \
  -G "$history_pattern" -- \
  ':!package-lock.json' ':!*.lock' ':!*.map' 2>/dev/null \
  | sort -u | wc -l | tr -d ' ')

if (( total > 0 )); then
  echo "Credential-shaped matches found in Git history: $total"
  echo "Review provider exposure and rotate affected credentials before public release."
  exit 1
fi

echo "Git-history credential scan passed (no credential-shaped matches found)."

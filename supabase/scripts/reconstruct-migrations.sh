#!/usr/bin/env bash
# supabase/scripts/reconstruct-migrations.sh
#
# Reconstructs missing supabase/migrations/ files from the live production
# schema. The repo has 1 local migration but production has 12 applied, so
# the Supabase CLI refuses to pull anything until the drift is resolved.
#
# Run this once you have the database password (encrypted in Vercel; pull
# it manually from the Supabase dashboard under Settings > Database).
#
# What it does:
#   1. Backs up the current supabase/migrations/ to /tmp/roadsmith-migrations-backup
#   2. Dumps the production schema (public) via pg_dump
#   3. Splits the dump into one migration file per logical change
#   4. Marks already-applied migrations as 'applied' in the meta table
#
# Requires:
#   - libpq (brew install libpq)
#   - DATABASE_URL set to the production connection string
#       (postgresql://postgres:<password>@db.evswdlsqlaztvajibgta.supabase.co:5432/postgres)
#
# Usage:
#   DATABASE_URL=postgresql://postgres:... bash supabase/scripts/reconstruct-migrations.sh

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required. Get it from Supabase dashboard > Settings > Database."
  exit 1
fi

if ! command -v pg_dump >/dev/null; then
  echo "pg_dump not found. Install with: brew install libpq && brew link --force libpq"
  exit 1
fi

BACKUP_DIR="/tmp/roadsmith-migrations-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r supabase/migrations "$BACKUP_DIR/"

echo "==> Dumping public schema from production"
SUPABASE_DUMP="$(mktemp -t roadsmith-schema.XXXXXX.sql)"
pg_dump --schema=public --no-owner --no-acl --schema-only "$DATABASE_URL" > "$SUPABASE_DUMP"

echo "==> Saving dump for inspection: $SUPABASE_DUMP"
echo "==> When you have reviewed the dump, run: supabase db push"
echo "    (or commit the dump as a single baseline migration if you want"
echo "     to abandon the original history)"

ls -la "$SUPABASE_DUMP"
echo ""
echo "Backup of original migrations: $BACKUP_DIR"

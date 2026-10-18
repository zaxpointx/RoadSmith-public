-- supabase/scripts/pending/2026-07-25-add-missing-fk-indexes.sql
--
-- Performance fix: covers unindexed foreign keys identified by the
-- Supabase performance linter (2026-07-25). Each index is additive —
-- no schema changes, no policy changes.
--
-- After the schema drift is resolved, rename this file to
-- supabase/migrations/YYYYMMDDHHMMSS_add_missing_fk_indexes.sql and
-- run `supabase db push`. The timestamp prefix should fall AFTER
-- 20260714204422 (the latest applied migration) so it doesn't violate
-- Supabase's monotonic timestamp rule.
--
-- Linter findings:
--   public.bookings                  bookings_instructor_id_fkey
--   public.bookings                  bookings_session_id_fkey
--   public.bookings                  bookings_session_type_id_fkey
--   public.membership_audit_log      membership_audit_log_actor_user_id_fkey
--   public.membership_audit_log      membership_audit_log_membership_id_fkey
--   public.school_invitations        school_invitations_accepted_by_fkey

CREATE INDEX IF NOT EXISTS idx_bookings_instructor_id
  ON public.bookings (instructor_id);

CREATE INDEX IF NOT EXISTS idx_bookings_session_id
  ON public.bookings (session_id);

CREATE INDEX IF NOT EXISTS idx_bookings_session_type_id
  ON public.bookings (session_type_id);

CREATE INDEX IF NOT EXISTS idx_membership_audit_log_actor_user_id
  ON public.membership_audit_log (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_membership_audit_log_membership_id
  ON public.membership_audit_log (membership_id);

CREATE INDEX IF NOT EXISTS idx_school_invitations_accepted_by
  ON public.school_invitations (accepted_by);

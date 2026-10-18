-- Migration 003: Security hardening (FIXED)
-- Run this in Supabase SQL Editor after copying the output
-- NOTE: This migration is broken — it references columns/tables that don't exist.
--      Use this corrected version instead.

-- 1. Fix increment_seats_booked — use status='scheduled' not cancelled boolean
CREATE OR REPLACE FUNCTION increment_seats_booked(target_session_id UUID, target_school_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE sessions
  SET seats_booked = seats_booked + 1
  WHERE id = target_session_id
    AND school_id = target_school_id
    AND seats_booked < max_seats
    AND status = 'scheduled';
$$;

-- 2. Create processed_stripe_events for webhook idempotency
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure audit_logs table has actor_id and details
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

-- 4. Index for fast session lookups by school + date
-- FIXED: sessions has status TEXT, not cancelled BOOLEAN
CREATE INDEX IF NOT EXISTS idx_sessions_school_date
  ON sessions(school_id, start_date)
  WHERE status = 'scheduled';

-- 5. Index for audit log lookups by action + timestamp
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action, timestamp DESC);

-- 6. Add constraint: dob must be at least 15 years ago (TN driver ed minimum age)
ALTER TABLE students_driver_ed
  ADD CONSTRAINT IF NOT EXISTS check_student_min_age
  CHECK (dob <= (CURRENT_DATE - INTERVAL '15 years'));

-- 7. Enable RLS on all existing tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students_driver_ed ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Schools RLS: service role full access; auth reads own record
CREATE OR REPLACE POLICY "service_role_schools_all" ON schools
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE POLICY "auth_schools_read_own" ON schools
  FOR SELECT TO authenticated
  USING (owner_email = (auth.jwt() ->> 'email'));

-- 9. Service role full access for all operational tables
CREATE OR REPLACE POLICY "service_role_sessions_all" ON sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE POLICY "service_role_students_all" ON students_driver_ed
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE POLICY "service_role_audit_all" ON audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- NOTE: payments table was referenced but never created.
--       If you need it, create it separately:
-- CREATE TABLE IF NOT EXISTS payments (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   student_email TEXT,
--   stripe_session_id TEXT,
--   amount INTEGER,
--   status TEXT DEFAULT 'paid',
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- CREATE OR REPLACE POLICY "service_role_payments_all" ON payments
--   FOR ALL TO service_role USING (true) WITH CHECK (true);

-- FIXED migration — removed:
--   - sessions.deleted_at (column doesn't exist)
--   - students_driver_ed.deleted_at (column doesn't exist)
--   - sessions.cancelled (column doesn't exist — use status='cancelled' instead)
--   - payments table creation (never existed to reference)

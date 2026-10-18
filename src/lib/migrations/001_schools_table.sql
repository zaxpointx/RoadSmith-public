-- Migration 001: Multi-tenant schools table + RPC functions
-- Run this in Supabase SQL Editor after copying the output

-- 1. Schools (root tenant table)
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  state TEXT NOT NULL DEFAULT 'TN', -- TN | KY | GA
  license_number TEXT,
  plan_tier TEXT DEFAULT 'starter', -- starter | growth | enterprise
  stripe_customer_id TEXT,
  service_zips TEXT[], -- allowed ZIP codes for this school
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add school_id to all existing data tables
ALTER TABLE students_driver_ed ADD COLUMN school_id UUID REFERENCES schools(id);
ALTER TABLE sessions ADD COLUMN school_id UUID REFERENCES schools(id);
ALTER TABLE payments ADD COLUMN school_id UUID REFERENCES schools(id);

-- 3. Increment seats_booked RPC
CREATE OR REPLACE FUNCTION increment_seats_booked(target_session_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE sessions
  SET seats_booked = seats_booked + 1
  WHERE id = target_session_id
    AND seats_booked < max_seats;
$$;

-- 4. Seats available RPC
CREATE OR REPLACE FUNCTION get_seats_available(target_session_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT (max_seats - seats_booked)
  FROM sessions
  WHERE id = target_session_id;
$$;

-- 5. Per-school RLS policies (add to existing service_role policies)
-- Schools can only see their own data
ALTER TABLE students_driver_ed ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS for writes (used by API routes / webhooks)
CREATE POLICY "service_role_all" ON students_driver_ed
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_sessions" ON sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_payments" ON payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read their own school's data (for dashboards)
CREATE POLICY "auth_read_own_school" ON students_driver_ed
  FOR SELECT TO authenticated
  USING (school_id = (
    SELECT school_id FROM schools
    WHERE owner_email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "auth_read_sessions" ON sessions
  FOR SELECT TO authenticated
  USING (school_id = (
    SELECT school_id FROM schools
    WHERE owner_email = auth.jwt() ->> 'email'
  ));

-- 6. Schools table: only service role can write; auth can read own record
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_schools" ON schools
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_own_school_record" ON schools
  FOR SELECT TO authenticated
  USING (owner_email = auth.jwt() ->> 'email');

-- 7. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_students_school ON students_driver_ed(school_id);
CREATE INDEX IF NOT EXISTS idx_sessions_school ON sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_school ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status) WHERE status = 'paid';
CREATE INDEX IF NOT EXISTS idx_students_cert ON students_driver_ed(certificate_issued_at)
  WHERE certificate_issued_at IS NOT NULL;

-- Migration 004: Instructor availability + session types + enhanced booking schema
-- Run this in Supabase SQL Editor after copying the output

-- 1. Session types (driving school specific)
CREATE TABLE IF NOT EXISTS session_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  name TEXT NOT NULL,            -- e.g. 'Traffic School', 'Private Lesson', 'Driving Assessment'
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_cents INTEGER NOT NULL DEFAULT 0,
  deposit_cents INTEGER NOT NULL DEFAULT 2500,  -- $25 default deposit
  color TEXT DEFAULT '#06b6d4',   -- For calendar color coding
  tca_hours_credit NUMERIC(4,2), -- Hours credited toward TCA requirement
  requires_permit BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Instructor availability windows (weekly recurring)
CREATE TABLE IF NOT EXISTS instructor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID REFERENCES instructors(id) NOT NULL,
  day_of_week INTEGER NOT NULL,   -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time TIME NOT NULL,       -- e.g. '08:00'
  end_time TIME NOT NULL,         -- e.g. '17:00'
  location TEXT,                  -- Optional location override
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instructor_id, day_of_week, start_time)
);

-- 3. Instructor time off (vacations, sick days)
CREATE TABLE IF NOT EXISTS instructor_time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID REFERENCES instructors(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Updated sessions table — add session_type_id and start_at
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_type_id UUID REFERENCES session_types(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;  -- UTC slot start

-- 5. Booking table (the actual reservation)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) NOT NULL,
  student_id UUID REFERENCES students_driver_ed(id),
  student_name TEXT NOT NULL,           -- Student's actual name
  student_email TEXT NOT NULL,
  student_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
  deposit_amount_cents INTEGER NOT NULL DEFAULT 0,
  deposit_paid_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  confirmation_token TEXT UNIQUE,       -- Magic link token for cancel/reschedule
  reminder_48h_sent BOOLEAN DEFAULT FALSE,
  reminder_4h_sent BOOLEAN DEFAULT FALSE,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_type_school ON session_types(school_id);
CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor ON instructor_availability(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_timeoff_instructor ON instructor_time_off(instructor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_session ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE status IN ('pending', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_token ON bookings(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON sessions(start_at) WHERE start_at IS NOT NULL AND cancelled = false;

-- 7. Function: get_available_slots for a given date range + instructor
CREATE OR REPLACE FUNCTION get_available_slots(
  p_school_id UUID,
  p_instructor_id UUID DEFAULT NULL,
  p_session_type_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  session_date DATE,
  start_time TIME,
  end_time TIME,
  instructor_id UUID,
  instructor_name TEXT,
  seats_available INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH instructor_windows AS (
    SELECT ia.instructor_id, ia.day_of_week, ia.start_time, ia.end_time, i.name as instructor_name
    FROM instructor_availability ia
    JOIN instructors i ON i.id = ia.instructor_id
    WHERE ia.instructor_id = COALESCE(p_instructor_id, ia.instructor_id)
      AND i.school_id = p_school_id
      AND i.active = true
  ),
  date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS session_date
  ),
  potential_slots AS (
    SELECT
      ds.session_date,
      iw.start_time,
      iw.end_time,
      iw.instructor_id,
      iw.instructor_name,
      st.duration_minutes,
      st.id AS session_type_id
    FROM date_series ds
    JOIN instructor_windows iw ON iw.day_of_week = EXTRACT(DOW FROM ds.session_date)::integer
    CROSS JOIN session_types st
    WHERE st.id = p_session_type_id AND st.school_id = p_school_id AND st.active = true
  ),
  booked_counts AS (
    SELECT session_id, COUNT(*) as booked
    FROM bookings
    WHERE status IN ('pending', 'confirmed')
    GROUP BY session_id
  )
  SELECT
    ps.session_date,
    ps.start_time,
    ps.end_time,
    ps.instructor_id,
    ps.instructor_name,
    (s.max_seats - COALESCE(bc.booked, 0)) AS seats_available
  FROM potential_slots ps
  JOIN sessions s ON s.session_type_id = ps.session_type_id
    AND s.start_date = ps.session_date::text
    AND s.instructor_id = ps.instructor_id
    AND s.cancelled = false
  LEFT JOIN booked_counts bc ON bc.session_id = s.id
  WHERE (s.max_seats - COALESCE(bc.booked, 0)) > 0
    AND ps.session_date >= CURRENT_DATE
  ORDER BY ps.session_date, ps.start_time;
$$;

-- 8. RLS policies
ALTER TABLE session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Service role full access on everything
CREATE POLICY "service_role_session_types" ON session_types FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_instructor_availability" ON instructor_availability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_instructor_timeoff" ON instructor_time_off FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bookings" ON bookings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated: schools can manage their own
CREATE POLICY "auth_session_types" ON session_types FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM schools WHERE owner_email = auth.jwt() ->> 'email'));
CREATE POLICY "auth_instructor_availability" ON instructor_availability FOR ALL TO authenticated
  USING (instructor_id IN (SELECT id FROM instructors WHERE school_id IN (SELECT id FROM schools WHERE owner_email = auth.jwt() ->> 'email')));
CREATE POLICY "auth_instructor_timeoff" ON instructor_time_off FOR ALL TO authenticated
  USING (instructor_id IN (SELECT id FROM instructors WHERE school_id IN (SELECT id FROM schools WHERE owner_email = auth.jwt() ->> 'email')));

-- Bookings: anyone can CREATE (public booking), schools can view their own
CREATE POLICY "auth_bookings_create" ON bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_bookings_read" ON bookings FOR SELECT TO authenticated
  USING (session_id IN (
    SELECT s.id FROM sessions s WHERE s.school_id IN (
      SELECT id FROM schools WHERE owner_email = auth.jwt() ->> 'email'
    )
  ));

-- 9. Seed default session types for new schools
-- (This will be called from the signup flow)
CREATE OR REPLACE FUNCTION seed_session_types(p_school_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO session_types (school_id, name, description, duration_minutes, price_cents, deposit_cents, color, tca_hours_credit, requires_permit) VALUES
    (p_school_id, 'Traffic School (4 Hour)', 'State-approved driver improvement course', 240, 5000, 2500, '#ef4444', 4.0, false),
    (p_school_id, 'Traffic School (8 Hour)', 'Extended driver improvement course', 480, 8000, 2500, '#f97316', 8.0, false),
    (p_school_id, 'Private Lesson', 'One-on-one driving instruction', 60, 5000, 2500, '#06b6d4', NULL, true),
    (p_school_id, 'Driving Assessment', 'Medical clearance driving evaluation', 90, 20000, 5000, '#8b5cf6', NULL, true),
    (p_school_id, 'Road Test Prep', 'Practice for state road test', 60, 5000, 2500, '#10b981', true, true);
$$;

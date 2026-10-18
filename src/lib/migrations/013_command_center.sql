-- Migration 013: Roadsmith command center
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS dashboard_widget_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'instructor')),
  widget_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  size TEXT NOT NULL DEFAULT 'normal' CHECK (size IN ('compact', 'normal', 'wide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, role, widget_key, user_id)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'instructor', 'parent')),
  booking_confirmations BOOLEAN NOT NULL DEFAULT TRUE,
  payment_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  session_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  instructor_schedule_changes BOOLEAN NOT NULL DEFAULT TRUE,
  compliance_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  marketing_updates BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_48h BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_4h BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, role, user_id)
);

CREATE TABLE IF NOT EXISTS student_compliance_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students_driver_ed(id) ON DELETE CASCADE,
  sf_1010_ready BOOLEAN NOT NULL DEFAULT FALSE,
  sf_1256_ready BOOLEAN NOT NULL DEFAULT FALSE,
  sf_0259_ready BOOLEAN NOT NULL DEFAULT FALSE,
  permit_verified BOOLEAN NOT NULL DEFAULT FALSE,
  required_driving_hours NUMERIC NOT NULL DEFAULT 50,
  required_classroom_hours NUMERIC NOT NULL DEFAULT 30,
  notes TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, student_id)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id UUID NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NULL,
  entity_id UUID NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS result_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS miles_driven NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS skills_practiced TEXT[] NULL,
  ADD COLUMN IF NOT EXISTS instructor_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS parent_visible_notes TEXT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'public_booking',
  ADD COLUMN IF NOT EXISTS balance_due_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL;

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  ADD COLUMN IF NOT EXISTS booking_min_notice_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS booking_max_days_ahead INTEGER NOT NULL DEFAULT 60;

CREATE INDEX IF NOT EXISTS dashboard_widget_preferences_school_idx
  ON dashboard_widget_preferences(school_id, role, display_order);

CREATE INDEX IF NOT EXISTS notification_preferences_school_idx
  ON notification_preferences(school_id, role);

CREATE INDEX IF NOT EXISTS student_compliance_status_school_idx
  ON student_compliance_status(school_id, student_id);

CREATE INDEX IF NOT EXISTS activity_log_school_created_idx
  ON activity_log(school_id, created_at DESC);

ALTER TABLE dashboard_widget_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON dashboard_widget_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_compliance_status TO authenticated;
GRANT SELECT, INSERT ON activity_log TO authenticated;

DROP POLICY IF EXISTS "Owners manage dashboard widget preferences" ON dashboard_widget_preferences;
CREATE POLICY "Owners manage dashboard widget preferences"
  ON dashboard_widget_preferences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = dashboard_widget_preferences.school_id
        AND schools.owner_email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = dashboard_widget_preferences.school_id
        AND schools.owner_email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Owners manage notification preferences" ON notification_preferences;
CREATE POLICY "Owners manage notification preferences"
  ON notification_preferences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = notification_preferences.school_id
        AND schools.owner_email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = notification_preferences.school_id
        AND schools.owner_email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Owners manage student compliance status" ON student_compliance_status;
CREATE POLICY "Owners manage student compliance status"
  ON student_compliance_status
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = student_compliance_status.school_id
        AND schools.owner_email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = student_compliance_status.school_id
        AND schools.owner_email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Owners read activity log" ON activity_log;
CREATE POLICY "Owners read activity log"
  ON activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = activity_log.school_id
        AND schools.owner_email = auth.jwt() ->> 'email'
    )
  );

CREATE TABLE IF NOT EXISTS instructors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  license_number TEXT,
  license_expiry DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES instructors(id);

CREATE INDEX IF NOT EXISTS idx_instructors_school ON instructors(school_id);
CREATE INDEX IF NOT EXISTS idx_sessions_instructor ON sessions(instructor_id);

-- Add reminder tracking columns to students_driver_ed
ALTER TABLE students_driver_ed ADD COLUMN IF NOT EXISTS reminder_sent_72h BOOLEAN DEFAULT FALSE;
ALTER TABLE students_driver_ed ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN DEFAULT FALSE;
ALTER TABLE students_driver_ed ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

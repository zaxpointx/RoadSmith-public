-- Migration 005: School profiles + TCA compliance
-- Run this in Supabase SQL Editor after copying the output

-- 1. Add slug column to schools (for public URLs like /school/your-school-name)
ALTER TABLE schools ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Generate slug from school name if not set
UPDATE schools SET slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g'))
  WHERE slug IS NULL;

-- 3. School profiles (public-facing info schools control)
CREATE TABLE IF NOT EXISTS school_profiles (
  school_id UUID REFERENCES schools(id) PRIMARY KEY,
  tagline TEXT,
  about TEXT,
  address TEXT,
  city TEXT,
  zip TEXT,
  email TEXT,
  website TEXT,
  facebook TEXT,
  instagram TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);

-- 5. Add TCA compliance columns to students if not exists
ALTER TABLE students_driver_ed ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE students_driver_ed ADD COLUMN IF NOT EXISTS completion_date DATE;

-- 6. Certificate issuance tracking
ALTER TABLE students_driver_ed ADD COLUMN IF NOT EXISTS certificate_number TEXT UNIQUE;

-- Generate certificate number when issued
CREATE OR REPLACE FUNCTION generate_certificate_number(p_student_id UUID)
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'TCA-' || upper(substr(md5(p_student_id::text), 1, 8)) || '-' || to_char(NOW(), 'YYYY')
$$;

-- 7. RLS for school_profiles
ALTER TABLE school_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_school_profiles" ON school_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "auth_school_profiles_read" ON school_profiles
  FOR SELECT TO authenticated
  USING (school_id IN (
    SELECT id FROM schools WHERE owner_email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "auth_school_profiles_write" ON school_profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_school_profiles_update" ON school_profiles
  FOR UPDATE TO authenticated
  USING (school_id IN (
    SELECT id FROM schools WHERE owner_email = auth.jwt() ->> 'email'
  ));

-- 8. Index for TCA compliance queries
CREATE INDEX IF NOT EXISTS idx_students_tca_progress
  ON students_driver_ed(school_id, classroom_hours, driving_hours, certificate_issued_at)
  WHERE certificate_issued_at IS NULL;

-- 9. Ensure dob is not null for TCA age tracking
ALTER TABLE students_driver_ed
  ALTER COLUMN dob SET NOT NULL;

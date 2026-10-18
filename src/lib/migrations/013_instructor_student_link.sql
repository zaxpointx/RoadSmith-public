-- Migration 013: instructor_id on students (multi-school multi-instructor support)
-- Allows per-instructor student scoping: each student has a primary instructor.
-- Used by /instructor/dashboard to show only the logged-in instructor's students.

ALTER TABLE students_driver_ed
ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES instructors(id) ON DELETE SET NULL;

-- Index for fast lookup by instructor
CREATE INDEX IF NOT EXISTS idx_students_instructor ON students_driver_ed(instructor_id) WHERE instructor_id IS NOT NULL;

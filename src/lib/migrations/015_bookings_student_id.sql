-- Migration 015: Add student_id to bookings table
-- Links bookings to students_driver_ed records for booking history

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES students_driver_ed(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);

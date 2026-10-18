-- Migration 014: Add night_hours column to students_driver_ed
-- Cumulative night driving hours (part of the 50 total hours requirement for SF-1256)
-- TN law requires 10 of 50 hours to be night driving

ALTER TABLE students_driver_ed
ADD COLUMN IF NOT EXISTS night_hours NUMERIC(5,1) DEFAULT 0;

-- Ensure existing rows get default 0
UPDATE students_driver_ed SET night_hours = 0 WHERE night_hours IS NULL;

-- Add NOT NULL constraint after update
ALTER TABLE students_driver_ed ALTER COLUMN night_hours SET NOT NULL;
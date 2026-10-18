-- Migration 016: Add link_status to bookings
-- Tracks the result of the booking-to-student auto-link (ROA-13).
-- Values:
--   'pending'    - not yet evaluated (default for legacy / in-flight bookings)
--   'linked'     - booking was linked to an existing student by email+name match
--   'created'    - no matching student found; a new student record was created
--   'ambiguous'  - matches were found but none with both email AND name matching
--                   (requires manual admin review to pick the right student)

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS link_status text
  CHECK (link_status IN ('pending', 'linked', 'created', 'ambiguous'))
  DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_bookings_link_status ON bookings(link_status)
  WHERE link_status IN ('ambiguous', 'pending');

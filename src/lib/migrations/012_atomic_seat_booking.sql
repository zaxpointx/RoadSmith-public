-- Migration 012: Atomic seat booking with race condition protection
-- Date: 2026-05-12

-- 1. Add check constraint to prevent overselling at DB level
ALTER TABLE sessions ADD CONSTRAINT sessions_seats_not_overbooked
  CHECK (seats_booked <= max_seats);

-- 2. Add CHECK constraints to bookings table for data integrity
ALTER TABLE bookings ADD CONSTRAINT bookings_valid_status
  CHECK (status IN ('pending', 'confirmed', 'cancelled'));

ALTER TABLE bookings ADD CONSTRAINT bookings_valid_payment
  CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed'));

-- 3. Create atomic seat-booking function
-- Uses SELECT FOR UPDATE row lock to prevent race conditions
CREATE OR REPLACE FUNCTION book_seat(
  p_session_id UUID,
  p_student_name TEXT,
  p_student_email TEXT,
  p_student_phone TEXT,
  p_session_date DATE,
  p_session_time TEXT,
  p_status TEXT DEFAULT 'confirmed',
  p_payment_status TEXT DEFAULT 'paid',
  p_deposit_cents INTEGER DEFAULT 0,
  p_school_id UUID DEFAULT NULL,
  p_session_type_id UUID DEFAULT NULL,
  p_instructor_id UUID DEFAULT NULL,
  p_booking_token UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_seats_booked INTEGER;
  v_max_seats INTEGER;
  v_school_id UUID;
  v_session_type_id UUID;
  v_instructor_id UUID;
  v_deposit_cents INTEGER;
  v_booking_id UUID;
  v_token UUID;
BEGIN
  -- Lock the session row and read current state (blocks other bookings until commit)
  SELECT seats_booked, max_seats, school_id, session_type_id, instructor_id
  INTO v_seats_booked, v_max_seats, v_school_id, v_session_type_id, v_instructor_id
  FROM sessions
  WHERE id = p_session_id AND status = 'scheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  IF v_seats_booked >= v_max_seats THEN
    RAISE EXCEPTION 'SESSION_FULL';
  END IF;

  -- Use provided values or fall back to session defaults
  v_school_id := COALESCE(p_school_id, v_school_id);
  v_session_type_id := COALESCE(p_session_type_id, v_session_type_id);
  v_instructor_id := COALESCE(p_instructor_id, v_instructor_id);
  v_deposit_cents := COALESCE(p_deposit_cents, 0);
  v_token := COALESCE(p_booking_token, gen_random_uuid());

  -- Insert booking
  INSERT INTO bookings (
    student_name, student_email, student_phone,
    session_date, session_time, status, payment_status,
    deposit_amount_cents, booking_token, confirmation_token,
    session_id, school_id, session_type_id, instructor_id
  ) VALUES (
    p_student_name, p_student_email, p_student_phone,
    p_session_date, p_session_time, p_status, p_payment_status,
    v_deposit_cents, v_token, v_token,
    p_session_id, v_school_id, v_session_type_id, v_instructor_id
  )
  RETURNING id INTO v_booking_id;

  -- Atomically increment seats_booked
  UPDATE sessions SET seats_booked = seats_booked + 1 WHERE id = p_session_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

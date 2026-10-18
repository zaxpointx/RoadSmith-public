-- Migration 009: Add missing columns to bookings table
-- Fixes: session_id FK, deposit_amount_cents, confirmation_token, cancellation_reason, cancelled_at
-- Date: 2026-04-26

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount_cents INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_token TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
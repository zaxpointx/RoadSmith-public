-- Migration: 008_processed_stripe_events
-- Purpose: Idempotency table for Stripe webhook replay protection
-- Run this in Supabase Dashboard > SQL Editor
-- Stripe can send the same event multiple times; we must not double-process

CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-purge events older than 7 days to keep table small
CREATE OR REPLACE FUNCTION purge_old_stripe_events()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_stripe_events WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

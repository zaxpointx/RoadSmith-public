-- Phase 2: Subscription status for schools
-- Run this in Supabase SQL Editor before deploying Phase 2

-- subscription_status: trial | active | past_due | cancelled
ALTER TABLE schools ADD COLUMN subscription_status TEXT DEFAULT 'trial';
ALTER TABLE schools ADD COLUMN subscription_id TEXT;
ALTER TABLE schools ADD COLUMN trial_ends_at TIMESTAMPTZ;

-- Make sure schools created before this migration get 'trial' status
UPDATE schools SET subscription_status = 'trial' WHERE subscription_status IS NULL;
-- Migration 010: Add UNIQUE constraint on schools.owner_email
-- Prevents duplicate school registrations with the same owner email
-- Run in Supabase SQL Editor

ALTER TABLE schools ADD CONSTRAINT schools_owner_email_key UNIQUE (owner_email);
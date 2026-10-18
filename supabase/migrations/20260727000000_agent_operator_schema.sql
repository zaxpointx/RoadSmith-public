-- Migration: ROA-98 Agent Operator schema
-- Additive, tenant-scoped, RLS-protected.
-- Safe defaults: pilot_enabled=false, agent_mode=shadow, timezone=America/New_York, drive_buffer_minutes=10.
-- All new tables follow the tenant convention: school_id UUID NOT NULL with RLS scoped to authenticated school membership.
-- This migration is self-contained: it creates the helper functions it depends on if they do not exist.

-- ── 0. Helper functions (idempotent) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Returns the set of school ids the current authenticated user can access.
-- Falls back to empty set if no membership is found.
CREATE OR REPLACE FUNCTION public.school_ids_for_current_user()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- school_memberships is optional in the current Roadsmith schema. Do not
  -- let its absence short-circuit the owner_user_id path below.
  IF to_regclass('public.school_memberships') IS NOT NULL THEN
    RETURN QUERY
    SELECT school_id::UUID
    FROM school_memberships
    WHERE user_id = v_user_id
      AND (ended_at IS NULL OR ended_at > now());
  END IF;

  RETURN QUERY
  SELECT id::UUID
  FROM schools
  WHERE owner_user_id = v_user_id;
END;
$$;


-- ── 1. Extend existing tables ────────────────────────────────────────────
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT,
  ADD COLUMN IF NOT EXISTS agent_pilot_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agent_pilot_enabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_booking_modes TEXT[] NOT NULL DEFAULT ARRAY['class_seat','private_request']::TEXT[],
  ADD COLUMN IF NOT EXISTS agent_sms_number TEXT,
  ADD COLUMN IF NOT EXISTS agent_display_name TEXT NOT NULL DEFAULT 'Roadsmith Assistant';

ALTER TABLE instructors
  ADD COLUMN IF NOT EXISTS capabilities TEXT[] NOT NULL DEFAULT ARRAY['behind_the_wheel','classroom']::TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT NOT NULL DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS base_location TEXT,
  ADD COLUMN IF NOT EXISTS max_daily_hours NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  ADD COLUMN IF NOT EXISTS sms_phone TEXT;

ALTER TABLE session_types
  ADD COLUMN IF NOT EXISTS booking_mode TEXT NOT NULL DEFAULT 'class_seat'
    CHECK (booking_mode IN ('class_seat','private_request')),
  ADD COLUMN IF NOT EXISTS reminder_offsets_hours INTEGER[] NOT NULL DEFAULT ARRAY[24,2]::INTEGER[],
  ADD COLUMN IF NOT EXISTS requires_pickup BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web'
    CHECK (source IN ('web','sms','phone','admin')),
  ADD COLUMN IF NOT EXISTS booking_mode TEXT
    CHECK (booking_mode IN ('class_seat','private_request')),
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_status TEXT NOT NULL DEFAULT 'unscheduled'
    CHECK (schedule_status IN ('unscheduled','hold','requested','proposed','approved','completed','cancelled')),
  ADD COLUMN IF NOT EXISTS pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS payment_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS intake_id UUID;

-- ── 2. school_agent_settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_agent_settings (
  school_id UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  agent_mode TEXT NOT NULL DEFAULT 'shadow'
    CHECK (agent_mode IN ('shadow','graduated','paused')),
  drive_buffer_minutes INTEGER NOT NULL DEFAULT 10
    CHECK (drive_buffer_minutes BETWEEN 0 AND 120),
  default_reminder_offsets_hours INTEGER[] NOT NULL DEFAULT ARRAY[24,2]::INTEGER[],
  instructor_brief_local_time TIME NOT NULL DEFAULT '07:00:00',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  sms_signature TEXT,
  consent_message TEXT,
  -- autonomy gates
  auto_send_faq BOOLEAN NOT NULL DEFAULT FALSE,
  auto_send_intake_prompts BOOLEAN NOT NULL DEFAULT FALSE,
  auto_send_receipts BOOLEAN NOT NULL DEFAULT FALSE,
  auto_send_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  auto_send_instructor_briefs BOOLEAN NOT NULL DEFAULT FALSE,
  auto_publish_schedule BOOLEAN NOT NULL DEFAULT FALSE,
  auto_apply_reschedules BOOLEAN NOT NULL DEFAULT FALSE,
  auto_apply_cancellations BOOLEAN NOT NULL DEFAULT FALSE,
  auto_apply_refunds BOOLEAN NOT NULL DEFAULT FALSE,
  auto_apply_discounts BOOLEAN NOT NULL DEFAULT FALSE,
  -- escalation
  escalation_phone TEXT,
  -- audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE school_agent_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_agent_settings_school_read" ON school_agent_settings;
CREATE POLICY "school_agent_settings_school_read"
  ON school_agent_settings FOR SELECT
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "school_agent_settings_school_write" ON school_agent_settings;
CREATE POLICY "school_agent_settings_school_write"
  ON school_agent_settings FOR ALL
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id = ANY(public.school_ids_for_current_user()));

-- ── 3. agent_conversations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer','instructor')),
  sms_phone TEXT NOT NULL,
  -- for customer: nullable until matched
  contact_id UUID,
  -- for instructor: required
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'active'
    CHECK (state IN ('active','paused','opted_out','closed')),
  consent_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_school_phone
  ON agent_conversations(school_id, sms_phone, role);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_conversations_school_read" ON agent_conversations;
CREATE POLICY "agent_conversations_school_read"
  ON agent_conversations FOR SELECT
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "agent_conversations_school_write" ON agent_conversations;
CREATE POLICY "agent_conversations_school_write"
  ON agent_conversations FOR ALL
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id = ANY(public.school_ids_for_current_user()));

-- ── 4. agent_messages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  -- for idempotency, the Twilio Message SID is unique per provider event
  provider_message_sid TEXT,
  -- for outbound, the job that produced it
  job_id UUID,
  body TEXT NOT NULL,
  -- classification hint; LLM never directly mutates
  intent TEXT,
  confidence NUMERIC(3,2),
  -- delivery status
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','delivered','failed','received','opted_out')),
  error_code TEXT,
  -- dedup
  idempotency_key TEXT,
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_messages_provider_sid
  ON agent_messages(provider_message_sid) WHERE provider_message_sid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_messages_idem
  ON agent_messages(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation
  ON agent_messages(conversation_id, created_at DESC);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_messages_school_read" ON agent_messages;
CREATE POLICY "agent_messages_school_read"
  ON agent_messages FOR SELECT
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "agent_messages_school_write" ON agent_messages;
CREATE POLICY "agent_messages_school_write"
  ON agent_messages FOR ALL
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id = ANY(public.school_ids_for_current_user()));

-- ── 5. booking_intakes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  parent_name TEXT,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  student_name TEXT,
  student_age INTEGER,
  service_requested TEXT,
  pickup_address TEXT,
  availability_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- non-sensitive notes only
  notes TEXT,
  state TEXT NOT NULL DEFAULT 'collecting'
    CHECK (state IN ('collecting','awaiting_schedule','awaiting_payment','confirmed','cancelled','abandoned')),
  session_type_id UUID REFERENCES session_types(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_intakes_school_phone
  ON booking_intakes(school_id, parent_phone);

ALTER TABLE booking_intakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_intakes_school_read" ON booking_intakes;
CREATE POLICY "booking_intakes_school_read"
  ON booking_intakes FOR SELECT
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "booking_intakes_school_write" ON booking_intakes;
CREATE POLICY "booking_intakes_school_write"
  ON booking_intakes FOR ALL
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id = ANY(public.school_ids_for_current_user()));

-- FK for bookings.intake_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bookings' AND constraint_name = 'bookings_intake_id_fkey'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_intake_id_fkey
      FOREIGN KEY (intake_id) REFERENCES booking_intakes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 6. schedule_proposals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  -- the date the schedule covers
  schedule_date DATE NOT NULL,
  -- the run that produced this proposal
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by TEXT NOT NULL DEFAULT 'scheduler'
    CHECK (generated_by IN ('scheduler','recovery','admin')),
  -- inputs and outputs as JSON
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
  travel_legs JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- aggregate scoring
  score_overtime_risk NUMERIC(4,2),
  score_window_deviation NUMERIC(4,2),
  score_idle_time NUMERIC(4,2),
  score_total_travel_minutes INTEGER,
  -- conflict reasons
  conflict_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- approval state
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','rejected','superseded')),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejected_at TIMESTAMPTZ,
  rejected_reason TEXT,
  -- supersession
  superseded_by UUID REFERENCES schedule_proposals(id) ON DELETE SET NULL,
  -- audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_proposals_school_date
  ON schedule_proposals(school_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedule_proposals_status
  ON schedule_proposals(school_id, status);

ALTER TABLE schedule_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_proposals_school_read" ON schedule_proposals;
CREATE POLICY "schedule_proposals_school_read"
  ON schedule_proposals FOR SELECT
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "schedule_proposals_school_write" ON schedule_proposals;
CREATE POLICY "schedule_proposals_school_write"
  ON schedule_proposals FOR ALL
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id = ANY(public.school_ids_for_current_user()));

-- ── 7. schedule_assignments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES schedule_proposals(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  session_type_id UUID REFERENCES session_types(id) ON DELETE SET NULL,
  -- planned times in school timezone
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  -- travel time leading into this assignment, in minutes
  travel_in_minutes INTEGER,
  -- slack window (latest permissible start given instructor + student windows)
  slack_minutes INTEGER,
  -- status
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','in_progress','completed','cancelled','no_show')),
  -- google calendar event id for idempotent upserts
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_assignments_proposal
  ON schedule_assignments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_instructor_time
  ON schedule_assignments(school_id, instructor_id, scheduled_start);

ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_assignments_school_read" ON schedule_assignments;
CREATE POLICY "schedule_assignments_school_read"
  ON schedule_assignments FOR SELECT
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "schedule_assignments_school_write" ON schedule_assignments;
CREATE POLICY "schedule_assignments_school_write"
  ON schedule_assignments FOR ALL
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id = ANY(public.school_ids_for_current_user()));

-- ── 8. instructor_events ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instructor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('confirm','start','end','delay','no_show','note')),
  -- the inbound message that produced this event, for idempotency
  provider_message_sid TEXT,
  -- assignment the event refers to (start/end/delay/no_show)
  assignment_id UUID REFERENCES schedule_assignments(id) ON DELETE SET NULL,
  -- raw text the instructor sent
  raw_text TEXT,
  -- structured payload
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- if delay: minutes
  delay_minutes INTEGER,
  -- if note: student name reference
  student_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_events_provider_sid
  ON instructor_events(provider_message_sid) WHERE provider_message_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instructor_events_instructor_time
  ON instructor_events(school_id, instructor_id, occurred_at DESC);

ALTER TABLE instructor_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instructor_events_school_read" ON instructor_events;
CREATE POLICY "instructor_events_school_read"
  ON instructor_events FOR SELECT
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "instructor_events_school_write" ON instructor_events;
CREATE POLICY "instructor_events_school_write"
  ON instructor_events FOR ALL
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id = ANY(public.school_ids_for_current_user()));

-- ── 9. agent_approvals ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'publish_schedule','reschedule','cancel','refund','exception_reply'
  )),
  -- the subject of the approval, polymorphic
  subject_table TEXT,
  subject_id UUID,
  -- human-readable description and any structured payload
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- decision
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired')),
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  decision_note TEXT,
  -- expiry for time-sensitive approvals
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_approvals_school_status
  ON agent_approvals(school_id, status);

ALTER TABLE agent_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_approvals_school_read" ON agent_approvals;
CREATE POLICY "agent_approvals_school_read"
  ON agent_approvals FOR SELECT
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "agent_approvals_school_write" ON agent_approvals;
CREATE POLICY "agent_approvals_school_write"
  ON agent_approvals FOR ALL
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id = ANY(public.school_ids_for_current_user()));

-- ── 10. agent_jobs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  -- kind drives the handler; names are stable
  kind TEXT NOT NULL CHECK (kind IN (
    'send_5d_class_brief','send_7am_daily_brief','send_weekly_digest',
    'process_inbound_sms','process_inbound_sms_status',
    'expire_holds','expire_approvals',
    'generate_schedule_proposal','apply_approved_proposal',
    'handle_instructor_command','handle_payment_webhook',
    'handle_twilio_status'
  )),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- idempotency: same key + same payload hash = same job
  idempotency_key TEXT,
  -- claim state
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','claimed','running','succeeded','failed','dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 6,
  -- exponential backoff: next attempt at now() + (2^attempt) * base_seconds
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- error
  last_error TEXT,
  -- ordering
  priority INTEGER NOT NULL DEFAULT 100,
  -- claim audit
  claimed_at TIMESTAMPTZ,
  claimed_by TEXT,
  -- completion
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- result snapshot
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_jobs_idem
  ON agent_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_jobs_pending
  ON agent_jobs(status, next_run_at) WHERE status IN ('pending','claimed');
CREATE INDEX IF NOT EXISTS idx_agent_jobs_school_kind
  ON agent_jobs(school_id, kind, created_at DESC);

ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_jobs_school_read" ON agent_jobs;
CREATE POLICY "agent_jobs_school_read"
  ON agent_jobs FOR SELECT
  TO authenticated
  USING (school_id IS NULL OR school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "agent_jobs_school_write" ON agent_jobs;
CREATE POLICY "agent_jobs_school_write"
  ON agent_jobs FOR ALL
  TO authenticated
  USING (school_id IS NULL OR school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id IS NULL OR school_id = ANY(public.school_ids_for_current_user()));

-- ── 11. school_integrations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'twilio','stripe_connect','google_calendar','google_routes'
  )),
  -- the encrypted credentials blob, only ever decrypted server-side
  credentials_encrypted TEXT,
  -- non-sensitive configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- last verified at
  last_verified_at TIMESTAMPTZ,
  -- enabled flag
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  -- the connected-account or external id (non-secret)
  external_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_school_integrations_school
  ON school_integrations(school_id);

ALTER TABLE school_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_integrations_school_read" ON school_integrations;
CREATE POLICY "school_integrations_school_read"
  ON school_integrations FOR SELECT
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()));

DROP POLICY IF EXISTS "school_integrations_school_write" ON school_integrations;
CREATE POLICY "school_integrations_school_write"
  ON school_integrations FOR ALL
  TO authenticated
  USING (school_id = ANY(public.school_ids_for_current_user()))
  WITH CHECK (school_id = ANY(public.school_ids_for_current_user()));

-- ── 12. processed_provider_events (idempotency for webhooks) ────────────
CREATE TABLE IF NOT EXISTS processed_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('twilio','stripe')),
  -- the provider's event id (Twilio MessageSid or Stripe event id)
  provider_event_id TEXT NOT NULL,
  -- the kind of event for quick filtering
  kind TEXT,
  -- the resulting job id, if the event enqueued a job
  job_id UUID,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_provider_events_received
  ON processed_provider_events(received_at);

ALTER TABLE processed_provider_events ENABLE ROW LEVEL SECURITY;

-- No school-scoped policies: only the service role reads/writes this table.
-- It is server-only and never exposed via authenticated client queries.

-- ── 13. Defaults ─────────────────────────────────────────────────────────
INSERT INTO school_agent_settings (school_id)
SELECT id FROM schools
ON CONFLICT (school_id) DO NOTHING;

-- ── 14. updated_at triggers ──────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'school_agent_settings','agent_conversations','agent_messages',
      'booking_intakes','schedule_proposals','schedule_assignments',
      'agent_approvals','agent_jobs','school_integrations'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_touch_updated_at ON %I;
       CREATE TRIGGER trg_%I_touch_updated_at BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

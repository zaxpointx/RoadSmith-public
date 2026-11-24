-- Roadsmith operating system schema.
--
-- Everything lives in the `rs` schema, which Supabase does not expose through
-- PostgREST by default. The application reaches it only through server-side
-- code that binds every query to one school (tenant). RLS is enabled with no
-- policies so that the anon/authenticated roles can never read these tables
-- even if the schema is exposed later by mistake.
--
-- The same file is applied to the local sandbox database (PGlite), so it must
-- stay idempotent and plain PostgreSQL.

create extension if not exists btree_gist;
create schema if not exists rs;

-- ── Tenants ─────────────────────────────────────────────────────────────────
create table if not exists rs.schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  timezone text not null default 'America/Chicago',
  currency text not null default 'usd',
  agent_phone text not null unique,          -- the number families and staff text
  address text not null default '',
  lat double precision,
  lng double precision,
  playbook jsonb not null default '{}'::jsonb, -- policies, FAQs, autonomy, travel model
  is_sandbox boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists rs.staff (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'instructor')),
  name text not null,
  email text,
  phone text,
  teaches text[] not null default '{}',      -- service codes this person can deliver
  color text not null default '#3b82f6',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, phone),
  unique (school_id, email)
);

-- Weekly availability, in the school's local time (minutes after midnight).
create table if not exists rs.instructor_hours (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  staff_id uuid not null references rs.staff(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_min integer not null check (start_min between 0 and 1440),
  end_min integer not null check (end_min between 0 and 1440),
  check (end_min > start_min)
);

create table if not exists rs.time_off (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  staff_id uuid not null references rs.staff(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- ── People ──────────────────────────────────────────────────────────────────
create table if not exists rs.contacts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  name text not null default '',
  phone text not null,
  email text,
  kind text not null default 'lead' check (kind in ('lead', 'parent', 'student')),
  opted_out boolean not null default false,  -- replied STOP
  first_contact_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (school_id, phone)
);

create table if not exists rs.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  dob date,
  permit_number text,
  address text,
  lat double precision,
  lng double precision,
  location_quality text not null default 'unknown' check (location_quality in ('exact', 'approximate', 'unknown')),
  guardian_contact_id uuid references rs.contacts(id) on delete set null,
  student_contact_id uuid references rs.contacts(id) on delete set null,
  driving_minutes integer not null default 0,
  classroom_hours numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists students_dedupe
  on rs.students (school_id, lower(first_name), lower(last_name), dob)
  where dob is not null;

-- ── Catalog ─────────────────────────────────────────────────────────────────
create table if not exists rs.services (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null check (kind in ('lesson', 'course')),
  description text not null default '',
  duration_min integer not null default 60,
  price_cents integer not null check (price_cents >= 0),
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  pickup boolean not null default true,      -- lesson starts at the student's address
  min_age_years integer,
  active boolean not null default true,
  unique (school_id, code)
);

-- Classroom cohorts ("Course week Jul 22–25", capacity 30).
create table if not exists rs.courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  service_id uuid not null references rs.services(id),
  title text not null,
  starts_on date not null,
  ends_on date not null,
  schedule_note text not null default '',     -- "Mon–Thu, 4:00–7:00 pm"
  capacity integer not null check (capacity > 0),
  location text not null default '',
  instructor_id uuid references rs.staff(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists rs.course_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  course_id uuid not null references rs.courses(id) on delete cascade,
  instructor_id uuid references rs.staff(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);

-- ── Money ───────────────────────────────────────────────────────────────────
create table if not exists rs.payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  contact_id uuid references rs.contacts(id) on delete set null,
  student_id uuid references rs.students(id) on delete set null,
  purpose text not null check (purpose in ('lesson', 'course_deposit', 'course_tuition', 'balance')),
  lesson_id uuid,                             -- what this payment pays for (no FK: rows are created in one transaction)
  enrollment_id uuid,
  description text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded')),
  token text not null unique,                 -- unguessable public link token
  provider text not null default 'sandbox' check (provider in ('sandbox', 'stripe')),
  provider_ref text,
  checkout_url text,
  failure_reason text,
  attempts integer not null default 0,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_lesson on rs.payments (lesson_id);
create index if not exists payments_enrollment on rs.payments (enrollment_id);

create table if not exists rs.payment_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  payment_id uuid not null references rs.payments(id) on delete cascade,
  provider_event_id text not null unique,    -- idempotency key
  type text not null,
  created_at timestamptz not null default now()
);

-- ── Bookings ────────────────────────────────────────────────────────────────
create table if not exists rs.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  course_id uuid not null references rs.courses(id) on delete cascade,
  student_id uuid not null references rs.students(id) on delete cascade,
  status text not null check (status in ('reserved', 'confirmed', 'cancelled')),
  hold_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists enrollments_one_active
  on rs.enrollments (course_id, student_id) where status <> 'cancelled';

create table if not exists rs.lessons (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  student_id uuid not null references rs.students(id) on delete cascade,
  instructor_id uuid not null references rs.staff(id),
  service_id uuid not null references rs.services(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  pickup_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  status text not null check (status in ('held', 'booked', 'completed', 'cancelled', 'no_show')),
  hold_expires_at timestamptz,
  course_id uuid references rs.courses(id) on delete set null,
  instructor_notes text not null default '',
  completed_minutes integer,
  created_by text not null default 'agent',
  cancelled_reason text,
  created_at timestamptz not null default now(),
  during tstzrange generated always as (tstzrange(starts_at, ends_at)) stored,
  check (ends_at > starts_at),
  -- Hard guarantee: no instructor or student is ever double-booked, whoever writes the row.
  constraint lessons_no_instructor_overlap exclude using gist
    (instructor_id with =, during with &&) where (status in ('held', 'booked', 'completed')),
  constraint lessons_no_student_overlap exclude using gist
    (student_id with =, during with &&) where (status in ('held', 'booked'))
);
create index if not exists lessons_school_start on rs.lessons (school_id, starts_at);

-- ── Conversations ───────────────────────────────────────────────────────────
create table if not exists rs.conversations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  phone text not null,
  contact_id uuid references rs.contacts(id) on delete cascade,
  staff_id uuid references rs.staff(id) on delete cascade,
  audience text not null check (audience in ('customer', 'instructor', 'owner')),
  mode text not null default 'agent' check (mode in ('agent', 'human')),
  state jsonb not null default '{}'::jsonb,   -- offered slots, pending questions
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (school_id, phone)
);

create table if not exists rs.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  conversation_id uuid not null references rs.conversations(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  author text not null check (author in ('contact', 'agent', 'staff', 'system')),
  body text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation on rs.messages (conversation_id, created_at);

-- Every outbound message is recorded here before any provider is called.
create table if not exists rs.outbox (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  channel text not null default 'sms' check (channel in ('sms', 'email')),
  to_address text not null,
  body text not null,
  status text not null check (status in ('queued', 'sent', 'failed', 'sandboxed', 'suppressed')),
  provider text not null default 'sandbox',
  provider_ref text,
  error text,
  conversation_id uuid references rs.conversations(id) on delete set null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- ── Oversight ───────────────────────────────────────────────────────────────
-- Things a human must decide or know about: approvals and escalations.
create table if not exists rs.inbox (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  kind text not null check (kind in ('approval', 'escalation', 'alert')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  title text not null,
  detail text not null default '',
  action jsonb,                               -- {type, args} executed on approval
  conversation_id uuid references rs.conversations(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'approved', 'declined', 'resolved')),
  resolution jsonb,
  decided_by uuid references rs.staff(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists rs.jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  kind text not null,
  run_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed', 'cancelled')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists jobs_due on rs.jobs (status, run_at);

create table if not exists rs.audit_log (
  id bigserial primary key,
  school_id uuid not null references rs.schools(id) on delete cascade,
  actor_type text not null check (actor_type in ('agent', 'staff', 'contact', 'system', 'provider')),
  actor_label text not null default '',
  action text not null,
  target_type text,
  target_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_school_time on rs.audit_log (school_id, created_at desc);

create table if not exists rs.agent_runs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references rs.schools(id) on delete cascade,
  conversation_id uuid references rs.conversations(id) on delete set null,
  engine text not null check (engine in ('claude', 'interpreter')),
  model text,
  tool_calls jsonb not null default '[]'::jsonb,
  grounding jsonb not null default '{}'::jsonb,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  error text,
  created_at timestamptz not null default now()
);

-- Key/value settings for the deployment (sandbox clock offset, session secret).
create table if not exists rs.settings (
  key text primary key,
  value jsonb not null
);

do $$
declare t text;
begin
  foreach t in array array['schools','staff','instructor_hours','time_off','contacts','students','services',
    'courses','course_sessions','payments','payment_events','enrollments','lessons','conversations','messages',
    'outbox','inbox','jobs','audit_log','agent_runs','settings']
  loop
    execute format('alter table rs.%I enable row level security', t);
  end loop;
end $$;

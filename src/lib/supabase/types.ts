// Shared TypeScript interfaces for all Supabase tables used across the codebase.
// Use these with `as` casts on admin client operations when the generated types are missing
// or incomplete for a given table.

// ─── Individual table interfaces ─────────────────────────────────────────────

export interface StudentsDriverEd {
  id: string
  school_id: string
  legal_name: string
  dob: string
  permit_number: string | null
  parent_email: string
  emergency_contact_name: string
  emergency_contact_phone: string | null
  classroom_hours: number
  driving_hours: number
  certificate_issued_at: string | null
  created_at: string
}

export interface Instructor {
  id: string
  school_id: string
  name: string
  email: string
  phone: string
  license_number: string
  license_expiry: string
  active: boolean
  created_at: string
  // ROA-98 additive fields
  capabilities: string[]
  preferred_channel: 'sms' | 'email' | 'phone'
  base_location: string | null
  max_daily_hours: number
  sms_phone: string | null
}

export interface Session {
  id: string
  school_id: string
  session_type_id: string
  instructor_id: string
  start_date: string
  location: string
  max_seats: number
  seats_booked: number
  status: string
  created_at: string
}

export interface Booking {
  id: string
  session_id: string | null
  school_id?: string
  instructor_id?: string | null
  student_name: string
  student_email: string
  student_phone: string | null
  status: string
  deposit_amount_cents: number
  booking_token: string | null
  confirmation_token: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  created_at: string
  // ROA-98 additive fields
  source: 'web' | 'sms' | 'phone' | 'admin'
  booking_mode: BookingMode | null
  hold_expires_at: string | null
  schedule_status:
    | 'unscheduled'
    | 'hold'
    | 'requested'
    | 'proposed'
    | 'approved'
    | 'completed'
    | 'cancelled'
  pickup_location: string | null
  payment_session_id: string | null
  stripe_payment_intent_id: string | null
  intake_id: string | null
}

export interface AuditLog {
  action: string
  actor_id: string
  timestamp: string
  details: Record<string, unknown>
}

export interface School {
  id: string
  name: string
  owner_email: string
  owner_name: string
  phone: string
  state: string
  license_number: string
  plan_tier: string
  stripe_customer_id: string | null
  service_zips: string
  created_at: string
  // ROA-98 additive fields
  timezone: string
  stripe_connected_account_id: string | null
  agent_pilot_enabled: boolean
  agent_pilot_enabled_at: string | null
  agent_booking_modes: BookingMode[]
  agent_sms_number: string | null
  agent_display_name: string
}

export interface SessionType {
  id: string
  school_id: string
  name: string
  duration_minutes: number
  price_cents: number
  deposit_cents: number
  // ROA-98 additive fields
  booking_mode: BookingMode
  reminder_offsets_hours: number[]
  requires_pickup: boolean
}

// ─── Supabase generic Database type (must be defined after individual interfaces) ───

// Supabase generic database type — pass to createClient<Database> for full type inference.
// Insert/Update types use index signatures so they satisfy postgrest-js's `GenericTable`
// constraint (`Record<string, unknown>`). Without the index signature, `.update()` and
// `.insert()` chain inference falls back to `never` because the type can't be matched
// against the GenericTable constraint and falls through to GenericView (read-only).
export interface Database {
  public: {
    Tables: {
      students_driver_ed: {
        Row: { [key: string]: unknown } & StudentsDriverEd
        Insert: { [key: string]: unknown | undefined; school_id?: string; legal_name?: string; dob?: string; permit_number?: string | null; parent_email?: string; emergency_contact_name?: string; emergency_contact_phone?: string | null; classroom_hours?: number; driving_hours?: number; certificate_issued_at?: string | null }
        Update: { [key: string]: unknown | undefined; school_id?: string; legal_name?: string; dob?: string; permit_number?: string | null; parent_email?: string; emergency_contact_name?: string; emergency_contact_phone?: string | null; classroom_hours?: number; driving_hours?: number; certificate_issued_at?: string | null }
        Relationships: []
      }
      instructors: {
        Row: { [key: string]: unknown } & Instructor
        Insert: { [key: string]: unknown | undefined; school_id?: string; name?: string; email?: string; phone?: string; license_number?: string; license_expiry?: string; active?: boolean }
        Update: { [key: string]: unknown | undefined; school_id?: string; name?: string; email?: string; phone?: string; license_number?: string; license_expiry?: string; active?: boolean }
        Relationships: []
      }
      sessions: {
        Row: { [key: string]: unknown } & Session
        Insert: { [key: string]: unknown | undefined; school_id?: string; session_type_id?: string; instructor_id?: string; start_date?: string; location?: string; max_seats?: number; seats_booked?: number; status?: string }
        Update: { [key: string]: unknown | undefined; school_id?: string; session_type_id?: string; instructor_id?: string; start_date?: string; location?: string; max_seats?: number; seats_booked?: number; status?: string }
        Relationships: []
      }
      bookings: {
        Row: { [key: string]: unknown } & Booking
        Insert: { [key: string]: unknown | undefined; session_id?: string | null; school_id?: string; instructor_id?: string | null; student_name?: string; student_email?: string; student_phone?: string | null; status?: string; deposit_amount_cents?: number; booking_token?: string | null; confirmation_token?: string | null; cancellation_reason?: string | null; cancelled_at?: string | null }
        Update: { [key: string]: unknown | undefined; session_id?: string | null; school_id?: string; instructor_id?: string | null; student_name?: string; student_email?: string; student_phone?: string | null; status?: string; deposit_amount_cents?: number; booking_token?: string | null; confirmation_token?: string | null; cancellation_reason?: string | null; cancelled_at?: string | null }
        Relationships: []
      }
      audit_logs: {
        Row: { [key: string]: unknown } & AuditLog
        Insert: { [key: string]: unknown | undefined; action?: string; actor_id?: string; details?: Record<string, unknown> }
        Update: { [key: string]: unknown | undefined; action?: string; actor_id?: string; details?: Record<string, unknown> }
        Relationships: []
      }
      schools: {
        Row: { [key: string]: unknown } & School
        Insert: { [key: string]: unknown | undefined; name?: string; owner_email?: string; owner_name?: string; phone?: string; state?: string; license_number?: string; plan_tier?: string; stripe_customer_id?: string | null; service_zips?: string }
        Update: { [key: string]: unknown | undefined; name?: string; owner_email?: string; owner_name?: string; phone?: string; state?: string; license_number?: string; plan_tier?: string; stripe_customer_id?: string | null; service_zips?: string }
        Relationships: []
      }
      session_types: {
        Row: { [key: string]: unknown } & SessionType
        Insert: { [key: string]: unknown | undefined; school_id?: string; name?: string; duration_minutes?: number; price_cents?: number; deposit_cents?: number }
        Update: { [key: string]: unknown | undefined; school_id?: string; name?: string; duration_minutes?: number; price_cents?: number; deposit_cents?: number }
        Relationships: []
      }
      dashboard_widget_preferences: {
        Row: { [key: string]: unknown } & {
          school_id: string
          user_id: string | null
          role: string
          widget_key: string
          enabled: boolean
          display_order: number
          size: string
        }
        Insert: { [key: string]: unknown | undefined; school_id?: string; user_id?: string | null; role?: string; widget_key?: string; enabled?: boolean; display_order?: number; size?: string }
        Update: { [key: string]: unknown | undefined; school_id?: string; user_id?: string | null; role?: string; widget_key?: string; enabled?: boolean; display_order?: number; size?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ─── Joined/extended types used in route handlers ─────────────────────────────

export interface BookingWithSession extends Booking {
  session: Pick<Session, 'id' | 'school_id' | 'start_date' | 'seats_booked'> | null
}

export interface BookingFull extends Booking {
  session: {
    id: string
    start_date: string
    location: string
    session_type: Pick<SessionType, 'name' | 'duration_minutes' | 'price_cents' | 'deposit_cents'>
    instructor: Pick<Instructor, 'name'>
  }
}

export interface CheckoutBookingData extends Booking {
  session: {
    id: string
    school_id: string
    start_date: string
    location: string
    session_type: Pick<SessionType, 'name'>
  }
}


// ─── ROA-98 Agent Operator additions ─────────────────────────────────────────

export type ConversationRole = 'customer' | 'instructor'
export type AgentMode = 'shadow' | 'graduated' | 'paused'
export type BookingMode = 'class_seat' | 'private_request'
export type InstructorEventType = 'confirm' | 'start' | 'end' | 'delay' | 'no_show' | 'note'
export type ApprovalType =
  | 'publish_schedule'
  | 'reschedule'
  | 'cancel'
  | 'refund'
  | 'exception_reply'
export type ScheduleProposalStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'superseded'

// Extended core tables (additive, safe defaults applied at the DB layer)

export interface SchoolAgentSettings {
  school_id: string
  agent_mode: AgentMode
  drive_buffer_minutes: number
  default_reminder_offsets_hours: number[]
  instructor_brief_local_time: string
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  sms_signature: string | null
  consent_message: string | null
  auto_send_faq: boolean
  auto_send_intake_prompts: boolean
  auto_send_receipts: boolean
  auto_send_reminders: boolean
  auto_send_instructor_briefs: boolean
  auto_publish_schedule: boolean
  auto_apply_reschedules: boolean
  auto_apply_cancellations: boolean
  auto_apply_refunds: boolean
  auto_apply_discounts: boolean
  escalation_phone: string | null
  created_at: string
  updated_at: string
}

export interface AgentConversation {
  id: string
  school_id: string
  role: ConversationRole
  sms_phone: string
  contact_id: string | null
  instructor_id: string | null
  state: 'active' | 'paused' | 'opted_out' | 'closed'
  consent_at: string | null
  last_message_at: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AgentMessage {
  id: string
  conversation_id: string
  school_id: string
  direction: 'inbound' | 'outbound'
  provider_message_sid: string | null
  job_id: string | null
  body: string
  intent: string | null
  confidence: number | null
  status:
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'failed'
    | 'received'
    | 'opted_out'
  error_code: string | null
  idempotency_key: string | null
  received_at: string | null
  sent_at: string | null
  delivered_at: string | null
  created_at: string
}

export interface BookingIntake {
  id: string
  school_id: string
  conversation_id: string | null
  parent_name: string | null
  parent_phone: string
  parent_email: string | null
  student_name: string | null
  student_age: number | null
  service_requested: string | null
  pickup_address: string | null
  availability_windows: unknown[]
  notes: string | null
  state:
    | 'collecting'
    | 'awaiting_schedule'
    | 'awaiting_payment'
    | 'confirmed'
    | 'cancelled'
    | 'abandoned'
  session_type_id: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleProposal {
  id: string
  school_id: string
  schedule_date: string
  generated_at: string
  generated_by: 'scheduler' | 'recovery' | 'admin'
  inputs: Record<string, unknown>
  assignments: unknown[]
  travel_legs: unknown[]
  score_overtime_risk: number | null
  score_window_deviation: number | null
  score_idle_time: number | null
  score_total_travel_minutes: number | null
  conflict_reasons: unknown[]
  status: ScheduleProposalStatus
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_reason: string | null
  superseded_by: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleAssignment {
  id: string
  proposal_id: string
  school_id: string
  booking_id: string | null
  instructor_id: string | null
  session_type_id: string | null
  scheduled_start: string
  scheduled_end: string
  travel_in_minutes: number | null
  slack_minutes: number | null
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  google_event_id: string | null
  created_at: string
  updated_at: string
}

export interface InstructorEvent {
  id: string
  school_id: string
  instructor_id: string
  conversation_id: string | null
  type: InstructorEventType
  provider_message_sid: string | null
  assignment_id: string | null
  raw_text: string | null
  payload: Record<string, unknown>
  delay_minutes: number | null
  student_name: string | null
  occurred_at: string
  created_at: string
}

export interface AgentApproval {
  id: string
  school_id: string
  type: ApprovalType
  subject_table: string | null
  subject_id: string | null
  summary: string
  payload: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  decided_at: string | null
  decided_by: string | null
  decision_note: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type AgentJobKind =
  | 'send_5d_class_brief'
  | 'send_7am_daily_brief'
  | 'send_weekly_digest'
  | 'process_inbound_sms'
  | 'process_inbound_sms_status'
  | 'expire_holds'
  | 'expire_approvals'
  | 'generate_schedule_proposal'
  | 'apply_approved_proposal'
  | 'handle_instructor_command'
  | 'handle_payment_webhook'
  | 'handle_twilio_status'

export type AgentJobStatus =
  | 'pending'
  | 'claimed'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'dead_letter'

export interface AgentJob {
  id: string
  school_id: string | null
  kind: AgentJobKind
  payload: Record<string, unknown>
  idempotency_key: string | null
  status: AgentJobStatus
  attempt_count: number
  max_attempts: number
  next_run_at: string
  last_error: string | null
  priority: number
  claimed_at: string | null
  claimed_by: string | null
  started_at: string | null
  completed_at: string | null
  result: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type SchoolIntegrationProvider =
  | 'twilio'
  | 'stripe_connect'
  | 'google_calendar'
  | 'google_routes'

export interface SchoolIntegration {
  id: string
  school_id: string
  provider: SchoolIntegrationProvider
  credentials_encrypted: string | null
  config: Record<string, unknown>
  last_verified_at: string | null
  enabled: boolean
  external_account_id: string | null
  created_at: string
  updated_at: string
}

export interface ProcessedProviderEvent {
  id: string
  provider: 'twilio' | 'stripe'
  provider_event_id: string
  kind: string | null
  job_id: string | null
  received_at: string
}

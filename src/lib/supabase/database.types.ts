// ACTUAL schema from live Supabase DB (REST API introspection, 2026-04-28)
// This is the source of truth — not the migrations.

// ─── Actual table columns (verified against live DB) ─────────────────────────────────

export interface SchoolsRow {
  id: string
  name: string
  owner_email: string
  owner_name: string | null
  phone: string | null
  state: string
  license_number: string | null
  plan_tier: string
  stripe_customer_id: string | null
  service_zips: string | null
  created_at: string
  slug: string | null
  owner_user_id: string | null
  subscription_status: string | null
  subscription_id: string | null
  trial_ends_at: string | null
  active: boolean
}

export interface StudentsDriverEdRow {
  id: string
  legal_name: string
  permit_number: string | null
  dob: string
  parent_email: string
  contract_signed_url: string | null
  classroom_hours: number
  driving_hours: number
  certificate_issued_at: string | null
  class_session_id: string | null
  created_at: string
  permit_expiration: string | null
  date_of_birth: string | null
  address_street: string | null
  address_city: string | null
  emergency_contact_name: string
  emergency_contact_phone: string | null
  signature_url: string | null
  school_id: string
  enrollment_date: string
  completion_date: string | null
  certificate_number: string | null
  reminder_72h_sent: boolean | null
  reminder_24h_sent: boolean | null
  dob_encrypted: string | null
  permit_encrypted: string | null
}

export interface SessionsRow {
  id: string
  start_date: string
  start_time: string | null
  end_date: string | null
  max_seats: number
  seats_booked: number
  created_at: string
  school_id: string
  instructor_id: string | null
  session_type_id: string | null
  status: string
  location: string | null
}

export interface BookingsRow {
  id: string
  school_id: string
  session_type_id: string | null
  instructor_id: string | null
  session_date: string | null
  session_time: string | null
  student_name: string
  student_email: string
  student_phone: string | null
  status: string
  payment_status: string | null
  stripe_payment_intent_id: string | null
  booking_token: string | null
  notes: string | null
  created_at: string
  reminder_48h_sent: boolean | null
  reminder_4h_sent: boolean | null
  session_id: string | null
  deposit_amount_cents: number | null
  confirmation_token: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  student_id: string | null
}

export interface SessionTypesRow {
  id: string
  school_id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cents: number
  deposit_cents: number
  color: string | null
  tca_hours_credit: number | null
  active: boolean
  created_at: string
}

export interface InstructorsRow {
  id: string
  school_id: string
  name: string
  email: string | null
  phone: string | null
  license_number: string | null
  license_expiry: string | null
  active: boolean
  created_at: string
}

export interface InstructorAvailabilityRow {
  id: string
  instructor_id: string
  day_of_week: number       // 0=Sunday, 1=Monday, … 6=Saturday
  start_time: string        // HH:MM format
  end_time: string          // HH:MM format
  active: boolean | null
  created_at: string
}

export interface SchoolProfilesRow {
  school_id: string
  tagline: string | null
  about: string | null
  address: string | null
  city: string | null
  zip: string | null
  email: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  created_at: string
  updated_at: string | null
}

// ─── Joined/computed types used in route handlers ───────────────────────────────────

export interface SessionWithDetails extends SessionsRow {
  instructor: Pick<InstructorsRow, 'id' | 'name'> | null
  session_type: Pick<SessionTypesRow, 'name' | 'duration_minutes' | 'price_cents' | 'deposit_cents'> | null
}

export interface BookingWithSession extends BookingsRow {
  session: Pick<SessionsRow, 'id' | 'school_id' | 'start_date' | 'seats_booked'> | null
}

export interface CheckoutBookingData extends BookingsRow {
  session: {
    id: string
    school_id: string
    start_date: string
    session_type: Pick<SessionTypesRow, 'name'>
  }
}

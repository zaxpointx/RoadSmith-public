export type PublicBookingView = {
  id: string
  student_name: string
  student_email: string
  student_phone: string | null
  status: string
  payment_status?: string | null
  deposit_amount_cents?: number | null
  session_date: string | null
  session_time: string | null
  session: {
    id: string
    school_id: string
    start_date: string
    start_time?: string | null
    location: string | null
    session_type: { id: string; name: string; color: string | null; duration_minutes: number; price_cents?: number; deposit_cents?: number } | null
    instructor: { id: string; name: string } | null
    school: { id: string; name: string } | null
  } | null
}

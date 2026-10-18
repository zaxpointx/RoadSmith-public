import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { instructorBookingNotificationEmail } from '@/lib/email-templates/instructor-booking-notify'

type InstructorNotificationBooking = {
  id: string
  student_name: string | null
  student_email: string | null
  student_phone: string | null
  session_date: string | null
  session_time: string | null
  booking_token: string | null
  session: {
    start_date: string | null
    location: string | null
    instructor: { name: string | null; email: string | null } | null
    session_type: { name: string | null } | null
    school: { name: string | null } | null
  } | null
}

/**
 * POST /api/instructor-notify
 *
 * Sends an instructor notification email when a booking is confirmed.
 * Called from the Stripe webhook handler after booking status → confirmed.
 *
 * Body: { booking_id: string }
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { booking_id } = body

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Get booking with full session + instructor info
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select(`
      id,
      student_name,
      student_email,
      student_phone,
      session_date,
      session_time,
      booking_token,
      session:session_id(
        id,
        school_id,
        start_date,
        location,
        instructor:instructors(id, name, email, phone),
        session_type:session_type_id(name, duration_minutes),
        school:schools(id, name)
      )
    `)
    .eq('id', booking_id)
    .eq('status', 'confirmed')
    .single() as unknown as { data: InstructorNotificationBooking | null; error: { message: string } | null }

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found or not confirmed' }, { status: 404 })
  }

  const instructor = booking.session?.instructor
  const sessionType = booking.session?.session_type
  const school = booking.session?.school

  if (!instructor?.email) {
    // No instructor email — log and skip
    console.log(`[instructor-notify] No instructor email for booking ${booking_id}`)
    return NextResponse.json({ skipped: true, reason: 'no_instructor_email' })
  }

  const sDate = booking.session_date ?? booking.session?.start_date ?? ''
  const sTime = booking.session_time ?? ''

  const formattedDate = sDate
    ? new Date(`${sDate}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      })
    : 'TBD'

  const formattedTime = sTime
    ? (() => {
        const [h, m] = sTime.split(':').map(Number)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
        return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
      })()
    : 'TBD'

  try {
    const email = instructorBookingNotificationEmail({
      instructorName: instructor.name ?? 'Instructor',
      studentName: booking.student_name ?? 'Student',
      studentEmail: booking.student_email ?? '',
      studentPhone: booking.student_phone ?? '',
      lessonType: sessionType?.name ?? 'Driving Lesson',
      schoolName: school?.name ?? 'Roadsmith',
      date: formattedDate,
      time: formattedTime,
      location: booking.session?.location ?? '',
      bookingToken: booking.booking_token ?? '',
    })

    // Import sendEmail from lib/email.ts
    const { sendEmail } = await import('@/lib/email')
    await sendEmail({
      to: instructor.email,
      subject: email.subject,
      html: email.html,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown notification error'
    console.error('[instructor-notify] Failed to send:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

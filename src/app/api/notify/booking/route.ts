import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendBookingConfirmationEmail } from '@/lib/email'

export async function POST(request: Request) {
  const body = await request.json()
  const { studentEmail, studentName, bookingId } = body

  if (!studentEmail || !bookingId) {
    return new NextResponse('Missing required fields', { status: 400 })
  }

  type BookingNotificationRecord = { id: string; student_name: string | null; session_date: string | null; session_time: string | null; booking_token: string | null; school_id: string }
  type SchoolNotificationRecord = { name: string | null; phone: string | null; slug: string | null }
  const admin = getSupabaseAdmin()

  // Get booking
  const { data: booking } = await (admin
    .from('bookings')
    .select('id, student_name, session_date, session_time, booking_token, school_id')
    .eq('id', bookingId)
    .single() as unknown as Promise<{ data: BookingNotificationRecord | null }>)

  if (!booking) return new NextResponse('Booking not found', { status: 404 })

  const schoolId = booking.school_id

  // Get school info
  const { data: school } = await (admin
    .from('schools')
    .select('name, phone, slug')
    .eq('id', schoolId)
    .single() as unknown as Promise<{ data: SchoolNotificationRecord | null }>)

  const sDate = booking.session_date ?? ''
  const sTime = booking.session_time ?? ''
  const bToken = booking.booking_token ?? ''

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const schoolSlug = school?.slug ?? ''

  const rescheduleUrl = bToken ? `${appUrl}/book/reschedule/${bToken}` : `${appUrl}/school/${schoolSlug}`
  const cancelUrl = bToken ? `${appUrl}/book/cancel/${bToken}` : `${appUrl}/school/${schoolSlug}`

  const formattedDate = sDate
    ? new Date(`${sDate}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      })
    : 'TBD'

  try {
    await sendBookingConfirmationEmail(
      studentEmail,
      studentName ?? booking.student_name ?? 'Student',
      'Driving Lesson',
      school?.name ?? 'Roadsmith',
      school?.phone ?? '',
      formattedDate,
      sTime,
      '',
      rescheduleUrl,
      cancelUrl
    )
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email error'
    console.error('Booking email send failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

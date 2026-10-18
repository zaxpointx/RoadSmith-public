import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// PATCH /api/instructor/bookings/[id]
// Marks a booking session as completed
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const demoMode = process.env.DEMO_MODE === 'true'

  let instructorId: string | null = null

  if (demoMode) {
    instructorId = request.headers.get('x-instructor-id')
    if (!instructorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const { data: instructor } = await supabase
      .from('instructors')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!instructor) {
      return new NextResponse('Instructor not found', { status: 404 })
    }
    instructorId = instructor.id
  }

  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Update the booking status to completed
  const { data, error } = await (admin
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', id)
    .eq('instructor_id', instructorId)
    .select('id, status')
    .single() as unknown as Promise<{ data: { id: string; status: string } | null; error: { message: string } | null }>)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Booking not found or not yours' }, { status: 404 })
  }

  return NextResponse.json({ success: true, booking: data })
}

import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

// Type for school record from admin query
interface SchoolRecord {
  id: string
  name: string
  email: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const schoolId = request.headers.get('x-school-id')
  if (!schoolId) return new NextResponse('Missing x-school-id', { status: 400 })

  // Get school details — use service role to bypass RLS
  const supabaseAdmin = getSupabaseAdmin()
  const { data: school, error } = await supabaseAdmin
    .from('schools')
    .select('id, name, email')
    .eq('id', schoolId)
    .single()

  if (error || !school) return new NextResponse('School not found', { status: 404 })

  try {
    await sendWelcomeEmail((school as SchoolRecord).email, (school as SchoolRecord).name, (school as SchoolRecord).id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

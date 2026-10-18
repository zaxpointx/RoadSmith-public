import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { encryptField, validateEmail, validatePhone } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { legal_name, dob, permit_number, emergency_contact_name, emergency_contact_phone, parent_email } = body

    if (!legal_name || !dob) {
      return NextResponse.json({ error: 'legal_name and dob are required' }, { status: 400 })
    }

    if (parent_email && !validateEmail(parent_email).valid) {
      return NextResponse.json({ error: 'Invalid parent_email' }, { status: 400 })
    }

    if (emergency_contact_phone && !validatePhone(emergency_contact_phone).valid) {
      return NextResponse.json({ error: 'Invalid emergency_contact_phone' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const encryptedName = await encryptField(legal_name)
    const encryptedPermit = permit_number ? await encryptField(permit_number) : 'PENDING'
    const encryptedPhone = emergency_contact_phone ? await encryptField(emergency_contact_phone) : null

    const updatePayload = {
      legal_name: encryptedName,
      dob,
      permit_number: encryptedPermit,
      emergency_contact_name,
      emergency_contact_phone: encryptedPhone,
      parent_email,
    }
    const { error } = await admin
      .from('students_driver_ed')
      .update(updatePayload)
      .eq('parent_email', user.email!)
      .eq('permit_number', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
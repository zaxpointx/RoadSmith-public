import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { resolveSchoolAdminContext } from '@/lib/school-admin/auth'

const DEFAULTS = {
  booking_confirmations: true,
  payment_alerts: true,
  session_reminders: true,
  instructor_schedule_changes: true,
  compliance_alerts: true,
  marketing_updates: false,
  reminder_48h: true,
  reminder_4h: true,
}

export async function GET(request: Request) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = getSupabaseAdmin() as unknown as SupabaseClient

  const { data, error } = await admin
    .from('notification_preferences')
    .select('*')
    .eq('school_id', context.schoolId)
    .eq('role', 'admin')
    .maybeSingle()

  if (error) return NextResponse.json({ preferences: DEFAULTS, persisted: false })
  return NextResponse.json({ preferences: data ? { ...DEFAULTS, ...data } : DEFAULTS, persisted: Boolean(data) })
}

export async function PATCH(request: Request) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const admin = getSupabaseAdmin() as unknown as SupabaseClient
  const payload = Object.fromEntries(
    Object.keys(DEFAULTS)
      .filter((key) => typeof body[key] === 'boolean')
      .map((key) => [key, body[key]])
  )

  const { data, error } = await admin
    .from('notification_preferences')
    .upsert({
      school_id: context.schoolId,
      user_id: context.userId,
      role: 'admin',
      ...DEFAULTS,
      ...payload,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'school_id,role,user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preferences: data })
}

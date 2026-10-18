import { cookies } from 'next/headers'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'

export type SchoolAdminContext = {
  schoolId: string
  userId: string | null
  ownerEmail: string | null
  demo: boolean
}

export async function resolveSchoolAdminContext(request?: Request): Promise<SchoolAdminContext | null> {
  const cookieStore = await cookies()
  const demoCookie = cookieStore.get('demo_user')

  if (demoCookie?.value) {
    try {
      const payload = JSON.parse(Buffer.from(demoCookie.value, 'base64').toString('utf8'))
      if (payload?.schoolId) {
        return {
          schoolId: payload.schoolId,
          userId: payload.userId ?? null,
          ownerEmail: payload.email ?? null,
          demo: true,
        }
      }
    } catch {
      return null
    }
  }

  const admin = getSupabaseAdmin()
  const headerSchoolId = request?.headers.get('x-school-id')
  const authHeader = request?.headers.get('Authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user?.email) return null

    const schoolQuery = admin
      .from('schools')
      .select('id')
      .eq('owner_email', user.email)

    if (headerSchoolId) schoolQuery.eq('id', headerSchoolId)

    const { data: school } = await schoolQuery.limit(1).maybeSingle() as { data: { id: string } | null; error: unknown }
    if (!school?.id) return null

    return { schoolId: school.id, userId: user.id, ownerEmail: user.email, demo: false }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const query = admin
    .from('schools')
    .select('id')
    .or(`owner_user_id.eq.${user.id},owner_email.eq.${user.email}`)

  if (headerSchoolId) query.eq('id', headerSchoolId)

  const { data: school } = await query.limit(1).maybeSingle() as { data: { id: string } | null; error: unknown }
  if (!school?.id) return null

  return { schoolId: school.id, userId: user.id, ownerEmail: user.email, demo: false }
}

export async function insertActivityLog(input: {
  schoolId: string
  actorType?: string
  actorId?: string | null
  eventType: string
  entityType?: string | null
  entityId?: string | null
  message: string
  metadata?: Record<string, unknown>
}) {
  const admin = getSupabaseAdmin()
  const activityLogTable = admin.from('activity_log') as unknown as {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }
  const { error } = await activityLogTable.insert({
    school_id: input.schoolId,
    actor_type: input.actorType ?? 'system',
    actor_id: input.actorId ?? null,
    event_type: input.eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    message: input.message,
    metadata: input.metadata ?? {},
  })

  if (error) {
    await admin.from('audit_logs').insert({
      action: input.eventType,
      actor_id: input.actorId ?? 'system',
      metadata: {
        school_id: input.schoolId,
        message: input.message,
        ...(input.metadata ?? {}),
      },
      created_at: new Date().toISOString(),
    }).throwOnError?.()
  }
}

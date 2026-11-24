/** Shared guards and read models for the sandbox phone simulator. */
import { isSandbox, many, one, type Db } from './db.ts'
import { now } from './clock.ts'
import { schoolByPhone, type School } from './school.ts'
import { normalizePhone } from './util.ts'
import { fmtWhen } from './time.ts'

/** The sandbox phone and its controls exist only when running on the local sandbox database. */
export function sandboxEnabled(): boolean {
  return isSandbox()
}

export async function sandboxSchool(db: Db, phone: string | null | undefined): Promise<School | null> {
  const p = normalizePhone(phone ?? '+16155550100')
  if (!p) return null
  const s = await schoolByPhone(db, p)
  return s?.is_sandbox ? s : null
}

export interface ThreadMessage { id: string; direction: 'in' | 'out'; author: string; body: string; at: string; tools?: { tool: string; ok: boolean }[] }

export async function thread(db: Db, school: School, phone: string): Promise<{ conversationId: string | null; mode: string | null; messages: ThreadMessage[] }> {
  const conv = await one<{ id: string; mode: string }>(db, `select id, mode from rs.conversations where school_id = $1 and phone = $2`, [school.id, phone])
  if (!conv) return { conversationId: null, mode: null, messages: [] }
  const rows = await many<{ id: string; direction: 'in' | 'out'; author: string; body: string; created_at: Date; meta: { tools?: { tool: string; ok: boolean }[] } }>(db,
    `select id, direction, author, body, created_at, meta from rs.messages where conversation_id = $1 order by created_at, id limit 300`, [conv.id])
  return { conversationId: conv.id, mode: conv.mode, messages: rows.map((r) => ({ id: r.id, direction: r.direction, author: r.author, body: r.body, at: new Date(r.created_at).toISOString(), tools: r.meta?.tools })) }
}

export interface Persona { phone: string; name: string; role: string; detail: string }

export async function personas(db: Db, school: School): Promise<Persona[]> {
  const staff = await many<{ name: string; phone: string; role: string }>(db, `select name, phone, role from rs.staff where school_id = $1 and phone is not null and active order by role desc, name`, [school.id])
  const contacts = await many<{ name: string; phone: string; kind: string; students: string | null }>(db,
    `select c.name, c.phone, c.kind, string_agg(s.first_name, ', ') as students from rs.contacts c
       left join rs.students s on s.guardian_contact_id = c.id or s.student_contact_id = c.id
      where c.school_id = $1 and c.name <> '' and (c.phone like '+1615555020%' or c.phone like '+1615555022%')
      group by c.id order by c.kind, c.name`, [school.id])
  return [
    { phone: '+16155550199', name: 'New parent', role: 'lead', detail: 'Unknown number — starts from scratch' },
    ...contacts.map((c) => ({ phone: c.phone, name: c.name, role: c.kind, detail: c.students ? `${c.kind === 'parent' ? 'Parent of' : 'Student:'} ${c.students}` : c.kind })),
    ...staff.map((s) => ({ phone: s.phone, name: s.name, role: s.role, detail: s.role === 'owner' ? 'Owner — business questions & approvals' : 'Instructor — schedule, done, late' })),
  ]
}

export async function sandboxState(db: Db, school: School) {
  const outbox = await many<{ to_address: string; body: string; status: string; reason: string; created_at: Date; name: string | null }>(db,
    `select o.to_address, o.body, o.status, o.reason, o.created_at, coalesce(c.name, st.name) as name from rs.outbox o
       left join rs.contacts c on c.school_id = o.school_id and c.phone = o.to_address
       left join rs.staff st on st.school_id = o.school_id and st.phone = o.to_address
      where o.school_id = $1 order by o.created_at desc limit 40`, [school.id])
  const due = await one<{ n: number; next: Date | null }>(db, `select count(*)::int as n, min(run_at) as next from rs.jobs where school_id = $1 and status = 'pending'`, [school.id])
  return {
    now: now().toISOString(),
    nowLabel: fmtWhen(now(), school.timezone),
    timezone: school.timezone,
    pendingJobs: due?.n ?? 0,
    nextJob: due?.next ? fmtWhen(new Date(due.next), school.timezone) : null,
    outbox: outbox.map((o) => ({ to: o.to_address, name: o.name, body: o.body, status: o.status, reason: o.reason, at: new Date(o.created_at).toISOString() })),
  }
}

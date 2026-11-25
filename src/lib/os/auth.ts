/**
 * Control Center sessions.
 *
 * A session is an HMAC-signed cookie naming one staff member at one school.
 * Every Control Center request re-loads that staff row and scopes all work to
 * its school — the school id is never taken from the request.
 *
 *  - Sandbox: "Enter the sandbox" signs in as the demo owner (synthetic data).
 *  - Production: Supabase Auth (magic link) identifies the user by email,
 *    which must match an active owner/admin in rs.staff.
 */
import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { isSandbox, one, type Db } from './db.ts'
import { hmac, safeEqual } from './util.ts'
import { loadSchool, type School } from './school.ts'
import { ready } from './sandbox.ts'

export const SESSION_COOKIE = 'rs_session'
const TTL_MS = 12 * 3600 * 1000

export interface StaffSession {
  staff: { id: string; name: string; role: 'owner' | 'admin' | 'instructor'; email: string | null }
  school: School
  db: Db
}

async function secret(db: Db): Promise<string> {
  if (process.env.ROADSMITH_SESSION_SECRET) return process.env.ROADSMITH_SESSION_SECRET
  if (!isSandbox()) throw new Error('ROADSMITH_SESSION_SECRET must be set outside the sandbox.')
  const row = await one<{ value: { s: string } }>(db, `select value from rs.settings where key = 'session_secret'`)
  if (row) return row.value.s
  const s = randomBytes(32).toString('base64url')
  await db.query(`insert into rs.settings (key, value) values ('session_secret', $1::jsonb) on conflict (key) do nothing`, [JSON.stringify({ s })])
  return (await one<{ value: { s: string } }>(db, `select value from rs.settings where key = 'session_secret'`))!.value.s
}

export async function signSession(db: Db, staffId: string): Promise<string> {
  const payload = Buffer.from(JSON.stringify({ sid: staffId, exp: Date.now() + TTL_MS })).toString('base64url')
  return `${payload}.${hmac(await secret(db), payload)}`
}

async function verify(db: Db, value: string | undefined): Promise<string | null> {
  if (!value) return null
  const [payload, sig] = value.split('.')
  if (!payload || !sig || !safeEqual(sig, hmac(await secret(db), payload))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sid: string; exp: number }
    return data.exp > Date.now() ? data.sid : null
  } catch {
    return null
  }
}

async function staffSession(db: Db, staffId: string): Promise<StaffSession | null> {
  const staff = await one<StaffSession['staff'] & { school_id: string }>(db,
    `select id, name, role, email, school_id from rs.staff where id = $1 and active and role in ('owner','admin')`, [staffId])
  if (!staff) return null
  const school = await loadSchool(db, staff.school_id)
  return school ? { staff: { id: staff.id, name: staff.name, role: staff.role, email: staff.email }, school, db } : null
}

/** The signed-in owner/admin, or null. */
export async function getSession(): Promise<StaffSession | null> {
  const db = await ready()
  const jar = await cookies()
  const sid = await verify(db, jar.get(SESSION_COOKIE)?.value)
  if (sid) return staffSession(db, sid)
  if (!isSandbox() && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const { createServerClient } = await import('@supabase/ssr')
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: { getAll: () => jar.getAll(), setAll: () => {} },
    })
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email?.toLowerCase()
    if (!email || !data.user?.email_confirmed_at) return null
    const staff = await one<{ id: string }>(db, `select id from rs.staff where lower(email) = $1 and active and role in ('owner','admin') limit 1`, [email])
    return staff ? staffSession(db, staff.id) : null
  }
  return null
}

/** For the sandbox's one-click entry: the demo school's owner. */
export async function sandboxOwnerId(db: Db, slug = 'larkspur'): Promise<string | null> {
  if (!isSandbox()) return null
  return (await one<{ id: string }>(db, `select st.id from rs.staff st join rs.schools s on s.id = st.school_id where s.slug = $1 and s.is_sandbox and st.role = 'owner' limit 1`, [slug]))?.id ?? null
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: TTL_MS / 1000,
}

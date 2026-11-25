/** Server-side helpers for Control Center pages. */
import { redirect } from 'next/navigation'
import { getSession, type StaffSession } from './auth.ts'
import { isSandbox } from './db.ts'
import { tickAll } from './automations.ts'

export async function requireSession(): Promise<StaffSession & { ctx: { q: StaffSession['db']; school: StaffSession['school'] } }> {
  // In the sandbox there is no cron, so due work runs whenever someone looks.
  if (isSandbox()) await tickAll().catch((e) => console.error('[roadsmith] tick failed', e))
  const s = await getSession()
  if (!s) redirect('/app/login')
  return { ...s, ctx: { q: s.db, school: s.school } }
}

export function relTime(d: Date, ref: Date): string {
  const mins = Math.round((+ref - +d) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

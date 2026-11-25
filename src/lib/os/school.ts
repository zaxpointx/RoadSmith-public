import { one, type Q } from './db.ts'
import { parsePlaybook, type Playbook } from './playbook.ts'

export interface School {
  id: string
  slug: string
  name: string
  timezone: string
  currency: string
  agent_phone: string
  address: string
  lat: number | null
  lng: number | null
  is_sandbox: boolean
  playbook: Playbook
}

/** Everything a domain function needs: a query runner bound to one school. */
export interface Ctx {
  q: Q
  school: School
}

function hydrate(row: Record<string, unknown> | null): School | null {
  if (!row) return null
  return { ...(row as unknown as School), playbook: parsePlaybook(row.playbook) }
}

export async function loadSchool(q: Q, id: string): Promise<School | null> {
  return hydrate(await one(q, `select * from rs.schools where id = $1`, [id]))
}

export async function schoolByPhone(q: Q, phone: string): Promise<School | null> {
  return hydrate(await one(q, `select * from rs.schools where agent_phone = $1`, [phone]))
}

export async function schoolBySlug(q: Q, slug: string): Promise<School | null> {
  return hydrate(await one(q, `select * from rs.schools where slug = $1`, [slug]))
}

export function schoolPoint(s: School) {
  return s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null
}

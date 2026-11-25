import { withSession, readJson, json, fail } from '@/lib/os/http'
import { playbookSchema } from '@/lib/os/playbook'
import { audit } from '@/lib/os/audit'

export const dynamic = 'force-dynamic'

/** Replace the school's playbook (validated). Changes take effect on the next message. */
export async function PUT(req: Request) {
  return withSession(req, async (s) => {
    const body = await readJson<{ playbook?: unknown }>(req)
    const merged = { ...s.school.playbook, ...(body.playbook as object) }
    const parsed = playbookSchema.safeParse(merged)
    if (!parsed.success) return fail(`Check these fields: ${parsed.error.issues.slice(0, 3).map((i) => i.path.join('.')).join(', ')}`)
    const changed = Object.keys(body.playbook ?? {})
    await s.db.tx(async (q) => {
      await q.query(`update rs.schools set playbook = $2::jsonb where id = $1`, [s.school.id, JSON.stringify(parsed.data)])
      await audit({ q, school: s.school }, { type: 'staff', id: s.staff.id, label: s.staff.name }, 'playbook.updated', { type: 'school', id: s.school.id }, { sections: changed })
    })
    return json({ ok: true })
  })
}

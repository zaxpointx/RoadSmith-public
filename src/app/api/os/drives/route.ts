import { withSession, readJson, json, fail } from '@/lib/os/http'
import { planCohortDrives } from '@/lib/os/cohort'
import { createInbox } from '@/lib/os/inbox'

export const dynamic = 'force-dynamic'

/** Draft a cohort's behind-the-wheel schedule into the inbox for approval. */
export async function POST(req: Request) {
  return withSession(req, async (s) => {
    const body = await readJson<{ courseId?: string }>(req)
    if (!body.courseId) return fail('Pick a course.')
    const out = await s.db.tx(async (q) => {
      const ctx = { q, school: s.school }
      const plan = await planCohortDrives(ctx, { courseId: body.courseId! })
      if (!plan.items.length) return { plan, itemId: null }
      const item = await createInbox(ctx, {
        kind: 'approval', title: `Drive plan: ${plan.course} (${plan.items.length} students)`,
        detail: plan.items.map((x) => `${x.student}: ${x.label} with ${x.instructor.split(' ')[0]}`).join('\n') + (plan.unplaced.length ? `\nNot placed: ${plan.unplaced.map((u) => `${u.student} (${u.reason})`).join('; ')}` : ''),
        action: { type: 'apply_drive_plan', args: { plan } as unknown as Record<string, unknown> },
      })
      return { plan, itemId: item.id }
    })
    return json({ ok: true, placed: out.plan.items.length, unplaced: out.plan.unplaced, itemId: out.itemId })
  })
}

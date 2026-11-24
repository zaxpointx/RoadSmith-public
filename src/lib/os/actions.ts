/** Executes approved inbox actions. Every action re-validates current state. */
import { one } from './db.ts'
import type { Actor } from './audit.ts'
import { cancelLesson, enrollInCourse, holdLesson, markRefunded, moveLesson } from './bookings.ts'
import { applyDrivePlan, type DrivePlan } from './cohort.ts'
import { notifyContact } from './messaging.ts'
import { paymentLink, type Payment } from './payments.ts'
import { asDate, fmtMoney, fmtWhen } from './time.ts'
import { OsError } from './util.ts'
import type { InboxAction } from './inbox.ts'
import type { Ctx } from './school.ts'

async function refund(ctx: Ctx, paymentId: string, actor: Actor): Promise<string> {
  const p = await one<Payment>(ctx.q, `select * from rs.payments where id = $1 and school_id = $2`, [paymentId, ctx.school.id])
  if (!p) throw new OsError('not_found', 'Payment not found.')
  if (p.status !== 'paid') throw new OsError('invalid', `Payment is ${p.status}, not paid.`)
  if (p.provider === 'stripe') {
    if (!p.provider_ref) throw new OsError('invalid', 'No Stripe payment reference; refund it in the Stripe dashboard.')
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    await stripe.refunds.create({ payment_intent: p.provider_ref })
  }
  await markRefunded(ctx, paymentId, actor)
  return `Refunded ${fmtMoney(p.amount_cents, p.currency)}${p.provider === 'sandbox' ? ' (sandbox — no real money moved)' : ''}.`
}

export async function executeAction(ctx: Ctx, action: InboxAction, actor: Actor): Promise<string> {
  const a = action.args as Record<string, string | boolean | DrivePlan>
  const tz = ctx.school.timezone
  switch (action.type) {
    case 'move_lesson': {
      const l = await moveLesson(ctx, { lessonId: String(a.lessonId), start: new Date(String(a.start)), instructorId: a.instructorId ? String(a.instructorId) : undefined, actor, notify: true })
      return `Moved to ${fmtWhen(asDate(l.starts_at), tz)}; the family was told.`
    }
    case 'cancel_lesson': {
      const { refundable } = await cancelLesson(ctx, { lessonId: String(a.lessonId), reason: String(a.reason ?? 'approved cancellation'), actor, notifyFamily: true })
      if (refundable && a.refund) return `Cancelled. ${await refund(ctx, refundable.id, actor)}`
      return refundable ? 'Cancelled. Payment kept (no refund).' : 'Cancelled.'
    }
    case 'refund_payment':
      return refund(ctx, String(a.paymentId), actor)
    case 'apply_drive_plan': {
      const r = await applyDrivePlan(ctx, a.plan as DrivePlan, actor)
      return `Booked ${r.booked} drive${r.booked === 1 ? '' : 's'} and texted each family.${r.skipped.length ? ` Skipped: ${r.skipped.join('; ')}` : ''}`
    }
    case 'hold_lesson': {
      const { lesson, payment } = await holdLesson(ctx, { studentId: String(a.studentId), serviceId: String(a.serviceId), instructorId: String(a.instructorId), start: new Date(String(a.start)), contactId: a.contactId ? String(a.contactId) : null, actor })
      if (a.contactId) await notifyContact(ctx, String(a.contactId), payment
        ? `Good news — the office approved ${fmtWhen(asDate(lesson.starts_at), tz)}. It's held for you; pay here to confirm: ${paymentLink(payment)}`
        : `Good news — ${fmtWhen(asDate(lesson.starts_at), tz)} is confirmed.`, { reason: 'approved_booking' })
      return `Held ${fmtWhen(asDate(lesson.starts_at), tz)} and sent the payment link.`
    }
    case 'enroll_course': {
      const r = await enrollInCourse(ctx, { studentId: String(a.studentId), courseId: String(a.courseId), contactId: a.contactId ? String(a.contactId) : null, actor })
      if (r.status === 'full') throw new OsError('conflict', 'The course filled up before approval.')
      if (a.contactId && r.payment) await notifyContact(ctx, String(a.contactId), `The office approved the enrollment. Pay here to confirm the seat: ${paymentLink(r.payment)}`, { reason: 'approved_enrollment' })
      return `Enrollment ${r.status}.`
    }
  }
}

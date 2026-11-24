/**
 * Payment requests. Roadsmith never handles card data: a payment is a row with
 * an unguessable token; the customer opens /pay/<token>, which redirects to
 * Stripe Checkout (test or live keys) or, in the sandbox, a clearly labelled
 * test checkout. Status only changes from a verified provider event.
 */
import { one, type Q } from './db.ts'
import { now } from './clock.ts'
import { token } from './util.ts'
import type { Ctx } from './school.ts'

export type PaymentPurpose = 'lesson' | 'course_deposit' | 'course_tuition' | 'balance'

export interface Payment {
  id: string
  school_id: string
  contact_id: string | null
  student_id: string | null
  purpose: PaymentPurpose
  lesson_id: string | null
  enrollment_id: string | null
  description: string
  amount_cents: number
  currency: string
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded'
  token: string
  provider: 'sandbox' | 'stripe'
  provider_ref: string | null
  checkout_url: string | null
  failure_reason: string | null
  attempts: number
  expires_at: Date | null
  paid_at: Date | null
  created_at: Date
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export function paymentLink(p: Pick<Payment, 'token'>): string {
  return `${appUrl()}/pay/${p.token}`
}

/** Which provider a school's payments go through. Live keys need an explicit opt-in. */
export function paymentProvider(isSandboxSchool: boolean): 'sandbox' | 'stripe' {
  if (isSandboxSchool) return 'sandbox'
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  if (key.startsWith('sk_test_')) return 'stripe'
  if (key.startsWith('sk_live_') && process.env.ROADSMITH_ALLOW_LIVE_PAYMENTS === '1') return 'stripe'
  return 'sandbox'
}

export async function createPayment(ctx: Ctx, p: {
  contactId: string | null; studentId: string | null; purpose: PaymentPurpose; description: string; amountCents: number;
  lessonId?: string; enrollmentId?: string; expiresAt?: Date | null
}): Promise<Payment> {
  return (await one<Payment>(ctx.q,
    `insert into rs.payments (school_id, contact_id, student_id, purpose, lesson_id, enrollment_id, description, amount_cents, currency, token, provider, expires_at, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
    [ctx.school.id, p.contactId, p.studentId, p.purpose, p.lessonId ?? null, p.enrollmentId ?? null, p.description, p.amountCents,
      ctx.school.currency, token(), paymentProvider(ctx.school.is_sandbox), p.expiresAt ?? null, now()]))!
}

export async function paymentByToken(q: Q, tok: string): Promise<Payment | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(tok)) return null
  return one<Payment>(q, `select * from rs.payments where token = $1`, [tok])
}

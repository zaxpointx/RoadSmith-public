import { NextResponse } from 'next/server'
import { POST as bookingCheckout } from '@/app/api/bookings/[booking_id]/checkout/route'

/**
 * POST /api/checkout
 *
 * Canonical entry point used by the booking flow to initiate a Stripe
 * Checkout session for a pending booking. Accepts the same body as
 * /api/bookings/[booking_id]/checkout and forwards to it.
 *
 * Request body:
 *   booking_id: string (required) — id of a bookings row with status='pending'
 *
 * Response:
 *   200 { url: string }           — Stripe Checkout URL to redirect the user to
 *   200 { demo: true, confirmed } — DEMO_MODE short-circuit (no Stripe key)
 *   400 { error }                 — missing booking_id
 *   404 { error }                 — booking not found
 *   409 { error }                 — booking is not pending payment
 *   503 { error }                 — Stripe not configured outside DEMO_MODE
 *
 * The actual session creation, metadata, idempotency, and webhook
 * reconciliation are handled by /api/bookings/[booking_id]/checkout
 * and /api/webhooks/stripe — this route is a stable alias so the
 * public flow can call a non-parameterized path.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const bookingId =
    body && typeof body === 'object' && 'booking_id' in body
      ? (body as { booking_id?: unknown }).booking_id
      : undefined

  if (!bookingId || typeof bookingId !== 'string') {
    return NextResponse.json(
      { error: 'booking_id is required' },
      { status: 400 }
    )
  }

  // Forward to the real implementation. The downstream handler will
  // hydrate the booking, build line items from deposit_amount_cents,
  // create the Stripe Checkout session, and persist audit logs.
  return bookingCheckout(
    new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ booking_id: bookingId }),
    })
  )
}

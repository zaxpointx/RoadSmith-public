import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto'

export function token(bytes = 18): string {
  return randomBytes(bytes).toString('base64url')
}

export function shortCode(n = 4): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const b = randomBytes(n)
  return Array.from(b, (x) => alphabet[x % alphabet.length]).join('')
}

/** Normalise a North American phone number to E.164; returns null if it can't. */
export function normalizePhone(raw: string): string | null {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '')
  if (/^\+\d{8,15}$/.test(digits)) return digits
  const d = digits.replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return null
}

export function displayPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164
}

export function hmac(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function ageOn(dob: string, onDate: string): number {
  const [y, m, d] = dob.split('-').map(Number)
  const [Y, M, D] = onDate.split('-').map(Number)
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0)
}

/** An expected, user-explainable failure (conflict, missing info, not allowed). */
export class OsError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

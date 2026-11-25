import { createHmac } from 'node:crypto'
import { safeEqual } from './util.ts'

/**
 * Validate X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted(key+value))).
 * `url` must be the exact public URL configured in Twilio.
 */
export function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string | null): boolean {
  if (!signature) return false
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('')
  const expected = createHmac('sha1', authToken).update(Buffer.from(data, 'utf8')).digest('base64')
  return safeEqual(expected, signature)
}

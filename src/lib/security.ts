// Security-first encryption library — throws if key is missing or weak

// Security-first encryption library — throws on first use if key is missing or weak

function getEncryptionKey(): string {
  // SECURITY: server-side only. NEVER use NEXT_PUBLIC_* for encryption keys —
  // anything prefixed NEXT_PUBLIC_ is shipped to the browser bundle and is
  // effectively public. Encryption with a public key is not encryption.
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error(
      'FATAL: ENCRYPTION_KEY environment variable is required and must be at least 32 characters. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return key.slice(0, 32)
}

// Use exactly 32 bytes for AES-256
const getKeyBytes = () => new TextEncoder().encode(getEncryptionKey().padEnd(32, '\0'))

export async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit nonce for GCM
  const key = await crypto.subtle.importKey(
    'raw',
    getKeyBytes(),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )
  // Store as base64: iv (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptField(ciphertextB64: string): Promise<string> {
  if (!ciphertextB64 || ciphertextB64 === 'PENDING') return ciphertextB64
  try {
    const data = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0))
    const iv = data.slice(0, 12)
    const ciphertext = data.slice(12)
    const key = await crypto.subtle.importKey(
      'raw',
      getKeyBytes(),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch {
    // If decryption fails, return the value as-is (might be legacy plain text)
    return ciphertextB64
  }
}

// Audit logging helper — strips PII before storing
export function auditLog(action: string, actorId: string, details: Record<string, unknown>) {
  // Never log these fields in audit trail
  const PII_FIELDS = ['permit_number', 'dob', 'legal_name', 'emergency_contact_phone']
  const safe = Object.fromEntries(
    Object.entries(details).filter(([k]) => !PII_FIELDS.includes(k))
  )
  return { action, actor_id: actorId, timestamp: new Date().toISOString(), details: safe }
}

// Input validation helpers
export function validateDOB(dob: string): { valid: boolean; error?: string } {
  const date = new Date(dob)
  if (isNaN(date.getTime())) return { valid: false, error: 'Invalid date format' }
  const today = new Date()
  const age = today.getFullYear() - date.getFullYear()
  if (age < 14 || age > 100) return { valid: false, error: 'DOB out of reasonable range' }
  // Minimum age for driver ed in TN is 15
  const minAge = new Date(today)
  minAge.setFullYear(today.getFullYear() - 15)
  if (date > minAge) return { valid: false, error: 'Student must be at least 15 years old' }
  return { valid: true }
}

export function validatePermitNumber(value: string): { valid: boolean; error?: string } {
  if (!value || value === 'PENDING') return { valid: true }
  // Alphanumeric, 5-20 chars (standard permit formats)
  if (!/^[A-Za-z0-9-]{5,20}$/.test(value)) {
    return { valid: false, error: 'Permit number must be 5-20 alphanumeric characters (hyphens allowed)' }
  }
  return { valid: true }
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  return { valid: true }
}

export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone) return { valid: true } // optional
  // Strip formatting and validate E.164-ish
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 10 || cleaned.length > 11) {
    return { valid: false, error: 'Phone number must be 10-11 digits' }
  }
  return { valid: true }
}

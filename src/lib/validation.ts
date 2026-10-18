// Shared validation helpers for API routes

export function validateRequired(obj: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === '')
  if (missing.length) throw new Error('Missing required fields: ' + missing.join(', '))
}

export function validateStringLength(obj: Record<string, unknown>, field: string, maxLen: number) {
  const val = obj[field]
  if (typeof val !== 'string' || val.length > maxLen) {
    throw new Error(`${field} must be a string <= ${maxLen} chars`)
  }
}

export function validatePositiveInt(obj: Record<string, unknown>, field: string) {
  const val = obj[field]
  if (typeof val !== 'number' || !Number.isInteger(val) || val < 0) {
    throw new Error(`${field} must be a non-negative integer`)
  }
}

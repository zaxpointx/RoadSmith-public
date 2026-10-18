import test from 'node:test'
import assert from 'node:assert/strict'
import { validateContactInput } from '../../src/lib/contact.ts'

test('contact validation rejects missing fields', () => {
  const result = validateContactInput({})
  assert.equal(result.ok, false)
  assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'message', 'name', 'schoolName'])
})

test('contact validation rejects malformed email', () => {
  const result = validateContactInput({ name: 'Jordan', email: 'not-an-email', schoolName: 'Road School', message: 'Hello' })
  assert.equal(result.ok, false)
  assert.equal(result.errors.email, 'Enter a valid email.')
})

test('contact validation accepts a complete request', () => {
  const result = validateContactInput({ name: 'Jordan', email: 'jordan@example.org', schoolName: 'Road School', message: 'I would like a demo.' })
  assert.deepEqual(result, { ok: true, errors: {} })
})

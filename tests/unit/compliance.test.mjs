import assert from 'node:assert/strict'
import test from 'node:test'
import { getStudentComplianceSummary } from '../../src/lib/compliance/tennessee-teen-driver-forms.ts'

const completeStudent = {
  id: 'demo-student',
  legal_name: 'Demo Student',
  dob: '2009-01-01',
  permit_number: 'DEMO-PERMIT',
  parent_email: 'guardian@example.com',
  parent_legal_name: 'Demo Guardian',
  guardian_address: '123 Example Road',
  guardian_signature_state: 'signed',
  classroom_hours: 6,
  driving_hours: 50,
  night_hours: 10,
  certificate_issued_at: new Date().toISOString(),
  enrollment_date: new Date().toISOString().slice(0, 10),
}

test('compliance does not mark an attendance certificate ready without a current certificate', () => {
  const summary = getStudentComplianceSummary({
    ...completeStudent,
    certificate_issued_at: null,
  })

  assert.equal(summary.forms.find((form) => form.id === 'SF-1010')?.status, 'needs_info')
  assert.match(summary.forms.find((form) => form.id === 'SF-1010')?.missing.join(', ') ?? '', /attendance certificate/)
})

test('compliance treats attendance certificates older than 30 days as stale', () => {
  const stale = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
  const summary = getStudentComplianceSummary({ ...completeStudent, certificate_issued_at: stale })

  assert.equal(summary.forms.find((form) => form.id === 'SF-1010')?.status, 'needs_info')
  assert.match(summary.forms.find((form) => form.id === 'SF-1010')?.missing.join(', ') ?? '', /current attendance certificate/)
})

test('compliance does not mark the minor affidavit ready without guardian evidence', () => {
  const summary = getStudentComplianceSummary({
    ...completeStudent,
    parent_legal_name: null,
    guardian_address: null,
    guardian_signature_state: null,
  })

  const form = summary.forms.find((item) => item.id === 'SF-0259')
  assert.equal(form?.status, 'needs_info')
  assert.deepEqual(form?.missing, [
    'parent/guardian legal name',
    'parent/guardian address',
    'parent/guardian signature state',
  ])
})

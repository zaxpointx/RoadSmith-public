export type ContactInput = {
  name: string
  email: string
  schoolName: string
  message: string
}

export type ContactValidation = {
  ok: boolean
  errors: Partial<Record<keyof ContactInput, string>>
}

export function validateContactInput(input: Partial<ContactInput>): ContactValidation {
  const errors: ContactValidation['errors'] = {}
  const name = input.name?.trim() ?? ''
  const email = input.email?.trim() ?? ''
  const schoolName = input.schoolName?.trim() ?? ''
  const message = input.message?.trim() ?? ''

  if (!name) errors.name = 'Name is required.'
  else if (name.length > 120) errors.name = 'Name is too long.'

  if (!email) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email.'
  else if (email.length > 254) errors.email = 'Email is too long.'

  if (!schoolName) errors.schoolName = 'School name is required.'
  else if (schoolName.length > 160) errors.schoolName = 'School name is too long.'

  if (!message) errors.message = 'Message is required.'
  else if (message.length > 4000) errors.message = 'Message is too long.'

  return { ok: Object.keys(errors).length === 0, errors }
}

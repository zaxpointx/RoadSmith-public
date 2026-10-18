import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { validateContactInput } from '@/lib/contact'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const validation = validateContactInput({
    name: typeof input.name === 'string' ? input.name : '',
    email: typeof input.email === 'string' ? input.email : '',
    schoolName: typeof input.schoolName === 'string' ? input.schoolName : '',
    message: typeof input.message === 'string' ? input.message : '',
  })

  if (!validation.ok) {
    return NextResponse.json({ error: 'Please check the highlighted fields.', fields: validation.errors }, { status: 400 })
  }

  const name = String(input.name).trim()
  const email = String(input.email).trim()
  const schoolName = String(input.schoolName).trim()
  const message = String(input.message).trim()
  const recipient = process.env.CONTACT_EMAIL ?? process.env.SUPPORT_EMAIL ?? 'support@roadsmith.app'

  try {
    await sendEmail({
      to: recipient,
      subject: `Roadsmith demo request from ${schoolName}`,
      html: `<h2>Roadsmith demo request</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>School:</strong> ${escapeHtml(schoolName)}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>`,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'We could not send your request. Please try again.' }, { status: 502 })
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character)
}

// Resend email client — stub mode when key not configured

const apiKey = process.env.RESEND_API_KEY
export function isLikelyValidEmail(email: string): boolean {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  // Block obvious test/junk emails
  if (domain === 'test.com' || domain === 'email.com' || domain === 'example.com') return false
  return true
}

export function isEmailConfigured() {
  return Boolean(apiKey)
}

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  if (!apiKey) {
    console.log(`[Resend STUB] To: ${to} | Subject: ${subject}`)
    return
  }

  if (!isLikelyValidEmail(to)) {
    console.log(`[Resend BLOCKED] Unsafe email rejected: ${to}`)
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: 'Roadsmith <onboarding@resend.dev>', to, subject, html }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend failed: ${error}`)
  }
}

export async function sendWelcomeEmail(
  to: string,
  schoolName: string,
  schoolId: string
): Promise<void> {
  await sendEmail({
    to,
    subject: 'Welcome to Roadsmith — Your school is ready!',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #0a0a0f;">Welcome, ${schoolName}!</h1>
        <p style="color: #374151; line-height: 1.6;">
          Your school is set up on Roadsmith. Here's what you can do right now:
        </p>
        <ul style="color: #374151; line-height: 1.8;">
          <li><strong>Add instructors</strong> — set up your teaching team</li>
          <li><strong>Create sessions</strong> — use the calendar to block off lesson times</li>
          <li><strong>Share your booking link</strong> — let students book and pay online</li>
          <li><strong>Track students</strong> — manage permits, hours, and certification</li>
        </ul>
        <p style="color: #374151;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/school-admin?school=${schoolId}" style="background: #06b6d4; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
            Open Your Dashboard →
          </a>
        </p>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">
          Questions? Reply to this email — we're here to help.
        </p>
      </div>
    `,
  })
}

export async function sendBookingConfirmationEmail(
  to: string,
  studentName: string,
  lessonType: string,
  schoolName: string,
  schoolPhone: string,
  date: string,
  time: string,
  location: string,
  rescheduleUrl: string,
  cancelUrl: string
): Promise<void> {
  // Lazy import the beautiful template — only used when email is actually sent
  const { bookingConfirmationEmail } = await import('./email-templates/booking-confirmed')

  const email = bookingConfirmationEmail({
    studentName,
    lessonType,
    schoolName,
    schoolPhone,
    date,
    time,
    location,
    rescheduleUrl,
    cancelUrl,
  })

  await sendEmail({
    to,
    subject: email.subject,
    html: email.html,
  })
}

export async function sendSessionCompletedEmail(
  to: string,
  studentName: string,
  parentName: string,
  hoursLogged: number,
  totalDrivingHours: number,
  classroomHours: number,
  sessionDate: string,
  instructorName: string,
  schoolName: string,
  schoolPhone: string,
  instructorNotes?: string
): Promise<void> {
  const { sessionCompletedEmail } = await import('./email-templates/session-completed')

  const email = sessionCompletedEmail({
    studentName,
    parentName,
    hoursLogged,
    totalDrivingHours,
    classroomHours,
    sessionDate,
    instructorName,
    schoolName,
    schoolPhone,
    instructorNotes,
  })

  await sendEmail({
    to,
    subject: email.subject,
    html: email.html,
  })
}

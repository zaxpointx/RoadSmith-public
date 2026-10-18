// Booking confirmation — sent to student immediately after they complete a booking

export function bookingConfirmationEmail({
  studentName,
  lessonType,
  schoolName,
  schoolPhone,
  date,
  time,
  location,
  rescheduleUrl,
  cancelUrl,
}: {
  studentName: string
  lessonType: string
  schoolName: string
  schoolPhone: string
  date: string
  time: string
  location: string
  rescheduleUrl: string
  cancelUrl: string
}) {
  return {
    from: `${schoolName} <noreply@roadsmith.app>`,
    subject: `Lesson confirmed: ${lessonType} on ${date}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lesson Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#06b6d4,#2563eb);padding:32px 40px;text-align:center;">
                  <div style="font-size:28px;margin-bottom:8px;">✅</div>
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Lesson Confirmed</h1>
                  <p style="margin:8px 0 0 0;font-size:15px;color:rgba(255,255,255,0.8);">You're all set. See you there.</p>
                </td>
              </tr>

              <!-- Details -->
              <tr>
                <td style="padding:32px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    ${[
                      { label: 'Lesson', value: lessonType },
                      { label: 'Date', value: date },
                      { label: 'Time', value: time },
                      { label: 'Location', value: location },
                      { label: 'Instructor', value: 'Your instructor will confirm via email' },
                    ].map(row => `
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">${row.label}</td>
                            <td style="font-size:15px;color:#111827;font-weight:500;text-align:right;">${row.value}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    `).join('')}
                  </table>

                  <p style="margin:0 0 20px 0;font-size:14px;color:#6b7280;line-height:1.5;">
                    You'll receive an SMS reminder 48 hours before your lesson, and again 4 hours before. Reply <strong>R</strong> to reschedule or <strong>C</strong> to confirm.
                  </p>

                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:0 0 12px 0;">
                        <a href="${rescheduleUrl}"
                           style="display:inline-block;background:#06b6d4;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
                          Reschedule if needed →
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <a href="${cancelUrl}"
                           style="font-size:13px;color:#9ca3af;text-decoration:underline;">
                          Cancel booking
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${schoolName} · ${schoolPhone}<br>
                <a href="#" style="color:#9ca3af;">Questions? Call us</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Lesson Confirmed — ${studentName}

Your ${lessonType} lesson is booked:

Date: ${date}
Time: ${time}
Location: ${location}

You'll get an SMS reminder 48 hours before, and again 4 hours before.
Reply R to reschedule, C to confirm.

${schoolName} · ${schoolPhone}
    `.trim(),
  }
}

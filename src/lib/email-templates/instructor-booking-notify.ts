// Instructor booking notification — sent when a parent books a lesson

export function instructorBookingNotificationEmail({
  studentName,
  studentEmail,
  studentPhone,
  lessonType,
  schoolName,
  date,
  time,
  location,
  bookingToken,
}: {
  instructorName?: string
  studentName: string
  studentEmail: string
  studentPhone: string
  lessonType: string
  schoolName: string
  date: string
  time: string
  location: string
  bookingToken: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const viewUrl = bookingToken ? `${appUrl}/instructor/booking/${bookingToken}` : `${appUrl}/instructor/schedule`

  return {
    from: `${schoolName} <noreply@roadsmith.app>`,
    subject: `New Booking: ${studentName} — ${lessonType} on ${date}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New Student Booking</title>
</head>
<body style="margin:0;padding:0;background:#0d0f18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f18;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d0f18,#1a1d2e);padding:28px 36px;border-radius:20px 20px 0 0;border:1px solid rgba(255,255,255,0.08);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:16px;font-weight:700;color:#ffffff;">${schoolName}</div>
                    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:2px;">Instructor Portal</div>
                  </td>
                  <td align="right">
                    <div style="background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.3);border-radius:100px;padding:6px 16px;font-size:12px;font-weight:600;color:#4ADE80;">
                      New Booking
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:rgba(255,255,255,0.03);padding:28px 36px;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);">
              <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#ffffff;">You have a new student!</h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.5);">A booking has been confirmed for your schedule.</p>

              <!-- Lesson card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:6px;">Lesson</div>
                    <div style="font-size:18px;font-weight:700;color:#ffffff;">${lessonType}</div>
                  </td>
                </tr>
                ${[
                  { label: 'Date', value: date },
                  { label: 'Time', value: time },
                  { label: 'Location', value: location || 'To be confirmed' },
                ].map(row => `
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:rgba(255,255,255,0.4);width:80px;">${row.label}</td>
                        <td style="font-size:15px;font-weight:500;color:#ffffff;">${row.value}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `).join('')}
              </table>

              <!-- Student card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:6px;">Student</div>
                    <div style="font-size:18px;font-weight:700;color:#ffffff;">${studentName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:rgba(255,255,255,0.4);width:80px;">Email</td>
                        <td style="font-size:15px;font-weight:500;color:#ffffff;"><a href="mailto:${studentEmail}" style="color:#4ADE80;text-decoration:none;">${studentEmail}</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${studentPhone ? `
                <tr>
                  <td style="padding:14px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:rgba(255,255,255,0.4);width:80px;">Phone</td>
                        <td style="font-size:15px;font-weight:500;color:#ffffff;"><a href="tel:${studentPhone}" style="color:#ffffff;text-decoration:none;">${studentPhone}</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${viewUrl}"
                       style="display:inline-block;background:#4ADE80;color:#000;font-size:14px;font-weight:600;padding:14px 28px;border-radius:100px;text-decoration:none;">
                      View Booking Details →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(255,255,255,0.02);padding:20px 36px;border-radius:0 0 20px 20px;border:1px solid rgba(255,255,255,0.08);border-top:none;text-align:center;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);">
                ${schoolName} · Instructor Portal<br>
                <a href="${appUrl}/instructor/schedule" style="color:rgba(255,255,255,0.3);">View your schedule</a>
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
New Booking — ${schoolName}

Student: ${studentName}
Email: ${studentEmail}
${studentPhone ? `Phone: ${studentPhone}` : ''}

Lesson: ${lessonType}
Date: ${date}
Time: ${time}
Location: ${location || 'TBD'}

View details: ${viewUrl}

${schoolName} · Instructor Portal
    `.trim(),
  }
}

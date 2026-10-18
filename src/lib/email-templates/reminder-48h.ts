// 48-hour reminder — sent to student 48 hours before their lesson

export function reminder48hEmail({
  studentName,
  lessonType,
  schoolName,
  date,
  time,
  location,
  confirmUrl,
  rescheduleUrl,
}: {
  studentName: string
  lessonType: string
  schoolName: string
  date: string
  time: string
  location: string
  confirmUrl: string
  rescheduleUrl: string
}) {
  return {
    from: `${schoolName} <noreply@roadsmith.app>`,
    subject: `Reminder: Your lesson is in 2 days — ${date}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lesson Reminder</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 40px;text-align:center;">
                  <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">⏰ Lesson in 2 Days</h1>
                  <p style="margin:6px 0 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${date} at ${time}</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 40px;">
                  <p style="margin:0 0 20px 0;font-size:16px;color:#111827;">
                    Hi ${studentName},<br>
                    Just a reminder — your <strong>${lessonType}</strong> lesson at <strong>${schoolName}</strong> is coming up.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px;">
                    <tr>
                      <td style="font-size:14px;color:#6b7280;">Date</td>
                      <td style="font-size:14px;font-weight:600;color:#111827;text-align:right;">${date}</td>
                    </tr>
                    <tr>
                      <td style="padding-top:8px;font-size:14px;color:#6b7280;">Time</td>
                      <td style="padding-top:8px;font-size:14px;font-weight:600;color:#111827;text-align:right;">${time}</td>
                    </tr>
                    <tr>
                      <td style="padding-top:8px;font-size:14px;color:#6b7280;">Location</td>
                      <td style="padding-top:8px;font-size:14px;font-weight:600;color:#111827;text-align:right;">${location}</td>
                    </tr>
                  </table>

                  <p style="margin:0 0 24px 0;font-size:14px;color:#374151;">
                    Need to change plans? You can reschedule without penalty if you let us know before 24 hours.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:0 0 10px 0;">
                        <a href="${confirmUrl}"
                           style="display:inline-block;background:#059669;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
                          ✓ Confirm — I'll be there
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <a href="${rescheduleUrl}"
                           style="font-size:13px;color:#06b6d4;text-decoration:underline;">
                          Reschedule instead
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </td>
          </tr>

          <tr>
            <td style="padding:16px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${schoolName} · Powered by Roadsmith
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
Hi ${studentName},

Reminder: Your ${lessonType} lesson is in 2 days.

Date: ${date}
Time: ${time}
Location: ${location}

Confirm: ${confirmUrl}
Reschedule: ${rescheduleUrl}

${schoolName}
    `.trim(),
  }
}

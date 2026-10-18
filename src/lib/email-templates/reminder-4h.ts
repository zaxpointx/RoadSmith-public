// 4-hour reminder — final reminder sent 4 hours before the lesson

export function reminder4hEmail({
  studentName,
  lessonType,
  schoolName,
  schoolPhone,
  date,
  time,
  location,
}: {
  studentName: string
  lessonType: string
  schoolName: string
  schoolPhone: string
  date: string
  time: string
  location: string
}) {
  return {
    from: `${schoolName} <noreply@roadsmith.app>`,
    subject: `Today at ${time} — your lesson is coming up`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lesson Today</title>
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
                <td style="background:linear-gradient(135deg,#06b6d4,#2563eb);padding:28px 40px;text-align:center;">
                  <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">🚗 See you soon!</h1>
                  <p style="margin:6px 0 0 0;font-size:14px;color:rgba(255,255,255,0.8);">Your lesson is in 4 hours</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 40px;">
                  <p style="margin:0 0 20px 0;font-size:16px;color:#111827;">
                    Hi ${studentName},<br>
                    Quick reminder — your <strong>${lessonType}</strong> lesson is <strong>today at ${time}</strong>.
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
                    If anything comes up, call us at <a href="tel:${schoolPhone}" style="color:#06b6d4;text-decoration:none;font-weight:600;">${schoolPhone}</a> and we'll work it out.
                  </p>

                  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;text-align:center;">
                    <p style="margin:0;font-size:14px;color:#1e40af;font-weight:600;">
                      📋 Don't forget your permit and a licensed driver to accompany you.
                    </p>
                  </div>
                </td>
              </tr>

            </td>
          </tr>

          <tr>
            <td style="padding:16px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${schoolName} · ${schoolPhone}<br>
                Powered by Roadsmith
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

Quick reminder — your ${lessonType} lesson is TODAY at ${time}.

Date: ${date}
Time: ${time}
Location: ${location}

Call us if anything comes up: ${schoolPhone}

Don't forget your permit and a licensed driver.

${schoolName} · ${schoolPhone}
    `.trim(),
  }
}

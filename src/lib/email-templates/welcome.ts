// Welcome email — sent to school owner immediately after signup + profile completion
// Compatible with Resend API (resend.emails.send)

export function welcomeEmail({
  schoolName,
  schoolSlug,
  toEmail,
}: {
  schoolName: string
  schoolSlug: string
  toEmail: string
}) {
  const dashboardUrl = schoolSlug
    ? `https://roadsmith.app/school-admin`
    : 'https://roadsmith.app/school-admin'
  const bookingUrl = schoolSlug
    ? `https://roadsmith.app/book?school=${schoolSlug}`
    : 'https://roadsmith.app/book'

  return {
    from: 'Roadsmith <noreply@roadsmith.app>',
    to: toEmail,
    subject: `Welcome to Roadsmith, ${schoolName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to Roadsmith</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px 0;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#2563eb);width:48px;height:48px;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:#fff;">RS</div>
              <h1 style="margin:16px 0 0 0;font-size:24px;font-weight:700;color:#ffffff;">Roadsmith</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#111118;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:40px;">
              <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#fff;">
                You're set up. Here's what to do next.
              </h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#9ca3af;">
                Your school is live on Roadsmith. Here's the quick setup — takes about 10 minutes total:
              </p>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
                ${[
                  { n: '1', title: 'Set up your public page', desc: 'Add your address, phone, and a short tagline students will see.' },
                  { n: '2', title: 'Import your students', desc: 'Drop your existing spreadsheet into the CSV importer. 200 students in 30 seconds.' },
                  { n: '3', title: 'Set instructor availability', desc: 'Tell us your instructors\' hours once. We handle the rest.' },
                  { n: '4', title: 'Share your booking link', desc: `Your booking page is live — share it with students and they book without calling you.` },
                ].map(step => `
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="top" style="padding-right:16px;">
                          <div style="width:28px;height:28px;border-radius:50%;background:rgba(6,182,212,0.2);color:#06b6d4;font-size:13px;font-weight:700;line-height:28px;text-align:center;">${step.n}</div>
                        </td>
                        <td>
                          <div style="font-size:15px;font-weight:600;color:#fff;margin-bottom:2px;">${step.title}</div>
                          <div style="font-size:14px;color:#6b7280;">${step.desc}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `).join('')}
              </table>

              <p style="margin:0 0 24px 0;font-size:15px;color:#9ca3af;">
                <strong style="color:#fff;">Your booking link is already live.</strong> Share it with your students and they'll be able to book lessons without calling you.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#2563eb);color:#ffffff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
                      Go to Your Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:13px;color:#4b5563;">
                Roadsmith — Driving School Software<br>
                <a href="#" style="color:#4b5563;">Manage preferences</a> ·
                <a href="#" style="color:#4b5563;">Unsubscribe</a>
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
Welcome to Roadsmith, ${schoolName}.

You're set up. Here's what to do next:

1. Set up your public page — add your address, phone, and tagline
2. Import your students — drop your spreadsheet into the CSV importer
3. Set instructor availability — tell us your instructors' hours
4. Share your booking link — students book without calling you

Your booking page: ${bookingUrl}

Go to your dashboard: ${dashboardUrl}

— Roadsmith
    `.trim(),
  }
}

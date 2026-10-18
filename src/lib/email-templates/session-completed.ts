// Session completed — sent to parent email after instructor logs driving hours

export function sessionCompletedEmail({
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
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
}: {
  studentName: string
  parentName: string
  hoursLogged: number
  totalDrivingHours: number
  classroomHours: number
  sessionDate: string
  instructorName: string
  schoolName: string
  schoolPhone: string
  instructorNotes?: string
  appUrl?: string
}) {
  const hoursRemaining = Math.max(0, 50 - totalDrivingHours)
  const certificationReady = totalDrivingHours >= 50

  return {
    from: `${schoolName} <noreply@roadsmith.app>`,
    subject: `${studentName} completed ${hoursLogged}h today — ${totalDrivingHours}/50 hours logged`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Session Complete</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px 20px 0 0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#059669,#10b981);padding:40px 40px 32px;text-align:center;">
                  <div style="font-size:40px;margin-bottom:12px;">🚗</div>
                  <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">Session Complete</h1>
                  <p style="margin:8px 0 0 0;font-size:16px;color:rgba(255,255,255,0.85);">${studentName} just finished a driving lesson</p>
                </td>
              </tr>
            </td>
          </tr>

          <!-- White card body -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 40px;border-radius:0 0 20px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

              <!-- Greeting -->
              <p style="margin:32px 0 20px;font-size:16px;color:#374151;line-height:1.6;">
                Hi ${parentName},
              </p>
              <p style="margin:0 0 28px;font-size:16px;color:#374151;line-height:1.6;">
                Great news — <strong>${studentName}</strong> completed a driving session today with ${instructorName} at ${schoolName}.
              </p>

              <!-- Session summary box -->
              <tr>
                <td style="background:#f9fafb;border-radius:16px;padding:24px;margin:24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:0 0 16px 0;border-bottom:1px solid #e5e7eb;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Session Date</td>
                          <td style="font-size:16px;font-weight:700;color:#111827;text-align:right;">${sessionDate}</td>
                        </tr></table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 16px 0;border-bottom:1px solid #e5e7eb;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Instructor</td>
                          <td style="font-size:16px;font-weight:700;color:#111827;text-align:right;">${instructorName}</td>
                        </tr></table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 0 0 0;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Hours Logged Today</td>
                          <td style="font-size:16px;font-weight:700;color:#059669;text-align:right;">+${hoursLogged}h</td>
                        </tr></table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Instructor notes (if any) -->
              ${instructorNotes ? `
              <tr>
                <td style="background:#eff6ff;border-radius:12px;padding:20px;margin-bottom:24px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;">Instructor Notes</p>
                  <p style="margin:0;font-size:15px;color:#1e40af;line-height:1.6;font-style:italic;">"${instructorNotes}"</p>
                </td>
              </tr>
              ` : ''}

              <!-- Hours progress -->
              <tr>
                <td style="background:#f0fdf4;border-radius:16px;padding:24px;margin-bottom:24px;">
                  <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;">Driving Hours Progress</p>

                  <!-- Driving hours bar -->
                  <div style="background:#dcfce7;border-radius:999px;height:12px;overflow:hidden;margin-bottom:8px;">
                    <div style="background:linear-gradient(90deg,#22c55e,#16a34a);height:100%;border-radius:999px;width:${Math.min(100, (totalDrivingHours / 50) * 100)}%;transition:width 0.3s ease;"></div>
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:24px;font-weight:800;color:#166534;">${totalDrivingHours}<span style="font-size:14px;font-weight:600;color:#4ade80;">/50 hours</span></td>
                      <td style="text-align:right;">
                        ${certificationReady
                          ? '<span style="display:inline-flex;align-items:center;gap:6px;background:#166534;color:#ffffff;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;">✓ Certification Ready</span>'
                          : `<span style="font-size:14px;color:#4ade80;font-weight:600;">${hoursRemaining}h remaining</span>`
                        }
                      </td>
                    </tr>
                  </table>

                  ${!certificationReady ? `
                  <p style="margin:16px 0 0;font-size:13px;color:#166534;opacity:0.8;">Classroom hours: ${classroomHours}h (TN requires 30h classroom + 50h driving)</p>
                  ` : ''}
                </td>
              </tr>

              ${certificationReady ? `
              <tr>
                <td style="background:#fffbeb;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #fde68a;">
                  <p style="margin:0;font-size:15px;color:#92400e;line-height:1.6;">
                    🎉 <strong>${studentName} has completed all required driving hours!</strong> They're eligible to schedule their road test with the Tennessee DMV.
                  </p>
                </td>
              </tr>
              ` : ''}

              <!-- CTA -->
              <tr>
                <td align="center" style="padding-top:8px;">
                  <a href="${appUrl}" style="display:inline-block;background:#059669;color:#ffffff;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700;width:100%;text-align:center;box-sizing:border-box;">
                    View Dashboard →
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <p style="margin:32px 0 0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.6;">
                Questions about this session? Contact ${schoolName} at ${schoolPhone}.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  }
}

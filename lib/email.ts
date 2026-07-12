import { Resend } from 'resend';

// Replace 're_xxxxxxxxx' with your real API key in .env.local as RESEND_API_KEY
const resend = new Resend(process.env.RESEND_API_KEY);

// Use 'onboarding@resend.dev' while testing (works without a verified domain).
// Once you verify a domain in Resend, set RESEND_FROM_EMAIL in .env.local.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'TransitOps <onboarding@resend.dev>';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log('Email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}


export function buildLicenseReminderHtml(
  driverName: string,
  licenseNumber: string,
  expiryDate: string,
  daysLeft: number,
  body: string
): string {
  const urgencyColor = daysLeft <= 7 ? '#ef4444' : daysLeft <= 14 ? '#f59e0b' : '#3b82f6';
  const urgencyLabel = daysLeft <= 7 ? '🚨 URGENT' : daysLeft <= 14 ? '⚠️ WARNING' : 'ℹ️ REMINDER';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>License Renewal Reminder</title>
</head>
<body style="margin:0;padding:0;background:#0a0a15;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#0e0e1a;border:1px solid #1e2035;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 32px 24px;text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#000;letter-spacing:-1px;">TransitOps</div>
      <div style="font-size:13px;color:rgba(0,0,0,0.7);margin-top:4px;">Smart Transport Operations</div>
    </div>
    
    <!-- Urgency Banner -->
    <div style="background:${urgencyColor}20;border-bottom:1px solid ${urgencyColor}40;padding:12px 32px;text-align:center;">
      <span style="color:${urgencyColor};font-weight:700;font-size:13px;">${urgencyLabel}: License expires in ${daysLeft} days</span>
    </div>
    
    <!-- Content -->
    <div style="padding:32px;">
      <p style="color:#f0f0ff;font-size:16px;margin:0 0 8px 0;">Hello, <strong>${driverName}</strong></p>
      
      <div style="background:#13131f;border:1px solid #2d2d4a;border-radius:10px;padding:16px;margin:20px 0;">
        <div style="color:#9090b0;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">License Details</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#9090b0;font-size:13px;">License Number</span>
          <span style="color:#f0f0ff;font-size:13px;font-weight:600;">${licenseNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#9090b0;font-size:13px;">Expiry Date</span>
          <span style="color:${urgencyColor};font-size:13px;font-weight:700;">${new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
      
      <div style="color:#d0d0e8;font-size:14px;line-height:1.7;white-space:pre-line;">${body}</div>
      
      <div style="background:#f59e0b10;border:1px solid #f59e0b30;border-radius:10px;padding:16px;margin-top:24px;">
        <div style="color:#fbbf24;font-size:13px;font-weight:600;margin-bottom:8px;">📋 Next Steps</div>
        <ul style="color:#d0d0e8;font-size:13px;margin:0;padding-left:20px;line-height:2;">
          <li>Visit your nearest Regional Transport Office (RTO)</li>
          <li>Carry original license + Aadhar + passport photos</li>
          <li>Submit renewal application (Form 9)</li>
          <li>Pay renewal fee</li>
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="border-top:1px solid #1e2035;padding:20px 32px;text-align:center;">
      <p style="color:#5a5a7a;font-size:12px;margin:0;">
        This is an automated reminder from TransitOps Fleet Management System.<br>
        Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

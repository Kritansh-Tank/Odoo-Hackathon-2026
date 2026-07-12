import { NextRequest, NextResponse } from 'next/server';
import { getLicenseReminderEmail, type LicenseReminderInput } from '@/lib/groq';
import { sendEmail, buildLicenseReminderHtml } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as LicenseReminderInput & { driver_email?: string };

    // Generate AI email content
    const { subject, body: emailBody } = await getLicenseReminderEmail({
      driver_name: body.driver_name,
      license_number: body.license_number,
      expiry_date: body.expiry_date,
      days_until_expiry: body.days_until_expiry,
      company_name: 'TransitOps',
    });

    // Build HTML
    const html = buildLicenseReminderHtml(
      body.driver_name,
      body.license_number,
      body.expiry_date,
      body.days_until_expiry,
      emailBody
    );

    // Send email — use driver's email if available, otherwise log
    const recipient = body.driver_email || process.env.ADMIN_EMAIL || 'admin@transitops.app';

    const sent = await sendEmail({
      to: recipient,
      subject,
      html,
      text: emailBody,
    });

    if (sent) {
      return NextResponse.json({ success: true, message: `Reminder sent to ${recipient}` });
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  } catch (error) {
    console.error('License reminder error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

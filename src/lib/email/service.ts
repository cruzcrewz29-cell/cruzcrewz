// src/lib/email/service.ts
import { SENDGRID_API_KEY, FROM_EMAIL } from '$env/static/private';

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: 'Cruz Crewz' },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html',  value: html },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[sendEmail] SendGrid error:', res.status, body);
      return { success: false, error: body };
    }

    console.log('[sendEmail] sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[sendEmail] exception:', err);
    return { success: false, error: err };
  }
}
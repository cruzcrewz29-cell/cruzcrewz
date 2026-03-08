// src/lib/email/service.ts
import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

// Once you verify cruzcrewz.com in Resend (resend.com/domains),
// change this to: 'Cruz Crewz <noreply@cruzcrewz.com>'
// Until then, Resend's shared domain only allows sending to your
// own verified email — swap FROM_ADDRESS in .env to override.
const FROM_ADDRESS = 'Cruz Crewz <onboarding@resend.dev>';

export async function sendEmail({
  to,
  subject,
  html,
  text
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      text
    });

    if (error) {
      console.error('[sendEmail] Resend error:', JSON.stringify(error));
      return { success: false, error };
    }

    console.log('[sendEmail] sent to', to, '— id:', data?.id);
    return { success: true, data };
  } catch (err) {
    console.error('[sendEmail] exception:', err);
    return { success: false, error: err };
  }
}
// src/routes/api/send-quote-email/+server.ts
import { json } from '@sveltejs/kit';
import { sendEmail } from '$lib/email/service';
import { getQuoteEmail } from '$lib/email/templates';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { customerEmail, customerName, services, schedule, totalPrice, jobId } = body;

    if (!customerEmail || !customerName) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[send-quote-email] sending to:', customerEmail);

    const emailContent = getQuoteEmail({
      customerName,
      services: services ?? [],
      schedule: schedule ?? '',
      totalPrice: totalPrice ?? 0,
      jobId
    });

    const result = await sendEmail({
      to: customerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    if (result.success) {
      return json({ success: true });
    } else {
      console.error('[send-quote-email] failed:', result.error);
      return json({ error: 'Failed to send email', detail: result.error }, { status: 500 });
    }
  } catch (err) {
    console.error('[send-quote-email] exception:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
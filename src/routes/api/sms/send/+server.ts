// src/routes/api/sms/send/+server.ts
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { to, body, customerId, jobId } = await request.json();
    if (!to || !body) return json({ error: 'to and body required' }, { status: 400 });

    const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Send via Twilio
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To:   to,
          Body: body,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('[sms/send] Twilio error:', data);
      return json({ error: data.message || 'Failed to send SMS' }, { status: 500 });
    }

    // Store in sms_messages
    await admin.from('sms_messages').insert({
      customer_id: customerId || null,
      job_id:      jobId || null,
      direction:   'outbound',
      body,
      from_number: TWILIO_PHONE_NUMBER,
      to_number:   to,
      twilio_sid:  data.sid,
      read:        true,
    });

    return json({ success: true, sid: data.sid });
  } catch (err) {
    console.error('[sms/send]', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
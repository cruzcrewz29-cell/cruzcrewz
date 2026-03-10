// src/routes/api/sms/webhook/+server.ts
import { text } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const from   = formData.get('From')   as string;
    const body   = formData.get('Body')   as string;
    const sid    = formData.get('MessageSid') as string;

    if (!from || !body) {
      return text('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Normalize phone number — strip all non-digits then re-add +1
    const normalized = '+1' + from.replace(/\D/g, '').slice(-10);

    // Look up customer by phone number
    const { data: customer } = await admin
      .from('customers')
      .select('id, name')
      .or(`phone.eq.${from},phone.eq.${normalized}`)
      .single();

    // Handle STOP / HELP keywords
    const upperBody = body.trim().toUpperCase();
    if (upperBody === 'STOP') {
      if (customer) {
        await admin
          .from('customers')
          .update({ sms_opt_in: false })
          .eq('id', customer.id);
      }
      return text('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    // Store inbound message
    await admin.from('sms_messages').insert({
      customer_id: customer?.id || null,
      direction:   'inbound',
      body:        body.trim(),
      from_number: from,
      to_number:   null,
      twilio_sid:  sid,
      read:        false,
    });

    // No auto-reply — admin handles responses manually
    return text('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
  } catch (err) {
    console.error('[sms/webhook]', err);
    return text('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
  }
};
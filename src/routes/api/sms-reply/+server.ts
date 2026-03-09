// src/routes/api/sms-reply/+server.ts
//
// Twilio webhook — receives inbound SMS replies from customers.
//
// In your Twilio console, set the "A message comes in" webhook for your
// phone number to: https://cruzcrewz.com/api/sms-reply
// Method: HTTP POST
//
// Supported replies:
//   Y / YES / CONFIRM  → marks job as confirmed, replies with confirmation
//   S / SKIP / CANCEL  → marks job as skipped for that visit, replies asking to reschedule
//   Anything else      → replies with a helpful prompt

import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } from '$env/static/private';
import type { RequestHandler } from './$types';

const PHONE = '(866) 873-2789';

export const POST: RequestHandler = async ({ request }) => {
  // Twilio sends form-encoded body
  const formData = await request.formData();
  const from    = formData.get('From')?.toString() ?? '';
  const body    = formData.get('Body')?.toString().trim().toUpperCase() ?? '';

  console.log(`[sms-reply] from=${from} body="${body}"`);

  // Validate the request is from Twilio (basic check — upgrade to signature validation for prod)
  if (!from.startsWith('+')) {
    return twimlResponse('');
  }

  const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find the most recent scheduled job for this phone number
  const normalizedPhone = from.replace(/\D/g, '');
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, service_type, scheduled_date, status, customers(name)')
    .or(`customer_phone.eq.${from},customer_phone.eq.${normalizedPhone}`)
    .in('status', ['scheduled', 'confirmed'])
    .order('scheduled_date', { ascending: true })
    .limit(1);

  const job    = jobs?.[0] ?? null;
  const customer = job ? (Array.isArray(job.customers) ? job.customers[0] : job.customers) : null;
  const firstName = customer?.name?.split(' ')[0] ?? 'there';

  // Log the reply regardless
  if (job) {
    await supabase.from('sms_replies').insert({
      job_id:       job.id,
      phone:        from,
      type:         'customer_reply',
      reply_body:   formData.get('Body')?.toString() ?? '',
      reply_intent: classifyReply(body),
      sent_date:    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
    }).catch(err => console.error('[sms-reply] log error:', err));
  }

  // Handle reply intent
  const intent = classifyReply(body);

  if (intent === 'confirm') {
    if (job) {
      await supabase
        .from('jobs')
        .update({ status: 'confirmed' })
        .eq('id', job.id);

      const dateLabel = new Date(job.scheduled_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Chicago'
      });

      return twimlResponse(
        `Got it, ${firstName}! ✅ We'll see you on ${dateLabel}. If anything changes just let us know. – Cruz Crewz`
      );
    }
    return twimlResponse(
      `Thanks for confirming! We'll see you soon. Questions? Call us at ${PHONE}. – Cruz Crewz`
    );
  }

  if (intent === 'skip') {
    if (job) {
      await supabase
        .from('jobs')
        .update({ status: 'skipped' })
        .eq('id', job.id);

      return twimlResponse(
        `No problem, ${firstName}! We've skipped your visit for this week. We'll be back on your next scheduled date. Want to reschedule? Call ${PHONE}. – Cruz Crewz`
      );
    }
    return twimlResponse(
      `No problem! We've noted your skip request. To reschedule, call us at ${PHONE}. – Cruz Crewz`
    );
  }

  if (intent === 'stop') {
    // Twilio handles STOP automatically for compliance — just acknowledge
    return twimlResponse('');
  }

  // Unknown reply — guide them
  return twimlResponse(
    `Hey ${firstName}! Reply Y to confirm your upcoming visit or S to skip it. For anything else, call us at ${PHONE}. – Cruz Crewz`
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function classifyReply(body: string): 'confirm' | 'skip' | 'stop' | 'unknown' {
  const b = body.trim().toUpperCase();
  if (['Y', 'YES', 'CONFIRM', 'CONFIRMED', 'OK', 'OKAY', 'YEP', 'YUP', '👍'].includes(b)) return 'confirm';
  if (['S', 'SKIP', 'CANCEL', 'NO', 'NOPE', 'NOT TODAY'].includes(b))                       return 'skip';
  if (['STOP', 'UNSUBSCRIBE', 'QUIT', 'END', 'CANCEL ALL'].includes(b))                      return 'stop';
  return 'unknown';
}

/**
 * Returns a TwiML response — Twilio expects this format to send an SMS reply.
 * Empty string = no reply sent (used for STOP and invalid requests).
 */
function twimlResponse(message: string) {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
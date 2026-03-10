// src/routes/api/reschedule-request/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SENDGRID_API_KEY, FROM_EMAIL } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { token, jobId, note } = await request.json();
    if (!token || !jobId || !note) return json({ error: 'Missing required fields' }, { status: 400 });

    // Validate session
    const { data: session } = await supabase
      .from('customer_sessions')
      .select('customer_id, expires_at')
      .eq('token', token)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      return json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // Get job (verify ownership)
    const { data: job } = await supabase
      .from('jobs')
      .select('id, service_type, scheduled_date, customers(name, email)')
      .eq('id', jobId)
      .eq('customer_id', session.customer_id)
      .single();

    if (!job) return json({ error: 'Job not found' }, { status: 404 });

    // Mark reschedule requested
    await supabase
      .from('jobs')
      .update({
        reschedule_requested: true,
        reschedule_note: note,
        reschedule_requested_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Notify admin via email
    const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
    const scheduledDate = new Date(job.scheduled_date.slice(0, 10) + 'T12:00:00')
      .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: FROM_EMAIL }] }],
        from: { email: FROM_EMAIL, name: 'Cruz Crewz' },
        subject: `Reschedule Request — ${customer?.name ?? 'Customer'}`,
        content: [{
          type: 'text/html',
          value: `
<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
  <h2 style="margin:0 0 16px;color:#111827;">Reschedule Request</h2>
  <p style="margin:0 0 8px;color:#374151;"><strong>Customer:</strong> ${customer?.name ?? 'Unknown'}</p>
  <p style="margin:0 0 8px;color:#374151;"><strong>Service:</strong> ${job.service_type}</p>
  <p style="margin:0 0 8px;color:#374151;"><strong>Scheduled:</strong> ${scheduledDate}</p>
  <p style="margin:0 0 16px;color:#374151;"><strong>Their note:</strong> ${note}</p>
  <p style="color:#6b7280;font-size:13px;">Log in to the admin panel to update this job.</p>
</div>
          `.trim(),
        }],
      }),
    });

    return json({ success: true });
  } catch (err) {
    console.error('[reschedule-request]', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
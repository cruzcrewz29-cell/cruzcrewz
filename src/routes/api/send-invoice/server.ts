// src/routes/api/send-invoice/+server.ts
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { sendEmail } from '$lib/email/service';
import { invoiceTemplate } from '$lib/email/templates/invoice';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { jobId } = await request.json();
    if (!jobId) return json({ error: 'jobId required' }, { status: 400 });

    const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch job + customer
    const { data: job, error: jobError } = await admin
      .from('jobs')
      .select('*, customers(name, email)')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return json({ error: 'Job not found' }, { status: 404 });
    }

    const customerEmail = job.customers?.email;
    const customerName  = job.customers?.name;

    if (!customerEmail) {
      return json({ error: 'No customer email on file' }, { status: 400 });
    }

    if (!job.price) {
      return json({ error: 'No price set on job' }, { status: 400 });
    }

    // Generate invoice number: INV-YYYYMMDD-JOBID_SHORT
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${today}-${jobId.slice(0, 6).toUpperCase()}`;

    const { html, text } = invoiceTemplate({
      invoiceNumber,
      customerName,
      customerEmail,
      serviceType:   job.service_type,
      scheduledDate: job.scheduled_date,
      completedDate: new Date().toISOString(),
      price:         job.price,
      jobId,
    });

    const result = await sendEmail({
      to:      customerEmail,
      subject: `Invoice ${invoiceNumber} — Cruz Crewz`,
      html,
      text,
    });

    if (!result.success) {
      return json({ error: 'Failed to send invoice email' }, { status: 500 });
    }

    // Mark invoice as sent on the job
    await admin
      .from('jobs')
      .update({
        invoice_sent: true,
        invoice_sent_at: new Date().toISOString(),
        invoice_number: invoiceNumber,
      })
      .eq('id', jobId);

    return json({ success: true, invoiceNumber });
  } catch (err) {
    console.error('[send-invoice]', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
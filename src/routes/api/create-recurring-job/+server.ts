// src/routes/api/create-recurring-job/+server.ts
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { jobId } = await request.json();
    if (!jobId) return json({ error: 'jobId required' }, { status: 400 });

    const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the completed job
    const { data: job, error: jobError } = await admin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return json({ error: 'Job not found' }, { status: 404 });
    }

    // Only recurring frequencies get auto-scheduled
    const frequency = job.frequency;
    if (!frequency || frequency === 'one-time') {
      return json({ success: false, reason: 'non-recurring job' });
    }

    // Calculate next scheduled date
    const days = frequency === 'biweekly' ? 14 : 7;
    const currentDate = new Date(job.scheduled_date);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + days);

    // Check if a job already exists for this customer/service around that date
    // (within 3 days either side — prevents duplicates)
    const rangeStart = new Date(nextDate);
    rangeStart.setDate(rangeStart.getDate() - 3);
    const rangeEnd = new Date(nextDate);
    rangeEnd.setDate(rangeEnd.getDate() + 3);

    const { data: existing } = await admin
      .from('jobs')
      .select('id')
      .eq('customer_id', job.customer_id)
      .eq('service_type', job.service_type)
      .gte('scheduled_date', rangeStart.toISOString())
      .lte('scheduled_date', rangeEnd.toISOString())
      .neq('status', 'cancelled');

    if (existing && existing.length > 0) {
      return json({ success: false, reason: 'job already exists for that period' });
    }

    // Create the next job
    const { data: newJob, error: createError } = await admin
      .from('jobs')
      .insert({
        customer_id:    job.customer_id,
        service_type:   job.service_type,
        description:    job.description,
        status:         'scheduled',
        scheduled_date: nextDate.toISOString(),
        price:          job.price,
        frequency:      job.frequency,
        customer_phone: job.customer_phone,
      })
      .select()
      .single();

    if (createError) {
      console.error('[create-recurring-job]', createError);
      return json({ error: 'Failed to create next job' }, { status: 500 });
    }

    console.log(`[create-recurring-job] created job ${newJob.id} for ${nextDate.toDateString()}`);
    return json({ success: true, nextJobId: newJob.id, nextDate: nextDate.toISOString() });

  } catch (err) {
    console.error('[create-recurring-job]', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
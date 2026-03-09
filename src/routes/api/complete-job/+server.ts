// src/routes/api/complete-job/+server.ts
//
// Called when admin marks a job as complete.
// Records actual time taken, logs to job_outcomes for AI learning,
// and updates the job status.
//
// POST body:
//   jobId          — required
//   actualMinutes  — how long the job actually took (optional but valuable)
//   crewId         — which crew did it (optional)
//   crewSize       — how many people (optional)
//   customerRating — 1-5 if known (optional)
//   notes          — any notes from crew (optional)

import { json } from '@sveltejs/kit';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const {
      jobId,
      actualMinutes,
      crewId,
      crewSize,
      customerRating,
      notes,
    } = await request.json();

    if (!jobId) return json({ error: 'jobId required' }, { status: 400 });

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch full job details
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select(`
        id, service_type, price, scheduled_date, customer_phone,
        customers ( id, address, lat, lng )
      `)
      .eq('id', jobId)
      .single();

    if (jobErr || !job) return json({ error: 'Job not found' }, { status: 404 });

    const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;

    // Extract zip from address
    const zipMatch = customer?.address?.match(/\b(\d{5})\b/);
    const zip      = zipMatch?.[1] ?? null;

    // Check if repeat customer
    const { count: priorJobs } = await supabase
      .from('job_outcomes')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customer?.id);

    // Estimate minutes from service type defaults
    const SERVICE_DURATIONS: Record<string, number> = {
      'Lawn Mowing':              45,
      'Trimming & Edging':        30,
      'Bush, Shrub & Tree Care':  90,
      'Spring & Fall Cleanups':   120,
      'Landscape Maintenance':    60,
      'Lawn Aeration & Overseeding': 120,
    };
    const estimatedMinutes = SERVICE_DURATIONS[job.service_type] ?? 60;

    // Log the outcome
    const { error: outcomeErr } = await supabase
      .from('job_outcomes')
      .insert({
        job_id:            jobId,
        customer_id:       customer?.id ?? null,
        service_type:      job.service_type,
        zip_code:          zip,
        quoted_price:      job.price,
        estimated_minutes: estimatedMinutes,
        actual_minutes:    actualMinutes ?? null,
        crew_id:           crewId ?? null,
        crew_size:         crewSize ?? 1,
        customer_rating:   customerRating ?? null,
        repeat_customer:   (priorJobs ?? 0) > 0,
        notes:             notes ?? null,
        completed_at:      new Date().toISOString(),
      });

    if (outcomeErr) {
      console.error('[complete-job] outcome insert error:', outcomeErr);
      // Don't fail the whole request — still mark job complete
    }

    // Update job status
    const { error: updateErr } = await supabase
      .from('jobs')
      .update({
        status:       'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateErr) throw updateErr;

    return json({ success: true });
  } catch (err) {
    console.error('[complete-job] error:', err);
    return json({ error: 'Failed to complete job' }, { status: 500 });
  }
};
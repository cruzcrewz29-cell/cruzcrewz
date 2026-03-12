// src/routes/(public)/pay/[jobId]/+page.server.ts
import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { jobId } = params;

  if (!jobId) throw error(404, 'Invoice not found.');

  // Use service role to bypass RLS — anon client cannot read jobs without a session
  const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: job, error: jobError } = await admin
    .from('jobs')
    .select(`
      id,
      service_type,
      price,
      status,
      scheduled_date,
      invoice_number,
      invoice_sent_at,
      customers ( id, name, email, address )
    `)
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw error(404, 'Invoice not found. This link may have expired.');
  }

  return {
    job,
    alreadyPaid: job.status === 'paid',
  };
};
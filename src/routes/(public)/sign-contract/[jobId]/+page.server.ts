// src/routes/(public)/sign-contract/[jobId]/+page.server.ts
import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { jobId } = params;

  const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      service_type,
      description,
      status,
      scheduled_date,
      price,
      contract_signed_at,
      customer_phone,
      customers (
        id,
        name,
        email,
        phone,
        address
      )
    `)
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw error(404, 'Quote not found. This link may have expired or been entered incorrectly.');
  }

  // Already signed — return with flag so page shows confirmation state
  if (job.contract_signed_at) {
    return {
      job,
      alreadySigned: true,
    };
  }

  // Quote expired (older than 30 days and still pending)
  const createdDate = new Date(job.scheduled_date);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isExpired = job.status === 'pending' && createdDate < thirtyDaysAgo;

  return {
    job,
    alreadySigned: false,
    isExpired,
  };
};
// src/routes/api/mark-job-paid/+server.ts
import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { jobId } = await request.json();
  if (!jobId) throw error(400, 'jobId required');

  const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { error: updateError } = await admin
    .from('jobs')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', jobId);

  if (updateError) {
    console.error('[mark-job-paid]', updateError);
    throw error(500, 'Failed to update job status');
  }

  return json({ success: true });
};
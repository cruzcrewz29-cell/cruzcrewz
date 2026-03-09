// src/routes/api/create-tracker/+server.ts
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

    const { data, error } = await admin
      .from('tracker_tokens')
      .insert({ job_id: jobId, status: 'pending' })
      .select('token')
      .single();

    if (error) {
      console.error('[create-tracker]', error);
      return json({ error: 'Failed to create tracker' }, { status: 500 });
    }

    return json({ success: true, token: data.token });
  } catch (err) {
    console.error('[create-tracker]', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
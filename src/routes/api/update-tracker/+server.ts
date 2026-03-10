// src/routes/api/update-tracker/+server.ts
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { token, status, lat, lng } = await request.json();
    if (!token) return json({ error: 'token required' }, { status: 400 });

    const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build tracker patch
    const patch: Record<string, any> = {};
    if (status) patch.status = status;
    if (lat != null && lng != null) {
      patch.crew_lat = lat;
      patch.crew_lng = lng;
      patch.crew_updated_at = new Date().toISOString();
    }

    const { error: trackerError } = await admin
      .from('tracker_tokens')
      .update(patch)
      .eq('token', token);

    if (trackerError) {
      console.error('[update-tracker] tracker error:', trackerError);
      return json({ error: 'Failed to update tracker' }, { status: 500 });
    }

    // When crew marks complete → flag the job for admin review
    if (status === 'completed') {
      // Look up the job_id from this token
      const { data: tokenRow, error: lookupError } = await admin
        .from('tracker_tokens')
        .select('job_id')
        .eq('token', token)
        .single();

      if (!lookupError && tokenRow?.job_id) {
        await admin
          .from('jobs')
          .update({
            crew_marked_done: true,
            crew_done_at: new Date().toISOString(),
          })
          .eq('id', tokenRow.job_id);
      }
    }

    return json({ success: true });
  } catch (err) {
    console.error('[update-tracker]', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
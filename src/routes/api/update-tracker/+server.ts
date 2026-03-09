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

    const patch: Record<string, any> = {};
    if (status) patch.status = status;
    if (lat != null && lng != null) {
      patch.crew_lat = lat;
      patch.crew_lng = lng;
      patch.crew_updated_at = new Date().toISOString();
    }

    const { error } = await admin
      .from('tracker_tokens')
      .update(patch)
      .eq('token', token);

    if (error) {
      console.error('[update-tracker]', error);
      return json({ error: 'Failed to update tracker' }, { status: 500 });
    }

    return json({ success: true });
  } catch (err) {
    console.error('[update-tracker]', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
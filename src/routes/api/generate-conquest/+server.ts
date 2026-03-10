// src/routes/api/generate-conquest/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SITE_URL } from '$env/static/public';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Rough address generation from lat/lng offset
// Returns nearby street addresses using Google Reverse Geocoding
async function getNearbyAddresses(lat: number, lng: number, count = 10): Promise<string[]> {
  const offsets = [
    [0.0005, 0], [-0.0005, 0], [0, 0.0007], [0, -0.0007],
    [0.0004, 0.0005], [-0.0004, 0.0005], [0.0004, -0.0005], [-0.0004, -0.0005],
    [0.0008, 0], [0, 0.001],
  ];

  const addresses: string[] = [];

  for (const [dlat, dlng] of offsets.slice(0, count)) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat + dlat},${lng + dlng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.formatted_address) {
        addresses.push(result.formatted_address);
      }
    } catch {
      // skip failed lookups
    }
  }

  return addresses;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { jobId } = await request.json();
    if (!jobId) return json({ error: 'jobId required' }, { status: 400 });

    // Get job + customer + property
    const { data: job } = await supabase
      .from('jobs')
      .select('id, service_type, customers(id, name, address, lat, lng), properties(address, lat, lng)')
      .eq('id', jobId)
      .single();

    if (!job) return json({ error: 'Job not found' }, { status: 404 });

    const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
    const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;

    // Prefer property coords, fall back to customer coords
    const lat = property?.lat ?? customer?.lat ?? null;
    const lng = property?.lng ?? customer?.lng ?? null;
    const address = property?.address ?? customer?.address ?? '';

    if (!lat || !lng) {
      return json({ error: 'No coordinates available for this job. Geocode the customer first.' }, { status: 400 });
    }

    // Get nearby addresses
    const nearbyAddresses = await getNearbyAddresses(lat, lng);

    // Log conquest flyer
    await supabase.from('conquest_flyers').insert({
      job_id: jobId,
      customer_id: customer?.id ?? null,
      address,
    });

    // Build quote URL with neighborhood pre-fill
    const neighborhood = address.split(',').slice(1, 2).join('').trim();
    const quoteUrl = `${PUBLIC_SITE_URL}/quote?neighborhood=${encodeURIComponent(neighborhood)}`;

    return json({
      success: true,
      jobId,
      address,
      neighborhood,
      nearbyAddresses,
      quoteUrl,
      flyerUrl: `/app/conquest/${jobId}`,
    });
  } catch (err) {
    console.error('[generate-conquest]', err);
    return json({ error: 'Failed to generate conquest data' }, { status: 500 });
  }
};
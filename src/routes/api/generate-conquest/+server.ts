import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SITE_URL } from '$env/static/public';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    if (loc) return { lat: loc.lat, lng: loc.lng };
  } catch {}
  return null;
}

async function getNearbyAddresses(lat: number, lng: number, count = 10) {
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
      if (result?.formatted_address) addresses.push(result.formatted_address);
    } catch {}
  }
  return addresses;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { jobId } = await request.json();
    if (!jobId) return json({ error: 'jobId required' }, { status: 400 });

    const { data: job } = await supabase
      .from('jobs')
      .select('id, service_type, customers(id, name, address, lat, lng)')
      .eq('id', jobId)
      .single();

    if (!job) return json({ error: 'Job not found' }, { status: 404 });

    const customer = (job as any).customers;
    if (!customer) return json({ error: 'No customer on this job' }, { status: 400 });

    let lat = customer.lat;
    let lng = customer.lng;

    // Geocode on the fly if lat/lng missing
    if ((!lat || !lng) && customer.address) {
      const coords = await geocodeAddress(customer.address);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        // Save for future use
        await supabase
          .from('customers')
          .update({ lat, lng })
          .eq('id', customer.id);
      }
    }

    if (!lat || !lng) {
      return json({ error: 'Could not geocode customer address. Make sure the address is valid.' }, { status: 400 });
    }

    const nearbyAddresses = await getNearbyAddresses(lat, lng);

    await supabase.from('conquest_flyers').insert({
      job_id: jobId,
      customer_id: customer.id,
      address: customer.address,
    });

    const quoteUrl = `${PUBLIC_SITE_URL}/quote`;

    return json({
      nearbyAddresses,
      quoteUrl,
      jobAddress: customer.address,
      customerName: customer.name,
      serviceType: (job as any).service_type,
    });
  } catch (err) {
    console.error('[generate-conquest]', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};

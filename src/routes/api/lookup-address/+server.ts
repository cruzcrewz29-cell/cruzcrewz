// src/routes/api/lookup-address/+server.ts
import { json } from '@sveltejs/kit';
import { GOOGLE_MAPS_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      return json({ success: false, error: 'address is required' }, { status: 400 });
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(geocodeUrl, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      console.error('[lookup-address] Google geocode HTTP error:', res.status);
      return json({ success: false, error: 'Geocoding failed' }, { status: 502 });
    }

    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.error('[lookup-address] Google status:', data.status);
      return json({ success: false, error: 'Address not found' });
    }

    const result = data.results[0];
    const components = result.address_components as GoogleAddressComponent[];
    const location = result.geometry.location;

    // Parse address components
    const get = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name ?? '';
    const getShort = (type: string) =>
      components.find((c) => c.types.includes(type))?.short_name ?? '';

    const streetNumber = get('street_number');
    const streetName = get('route');
    const city =
      get('locality') ||
      get('sublocality') ||
      get('neighborhood') ||
      get('administrative_area_level_3');
    const county = get('administrative_area_level_2')
      .replace(' County', '')
      .replace(' county', '')
      .trim();
    const state = getShort('administrative_area_level_1');
    const zip = get('postal_code');
    const street_address = streetNumber ? `${streetNumber} ${streetName}` : streetName;

    console.log('[lookup-address] resolved:', { street_address, city, county, state, zip, lat: location.lat, lng: location.lng });

    return json({
      success: true,
      data: {
        street_address,
        city,
        county,
        state,
        zip,
        lat: location.lat,
        lng: location.lng,
        formatted_address: result.formatted_address
      }
    });
  } catch (err) {
    console.error('[lookup-address] Error:', err);
    return json({ success: false, error: 'Internal error' }, { status: 500 });
  }
};

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}
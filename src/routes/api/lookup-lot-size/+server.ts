// src/routes/api/lookup-lot-size/+server.ts
//
// Lot size lookup — free data sources only, no Regrid required.
//
// Source priority by county:
//   Cook County, IL   → Cook County Assessor open data (Socrata)
//   Will County, IL   → Estimated from Google Maps footprint area (fallback)
//   Lake County, IL   → Estimated from Google Maps footprint area (fallback)
//   Porter County, IN → Estimated from Google Maps footprint area (fallback)
//   Lake County, IN   → Estimated from Google Maps footprint area (fallback)
//   All others        → null (triggers manual input on frontend)
//
// Cook County Assessor docs:
//   https://datacatalog.cookcountyil.gov/resource/tx2p-k2g9.json
//   Field: lot_size (sq ft as string)
//   Lookup by: pin (parcel ID) or address — we use lat/lng → pin via a
//   reverse-geocode lookup against their parcel centroid endpoint.
//
// For non-Cook counties we use the Google Maps Geocoding API's
// `bounds` geometry to estimate lot size from the premise footprint.
// This is a rough proxy (~±30%) but better than nothing and is free.

import { json } from '@sveltejs/kit';
import { GOOGLE_MAPS_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

// ─── Cook County Assessor ────────────────────────────────────────────────────

/**
 * Step 1: use Cook County's parcel centroid dataset to find the PIN
 * for the parcel containing (lat, lng).
 *
 * Endpoint: https://datacatalog.cookcountyil.gov/resource/77tz-riq7.json
 * We query with a geospatial within_circle filter (100m radius).
 */
async function getCookCountyPin(lat: number, lng: number): Promise<string | null> {
  try {
    // Socrata geospatial query — within_circle(geometry_col, lat, lng, radius_m)
    const url = new URL('https://datacatalog.cookcountyil.gov/resource/77tz-riq7.json');
    url.searchParams.set('$where', `within_circle(centroid, ${lat}, ${lng}, 100)`);
    url.searchParams.set('$limit', '1');

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      console.error('[cook-county-pin] HTTP', res.status);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    // The PIN field is called `pin` or `pin10`
    const pin = data[0]?.pin ?? data[0]?.pin10 ?? null;
    console.log('[cook-county-pin] found PIN:', pin);
    return pin ? String(pin) : null;
  } catch (err) {
    console.error('[cook-county-pin] error:', err);
    return null;
  }
}

/**
 * Step 2: use the PIN to look up lot size from the Cook County
 * Assessor's parcel characteristics dataset.
 *
 * Endpoint: https://datacatalog.cookcountyil.gov/resource/tx2p-k2g9.json
 * Field: lot_size (sq ft)
 */
async function getCookCountyLotSize(pin: string): Promise<number | null> {
  try {
    const url = new URL('https://datacatalog.cookcountyil.gov/resource/tx2p-k2g9.json');
    url.searchParams.set('pin', pin);
    url.searchParams.set('$limit', '1');

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      console.error('[cook-county-lot] HTTP', res.status);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.log('[cook-county-lot] no record for PIN', pin);
      return null;
    }

    const lot = data[0]?.lot_size ?? data[0]?.sqft ?? null;
    const sqft = lot ? Math.round(parseFloat(String(lot))) : null;
    console.log('[cook-county-lot] lot_size:', sqft, 'sqft for PIN', pin);
    return sqft && sqft > 0 ? sqft : null;
  } catch (err) {
    console.error('[cook-county-lot] error:', err);
    return null;
  }
}

// ─── Google Maps premise bounds estimator (fallback for other counties) ──────

/**
 * Uses the Google Geocoding API with result_type=premise to get the
 * bounding box of the parcel, then approximates area from that box.
 *
 * This is rough — bounding boxes aren't lot polygons — but gives a
 * reasonable ballpark for suburban lots (5,000–15,000 sqft typical).
 * For irregular lots it will be off, which is why we always show
 * "estimated" and let admins override via lot_size_overrides.
 *
 * Formula: haversine width × haversine height of the viewport box.
 */
async function estimateLotSizeFromBounds(lat: number, lng: number): Promise<number | null> {
  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=premise|street_address&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(geocodeUrl, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    const bounds = data.results[0]?.geometry?.bounds ?? data.results[0]?.geometry?.viewport;
    if (!bounds) return null;

    const { northeast: ne, southwest: sw } = bounds;

    // Haversine distance in feet between two lat/lng points
    const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 20902231; // Earth radius in feet
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    const widthFt = haversine(sw.lat, sw.lng, sw.lat, ne.lng);
    const heightFt = haversine(sw.lat, sw.lng, ne.lat, sw.lng);
    const sqft = Math.round(widthFt * heightFt);

    // Sanity check — suburban lot should be 2,000–100,000 sqft
    if (sqft < 2000 || sqft > 100000) {
      console.log('[bounds-estimate] out of range, discarding:', sqft);
      return null;
    }

    console.log('[bounds-estimate] estimated lot size:', sqft, 'sqft');
    return sqft;
  } catch (err) {
    console.error('[bounds-estimate] error:', err);
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { lat, lng, county, state } = await request.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const countyNorm = (county ?? '').toLowerCase().trim();
    let lot_size_sqft: number | null = null;
    let source = 'none';

    // ── Cook County: use free assessor API ──────────────────────────────────
    if (countyNorm === 'cook' && state === 'IL') {
      console.log('[lookup-lot-size] Cook County path');
      const pin = await getCookCountyPin(lat, lng);
      if (pin) {
        lot_size_sqft = await getCookCountyLotSize(pin);
        if (lot_size_sqft) source = 'cook_county_assessor';
      }
    }

    // ── All other counties: bounds estimation ────────────────────────────────
    if (!lot_size_sqft) {
      console.log('[lookup-lot-size] bounds estimation fallback for', county, state);
      lot_size_sqft = await estimateLotSizeFromBounds(lat, lng);
      if (lot_size_sqft) source = 'google_bounds_estimate';
    }

    console.log(`[lookup-lot-size] final: ${lot_size_sqft} sqft (${source})`);

    return json({
      lot_size_sqft,
      source,
      // Flag estimated values so the UI can show "~" prefix
      is_estimate: source === 'google_bounds_estimate'
    });
  } catch (err) {
    console.error('[lookup-lot-size] Error:', err);
    return json({ lot_size_sqft: null, source: 'error' }, { status: 500 });
  }
};
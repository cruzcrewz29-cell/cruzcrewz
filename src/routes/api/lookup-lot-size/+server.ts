import { json } from '@sveltejs/kit';
import { REGRID_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

/**
 * POST /api/lookup-lot-size
 * Body: { lat: number, lng: number }
 * Returns: { lot_size_sqft: number | null, parcel_id: string | null, source: string }
 *
 * Regrid API v2 — correct endpoint: /api/v2/us/point
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { lat, lng } = await request.json();

		if (typeof lat !== 'number' || typeof lng !== 'number') {
			return json({ error: 'lat and lng are required' }, { status: 400 });
		}

		// Correct v2 point endpoint with small radius to catch edge-of-parcel coordinates
		const url = new URL('https://app.regrid.com/api/v2/us/point');
		url.searchParams.set('lat', String(lat));
		url.searchParams.set('lon', String(lng));
		url.searchParams.set('token', REGRID_API_KEY);
		url.searchParams.set('radius', '10'); // 10 meter radius — catches edge cases
		url.searchParams.set('limit', '1');
		url.searchParams.set('return_custom', 'false');
		url.searchParams.set('return_field_labels', 'false');

		const res = await fetch(url.toString(), {
			signal: AbortSignal.timeout(8000)
		});

		if (!res.ok) {
			const body = await res.text().catch(() => '');
			console.error(`[regrid] HTTP ${res.status}: ${body.slice(0, 200)}`);
			return json({ lot_size_sqft: null, parcel_id: null, source: 'regrid_error' });
		}

		const data = await res.json();

		const features = data?.parcels?.features ?? [];
		if (!features.length) {
			console.log('[regrid] No parcel match for', lat, lng);
			return json({ lot_size_sqft: null, parcel_id: null, source: 'regrid_no_match' });
		}

		const fields = features[0]?.properties?.fields ?? {};

		console.log('[regrid] raw fields:', JSON.stringify({
			lotsize: fields.lotsize,
			ll_gisacre: fields.ll_gisacre,
			gisacre: fields.gisacre,
			ll_gissqm: fields.ll_gissqm,
			parcelnumb: fields.parcelnumb,
			address: fields.address
		}));

		let lot_size_sqft: number | null = null;

		if (fields.lotsize && parseFloat(fields.lotsize) > 0) {
			// lotsize is in sqft
			lot_size_sqft = Math.round(parseFloat(fields.lotsize));
		} else if (fields.ll_gisacre && parseFloat(fields.ll_gisacre) > 0) {
			// acres → sqft
			lot_size_sqft = Math.round(parseFloat(fields.ll_gisacre) * 43560);
		} else if (fields.gisacre && parseFloat(fields.gisacre) > 0) {
			lot_size_sqft = Math.round(parseFloat(fields.gisacre) * 43560);
		} else if (fields.ll_gissqm && parseFloat(fields.ll_gissqm) > 0) {
			// square meters → sqft
			lot_size_sqft = Math.round(parseFloat(fields.ll_gissqm) * 10.7639);
		}

		const parcel_id: string | null =
			fields.parcelnumb ?? fields.apn ?? fields.parcel_id ?? null;

		console.log(`[regrid] result: ${lot_size_sqft} sqft  parcel: ${parcel_id}`);

		return json({ lot_size_sqft, parcel_id, source: 'regrid' });
	} catch (err) {
		console.error('[regrid] Error:', err);
		return json({ lot_size_sqft: null, parcel_id: null, source: 'regrid_timeout' });
	}
};
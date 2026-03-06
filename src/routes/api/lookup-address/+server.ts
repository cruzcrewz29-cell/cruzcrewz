import { json } from '@sveltejs/kit';
import { GOOGLE_MAPS_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { lookupLotSize } from '$lib/lot-size/index';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { address } = await request.json();
		if (!address) {
			return json({ error: 'Address is required' }, { status: 400 });
		}

		// Check if we already have this address cached (with a lot size)
		const { data: cached } = await supabase
			.from('address_lookups')
			.select('*')
			.eq('address', address)
			.single();

		if (cached && cached.lot_size_sqft !== null) {
			return json({
				success: true,
				data: cached,
				cached: true
			});
		}

		// Check for manual override
		const { data: override } = await supabase
			.from('lot_size_overrides')
			.select('*')
			.eq('address', address)
			.single();

		if (override) {
			return json({
				success: true,
				data: {
					address,
					lot_size_sqft: override.lot_size_sqft,
					data_source: 'manual_override'
				}
			});
		}

		// Geocode the address
		const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
		const geocodeResponse = await fetch(geocodeUrl);
		const geocodeData = await geocodeResponse.json();

		if (geocodeData.status !== 'OK' || !geocodeData.results[0]) {
			return json({ error: 'Address not found' }, { status: 404 });
		}

		const result = geocodeData.results[0];
console.log('[debug] geometry:', JSON.stringify(result.geometry));

		// Extract address components
		let streetNumber = '';
		let route = '';
		let city = '';
		let state = '';
		let zip = '';
		let county = '';
		const lat: number | null = result.geometry?.location?.lat ?? null;
		const lng: number | null = result.geometry?.location?.lng ?? null;

		for (const component of result.address_components) {
			const types = component.types;
			if (types.includes('street_number')) {
				streetNumber = component.long_name;
			} else if (types.includes('route')) {
				route = component.long_name;
			} else if (types.includes('locality')) {
				city = component.long_name;
			} else if (types.includes('administrative_area_level_1')) {
				state = component.short_name;
			} else if (types.includes('postal_code')) {
				zip = component.long_name;
			} else if (types.includes('administrative_area_level_2')) {
				county = component.long_name.replace(' County', '');
			} else if (types.includes('sublocality_level_1') && !city) {
				city = component.long_name;
			}
		}

		const street_address = `${streetNumber} ${route}`.trim();

		// --- Lot size lookup (non-blocking — failure never breaks the response) ---
		let lot_size_sqft: number | null = null;
		let data_source = 'pending_assessor_lookup';
		let manual_entry_required = false;

		if (county && state && lat !== null && lng !== null) {
			try {
				const lotResult = await lookupLotSize({
					fullAddress: result.formatted_address,
					county: `${county} County`, // restore "County" suffix stripped above
					state,
					lat,
					lng
				});
				lot_size_sqft = lotResult.lot_size_sqft;
				data_source = lotResult.data_source;
				manual_entry_required = lotResult.manual_entry_required;
			} catch (lotErr) {
				console.error('Lot size lookup error (non-fatal):', lotErr);
			}
		}
		// -------------------------------------------------------------------------

		const lookupData = {
			address,
			street_address,
			city,
			state,
			zip,
			formatted_address: result.formatted_address,
			county,
			parcel_id: null,
			lot_size_sqft,
			data_source
		};

		// Upsert into Supabase (handles re-lookups for addresses that cached without a lot size)
		const { data: inserted, error: insertError } = await supabase
			.from('address_lookups')
			.upsert(lookupData, { onConflict: 'address' })
			.select()
			.single();

		if (insertError) {
			console.error('Supabase Upsert Error:', insertError);
		}

		return json({
			success: true,
			data: {
				...(inserted || lookupData),
				manual_entry_required
			},
			message: lot_size_sqft
				? 'Address geocoded with lot size.'
				: 'Address geocoded. Assessor lookup pending.'
		});
	} catch (error) {
		console.error('Address lookup error:', error);
		return json({ error: 'Failed to lookup address' }, { status: 500 });
	}
};
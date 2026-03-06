import { json } from '@sveltejs/kit';
import { GOOGLE_MAPS_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { address } = await request.json();

		if (!address) {
			return json({ error: 'Address is required' }, { status: 400 });
		}

		// Check if we already have this address cached
		const { data: cached } = await supabase
			.from('address_lookups')
			.select('*')
			.eq('address', address)
			.single();

		if (cached) {
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
		
		// Extract county and state
		let county = '';
		let state = '';
		
		for (const component of result.address_components) {
			if (component.types.includes('administrative_area_level_2')) {
				county = component.long_name.replace(' County', '');
			}
			if (component.types.includes('administrative_area_level_1')) {
				state = component.short_name;
			}
		}

		// For now, we'll use a placeholder for lot size
		const lookupData = {
			address,
			formatted_address: result.formatted_address,
			county,
			state,
			parcel_id: null,
			lot_size_sqft: null,
			data_source: 'pending_assessor_lookup'
		};

		// Cache the lookup
		const { data: inserted } = await supabase
			.from('address_lookups')
			.insert(lookupData)
			.select()
			.single();

		return json({
			success: true,
			data: inserted || lookupData,
			message: 'Address geocoded. Assessor lookup pending.'
		});

	} catch (error) {
		console.error('Address lookup error:', error);
		return json(
			{ error: 'Failed to lookup address' },
			{ status: 500 }
		);
	}
};
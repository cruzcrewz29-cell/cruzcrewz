import { json } from '@sveltejs/kit';
import { GOOGLE_MAPS_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const query = url.searchParams.get('query');

		if (!query || query.length < 3) {
			return json({ predictions: [] });
		}

		const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&components=country:us&location=41.8781,-87.6298&radius=80000&strictbounds=false&key=${GOOGLE_MAPS_API_KEY}`;		
		
		const response = await fetch(autocompleteUrl);
		const data = await response.json();

		return json({ predictions: data.predictions || [] });

	} catch (error) {
		console.error('Autocomplete error:', error);
		return json({ predictions: [] }, { status: 500 });
	}
};
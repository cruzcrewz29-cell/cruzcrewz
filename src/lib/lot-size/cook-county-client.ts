/**
 * Client-side lot size lookup for Cook County IL.
 * Called from the browser — Socrata allows browser requests but blocks server ones.
 *
 * Datasets:
 *   3723-97qp — Parcel Addresses  (columns: pin, prop_address_full)
 *   x54s-btds — Residential Characteristics (columns: pin, card, char_land_sf, year)
 */

const SODA_BASE = 'https://datacatalog.cookcountyil.gov/resource';

async function getPinFromAddress(streetAddress: string): Promise<string | null> {
	// streetAddress should be just "2129 MARSTON LN" — no city/state/zip
	const streetOnly = streetAddress.toUpperCase();

	const params = new URLSearchParams({
		$where: `upper(prop_address_full) LIKE '%${streetOnly.replace(/'/g, "''")}%'`,
		$limit: '3',
		$select: 'pin, prop_address_full'
	});

	const res = await fetch(`${SODA_BASE}/3723-97qp.json?${params}`);
	if (!res.ok) return null;

	const data: { pin: string; prop_address_full: string }[] = await res.json();
	if (!data.length) return null;

	console.log(`[cook-county] Matched: ${data[0].prop_address_full} → PIN ${data[0].pin}`);
	return data[0].pin;
}

async function getLotSizeByPin(pin: string): Promise<number | null> {
	const params = new URLSearchParams({
		$where: `pin = '${pin}' AND card = '1'`,
		$order: 'year DESC',
		$limit: '1',
		$select: 'char_land_sf, year'
	});

	const res = await fetch(`${SODA_BASE}/x54s-btds.json?${params}`);
	if (!res.ok) return null;

	const data: { char_land_sf: string; year: string }[] = await res.json();
	if (!data.length || !data[0].char_land_sf) return null;

	const sqft = Math.round(parseFloat(data[0].char_land_sf));
	console.log(`[cook-county] PIN ${pin} → ${sqft} sqft (year ${data[0].year})`);
	return sqft > 0 ? sqft : null;
}

/**
 * Given a street address string (e.g. "2129 Marston Lane"),
 * returns lot size in sqft or null.
 */
export async function lookupCookCountyLotSize(streetAddress: string): Promise<number | null> {
	try {
		const pin = await getPinFromAddress(streetAddress);
		if (!pin) return null;
		return await getLotSizeByPin(pin);
	} catch (err) {
		console.error('[cook-county] Client lookup failed:', err);
		return null;
	}
}
/**
 * Cook County, IL — Lot Size Lookup
 *
 * Step 1: Address → PIN  via "Assessor - Parcel Addresses" (dataset 3723-97qp)
 *         Real columns: pin, prop_address_full
 *
 * Step 2: PIN → lot size via "Assessor - Single and Multi-Family Improvement
 *         Characteristics" (dataset x54s-btds)
 *         Real columns: pin, card, char_land_sf
 *
 * Note: Socrata blocks requests without a browser-like User-Agent header.
 */

const SODA_BASE = 'https://datacatalog.cookcountyil.gov/resource';
const PARCEL_ADDRESSES_ID = '3723-97qp';
const CHARACTERISTICS_ID  = 'x54s-btds';

const HEADERS = {
	'Accept': 'application/json',
	'User-Agent': 'Mozilla/5.0 (compatible; CruzCrewz/1.0; lawn care pricing lookup)'
};

/**
 * Step 1: Address → PIN
 * Strips city/state/zip and searches by street only.
 * e.g. "2129 Marston Ln, Flossmoor, IL 60422, USA" → searches "2129 MARSTON LN"
 */
async function getPinFromAddress(fullAddress: string): Promise<string | null> {
	const streetOnly = fullAddress.split(',')[0].trim().toUpperCase();

	const params = new URLSearchParams({
		$where:  `upper(prop_address_full) LIKE '%${streetOnly.replace(/'/g, "''")}%'`,
		$limit:  '3',
		$select: 'pin, prop_address_full'
	});

	const url = `${SODA_BASE}/${PARCEL_ADDRESSES_ID}.json?${params}`;

	try {
		const res = await fetch(url, {
			headers: HEADERS,
			signal: AbortSignal.timeout(15000)
		});

		if (!res.ok) {
			console.error(`[cook-county] Addresses API error: ${res.status}`);
			return null;
		}

		const data: { pin: string; prop_address_full: string }[] = await res.json();

		if (!data.length) {
			console.warn(`[cook-county] No PIN found for: ${streetOnly}`);
			return null;
		}

		console.log(`[cook-county] Matched: ${data[0].prop_address_full} → PIN ${data[0].pin}`);
		return data[0].pin;
	} catch (err) {
		console.error('[cook-county] getPinFromAddress failed:', err);
		return null;
	}
}

/**
 * Step 2: PIN → lot size (char_land_sf)
 * Filters to card = 1 and most recent year.
 */
async function getLotSizeByPin(pin: string): Promise<number | null> {
	const params = new URLSearchParams({
		$where:  `pin = '${pin}' AND card = '1'`,
		$order:  'year DESC',
		$limit:  '1',
		$select: 'char_land_sf, year'
	});

	const url = `${SODA_BASE}/${CHARACTERISTICS_ID}.json?${params}`;

	try {
		const res = await fetch(url, {
			headers: HEADERS,
			signal: AbortSignal.timeout(15000)
		});

		if (!res.ok) {
			console.error(`[cook-county] Characteristics API error: ${res.status}`);
			return null;
		}

		const data: { char_land_sf: string; year: string }[] = await res.json();

		if (!data.length || !data[0].char_land_sf) {
			console.warn(`[cook-county] No characteristics found for PIN: ${pin}`);
			return null;
		}

		const sqft = Math.round(parseFloat(data[0].char_land_sf));
		console.log(`[cook-county] PIN ${pin} → ${sqft} sqft (year ${data[0].year})`);
		return sqft > 0 ? sqft : null;
	} catch (err) {
		console.error('[cook-county] getLotSizeByPin failed:', err);
		return null;
	}
}

/**
 * Main export: full address → lot size in sqft, or null if not found.
 */
export async function getLotSizeCookCounty(fullAddress: string): Promise<number | null> {
	const pin = await getPinFromAddress(fullAddress);
	if (!pin) return null;
	return getLotSizeByPin(pin);
}
/**
 * Lot Size Router
 *
 * Given a geocoded address (county, state, lat, lng, fullAddress),
 * routes to the correct data source and returns lot_size_sqft.
 *
 * Coverage:
 *   ✅ Cook County, IL        — Socrata SODA API (address → PIN → char_land_sf)
 *   ✅ Lake County, IL        — ArcGIS MapServer point query (Shape_Area)
 *   ✅ Will County, IL        — ArcGIS MapServer point query (Shape_Area)
 *   ⚠️  Porter County, IN     — No public API; returns null (manual override required)
 *   ⚠️  Lake County, IN       — No public API; returns null (manual override required)
 *
 * Returns: lot size in square feet, or null if unavailable.
 */

import { getLotSizeCookCounty } from './cook-county';
import { getLotSizeArcGIS } from './arcgis-counties';

export interface LotSizeLookupInput {
  fullAddress: string;   // Full formatted address (from Google geocoder)
  county: string;        // e.g. "Cook County"
  state: string;         // e.g. "IL"
  lat: number;
  lng: number;
}

export interface LotSizeLookupResult {
  lot_size_sqft: number | null;
  data_source: string;
  /** True if this county has no automated source — prompt admin to enter manually */
  manual_entry_required: boolean;
}

/**
 * Normalize county names from Google Geocoding API.
 * Google returns them as "Cook County", "Lake County", etc.
 */
function normalizeCounty(county: string): string {
  return county.toLowerCase().replace(/\s+county$/i, '').trim();
}

export async function lookupLotSize(
  input: LotSizeLookupInput,
): Promise<LotSizeLookupResult> {
  const county = normalizeCounty(input.county);
  const state  = input.state.toUpperCase();

  // ── Cook County, IL ────────────────────────────────────────────────────────
  if (county === 'cook' && state === 'IL') {
    const sqft = await getLotSizeCookCounty(input.fullAddress);
    return {
      lot_size_sqft:        sqft,
      data_source:          'cook_county_socrata',
      manual_entry_required: sqft === null,
    };
  }

  // ── Lake County, IL ────────────────────────────────────────────────────────
  if (county === 'lake' && state === 'IL') {
    const sqft = await getLotSizeArcGIS('lake-county-il', input.lat, input.lng);
    return {
      lot_size_sqft:        sqft,
      data_source:          'lake_county_il_arcgis',
      manual_entry_required: sqft === null,
    };
  }

  // ── Will County, IL ────────────────────────────────────────────────────────
  if (county === 'will' && state === 'IL') {
    const sqft = await getLotSizeArcGIS('will-county-il', input.lat, input.lng);
    return {
      lot_size_sqft:        sqft,
      data_source:          'will_county_il_arcgis',
      manual_entry_required: sqft === null,
    };
  }

  // ── Porter County, IN / Lake County, IN ───────────────────────────────────
  // No public API available. Admin must enter lot size manually.
  if (state === 'IN' && (county === 'porter' || county === 'lake')) {
    return {
      lot_size_sqft:        null,
      data_source:          'manual',
      manual_entry_required: true,
    };
  }

  // ── Unknown / unsupported county ──────────────────────────────────────────
  return {
    lot_size_sqft:        null,
    data_source:          'unsupported',
    manual_entry_required: true,
  };
}
/**
 * ArcGIS-based Lot Size Lookup
 * Covers: Lake County IL, Will County IL
 *
 * Both counties expose public ArcGIS REST MapServer endpoints.
 * Strategy: query the parcel feature layer by lat/lng point intersection,
 * then read the Shape_Area attribute (in the layer's native CRS units —
 * typically square feet for Illinois State Plane).
 *
 * Lake County IL:
 *   MapServer: https://maps.lakecountyil.gov/arcgis/rest/services/GISMapping/WABParcels/MapServer
 *   The parcel layer index needs confirmation; we try layer 0 first.
 *   The parcel shapefile only includes PIN (PARCEL_NUM), NOT lot size attributes.
 *   Shape_Area from the polygon geometry IS reliable for lot size.
 *
 * Will County IL:
 *   MapServer: https://gis.willcountyillinois.com/hosting/rest/services/Basemap/Parcels_V/MapServer
 *   Fields include PIN, HOUSENUMBE, Shape_Area.
 *
 * Shape_Area is in the layer's CRS. Illinois State Plane (WKID 102671 / EPSG:3435)
 * uses US Survey Feet, so Shape_Area is already in square feet.
 */

export type ArcGISCounty = 'lake-county-il' | 'will-county-il';

interface ArcGISConfig {
  /** Full REST endpoint to the parcel layer query */
  queryUrl: string;
  /** The field containing lot area. Usually Shape_Area. */
  areaField: string;
  /**
   * Conversion factor: multiply raw area value → square feet.
   * Illinois State Plane (feet) = 1.0
   * If a county uses meters, factor = 10.7639
   */
  areaToSqft: number;
  /** WKID of the layer's native spatial reference (for the geometry query) */
  wkid: number;
}

const ARCGIS_CONFIGS: Record<ArcGISCounty, ArcGISConfig> = {
  'lake-county-il': {
    // WABParcels MapServer — parcel layer 0
    // Note: PARCEL_NUM is the only attribute in the public download,
    // but the live MapServer returns Shape_Area from the polygon geometry.
    queryUrl: 'https://maps.lakecountyil.gov/arcgis/rest/services/GISMapping/WABParcels/MapServer/0/query',
    areaField: 'Shape_Area',
    areaToSqft: 1.0,   // Illinois State Plane feet
    wkid: 3435,
  },
  'will-county-il': {
    // Will County public GIS hosting — Parcels_V layer
    queryUrl: 'https://gis.willcountyillinois.com/hosting/rest/services/Basemap/Parcels_V/MapServer/0/query',
    areaField: 'Shape_Area',
    areaToSqft: 1.0,   // Illinois State Plane feet
    wkid: 102100,      // Web Mercator (based on fullExtent in the service JSON)
  },
};

/**
 * Project WGS84 (lat/lng) to a point string for ArcGIS geometry parameter.
 * We send as WGS84 (WKID 4326) and specify inSR=4326 in the request so
 * ArcGIS handles the projection server-side.
 */
function buildGeometryParam(lat: number, lng: number): string {
  return JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } });
}

/**
 * Query a county's ArcGIS parcel service by lat/lng point intersection.
 * Returns the lot size in square feet, or null if not found.
 */
export async function getLotSizeArcGIS(
  county: ArcGISCounty,
  lat: number,
  lng: number,
): Promise<number | null> {
  const config = ARCGIS_CONFIGS[county];

  const params = new URLSearchParams({
    geometry:      buildGeometryParam(lat, lng),
    geometryType:  'esriGeometryPoint',
    inSR:          '4326',             // input is WGS84
    spatialRel:    'esriSpatialRelIntersects',
    outFields:     config.areaField,
    returnGeometry: 'false',
    f:             'json',
  });

  const url = `${config.queryUrl}?${params}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`[arcgis/${county}] HTTP error: ${res.status}`);
      return null;
    }

    const data = await res.json();

    // ArcGIS returns errors as { error: { code, message } }
    if (data.error) {
      console.error(`[arcgis/${county}] API error:`, data.error.message);
      return null;
    }

    const features = data.features ?? [];
    if (!features.length) {
      console.warn(`[arcgis/${county}] No parcel found at (${lat}, ${lng})`);
      return null;
    }

    const rawArea = features[0]?.attributes?.[config.areaField];
    if (rawArea == null || isNaN(Number(rawArea))) {
      console.warn(`[arcgis/${county}] Missing area field for parcel at (${lat}, ${lng})`);
      return null;
    }

    const sqft = Math.round(Number(rawArea) * config.areaToSqft);
    console.log(`[arcgis/${county}] (${lat}, ${lng}) → ${sqft} sqft`);
    return sqft > 0 ? sqft : null;

  } catch (err) {
    console.error(`[arcgis/${county}] Lookup failed:`, err);
    return null;
  }
}
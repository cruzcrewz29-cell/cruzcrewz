// src/lib/pricing/calculator.ts
//
// Service pricing formulas — Chicago metro / NW Indiana market rates (2024).
// Admin pricing_rules override the sqft rate for mowing/edging.
// All other services use the constants below as defaults.
//
// To adjust: change the constants in each service block.
// Units: prices in USD, sizes in sqft, counts as integers.

// ─── Yard size tiers (fallback when lot size auto-detect fails) ──────────────

export const YARD_TIERS = [
  { id: 'small',  label: 'Small',  sublabel: 'Under 3,000 sq ft', sqft: 2500,  icon: '▪' },
  { id: 'medium', label: 'Medium', sublabel: '3,000–7,000 sq ft', sqft: 5000,  icon: '▪▪' },
  { id: 'large',  label: 'Large',  sublabel: '7,000–15,000 sq ft', sqft: 10000, icon: '▪▪▪' },
  { id: 'xlarge', label: 'Extra Large', sublabel: 'Over 15,000 sq ft', sqft: 18000, icon: '▪▪▪▪' },
] as const;

export type YardTierId = typeof YARD_TIERS[number]['id'];

// ─── Mowing & Edging ─────────────────────────────────────────────────────────

const MOWING_RATE_PER_SQFT = 0.0095;   // $9.50 per 1,000 sqft
const MOWING_MIN = 45;                  // minimum visit price
const MOWING_MAX = 350;                 // cap for residential

export function calcMowing(sqft: number, adminRule?: AdminRule | null): number {
  const rate = adminRule?.price_per_sqft ?? MOWING_RATE_PER_SQFT;
  let price = sqft * rate;
  const min = adminRule?.min_price ?? MOWING_MIN;
  const max = adminRule?.max_price ?? MOWING_MAX;
  return Math.round(Math.max(min, Math.min(max, price)));
}

// ─── Trimming & Edging ───────────────────────────────────────────────────────

const EDGING_RATE_PER_SQFT = 0.006;
const EDGING_MIN = 35;
const EDGING_MAX = 200;

export function calcEdging(sqft: number, adminRule?: AdminRule | null): number {
  const rate = adminRule?.price_per_sqft ?? EDGING_RATE_PER_SQFT;
  let price = sqft * rate;
  const min = adminRule?.min_price ?? EDGING_MIN;
  const max = adminRule?.max_price ?? EDGING_MAX;
  return Math.round(Math.max(min, Math.min(max, price)));
}

// ─── Bush / Shrub / Tree Care ────────────────────────────────────────────────
//
// Formula:
//   base_fee
//   + (shrub_count × per_shrub_rate × height_multiplier × condition_multiplier)
//   + (tree_count  × per_tree_rate  × condition_multiplier)
//   capped at max, bumped to min

const TREE_BASE_FEE = 50;            // show-up / setup fee
const PER_SHRUB_RATE = 12;           // base price per shrub
const PER_TREE_RATE = 45;            // base price per tree

// height multiplier applied to shrubs
const SHRUB_HEIGHT_MULTIPLIERS: Record<ShrubHeight, number> = {
  'under-4ft': 1.0,
  '4-8ft':     1.5,
  'over-8ft':  2.2,
};

// condition multiplier — overgrown means more time
const CONDITION_MULTIPLIERS: Record<TrimCondition, number> = {
  'maintained':  1.0,   // trimmed within last season
  'overgrown':   1.6,   // hasn't been done in 1+ years
};

// work type surcharge
const WORK_TYPE_SURCHARGES: Record<WorkType, number> = {
  'trim-shape': 0,      // standard — no surcharge
  'removal':    75,     // removal adds flat fee (debris hauling etc.)
};

const TREE_MIN = 75;
const TREE_MAX = 1200;

export type ShrubHeight   = 'under-4ft' | '4-8ft' | 'over-8ft';
export type TrimCondition = 'maintained' | 'overgrown';
export type WorkType      = 'trim-shape' | 'removal';

export interface TreeCareInputs {
  shrubCount:  number;
  treeCount:   number;
  shrubHeight: ShrubHeight;
  condition:   TrimCondition;
  workType:    WorkType;
}

export function calcTreeCare(inputs: TreeCareInputs): number {
  const { shrubCount, treeCount, shrubHeight, condition, workType } = inputs;
  const heightMult    = SHRUB_HEIGHT_MULTIPLIERS[shrubHeight];
  const conditionMult = CONDITION_MULTIPLIERS[condition];
  const workSurcharge = WORK_TYPE_SURCHARGES[workType];

  const shrubTotal = shrubCount * PER_SHRUB_RATE * heightMult * conditionMult;
  const treeTotal  = treeCount  * PER_TREE_RATE  * conditionMult;

  const price = TREE_BASE_FEE + shrubTotal + treeTotal + workSurcharge;
  return Math.round(Math.max(TREE_MIN, Math.min(TREE_MAX, price)));
}

// ─── Spring / Fall Cleanups ──────────────────────────────────────────────────
//
// Formula:
//   base_fee
//   + sqft × debris_rate_per_sqft (leaf/debris volume scales with lot)
//   + bed_count × per_bed_rate
//   + bed_sqft  × per_bed_sqft_rate
//   + hauling_flat_fee (if disposal requested)

const CLEANUP_BASE_FEE = 75;
const CLEANUP_SQFT_RATE = 0.004;       // $4 per 1,000 sqft lot (leaf volume proxy)

const DEBRIS_MULTIPLIERS: Record<DebrisLevel, number> = {
  'light':    0.8,
  'moderate': 1.0,
  'heavy':    1.5,
};

const CLEANUP_PER_BED      = 18;       // per garden bed (edging, clearing)
const CLEANUP_PER_BED_SQFT = 0.12;    // per sqft of bed area
const CLEANUP_HAULING_FEE  = 60;       // flat disposal/hauling add-on
const CLEANUP_MIN = 100;
const CLEANUP_MAX = 900;

export type DebrisLevel = 'light' | 'moderate' | 'heavy';

export interface CleanupInputs {
  lotSqft:     number;
  bedCount:    number;
  bedSqft:     number;
  debrisLevel: DebrisLevel;
  needsHauling: boolean;
}

export function calcCleanup(inputs: CleanupInputs): number {
  const { lotSqft, bedCount, bedSqft, debrisLevel, needsHauling } = inputs;
  const debrisMult = DEBRIS_MULTIPLIERS[debrisLevel];

  const lotComponent  = lotSqft * CLEANUP_SQFT_RATE * debrisMult;
  const bedComponent  = bedCount * CLEANUP_PER_BED + bedSqft * CLEANUP_PER_BED_SQFT;
  const haulComponent = needsHauling ? CLEANUP_HAULING_FEE : 0;

  const price = CLEANUP_BASE_FEE + lotComponent + bedComponent + haulComponent;
  return Math.round(Math.max(CLEANUP_MIN, Math.min(CLEANUP_MAX, price)));
}

// ─── Landscape Maintenance ───────────────────────────────────────────────────
//
// Similar to cleanup but recurring-oriented pricing:
// lower base, heavier weight on beds (that's the main work).

const LANDSCAPE_BASE_FEE = 60;
const LANDSCAPE_SQFT_RATE = 0.003;
const LANDSCAPE_PER_BED      = 22;
const LANDSCAPE_PER_BED_SQFT = 0.15;

const LANDSCAPE_DEBRIS_MULTIPLIERS: Record<DebrisLevel, number> = {
  'light':    0.9,
  'moderate': 1.0,
  'heavy':    1.3,
};

const LANDSCAPE_HAULING_FEE = 45;
const LANDSCAPE_MIN = 85;
const LANDSCAPE_MAX = 800;

export interface LandscapeInputs {
  lotSqft:      number;
  bedCount:     number;
  bedSqft:      number;
  debrisLevel:  DebrisLevel;
  needsHauling: boolean;
}

export function calcLandscape(inputs: LandscapeInputs): number {
  const { lotSqft, bedCount, bedSqft, debrisLevel, needsHauling } = inputs;
  const debrisMult = LANDSCAPE_DEBRIS_MULTIPLIERS[debrisLevel];

  const lotComponent  = lotSqft * LANDSCAPE_SQFT_RATE * debrisMult;
  const bedComponent  = bedCount * LANDSCAPE_PER_BED + bedSqft * LANDSCAPE_PER_BED_SQFT;
  const haulComponent = needsHauling ? LANDSCAPE_HAULING_FEE : 0;

  const price = LANDSCAPE_BASE_FEE + lotComponent + bedComponent + haulComponent;
  return Math.round(Math.max(LANDSCAPE_MIN, Math.min(LANDSCAPE_MAX, price)));
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface AdminRule {
  price_per_sqft: number;
  min_price?: number | null;
  max_price?: number | null;
}
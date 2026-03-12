// src/lib/data/services.ts
export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  features: string[];
  pricing: {
    tier: 'small' | 'medium' | 'large';
    price: number;
    label: string;
  }[];
  frequency: 'one-time' | 'recurring' | 'seasonal';
}

export const services = [
	{
		id: 'lawn-mowing',
		name: 'Lawn Mowing',
		slug: 'lawn-mowing',
		icon: 'zap',
		description: 'Professional lawn mowing service with flip edging included',
		frequency: 'recurring',
		features: [
			'Professional mowing',
			'Flip edging included',
			'Grass clippings mulched or bagged',
			'Consistent cutting height',
			'Weekly or bi-weekly service'
		],
		pricing: [] // Removed - using lot size calculation
	},
	{
		id: 'trimming-edging',
		name: 'Trimming & Edging',
		slug: 'trimming-edging',
		icon: 'sparkles',
		description: 'Precision trimming and edging for a polished look',
		frequency: 'recurring',
		features: [
			'String trimming around obstacles',
			'Clean edge along walkways',
			'Professional finish',
			'Debris removal'
		],
		pricing: []
	},
	{
		id: 'tree-care',
		name: 'Bush, Shrub & Tree Care',
		slug: 'tree-care',
		icon: 'sun',
		description: 'Expert trimming, pruning, and removal services',
		frequency: 'seasonal',
		features: [
			'Professional pruning',
			'Shaping and trimming',
			'Tree and shrub removal',
			'Branch cleanup and hauling',
			'Health assessment'
		],
		pricing: []
	},
	{
		id: 'seasonal-cleanup',
		name: 'Spring & Fall Cleanups',
		slug: 'seasonal-cleanup',
		icon: 'layers',
		description: 'Complete seasonal property cleanup and maintenance',
		frequency: 'seasonal',
		features: [
			'Leaf removal and disposal',
			'Debris cleanup',
			'Bed preparation',
			'Gutter cleaning',
			'Property detailing'
		],
		pricing: []
	},
	{
		id: 'landscape-maintenance',
		name: 'Landscape Maintenance',
		slug: 'landscape-maintenance',
		icon: 'grid',
		description: 'Complete landscape care and maintenance',
		frequency: 'recurring',
		features: [
			'Mulching and bed maintenance',
			'Weed control',
			'Plant care',
			'Seasonal planting',
			'Complete property upkeep'
		],
		pricing: []
	},
		{
		id: 'lawn-aeration',
		name: 'Lawn Aeration & Overseeding',
		slug: 'lawn-aeration',
		icon: 'sprout',
		description: 'Deep aeration and premium overseeding for a thicker, healthier lawn',
		frequency: 'seasonal',
		features: [
			'Core aeration to reduce compaction',
			'Premium grass seed application',
			'Improves water and nutrient absorption',
			'Best done in spring or fall',
			'Visible results within 2–3 weeks'
		],
		pricing: []
	},
];
export const serviceAreas = [
  // Chicago - South & Central (Within ~35-40 miles of Hobart)
  '60601', '60602', '60603', '60604', '60605', '60606', '60607', '60608', '60609', 
  '60615', '60616', '60617', '60619', '60620', '60621', '60628', '60629', '60632', 
  '60633', '60636', '60637', '60638', '60643', '60649', '60652', '60653', '60655',

  // Illinois South Suburbs (The "Core" IL Service Area for Hobart)
  '60402', '60406', '60409', '60411', '60415', '60417', '60419', '60422', '60423', 
  '60425', '60426', '60429', '60430', '60438', '60439', '60443', '60445', '60448', 
  '60449', '60451', '60452', '60453', '60455', '60456', '60457', '60458', '60459', 
  '60461', '60462', '60463', '60464', '60465', '60466', '60467', '60468', '60469', 
  '60471', '60472', '60473', '60475', '60476', '60477', '60478', '60479', '60480', 
  '60482', '60487', '60803', '60805',

  // Northwest Indiana - Lake County (Immediate Hobart Area)
  '46303', '46307', '46311', '46312', '46319', '46320', '46321', '46322', '46323', 
  '46324', '46327', '46342', '46356', '46373', '46375', '46394', 
  '46401', '46402', '46403', '46404', '46405', '46406', '46407', '46408', '46409', '46410',

  // Northwest Indiana - Porter County (East of Hobart)
  '46301', '46304', '46368', '46383', '46385', '46341',

  // Northwest Indiana - LaPorte County (Edge of 35-40 mile radius)
  '46350', '46360', '46391'
];
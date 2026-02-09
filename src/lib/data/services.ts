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

export const services: Service[] = [
  {
    id: 'mowing',
    name: 'Lawn Mowing',
    slug: 'lawn-mowing',
    description: 'Professional lawn mowing service to keep your grass at the perfect height year-round.',
    icon: '🌱',
    features: [
      'Precision cutting to optimal height',
      'String trimming around edges',
      'Blowing clippings off hard surfaces',
      'Weekly or bi-weekly scheduling'
    ],
    pricing: [
      { tier: 'small', price: 60, label: 'Small Yard (< 5,000 sq ft)' },
      { tier: 'medium', price: 85, label: 'Medium Yard (5,000-10,000 sq ft)' },
      { tier: 'large', price: 125, label: 'Large Yard (> 10,000 sq ft)' }
    ],
    frequency: 'recurring'
  },
  {
    id: 'trimming',
    name: 'Trimming & Edging',
    slug: 'trimming-edging',
    description: 'Clean, crisp edges and perfectly trimmed borders for a manicured look.',
    icon: '✂️',
    features: [
      'String trimming around obstacles',
      'Edging along walkways and driveways',
      'Trimming around flower beds',
      'Clean-up of debris'
    ],
    pricing: [
      { tier: 'small', price: 60, label: 'Small Property' },
      { tier: 'medium', price: 80, label: 'Medium Property' },
      { tier: 'large', price: 110, label: 'Large Property' }
    ],
    frequency: 'recurring'
  },
  {
    id: 'fertilization',
    name: 'Fertilization & Weed Control',
    slug: 'fertilization-weed-control',
    description: 'Professional-grade fertilization and targeted weed control for a healthy, green lawn.',
    icon: '🌿',
    features: [
      '6-step fertilization program',
      'Pre and post-emergent weed control',
      'Customized treatment plans',
      'Seasonal applications'
    ],
    pricing: [
      { tier: 'small', price: 95, label: 'Small Lawn (< 5,000 sq ft)' },
      { tier: 'medium', price: 145, label: 'Medium Lawn (5,000-10,000 sq ft)' },
      { tier: 'large', price: 225, label: 'Large Lawn (> 10,000 sq ft)' }
    ],
    frequency: 'seasonal'
  },
  {
    id: 'aeration',
    name: 'Aeration & Overseeding',
    slug: 'aeration-overseeding',
    description: 'Core aeration to relieve soil compaction and overseeding for a thicker, healthier lawn.',
    icon: '🌾',
    features: [
      'Core aeration to improve soil health',
      'Premium grass seed selection',
      'Starter fertilizer application',
      'Post-treatment care instructions'
    ],
    pricing: [
      { tier: 'small', price: 175, label: 'Small Lawn (< 5,000 sq ft)' },
      { tier: 'medium', price: 275, label: 'Medium Lawn (5,000-10,000 sq ft)' },
      { tier: 'large', price: 425, label: 'Large Lawn (> 10,000 sq ft)' }
    ],
    frequency: 'seasonal'
  },
  {
    id: 'leaf-removal',
    name: 'Leaf Removal',
    slug: 'leaf-removal',
    description: 'Complete fall cleanup including leaf removal, blowing, and disposal.',
    icon: '🍂',
    features: [
      'Complete leaf removal from lawn',
      'Cleaning of beds and gardens',
      'Gutter cleaning available',
      'Eco-friendly disposal'
    ],
    pricing: [
      { tier: 'small', price: 125, label: 'Small Property (light coverage)' },
      { tier: 'medium', price: 195, label: 'Medium Property (moderate coverage)' },
      { tier: 'large', price: 325, label: 'Large Property (heavy coverage)' }
    ],
    frequency: 'seasonal'
  },
  {
    id: 'landscape-maintenance',
    name: 'Landscape Maintenance',
    slug: 'landscape-maintenance',
    description: 'Full-service landscape care including pruning, mulching, and bed maintenance.',
    icon: '🌳',
    features: [
      'Shrub and tree pruning',
      'Mulch installation and refresh',
      'Bed weeding and maintenance',
      'Seasonal plant care'
    ],
    pricing: [
      { tier: 'small', price: 195, label: 'Basic Package (1-2 beds)' },
      { tier: 'medium', price: 350, label: 'Standard Package (3-5 beds)' },
      { tier: 'large', price: 575, label: 'Premium Package (6+ beds)' }
    ],
    frequency: 'recurring'
  }
];

export const serviceAreas = [
  '30301', '30302', '30303', '30304', '30305', '30306', '30307', '30308',
  '30309', '30310', '30311', '30312', '30313', '30314', '30315', '30316',
  '30317', '30318', '30319', '30320', '30321', '30322', '30324', '30325',
  '30326', '30327', '30328', '30329', '30330', '30331', '30332', '30333',
  '30334', '30336', '30337', '30338', '30339', '30340', '30341', '30342'
];
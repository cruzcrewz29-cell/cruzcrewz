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
    icon: 'Zap', // Lightning bolt
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
    icon: 'Scissors',
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
    id: 'aeration',
    name: 'Aeration & Overseeding',
    slug: 'aeration-overseeding',
    description: 'Core aeration to relieve soil compaction and overseeding for a thicker, healthier lawn.',
    icon: 'Sparkles',
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
    icon: 'Leaf',
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
    icon: 'Trees',
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
  // Chicago City Proper (60601-60661, 60666-60699, 60701-60712, 60714)
  '60601', '60602', '60603', '60604', '60605', '60606', '60607', '60608', '60609', '60610',
  '60611', '60612', '60613', '60614', '60615', '60616', '60617', '60618', '60619', '60620',
  '60621', '60622', '60623', '60624', '60625', '60626', '60628', '60629', '60630', '60631',
  '60632', '60633', '60634', '60636', '60637', '60638', '60639', '60640', '60641', '60642',
  '60643', '60644', '60645', '60646', '60647', '60649', '60651', '60652', '60653', '60654',
  '60655', '60656', '60657', '60659', '60660', '60661', '60666', '60668', '60669', '60670',
  '60673', '60674', '60675', '60677', '60678', '60680', '60681', '60682', '60684', '60685',
  '60686', '60687', '60688', '60689', '60690', '60691', '60693', '60694', '60695', '60696',
  '60697', '60699', '60701', '60706', '60707', '60712', '60714',
  
  // North Shore Suburbs
  '60015', '60025', '60026', '60029', '60040', '60043', '60044', '60045', '60053', '60062',
  '60064', '60065', '60070', '60076', '60077', '60081', '60091', '60093', '60201', '60202',
  '60203', '60204', '60208', '60209',
  
  // Northwest Suburbs
  '60004', '60005', '60006', '60007', '60008', '60010', '60016', '60017', '60018', '60019',
  '60022', '60038', '60047', '60050', '60056', '60067', '60068', '60069', '60071', '60072',
  '60073', '60074', '60089', '60090', '60101', '60102', '60103', '60107', '60120', '60131',
  '60133', '60156', '60168', '60169', '60173', '60176', '60192', '60193', '60194', '60195',
  '60196',
  
  // Western Suburbs
  '60104', '60105', '60106', '60108', '60117', '60118', '60119', '60122', '60123', '60126',
  '60130', '60137', '60139', '60143', '60148', '60153', '60154', '60155', '60160', '60162',
  '60163', '60164', '60165', '60171', '60181', '60184', '60185', '60187', '60188', '60189',
  '60190', '60191', '60301', '60302', '60304', '60305', '60402', '60501', '60513', '60514',
  '60515', '60516', '60517', '60521', '60522', '60523', '60525', '60526', '60527', '60530',
  '60532', '60540', '60544', '60558', '60559', '60561', '60563', '60564', '60565', '60566',
  '60585',
  
  // South Suburbs
  '60406', '60409', '60411', '60415', '60417', '60419', '60422', '60423', '60425', '60426',
  '60429', '60430', '60443', '60445', '60446', '60448', '60449', '60451', '60452', '60453',
  '60455', '60456', '60457', '60458', '60459', '60461', '60462', '60463', '60464', '60465',
  '60466', '60467', '60468', '60469', '60471', '60472', '60473', '60475', '60476', '60477',
  '60478', '60479', '60480', '60481', '60482', '60487', '60490',
  
  // Southwest Suburbs
  '60403', '60415', '60439', '60440', '60441', '60442', '60491', '60501', '60513', '60534',
  '60546', '60803', '60804', '60805', '60525',
  
  // Northwest Indiana - Lake County
  '46301', '46302', '46303', '46304', '46307', '46308', '46310', '46311', '46312', '46319',
  '46320', '46321', '46322', '46323', '46327', '46340', '46341', '46342', '46347', '46348',
  '46349', '46350', '46355', '46356', '46373', '46374', '46375', '46376', '46377', '46394',
  '46401', '46402', '46403', '46404', '46405', '46406', '46407', '46408', '46409', '46410',
  
  // Northwest Indiana - Porter County
  '46304', '46360', '46361', '46368', '46381', '46382', '46383', '46385',
  
  // Northwest Indiana - LaPorte County
  '46350', '46352', '46360', '46361', '46365', '46366', '46371', '46385', '46390', '46391',
  '46392', '46393',
  
  // Northwest Indiana - Other nearby areas
  '46310', '46311', '46312', '46319', '46320', '46321', '46322', '46323', '46327', '46340',
  '46341', '46342', '46347', '46348', '46349', '46356', '46373', '46374', '46375', '46376',
  '46377', '46394'
];
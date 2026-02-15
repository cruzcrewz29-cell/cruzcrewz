// src/lib/data/portfolio.ts
export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  service: string;
  location: string;
  date: string;
  featured: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  text: string;
  rating: number;
  service?: string;
  date: string;
  featured: boolean;
}

// Mock data stores (replace with actual backend/database)
let portfolioItems: PortfolioItem[] = [
  {
    id: '1',
    title: 'Complete Lawn Transformation',
    description: 'Full yard renovation including aeration, overseeding, and fertilization',
    beforeImage: '/portfolio/before-1.jpg',
    afterImage: '/portfolio/after-1.jpg',
    service: 'Lawn Renovation',
    location: 'Buckhead, GA',
    date: '2024-06-15',
    featured: true
  }
];

let testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    location: 'Buckhead, GA',
    text: 'Best lawn service we\'ve ever used! Our yard has never looked better and the team is always on time.',
    rating: 5,
    service: 'Lawn Mowing',
    date: '2024-11-20',
    featured: true
  },
  {
    id: '2',
    name: 'Michael Chen',
    location: 'Midtown, GA',
    text: 'Professional, reliable, and affordable. They transformed our overgrown yard into something we\'re proud of.',
    rating: 5,
    service: 'Landscape Maintenance',
    date: '2024-10-15',
    featured: true
  },
  {
    id: '3',
    name: 'Jennifer Williams',
    location: 'Decatur, GA',
    text: 'Great communication and attention to detail. They even clean up after themselves - highly recommend!',
    rating: 5,
    service: 'Fertilization',
    date: '2024-09-08',
    featured: true
  }
];

// Portfolio CRUD operations
export const portfolioStore = {
  getAll: () => portfolioItems,
  getById: (id: string) => portfolioItems.find(item => item.id === id),
  getFeatured: () => portfolioItems.filter(item => item.featured),
  create: (item: Omit<PortfolioItem, 'id'>) => {
    const newItem = { ...item, id: Date.now().toString() };
    portfolioItems = [...portfolioItems, newItem];
    return newItem;
  },
  update: (id: string, updates: Partial<PortfolioItem>) => {
    portfolioItems = portfolioItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    return portfolioItems.find(item => item.id === id);
  },
  delete: (id: string) => {
    portfolioItems = portfolioItems.filter(item => item.id !== id);
  }
};

// Testimonials CRUD operations
export const testimonialsStore = {
  getAll: () => testimonials,
  getById: (id: string) => testimonials.find(t => t.id === id),
  getFeatured: () => testimonials.filter(t => t.featured),
  create: (testimonial: Omit<Testimonial, 'id'>) => {
    const newTestimonial = { ...testimonial, id: Date.now().toString() };
    testimonials = [...testimonials, newTestimonial];
    return newTestimonial;
  },
  update: (id: string, updates: Partial<Testimonial>) => {
    testimonials = testimonials.map(t => 
      t.id === id ? { ...t, ...updates } : t
    );
    return testimonials.find(t => t.id === id);
  },
  delete: (id: string) => {
    testimonials = testimonials.filter(t => t.id !== id);
  }
};
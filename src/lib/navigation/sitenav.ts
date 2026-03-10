// src/lib/navigation/sitenav.ts
import LayoutDashboard from 'lucide-svelte/icons/layout-dashboard';
import Calendar from 'lucide-svelte/icons/calendar';
import ClipboardList from 'lucide-svelte/icons/clipboard-list';
import Users from 'lucide-svelte/icons/users';
import Settings from 'lucide-svelte/icons/settings';
import ImageIcon from 'lucide-svelte/icons/image';
import MessageSquare from 'lucide-svelte/icons/message-square';
import MessagesSquare from 'lucide-svelte/icons/messages-square';
import BarChart3 from 'lucide-svelte/icons/bar-chart-3';
import DollarSign from 'lucide-svelte/icons/dollar-sign';
import RouteIcon from 'lucide-svelte/icons/route';
import TrendingUp from 'lucide-svelte/icons/trending-up';
import MapPin from 'lucide-svelte/icons/map-pin';
import Trophy from 'lucide-svelte/icons/trophy';

export type NavItem = {
  label: string;
  href: string;
  section: string;
  icon: typeof LayoutDashboard;
};

export const SITE_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/app',               section: 'Dashboard',    icon: LayoutDashboard },
  { label: 'Calendar',     href: '/app/calendar',       section: 'Calendar',     icon: Calendar },
  { label: 'Jobs',         href: '/app/jobs',           section: 'Jobs',         icon: ClipboardList },
  { label: 'Customers',    href: '/app/customers',      section: 'Customers',    icon: Users },
  { label: 'Messages',     href: '/app/messages',       section: 'Messages',     icon: MessagesSquare },
  { label: 'Routes',       href: '/app/routes',         section: 'Routes',       icon: RouteIcon },
  { label: 'Heat Map',     href: '/app/heatmap',        section: 'Heat Map',     icon: MapPin },
  { label: 'Leaderboard',  href: '/app/leaderboard',    section: 'Leaderboard',  icon: Trophy },
  { label: 'Accounting',   href: '/app/accounting',     section: 'Accounting',   icon: TrendingUp },
  { label: 'Pricing',      href: '/app/pricing',        section: 'Pricing',      icon: DollarSign },
  { label: 'Portfolio',    href: '/app/portfolio',      section: 'Portfolio',    icon: ImageIcon },
  { label: 'Testimonials', href: '/app/testimonials',   section: 'Testimonials', icon: MessageSquare },
  { label: 'QR Analytics', href: '/app/analytics',      section: 'QR Analytics', icon: BarChart3 },
  { label: 'Settings',     href: '/app/settings',       section: 'Settings',     icon: Settings },
];
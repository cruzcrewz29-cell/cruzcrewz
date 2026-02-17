import LayoutDashboard from 'lucide-svelte/icons/layout-dashboard';
import Calendar from 'lucide-svelte/icons/calendar';
import ClipboardList from 'lucide-svelte/icons/clipboard-list';
import Users from 'lucide-svelte/icons/users';
import Settings from 'lucide-svelte/icons/settings';
import ImageIcon from 'lucide-svelte/icons/image';
import MessageSquare from 'lucide-svelte/icons/message-square';

export type NavItem = {
	label: string;
	href: string;
	section: string;
	icon: typeof LayoutDashboard;
};

export const SITE_NAV: NavItem[] = [
	{
		label: 'Dashboard',
		href: '/app',
		section: 'Dashboard',
		icon: LayoutDashboard
	},
	{
		label: 'Calendar',
		href: '/app/calendar',
		section: 'Calendar',
		icon: Calendar
	},
	{
		label: 'Jobs',
		href: '/app/jobs',
		section: 'Jobs',
		icon: ClipboardList
	},
	{
		label: 'Customers',
		href: '/app/customers',
		section: 'Customers',
		icon: Users
	},
	{
		label: 'Portfolio',
		href: '/app/portfolio',
		section: 'Portfolio',
		icon: ImageIcon
	},
	{
		label: 'Testimonials',
		href: '/app/testimonials',
		section: 'Testimonials',
		icon: MessageSquare
	},
	{
		label: 'Settings',
		href: '/app/settings',
		section: 'Settings',
		icon: Settings
	}
];
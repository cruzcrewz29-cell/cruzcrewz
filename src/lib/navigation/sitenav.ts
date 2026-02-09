import LayoutDashboard from 'lucide-svelte/icons/layout-dashboard';
import ClipboardList from 'lucide-svelte/icons/clipboard-list';
import Users from 'lucide-svelte/icons/users';
import Settings from 'lucide-svelte/icons/settings';

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
		label: 'Settings',
		href: '/app/settings',
		section: 'Settings',
		icon: Settings
	}
];

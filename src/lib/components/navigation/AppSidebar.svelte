<script lang="ts">
	import { page } from '$app/stores';
	import { SITE_NAV } from '$lib/navigation/sitenav';
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Menu from 'lucide-svelte/icons/menu';
	import X from 'lucide-svelte/icons/x';

	let { collapsed = $bindable(false) } = $props();
	let mobileMenuOpen = $state(false);

	function isActive(href: string) {
		if (href === '/app') {
			return $page.url.pathname === '/app';
		}
		return $page.url.pathname.startsWith(href);
	}

	async function handleLogout() {
		await authStore.signOut();
		goto('/login');
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<!-- Mobile Menu Button -->
<button
	onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
	class="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-lg"
	aria-label="Toggle menu"
>
	{#if mobileMenuOpen}
		<X class="h-6 w-6" />
	{:else}
		<Menu class="h-6 w-6" />
	{/if}
</button>

<!-- Overlay (mobile only) -->
{#if mobileMenuOpen}
	<div
		class="lg:hidden fixed inset-0 bg-black/50 z-40"
		onclick={closeMobileMenu}
	></div>
{/if}

<!-- Sidebar -->
<aside class="fixed left-0 top-0 z-40 h-screen border-r bg-gradient-to-b from-slate-800 to-slate-900 transition-all duration-300 
	{mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
	{collapsed ? 'lg:w-20' : 'lg:w-64'} w-64">
	<div class="flex h-full flex-col">
		<!-- Logo -->
		<div class="flex h-16 items-center justify-between border-b border-slate-700 px-6">
			{#if !collapsed || mobileMenuOpen}
				<a href="/app" onclick={closeMobileMenu} class="text-xl font-bold text-white">
					Cruz Crewz
				</a>
			{/if}
			<button
				onclick={() => (collapsed = !collapsed)}
				class="hidden lg:block rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors {collapsed && !mobileMenuOpen ? 'mx-auto' : ''}"
				aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				{#if collapsed}
					<ChevronRight class="h-5 w-5" />
				{:else}
					<ChevronLeft class="h-5 w-5" />
				{/if}
			</button>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 space-y-1 overflow-y-auto p-4">
			{#each SITE_NAV as item}
				<a
					href={item.href}
					onclick={closeMobileMenu}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
						{isActive(item.href)
							? 'bg-emerald-600 text-white'
							: 'text-slate-300 hover:bg-slate-700 hover:text-white'}"
					title={collapsed && !mobileMenuOpen ? item.label : ''}
				>
					<svelte:component this={item.icon} class="h-5 w-5 flex-shrink-0" />
					{#if !collapsed || mobileMenuOpen}
						<span>{item.label}</span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- User Section -->
		<div class="border-t border-slate-700 p-4">
			{#if (!collapsed || mobileMenuOpen)}
				<div class="mb-3 px-3">
					<div class="text-sm font-medium text-white truncate">
						{authStore.user?.email || 'User'}
					</div>
				</div>
			{/if}
			<button
				onclick={() => { handleLogout(); closeMobileMenu(); }}
				class="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-600 hover:text-white {collapsed && !mobileMenuOpen ? 'flex justify-center' : ''}"
				title={collapsed && !mobileMenuOpen ? 'Sign Out' : ''}
			>
				{#if collapsed && !mobileMenuOpen}
					<span class="text-lg">→</span>
				{:else}
					Sign Out
				{/if}
			</button>
		</div>
	</div>
</aside>
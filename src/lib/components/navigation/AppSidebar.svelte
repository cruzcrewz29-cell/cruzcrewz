<script lang="ts">
	import { page } from '$app/stores';
	import { SITE_NAV } from '$lib/navigation/sitenav';
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';

	let collapsed = $state(false);

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
</script>

<aside class="fixed left-0 top-0 z-30 h-screen border-r bg-gradient-to-b from-slate-800 to-slate-900 transition-all duration-300 {collapsed ? 'w-20' : 'w-64'}">
	<div class="flex h-full flex-col">
		<!-- Logo -->
		<div class="flex h-16 items-center justify-between border-b border-slate-700 px-6">
			{#if !collapsed}
				<a href="/app" class="text-xl font-bold text-white">
					Cruz Crewz
				</a>
			{/if}
			<button
				onclick={() => (collapsed = !collapsed)}
				class="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors {collapsed ? 'mx-auto' : ''}"
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
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
						{isActive(item.href)
							? 'bg-emerald-600 text-white'
							: 'text-slate-300 hover:bg-slate-700 hover:text-white'}"
					title={collapsed ? item.label : ''}
				>
					<svelte:component this={item.icon} class="h-5 w-5 flex-shrink-0" />
					{#if !collapsed}
						<span>{item.label}</span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- User Section -->
		<div class="border-t border-slate-700 p-4">
			{#if !collapsed}
				<div class="mb-3 px-3">
					<div class="text-sm font-medium text-white">
						{authStore.user?.email || 'User'}
					</div>
				</div>
			{/if}
			<button
				onclick={handleLogout}
				class="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-600 hover:text-white {collapsed ? 'flex justify-center' : ''}"
				title={collapsed ? 'Sign Out' : ''}
			>
				{#if collapsed}
					<span class="text-lg">→</span>
				{:else}
					Sign Out
				{/if}
			</button>
		</div>
	</div>
</aside>
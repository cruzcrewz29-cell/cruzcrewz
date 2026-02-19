<script lang="ts">
	import { page } from '$app/stores';
	import { SITE_NAV } from '$lib/navigation/sitenav';
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import Menu from 'lucide-svelte/icons/menu';
	import X from 'lucide-svelte/icons/x';

	let activeSection = $derived($page.url.pathname.split('/').pop() || 'dashboard');
	let mobileMenuOpen = $state(false);

	async function handleLogout() {
		await authStore.signOut();
		goto('/login');
	}

	function closeMenu() {
		mobileMenuOpen = false;
	}
</script>

<!-- Mobile Menu Button (visible on small screens) -->
<button
	onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
	class="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
	aria-label="Toggle menu"
>
	{#if mobileMenuOpen}
		<X class="h-6 w-6 text-gray-900" />
	{:else}
		<Menu class="h-6 w-6 text-gray-900" />
	{/if}
</button>

<!-- Overlay (mobile only) -->
{#if mobileMenuOpen}
	<div
		class="lg:hidden fixed inset-0 bg-black/50 z-40"
		onclick={closeMenu}
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white transition-transform duration-300 ease-in-out
		{mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
>
	<div class="flex h-full flex-col">
		<!-- Logo -->
		<div class="flex h-16 items-center border-b px-6">
			<a href="/app" onclick={closeMenu} class="text-xl font-bold text-gray-900">
				Cruz Crewz
			</a>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 space-y-1 overflow-y-auto p-4">
			{#each SITE_NAV as item}
				<a
					href={item.href}
					onclick={closeMenu}
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
						{activeSection === item.section.toLowerCase().replace(' ', '-')
							? 'bg-gray-900 text-white'
							: 'text-gray-700 hover:bg-gray-100'}"
				>
					<svelte:component this={item.icon} class="h-5 w-5" />
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- User Section -->
		<div class="border-t p-4">
			<div class="mb-3 px-3">
				<div class="text-sm font-medium text-gray-900">
					{authStore.user?.email || 'User'}
				</div>
			</div>
			<button
				onclick={() => {
					handleLogout();
					closeMenu();
				}}
				class="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
			>
				Sign Out
			</button>
		</div>
	</div>
</aside>
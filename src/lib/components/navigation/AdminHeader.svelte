<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { SITE_NAV } from '$lib/navigation/sitenav';

	let currentSection = $derived(
		SITE_NAV.find(item => $page.url.pathname === item.href)?.section || 'Dashboard'
	);

	async function handleLogout() {
		await authStore.signOut();
		goto('/');
	}
</script>

<header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
	<h1 class="text-lg font-semibold text-gray-900">
		{currentSection}
	</h1>

	<div class="flex items-center gap-3">
		<span class="text-sm text-gray-600">
			{authStore.user?.email}
		</span>
		
		<button
			onclick={handleLogout}
			class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
		>
			Logout
		</button>
	</div>
</header>
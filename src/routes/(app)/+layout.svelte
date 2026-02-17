<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { authStore } from '$lib/stores/auth.svelte';
	import AppSidebar from '$lib/components/navigation/AppSidebar.svelte';
	import AdminHeader from '$lib/components/navigation/AdminHeader.svelte';

	let { children } = $props();

	let checking = $state(true);
	let isAdmin = $state(false);

	$effect(async () => {
		if (authStore.loading) return;

		if (!authStore.user) {
			goto('/login');
			return;
		}

		const { data } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', authStore.user.id)
			.single();

		if (!data || data.role !== 'admin') {
			goto('/');
			return;
		}

		isAdmin = true;
		checking = false;
	});
</script>

{#if checking}
	<div class="min-h-screen flex items-center justify-center">
		<p class="text-gray-500">Loading...</p>
	</div>
{:else if isAdmin}
	<div class="min-h-screen bg-gray-50 flex">
		<AppSidebar />

		<div class="flex-1 flex flex-col">
			<AdminHeader />

			<main class="flex-1 p-8">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
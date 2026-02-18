<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	onMount(async () => {
		const campaign = $page.params.campaign;

		// Track the scan
		await supabase.from('qr_scans').insert({
			campaign,
			user_agent: navigator.userAgent,
			referrer: document.referrer || null
		});

		// Redirect to quote page
		setTimeout(() => {
			goto('/quote');
		}, 500);
	});
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="text-center">
		<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
		<p class="text-gray-600">Redirecting to quote page...</p>
	</div>
</div>
<script>
	import AppSidebar from '$lib/components/navigation/AppSidebar.svelte';
	import AppHeader from '$lib/components/navigation/AppHeader.svelte';

	let { children } = $props();
</script>

<div class="min-h-screen bg-slate-100 flex">
	<AppSidebar />

	<div class="flex-1 flex flex-col">
		<AppHeader />

		<main class="flex-1 p-6">
			{@render children()}
		</main>
	</div>
</div>

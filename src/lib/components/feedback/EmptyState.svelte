<script>
	export let title = 'Nothing here yet';
	export let description = '';
	export let actionLabel = null;
</script>

<div class="flex flex-col items-center justify-center rounded-lg border border-border bg-surface p-10 text-center">
	<h3 class="text-sm font-medium text-text">{title}</h3>

	{#if description}
		<p class="mt-1 text-sm text-muted">
			{description}
		</p>
	{/if}

	{#if actionLabel}
		<button
			type="button"
			class="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
		>
			{actionLabel}
		</button>
	{/if}
</div>

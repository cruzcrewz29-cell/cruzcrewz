<script>
	let { children } = $props();
</script>

<div class="flex items-center gap-2">
	{@render children?.()}
</div>

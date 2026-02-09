<script>
	import { page } from '$app/stores';
	import { SITE_NAV } from '$lib/navigation/sitenav';

	$: segments = $page.url.pathname.split('/').filter(Boolean);

	$: crumbs = segments.map((_, i) => {
		const href = '/' + segments.slice(0, i + 1).join('/');
		const nav = SITE_NAV.find((n) => n.href === href);

		return {
			label: nav?.label ?? segments[i],
			href
		};
	});
</script>

<nav class="text-sm text-slate-500">
	<ol class="flex items-center gap-2">
		{#each crumbs as crumb, i}
			<li class="flex items-center gap-2">
				<a
					href={crumb.href}
					class="hover:text-slate-900 transition"
				>
					{crumb.label}
				</a>

				{#if i < crumbs.length - 1}
					<span class="text-slate-400">/</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

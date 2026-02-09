<script>
	import { page } from '$app/stores';
	import { SITE_NAV } from '$lib/navigation/sitenav';
</script>

<aside class="w-64 bg-slate-900 text-slate-100 flex flex-col">
	<div class="h-16 flex items-center px-6 font-semibold text-lg border-b border-slate-800">
		LawnOps
	</div>

	<nav class="flex-1 px-3 py-4 space-y-1 text-sm">
		{#each SITE_NAV as item}
			<a
				href={item.href}
				class="flex items-center gap-3 rounded-md px-3 py-2 transition
					{ $page.url.pathname === item.href
						? 'bg-slate-800 text-white'
						: 'text-slate-300 hover:bg-slate-800 hover:text-white' }"
			>
				<item.icon class="h-4 w-4 shrink-0" />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>

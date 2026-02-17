<script lang="ts">
	import { page } from '$app/stores';
	import { SITE_NAV } from '$lib/navigation/sitenav';
	
	function isActive(href: string) {
		if (href === '/app') {
			return $page.url.pathname === '/app';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<aside class="w-64 bg-slate-900 text-slate-100 flex flex-col">
	<div class="h-14 flex items-center px-6 font-semibold text-lg border-b border-slate-800">
		Cruz Crewz
	</div>

	<nav class="flex-1 px-3 py-4 space-y-1">
		{#each SITE_NAV as item}
			<a 
				href={item.href}
				class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors 
					{isActive(item.href) 
						? 'bg-slate-800 text-white' 
						: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
			>
				<item.icon class="h-5 w-5 shrink-0" />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
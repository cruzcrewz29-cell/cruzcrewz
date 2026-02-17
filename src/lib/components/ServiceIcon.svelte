<script lang="ts">
	import Zap from 'lucide-svelte/icons/zap';
	import Scissors from 'lucide-svelte/icons/scissors';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import Leaf from 'lucide-svelte/icons/leaf';
	import Trees from 'lucide-svelte/icons/trees';

	let { name, class: className = 'h-6 w-6' } = $props<{
		name: string;
		class?: string;
	}>();

	const icons = {
		Zap,
		Scissors,
		Sparkles,
		Leaf,
		Trees
	};

	const IconComponent = icons[name as keyof typeof icons] || Zap;
</script>

<svelte:component this={IconComponent} class={className} />
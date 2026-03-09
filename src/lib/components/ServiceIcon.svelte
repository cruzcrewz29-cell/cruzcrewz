<script lang="ts">
  import Zap from 'lucide-svelte/icons/zap';
  import Scissors from 'lucide-svelte/icons/scissors';
  import Sparkles from 'lucide-svelte/icons/sparkles';
  import Leaf from 'lucide-svelte/icons/leaf';
  import Trees from 'lucide-svelte/icons/trees';
  import Sprout from 'lucide-svelte/icons/sprout';
  import Sun from 'lucide-svelte/icons/sun';
  import Layers from 'lucide-svelte/icons/layers';
  import Grid from 'lucide-svelte/icons/grid-2x2';
  import Flower2 from 'lucide-svelte/icons/flower-2';
  import Droplets from 'lucide-svelte/icons/droplets';
  import Wind from 'lucide-svelte/icons/wind';
  import Shovel from 'lucide-svelte/icons/shovel';
  import Bug from 'lucide-svelte/icons/bug';
  import Snowflake from 'lucide-svelte/icons/snowflake';
  import Star from 'lucide-svelte/icons/star';

  let { name, class: className = 'h-6 w-6' } = $props<{
    name: string;
    class?: string;
  }>();

  const icons: Record<string, any> = {
    // lowercase keys to match services.ts
    zap: Zap,
    scissors: Scissors,
    sparkles: Sparkles,
    leaf: Leaf,
    trees: Trees,
    sprout: Sprout,
    sun: Sun,
    layers: Layers,
    grid: Grid,
    flower: Flower2,
    droplets: Droplets,
    wind: Wind,
    shovel: Shovel,
    bug: Bug,
    snowflake: Snowflake,
    star: Star,
    // capitalized aliases for backwards compat
    Zap, Scissors, Sparkles, Leaf, Trees,
  };

  const IconComponent = icons[name] ?? Zap;
</script>

<svelte:component this={IconComponent} class={className} />
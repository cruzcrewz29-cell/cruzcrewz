<script>
  import { page } from '$app/stores';
  
  let { actions } = $props();
  
  let activeSection = $derived(
    $page.url.pathname.split('/')[1] || 'home'
  );
  
  let hasActions = $derived(!!actions);
  
  const navItems = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'services', label: 'Services', href: '/services' },
    { id: 'portfolio', label: 'Portfolio', href: '/portfolio' },
    { id: 'quote', label: 'Get Quote', href: '/quote' },
    { id: 'app', label: 'Dashboard', href: '/app' },
  ];
</script>

<header class="border-b bg-white">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex h-16 items-center justify-between">
      <div class="flex items-center gap-8">
        <a href="/" class="text-xl font-bold text-gray-900">
          Cruz Crewz
        </a>
        
        <nav class="hidden md:flex md:gap-6">
          {#each navItems as item}
            
              href={item.href}
              class="text-sm font-medium transition-colors hover:text-gray-900"
              class:text-gray-900={activeSection === item.id}
              class:text-gray-600={activeSection !== item.id}
            >
              {item.label}
            </a>
          {/each}
        </nav>
      </div>
      
      {#if hasActions}
        <div class="flex items-center gap-3">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
</header>
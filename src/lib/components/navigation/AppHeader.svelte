<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  
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
  ];

  async function handleLogout() {
    await authStore.signOut();
    goto('/');
  }
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
            <a
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
      
      <div class="flex items-center gap-3">
        {#if hasActions}
          {@render actions()}
          
        {:else if authStore.isAuthenticated}
          <div class="flex items-center gap-3">
            <a
              href="/app"
              class="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Dashboard
            </a>

            <button
              on:click={handleLogout}
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
          
        {:else}
          <a
            href="/login"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Login
          </a>
        {/if}
      </div>

    </div>
  </div>
</header>

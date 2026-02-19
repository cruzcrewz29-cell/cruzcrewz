<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import Menu from 'lucide-svelte/icons/menu';
  import X from 'lucide-svelte/icons/x';
  
  let { actions } = $props();
  
  let activeSection = $derived(
    $page.url.pathname.split('/')[1] || 'home'
  );
  
  let hasActions = $derived(!!actions);
  let mobileMenuOpen = $state(false);
  
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
  
  function closeMenu() {
    mobileMenuOpen = false;
  }
</script>

<header class="border-b bg-white sticky top-0 z-40">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex h-16 items-center justify-between">
      
      <div class="flex items-center gap-8">
        <a href="/" class="flex items-center">
          <BrandLogo size="sm" />
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
          <div class="hidden md:block">
            {@render actions()}
          </div>
          
        {:else if authStore.isAuthenticated}
          <div class="hidden md:flex items-center gap-3">
            <a
              href="/app"
              class="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Dashboard
            </a>

            <button
              onclick={handleLogout}
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
          
        {:else}
          <a
            href="/login"
            class="hidden md:block rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Login
          </a>
        {/if}
        
        <!-- Mobile menu button -->
        <button
          onclick={() => mobileMenuOpen = !mobileMenuOpen}
          class="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {#if mobileMenuOpen}
            <X class="h-6 w-6" />
          {:else}
            <Menu class="h-6 w-6" />
          {/if}
        </button>
      </div>
    </div>
  </div>
  
  <!-- Mobile menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden border-t border-gray-200 bg-white">
      <nav class="px-4 py-4 space-y-2">
        {#each navItems as item}
          <a
            href={item.href}
            onclick={closeMenu}
            class="block px-3 py-2 rounded-lg text-base font-medium transition-colors"
            class:bg-green-50={activeSection === item.id}
            class:text-green-600={activeSection === item.id}
            class:text-gray-700={activeSection !== item.id}
            class:hover:bg-gray-50={activeSection !== item.id}
          >
            {item.label}
          </a>
        {/each}
        
        {#if authStore.isAuthenticated}
          <div class="pt-4 border-t border-gray-200 space-y-2">
            <a
              href="/app"
              onclick={closeMenu}
              class="block px-3 py-2 rounded-lg bg-green-600 text-white text-center font-medium"
            >
              Dashboard
            </a>
            <button
              onclick={() => { handleLogout(); closeMenu(); }}
              class="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium"
            >
              Logout
            </button>
          </div>
        {:else}
          <div class="pt-4 border-t border-gray-200">
            <a
              href="/login"
              onclick={closeMenu}
              class="block px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-center font-medium"
            >
              Login
            </a>
          </div>
        {/if}
      </nav>
    </div>
  {/if}
</header>
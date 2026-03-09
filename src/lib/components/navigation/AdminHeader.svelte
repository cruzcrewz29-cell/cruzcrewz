<script lang="ts">
  // src/lib/components/navigation/AdminHeader.svelte
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import { SITE_NAV } from '$lib/navigation/sitenav';
  import QuickQuoteDrawer from '$lib/components/QuickQuoteDrawer.svelte';
  import QuoteFollowUpDrawer from '$lib/components/QuoteFollowUpDrawer.svelte';
  import Zap from 'lucide-svelte/icons/zap';
  import Mail from 'lucide-svelte/icons/mail';

  let currentSection = $derived(
    SITE_NAV.find(item => $page.url.pathname === item.href)?.section || 'Dashboard'
  );

  let quickQuoteOpen  = $state(false);
  let followUpOpen    = $state(false);

  async function handleLogout() {
    await authStore.signOut();
    goto('/');
  }
</script>

<header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
  <h1 class="text-lg font-semibold text-gray-900">{currentSection}</h1>
  <div class="flex items-center gap-3">

    <!-- Follow-up writer button -->
    <button
      onclick={() => (followUpOpen = true)}
      class="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
    >
      <Mail class="h-4 w-4" />
      <span class="hidden sm:inline">Follow-Up</span>
    </button>

    <!-- Quick Quote button -->
    <button
      onclick={() => (quickQuoteOpen = true)}
      class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
    >
      <Zap class="h-4 w-4" />
      <span class="hidden sm:inline">Quick Quote</span>
    </button>

    <span class="hidden text-sm text-gray-600 sm:block">{authStore.user?.email}</span>
    <button
      onclick={handleLogout}
      class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
    >
      Logout
    </button>
  </div>
</header>

<!-- Drawers — rendered here so always available in admin -->
<QuickQuoteDrawer bind:open={quickQuoteOpen} />
<QuoteFollowUpDrawer bind:open={followUpOpen} />
<script lang="ts">
  // src/lib/components/navigation/AdminHeader.svelte
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { SITE_NAV } from '$lib/navigation/sitenav';
  import { supabase } from '$lib/supabase';
  import QuickQuoteDrawer from '$lib/components/QuickQuoteDrawer.svelte';
  import QuoteFollowUpDrawer from '$lib/components/QuoteFollowUpDrawer.svelte';
  import Zap from 'lucide-svelte/icons/zap';
  import Mail from 'lucide-svelte/icons/mail';
  import MessagesSquare from 'lucide-svelte/icons/messages-square';

  let currentSection = $derived(
    SITE_NAV.find(item => $page.url.pathname === item.href)?.section || 'Dashboard'
  );

  let quickQuoteOpen = $state(false);
  let followUpOpen   = $state(false);
  let unreadSms      = $state(0);

  onMount(async () => {
    await fetchUnread();

    // Realtime subscription for new inbound messages
    const channel = supabase
      .channel('sms-unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sms_messages' },
        (payload) => {
          if (payload.new.direction === 'inbound' && !payload.new.read) {
            unreadSms++;
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sms_messages' },
        () => { fetchUnread(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  });

  async function fetchUnread() {
    const { count } = await supabase
      .from('sms_messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'inbound')
      .eq('read', false);
    unreadSms = count ?? 0;
  }

  async function handleLogout() {
    await authStore.signOut();
    goto('/');
  }
</script>

<header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
  <h1 class="text-lg font-semibold text-gray-900">{currentSection}</h1>
  <div class="flex items-center gap-3">

    <!-- SMS unread badge -->
    {#if unreadSms > 0}
      <a
        href="/app/messages"
        class="relative inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <MessagesSquare class="h-4 w-4" />
        <span class="hidden sm:inline">Messages</span>
        <span class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {unreadSms > 9 ? '9+' : unreadSms}
        </span>
      </a>
    {/if}

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
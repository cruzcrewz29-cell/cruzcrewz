<script lang="ts">
  // src/routes/(app)/app/messages/+page.svelte
  import { supabase } from '$lib/supabase';
  import { onMount, onDestroy } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Send from 'lucide-svelte/icons/send';
  import MessageSquare from 'lucide-svelte/icons/message-square';
  import User from 'lucide-svelte/icons/user';
  import Phone from 'lucide-svelte/icons/phone';
  import RefreshCw from 'lucide-svelte/icons/refresh-cw';

  type Message = {
    id: string;
    customer_id: string | null;
    direction: 'inbound' | 'outbound';
    body: string;
    from_number: string | null;
    to_number: string | null;
    read: boolean;
    created_at: string;
    customers?: { name: string; phone: string; } | null;
  };

  type Conversation = {
    customerId: string | null;
    customerName: string;
    phone: string;
    messages: Message[];
    unread: number;
    lastAt: string;
  };

  let messages     = $state<Message[]>([]);
  let loading      = $state(true);
  let selectedId   = $state<string | null>(null);
  let replyText    = $state('');
  let sending      = $state(false);
  let refreshing   = $state(false);
  let pollInterval: ReturnType<typeof setInterval>;

  // Group messages into conversations by customer
  let conversations = $derived(() => {
    const map = new Map<string, Conversation>();

    for (const msg of messages) {
      const key = msg.customer_id || msg.from_number || 'unknown';
      const phone = msg.direction === 'inbound'
        ? (msg.from_number || '')
        : (msg.to_number || '');

      if (!map.has(key)) {
        map.set(key, {
          customerId:   msg.customer_id,
          customerName: msg.customers?.name || msg.from_number || 'Unknown',
          phone:        msg.customers?.phone || phone,
          messages:     [],
          unread:       0,
          lastAt:       msg.created_at,
        });
      }

      const conv = map.get(key)!;
      conv.messages.push(msg);
      if (!msg.read && msg.direction === 'inbound') conv.unread++;
      if (msg.created_at > conv.lastAt) conv.lastAt = msg.created_at;
    }

    return [...map.entries()]
      .map(([key, conv]) => ({ key, ...conv }))
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  });

  let selectedConv = $derived(
    conversations().find(c => c.key === selectedId) ?? null
  );

  onMount(async () => {
    await fetchMessages();
    loading = false;
    // Poll every 30 seconds for new messages
    pollInterval = setInterval(fetchMessages, 30000);
  });

  onDestroy(() => {
    clearInterval(pollInterval);
  });

  async function fetchMessages() {
    const { data } = await supabase
      .from('sms_messages')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: true });
    if (data) messages = data as Message[];
  }

  async function refresh() {
    refreshing = true;
    await fetchMessages();
    refreshing = false;
  }

  async function selectConversation(key: string) {
    selectedId = key;
    // Mark inbound messages as read
    const conv = conversations().find(c => c.key === key);
    if (!conv) return;
    const unreadIds = conv.messages
      .filter(m => !m.read && m.direction === 'inbound')
      .map(m => m.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('sms_messages')
        .update({ read: true })
        .in('id', unreadIds);
      await fetchMessages();
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !selectedConv) return;
    sending = true;
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:         selectedConv.phone,
          body:       replyText.trim(),
          customerId: selectedConv.customerId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      replyText = '';
      toast.success('Message sent');
      await fetchMessages();
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      sending = false;
    }
  }

  function formatTime(date: string) {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  }

  let totalUnread = $derived(
    conversations().reduce((sum, c) => sum + c.unread, 0)
  );
</script>

<div class="flex h-[calc(100vh-4rem)] overflow-hidden">

  <!-- Conversation list -->
  <div class="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col">
    <div class="flex items-center justify-between px-4 py-4 border-b border-gray-200">
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold text-gray-900">Messages</h1>
        {#if totalUnread > 0}
          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {totalUnread}
          </span>
        {/if}
      </div>
      <button
        onclick={refresh}
        class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        title="Refresh"
      >
        <RefreshCw class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      {#if loading}
        <div class="flex items-center justify-center h-32 text-sm text-gray-400">Loading...</div>
      {:else if conversations().length === 0}
        <div class="flex flex-col items-center justify-center h-48 text-center px-6">
          <MessageSquare class="h-10 w-10 text-gray-200 mb-3" />
          <p class="text-sm font-medium text-gray-500">No messages yet</p>
          <p class="text-xs text-gray-400 mt-1">Customer replies will appear here</p>
        </div>
      {:else}
        {#each conversations() as conv (conv.key)}
          <button
            onclick={() => selectConversation(conv.key)}
            class="w-full flex items-start gap-3 px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors
              {selectedId === conv.key ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <User class="h-4 w-4" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-gray-900 truncate">{conv.customerName}</span>
                <span class="text-xs text-gray-400 shrink-0 ml-2">{formatTime(conv.lastAt)}</span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <p class="text-xs text-gray-500 truncate">
                  {conv.messages[conv.messages.length - 1]?.body ?? ''}
                </p>
                {#if conv.unread > 0}
                  <span class="ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {conv.unread}
                  </span>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Message thread -->
  <div class="flex-1 flex flex-col bg-gray-50">
    {#if !selectedConv}
      <div class="flex flex-1 items-center justify-center">
        <div class="text-center">
          <MessageSquare class="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p class="text-sm font-medium text-gray-500">Select a conversation</p>
        </div>
      </div>
    {:else}
      <!-- Thread header -->
      <div class="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200">
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
          <User class="h-4 w-4 text-gray-500" />
        </div>
        <div>
          <p class="text-sm font-semibold text-gray-900">{selectedConv.customerName}</p>
          <div class="flex items-center gap-1 text-xs text-gray-400">
            <Phone class="h-3 w-3" />
            {selectedConv.phone}
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {#each selectedConv.messages as msg (msg.id)}
          <div class="flex {msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[70%] rounded-2xl px-4 py-2.5
              {msg.direction === 'outbound'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'}">
              <p class="text-sm leading-relaxed">{msg.body}</p>
              <p class="mt-1 text-xs {msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}">
                {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        {/each}
      </div>

      <!-- Reply box -->
      <div class="px-6 py-4 bg-white border-t border-gray-200">
        <div class="flex items-end gap-3">
          <textarea
            bind:value={replyText}
            onkeydown={handleKeydown}
            rows="2"
            placeholder="Type a message... (Enter to send)"
            class="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          ></textarea>
          <button
            onclick={sendReply}
            disabled={sending || !replyText.trim()}
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {#if sending}
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            {:else}
              <Send class="h-4 w-4" />
            {/if}
          </button>
        </div>
        <p class="mt-2 text-xs text-gray-400">Shift+Enter for new line · Enter to send</p>
      </div>
    {/if}
  </div>
</div>
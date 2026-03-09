<script lang="ts">
  // src/lib/components/QuoteFollowUpDrawer.svelte
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import X from 'lucide-svelte/icons/x';
  import Loader from 'lucide-svelte/icons/loader';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import Copy from 'lucide-svelte/icons/copy';
  import RefreshCw from 'lucide-svelte/icons/refresh-cw';
  import Mail from 'lucide-svelte/icons/mail';

  let { open = $bindable(false) } = $props();

  type PendingJob = {
    id: string;
    service_type: string;
    scheduled_date: string;
    price: number | null;
    status: string;
    created_at: string;
    description: string | null;
    customers: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
    } | null;
    jobHistory: { service_type: string; status: string; scheduled_date: string; price: number | null }[];
  };

  let pendingJobs   = $state<PendingJob[]>([]);
  let selectedJobId = $state<string>('');
  let loading       = $state(false);
  let generating    = $state(false);
  let emailDraft    = $state<{ subject: string; body: string } | null>(null);
  let error         = $state('');
  let copied        = $state(false);

  const selectedJob = $derived(pendingJobs.find(j => j.id === selectedJobId) ?? null);

  // Days since quote was created
  function daysSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function urgencyLabel(days: number) {
    if (days <= 1) return { label: 'Just sent', color: 'text-gray-400' };
    if (days <= 3) return { label: `${days}d ago`, color: 'text-blue-600' };
    if (days <= 7) return { label: `${days}d ago`, color: 'text-amber-600' };
    return { label: `${days}d ago — follow up now`, color: 'text-red-600' };
  }

  // Season context
  function getSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  async function loadPendingJobs() {
    loading = true;
    error = '';
    const { data, error: err } = await supabase
      .from('jobs')
      .select(`
        id, service_type, scheduled_date, price, status, created_at, description,
        customers ( id, name, email, phone, address )
      `)
      .in('status', ['pending'])
      .order('created_at', { ascending: true });

    if (err) { error = 'Failed to load quotes'; loading = false; return; }

    // For each job, also pull customer's job history
    const jobs: PendingJob[] = [];
    for (const job of data ?? []) {
      const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
      let jobHistory: PendingJob['jobHistory'] = [];
      if (customer?.id) {
        const { data: hist } = await supabase
          .from('jobs')
          .select('service_type, status, scheduled_date, price')
          .eq('customer_id', customer.id)
          .neq('id', job.id)
          .order('scheduled_date', { ascending: false })
          .limit(5);
        jobHistory = hist ?? [];
      }
      jobs.push({ ...job, customers: customer ?? null, jobHistory });
    }

    pendingJobs = jobs;
    if (jobs.length > 0 && !selectedJobId) {
      // Auto-select the oldest pending quote
      selectedJobId = jobs[0].id;
    }
    loading = false;
  }

  async function generateFollowUp() {
    if (!selectedJob) return;
    generating = true;
    emailDraft = null;
    error = '';

    const days = daysSince(selectedJob.created_at);
    const season = getSeason();

    try {
      const res = await fetch('/api/generate-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: selectedJob, season, days }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Unknown error');
      emailDraft = { subject: data.subject, body: data.body };
    } catch (err) {
      error = 'Failed to generate email. Try again.';
      console.error('[follow-up] error:', err);
    } finally {
      generating = false;
    }
  }

  async function copyEmail() {
    if (!emailDraft) return;
    await navigator.clipboard.writeText(`Subject: ${emailDraft.subject}\n\n${emailDraft.body}`);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function openMailto() {
    if (!emailDraft || !selectedJob?.customers?.email) return;
    const mailto = `mailto:${selectedJob.customers.email}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`;
    window.open(mailto);
  }

  function resetAndClose() {
    open = false;
    emailDraft = null;
    error = '';
  }

  $effect(() => {
    if (open) loadPendingJobs();
  });

  $effect(() => {
    // Reset draft when job selection changes
    selectedJobId;
    emailDraft = null;
    error = '';
  });
</script>

<!-- Backdrop -->
{#if open}
  <div
    class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
    onclick={resetAndClose}
  ></div>
{/if}

<!-- Drawer -->
<div class="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300
  {open ? 'translate-x-0' : 'translate-x-full'}">

  <!-- Header -->
  <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
    <div class="flex items-center gap-3">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
        <Mail class="h-4 w-4 text-white" />
      </div>
      <div>
        <h2 class="text-base font-semibold text-gray-900">Quote Follow-Up</h2>
        <p class="text-xs text-gray-500">AI-written follow-up emails for pending quotes</p>
      </div>
    </div>
    <button onclick={resetAndClose} class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
      <X class="h-5 w-5" />
    </button>
  </div>

  <div class="flex-1 overflow-y-auto p-6 space-y-5">

    {#if loading}
      <div class="flex h-32 items-center justify-center">
        <Loader class="h-5 w-5 animate-spin text-gray-400" />
      </div>

    {:else if pendingJobs.length === 0}
      <div class="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-center">
        <Mail class="mx-auto h-8 w-8 text-gray-300" />
        <p class="mt-2 text-sm font-medium text-gray-500">No pending quotes</p>
        <p class="text-xs text-gray-400">All quotes have been responded to</p>
      </div>

    {:else}
      <!-- Quote selector -->
      <div>
        <label for="quote-select" class="mb-1.5 block text-sm font-medium text-gray-700">
          Select a pending quote
          <span class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {pendingJobs.length} waiting
          </span>
        </label>
        <div class="relative">
          <select
            id="quote-select"
            bind:value={selectedJobId}
            class="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {#each pendingJobs as job}
              {@const days = daysSince(job.created_at)}
              {@const urgency = urgencyLabel(days)}
              <option value={job.id}>
                {job.customers?.name ?? 'Unknown'} — {job.service_type} ({urgency.label})
              </option>
            {/each}
          </select>
          <ChevronDown class="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <!-- Selected quote details -->
      {#if selectedJob}
        {@const days = daysSince(selectedJob.created_at)}
        {@const urgency = urgencyLabel(days)}
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2.5">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-semibold text-gray-900">{selectedJob.customers?.name ?? 'Unknown'}</p>
              <p class="text-xs text-gray-500">{selectedJob.customers?.email ?? 'No email on file'}</p>
            </div>
            <span class="text-xs font-semibold {urgency.color}">{urgency.label}</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p class="text-gray-400">Service</p>
              <p class="font-medium text-gray-700">{selectedJob.service_type}</p>
            </div>
            <div>
              <p class="text-gray-400">Quoted Price</p>
              <p class="font-medium text-gray-700">{selectedJob.price ? `$${selectedJob.price}` : 'Custom quote'}</p>
            </div>
            <div>
              <p class="text-gray-400">Scheduled</p>
              <p class="font-medium text-gray-700">
                {new Date(selectedJob.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div>
              <p class="text-gray-400">Customer type</p>
              <p class="font-medium text-gray-700">
                {selectedJob.jobHistory.some(h => h.status === 'completed') ? 'Repeat customer' : 'New customer'}
              </p>
            </div>
          </div>
          {#if !selectedJob.customers?.email}
            <div class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p class="text-xs text-amber-700">No email on file — add one in the Customers page before sending.</p>
            </div>
          {/if}
        </div>

        <!-- Generate button -->
        {#if !emailDraft}
          <button
            onclick={generateFollowUp}
            disabled={generating}
            class="flex w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {#if generating}
              <Loader class="h-4 w-4 animate-spin" />
              Writing follow-up email...
            {:else}
              <Mail class="h-4 w-4" />
              Generate Follow-Up Email
            {/if}
          </button>
        {/if}

        {#if error}
          <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p class="text-sm text-red-700">{error}</p>
          </div>
        {/if}

        <!-- Generated email -->
        {#if emailDraft}
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-gray-900">Generated Email</p>
              <button
                onclick={generateFollowUp}
                disabled={generating}
                class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <RefreshCw class="h-3.5 w-3.5 {generating ? 'animate-spin' : ''}" />
                Regenerate
              </button>
            </div>

            <!-- Subject -->
            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Subject</p>
              <p class="text-sm text-gray-900">{emailDraft.subject}</p>
            </div>

            <!-- Body -->
            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Body</p>
              <div class="space-y-2">
                {#each emailDraft.body.split('\n') as line}
                  {#if line.trim()}
                    <p class="text-sm text-gray-800 leading-relaxed">{line}</p>
                  {:else}
                    <div class="h-1"></div>
                  {/if}
                {/each}
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <button
                onclick={copyEmail}
                class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Copy class="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onclick={openMailto}
                disabled={!selectedJob.customers?.email}
                class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <Mail class="h-4 w-4" />
                Open in Mail
              </button>
            </div>

            <p class="text-center text-xs text-gray-400">
              Review and edit before sending. The AI draft is a starting point.
            </p>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>
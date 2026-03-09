<script lang="ts">
  // src/routes/(app)/app/+page.svelte
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import Loader from 'lucide-svelte/icons/loader';
  import RefreshCw from 'lucide-svelte/icons/refresh-cw';
  import TrendingUp from 'lucide-svelte/icons/trending-up';
  import TrendingDown from 'lucide-svelte/icons/trending-down';
  import DollarSign from 'lucide-svelte/icons/dollar-sign';
  import Clock from 'lucide-svelte/icons/clock';
  import ClipboardList from 'lucide-svelte/icons/clipboard-list';
  import Users from 'lucide-svelte/icons/users';
  import Lightbulb from 'lucide-svelte/icons/lightbulb';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import CheckCircle from 'lucide-svelte/icons/check-circle';
  import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
  import Sparkles from 'lucide-svelte/icons/sparkles';

  // ── Types ──────────────────────────────────────────────────────────────────
  type Digest = {
    headline: string;
    weekSummary: string;
    wins: string[];
    watchouts: string[];
    proactiveInsights: { title: string; body: string; priority: 'high' | 'medium' | 'low' }[];
    targetingRecommendations: { area: string; reason: string; action: string }[];
    weekScore: number;
    weekScoreReason: string;
  };

  // ── State ──────────────────────────────────────────────────────────────────
  let loading       = $state(true);
  let generating    = $state(false);
  let digest        = $state<Digest | null>(null);
  let digestError   = $state('');
  let lastGenerated = $state<string | null>(null);

  // Quick stats
  let weekJobs      = $state(0);
  let weekRevenue   = $state(0);
  let outstanding   = $state(0);
  let totalCustomers = $state(0);
  let pendingQuotes = $state(0);
  let todayJobs     = $state<any[]>([]);

  // ── Load data ──────────────────────────────────────────────────────────────
  onMount(async () => {
    await loadStats();
    // Auto-generate digest if none cached
    const cached = sessionStorage.getItem('cruzcrewz_digest');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        digest = parsed.digest;
        lastGenerated = parsed.generatedAt;
      } catch {}
    }
    loading = false;
  });

  async function loadStats() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const todayStr = now.toISOString().slice(0, 10);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const [jobsRes, customersRes] = await Promise.all([
      supabase.from('jobs').select('id, status, price, scheduled_date, service_type, customer_id, customers(name, address)'),
      supabase.from('customers').select('id'),
    ]);

    const allJobs = jobsRes.data ?? [];
    totalCustomers = (customersRes.data ?? []).length;

    const thisWeek = allJobs.filter(j => j.scheduled_date >= weekStartStr);
    const completed = thisWeek.filter(j => j.status === 'completed');
    weekJobs    = thisWeek.length;
    weekRevenue = completed.reduce((s, j) => s + (j.price ?? 0), 0);
    outstanding = allJobs
      .filter(j => !['completed', 'cancelled'].includes(j.status))
      .reduce((s, j) => s + (j.price ?? 0), 0);
    pendingQuotes = allJobs.filter(j => j.status === 'pending').length;
    todayJobs = allJobs.filter(j => j.scheduled_date === todayStr && j.status !== 'cancelled');
  }

  async function generateDigest() {
    generating = true;
    digestError = '';

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const [jobsRes, customersRes] = await Promise.all([
      supabase.from('jobs').select('id, status, price, scheduled_date, service_type, customer_id, customers(name, address)'),
      supabase.from('customers').select('id, name'),
    ]);

    const allJobs = (jobsRes.data ?? []).map(j => ({
      ...j,
      customers: Array.isArray(j.customers) ? j.customers[0] : j.customers,
    }));
    const weekJobs = allJobs.filter(j => j.scheduled_date >= weekStartStr);
    const customers = customersRes.data ?? [];

    const res = await fetch('/api/generate-digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekJobs, allJobs, pendingQuotes, customers }),
    });

    const data = await res.json();
    if (!data.success) {
      digestError = data.error ?? 'Failed to generate digest';
    } else {
      digest = data.digest;
      lastGenerated = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      sessionStorage.setItem('cruzcrewz_digest', JSON.stringify({ digest: data.digest, generatedAt: lastGenerated }));
    }
    generating = false;
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
  }

  function scoreColor(s: number) {
    if (s >= 8) return 'text-emerald-600';
    if (s >= 5) return 'text-amber-600';
    return 'text-red-600';
  }

  function priorityStyle(p: string) {
    if (p === 'high')   return 'border-red-200 bg-red-50';
    if (p === 'medium') return 'border-amber-200 bg-amber-50';
    return 'border-blue-200 bg-blue-50';
  }

  function priorityDot(p: string) {
    if (p === 'high')   return 'bg-red-500';
    if (p === 'medium') return 'bg-amber-500';
    return 'bg-blue-500';
  }
</script>

<div class="space-y-6">

  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p class="mt-0.5 text-sm text-gray-500">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
    <button
      onclick={generateDigest}
      disabled={generating}
      class="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-colors"
    >
      {#if generating}
        <Loader class="h-4 w-4 animate-spin" />
        Analyzing...
      {:else}
        <Sparkles class="h-4 w-4" />
        {digest ? 'Refresh Digest' : 'Generate Weekly Digest'}
      {/if}
    </button>
  </div>

  {#if loading}
    <div class="flex h-48 items-center justify-center">
      <Loader class="h-5 w-5 animate-spin text-gray-400" />
    </div>
  {:else}

    <!-- Quick stats -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-500">This Week</p>
          <div class="rounded-lg bg-blue-50 p-2"><ClipboardList class="h-4 w-4 text-blue-600" /></div>
        </div>
        <p class="mt-3 text-2xl font-bold text-gray-900">{weekJobs}</p>
        <p class="mt-1 text-xs text-gray-400">jobs scheduled</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-500">Week Revenue</p>
          <div class="rounded-lg bg-emerald-50 p-2"><DollarSign class="h-4 w-4 text-emerald-600" /></div>
        </div>
        <p class="mt-3 text-2xl font-bold text-gray-900">{fmt(weekRevenue)}</p>
        <p class="mt-1 text-xs text-gray-400">collected</p>
      </div>

      <div class="rounded-xl border border-amber-100 bg-white p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-500">Outstanding</p>
          <div class="rounded-lg bg-amber-50 p-2"><Clock class="h-4 w-4 text-amber-600" /></div>
        </div>
        <p class="mt-3 text-2xl font-bold text-gray-900">{fmt(outstanding)}</p>
        <p class="mt-1 text-xs text-amber-600">{pendingQuotes} pending quote{pendingQuotes !== 1 ? 's' : ''}</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-500">Customers</p>
          <div class="rounded-lg bg-purple-50 p-2"><Users class="h-4 w-4 text-purple-600" /></div>
        </div>
        <p class="mt-3 text-2xl font-bold text-gray-900">{totalCustomers}</p>
        <p class="mt-1 text-xs text-gray-400">total active</p>
      </div>
    </div>

    <!-- Today's jobs -->
    {#if todayJobs.length > 0}
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <h2 class="mb-4 text-sm font-semibold text-gray-900">Today's Jobs ({todayJobs.length})</h2>
        <div class="flex flex-wrap gap-2">
          {#each todayJobs as job}
            <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
              <div class="h-2 w-2 rounded-full {job.status === 'completed' ? 'bg-emerald-500' : job.status === 'in_progress' ? 'bg-yellow-500' : 'bg-blue-400'}"></div>
              <span class="font-medium text-gray-900">{job.customers?.name ?? 'Unknown'}</span>
              <span class="text-gray-400">·</span>
              <span class="text-gray-600">{job.service_type}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Weekly Digest -->
    {#if digestError}
      <div class="rounded-xl border border-red-200 bg-red-50 p-4">
        <p class="text-sm text-red-700">{digestError}</p>
      </div>
    {/if}

    {#if !digest && !generating}
      <div class="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center">
        <Sparkles class="mx-auto h-8 w-8 text-gray-300" />
        <p class="mt-3 text-sm font-medium text-gray-500">No digest yet this session</p>
        <p class="mt-1 text-xs text-gray-400">Click "Generate Weekly Digest" for AI-powered business insights</p>
      </div>
    {/if}

    {#if generating && !digest}
      <div class="rounded-xl border border-gray-200 bg-white py-16 text-center">
        <Loader class="mx-auto h-6 w-6 animate-spin text-gray-400" />
        <p class="mt-3 text-sm text-gray-500">Analyzing your business data...</p>
        <p class="mt-1 text-xs text-gray-400">This takes about 5 seconds</p>
      </div>
    {/if}

    {#if digest}
      <div class="space-y-4">

        <!-- Digest header -->
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-900">Weekly Digest</h2>
          {#if lastGenerated}
            <span class="text-xs text-gray-400">Generated at {lastGenerated}</span>
          {/if}
        </div>

        <!-- Headline + score -->
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <p class="text-lg font-bold text-gray-900">{digest.headline}</p>
              <p class="mt-2 text-sm text-gray-600 leading-relaxed">{digest.weekSummary}</p>
            </div>
            <div class="flex flex-col items-center rounded-xl border-2 border-gray-100 px-4 py-3 text-center shrink-0">
              <p class="text-3xl font-black {scoreColor(digest.weekScore)}">{digest.weekScore}<span class="text-base font-normal text-gray-300">/10</span></p>
              <p class="mt-1 text-xs text-gray-400">week score</p>
            </div>
          </div>
          <p class="mt-3 text-xs text-gray-400 italic">{digest.weekScoreReason}</p>
        </div>

        <!-- Wins + Watchouts -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div class="mb-3 flex items-center gap-2">
              <CheckCircle class="h-4 w-4 text-emerald-600" />
              <h3 class="text-sm font-semibold text-emerald-900">Wins</h3>
            </div>
            <ul class="space-y-2">
              {#each digest.wins as win}
                <li class="flex items-start gap-2 text-sm text-emerald-800">
                  <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
                  {win}
                </li>
              {/each}
            </ul>
          </div>

          <div class="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div class="mb-3 flex items-center gap-2">
              <AlertTriangle class="h-4 w-4 text-amber-600" />
              <h3 class="text-sm font-semibold text-amber-900">Watch Out</h3>
            </div>
            <ul class="space-y-2">
              {#each digest.watchouts as w}
                <li class="flex items-start gap-2 text-sm text-amber-800">
                  <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
                  {w}
                </li>
              {/each}
            </ul>
          </div>
        </div>

        <!-- Proactive Insights -->
        {#if digest.proactiveInsights?.length > 0}
          <div class="rounded-xl border border-gray-200 bg-white p-6">
            <div class="mb-4 flex items-center gap-2">
              <Lightbulb class="h-4 w-4 text-yellow-500" />
              <h3 class="text-sm font-semibold text-gray-900">AI Insights</h3>
            </div>
            <div class="space-y-3">
              {#each digest.proactiveInsights as insight}
                <div class="rounded-lg border p-4 {priorityStyle(insight.priority)}">
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-2 rounded-full {priorityDot(insight.priority)}"></div>
                    <p class="text-sm font-semibold text-gray-900">{insight.title}</p>
                    <span class="ml-auto text-xs capitalize text-gray-400">{insight.priority}</span>
                  </div>
                  <p class="mt-1.5 text-sm text-gray-700 leading-relaxed">{insight.body}</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Targeting Recommendations -->
        {#if digest.targetingRecommendations?.length > 0}
          <div class="rounded-xl border border-gray-200 bg-white p-6">
            <div class="mb-4 flex items-center gap-2">
              <MapPin class="h-4 w-4 text-blue-500" />
              <h3 class="text-sm font-semibold text-gray-900">Where to Grow Next</h3>
              <span class="ml-1 text-xs text-gray-400">AI-suggested target areas</span>
            </div>
            <div class="space-y-3">
              {#each digest.targetingRecommendations as rec}
                <div class="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-blue-900">{rec.area}</p>
                  </div>
                  <p class="mt-1 text-xs text-blue-700">{rec.reason}</p>
                  <div class="mt-2 flex items-center gap-1.5">
                    <span class="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800">Action</span>
                    <span class="text-xs text-blue-800">{rec.action}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

      </div>
    {/if}

  {/if}
</div>
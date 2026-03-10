<script lang="ts">
  // src/routes/(app)/app/+page.svelte
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import WeatherWidget from '$lib/components/WeatherWidget.svelte';
  import Users from 'lucide-svelte/icons/users';
  import ClipboardList from 'lucide-svelte/icons/clipboard-list';
  import DollarSign from 'lucide-svelte/icons/dollar-sign';
  import TrendingUp from 'lucide-svelte/icons/trending-up';
  import Loader from 'lucide-svelte/icons/loader';
  import Sparkles from 'lucide-svelte/icons/sparkles';
  import Calendar from 'lucide-svelte/icons/calendar';
  import CircleAlert from 'lucide-svelte/icons/circle-alert';
  import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
  import UserX from 'lucide-svelte/icons/user-x';

  type Job = {
    id: string;
    service_type: string;
    status: string;
    scheduled_date: string;
    price: number | null;
    crew_marked_done: boolean;
    customers?: { name: string };
  };

  type ChurnRisk = {
    id: string;
    name: string;
    reason: string;
    daysSinceLastJob: number;
    riskLevel: 'high' | 'medium';
  };

  let jobs          = $state<Job[]>([]);
  let customers     = $state<{ id: string }[]>([]);
  let loading       = $state(true);
  let digest        = $state('');
  let digestLoading = $state(false);
  let digestError   = $state('');

  // Churn AI
  let churnRisks      = $state<ChurnRisk[]>([]);
  let churnLoading    = $state(false);
  let churnDismissed  = $state<Set<string>>(new Set());

  onMount(async () => {
    await Promise.all([fetchJobs(), fetchCustomers()]);
    loading = false;

    const cached = sessionStorage.getItem('cruzcrewz_digest');
    if (cached) digest = cached;

    const dismissedRaw = localStorage.getItem('cruzcrewz_churn_dismissed');
    if (dismissedRaw) churnDismissed = new Set(JSON.parse(dismissedRaw));

    await analyzeChurn();
  });

  async function fetchJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('id, service_type, status, scheduled_date, price, crew_marked_done, customers(name)')
      .order('scheduled_date');
    if (data) jobs = data as Job[];
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id');
    if (data) customers = data;
  }

  // ── Churn AI ────────────────────────────────────────────────────────────────
  async function analyzeChurn() {
    churnLoading = true;
    try {
      // Get all customers with their last completed job date
      const { data: custData } = await supabase
        .from('customers')
        .select('id, name');

      const { data: jobData } = await supabase
        .from('jobs')
        .select('customer_id, scheduled_date, status')
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false });

      if (!custData || !jobData) return;

      const today = new Date();

      // Find last completed job per customer
      const lastJobMap: Record<string, Date> = {};
      for (const job of jobData) {
        if (!job.customer_id || lastJobMap[job.customer_id]) continue;
        lastJobMap[job.customer_id] = new Date(job.scheduled_date.slice(0, 10) + 'T12:00:00');
      }

      // Flag customers with no job in 21+ days (medium) or 35+ days (high)
      const risks: ChurnRisk[] = [];
      for (const c of custData) {
        if (churnDismissed.has(c.id)) continue;
        const lastJob = lastJobMap[c.id];
        if (!lastJob) continue; // never had a job — skip (they're not churning, just new)
        const daysSince = Math.floor((today.getTime() - lastJob.getTime()) / (1000 * 60 * 60 * 24));

        // Check if they have a future scheduled job (not at risk)
        const hasFuture = jobs.some(j =>
          j.customers &&
          new Date(j.scheduled_date) > today &&
          ['pending', 'scheduled'].includes(j.status)
        );
        if (hasFuture) continue;

        if (daysSince >= 35) {
          risks.push({ id: c.id, name: c.name, daysSinceLastJob: daysSince, riskLevel: 'high', reason: `No service in ${daysSince} days` });
        } else if (daysSince >= 21) {
          risks.push({ id: c.id, name: c.name, daysSinceLastJob: daysSince, riskLevel: 'medium', reason: `No service in ${daysSince} days` });
        }
      }

      // Sort high risk first, then by days desc
      churnRisks = risks.sort((a, b) => {
        if (a.riskLevel !== b.riskLevel) return a.riskLevel === 'high' ? -1 : 1;
        return b.daysSinceLastJob - a.daysSinceLastJob;
      });
    } catch {
      // silently fail — churn is non-critical
    } finally {
      churnLoading = false;
    }
  }

  function dismissChurn(customerId: string) {
    churnDismissed = new Set([...churnDismissed, customerId]);
    localStorage.setItem('cruzcrewz_churn_dismissed', JSON.stringify([...churnDismissed]));
    churnRisks = churnRisks.filter(r => r.id !== customerId);
  }

  let visibleChurnRisks = $derived(churnRisks.filter(r => !churnDismissed.has(r.id)));

  // ── Digest ──────────────────────────────────────────────────────────────────
  async function generateDigest() {
    digestLoading = true;
    digestError = '';
    try {
      const summary = {
        totalJobs: jobs.length,
        completedRevenue,
        upcomingCount: upcomingJobs.length,
        needsReviewCount: needsReview.length,
        customerCount: customers.length,
      };
      const res = await fetch('/api/generate-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      digest = data.digest;
      sessionStorage.setItem('cruzcrewz_digest', data.digest);
    } catch {
      digestError = 'Failed to generate digest.';
    } finally {
      digestLoading = false;
    }
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }

  let completedRevenue = $derived(
    jobs.filter(j => j.status === 'completed' && j.price).reduce((s, j) => s + Number(j.price), 0)
  );

  let upcomingJobs = $derived(
    [...jobs]
      .filter(j => ['scheduled', 'in_progress'].includes(j.status))
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .slice(0, 5)
  );

  let needsReview = $derived(
    jobs.filter(j => j.crew_marked_done && j.status !== 'completed')
  );

  let next7DaysJobs = $derived(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() + 7);
    return jobs.filter(j => {
      const d = new Date(j.scheduled_date.slice(0, 10) + 'T12:00:00');
      return d >= now && d <= cutoff && ['scheduled', 'in_progress', 'pending'].includes(j.status);
    });
  });

  const stats = $derived([
    { label: 'Total Customers', value: customers.length.toString(), icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Jobs', value: jobs.filter(j => !['completed','cancelled'].includes(j.status)).length.toString(), icon: ClipboardList, color: 'bg-amber-50 text-amber-600' },
    { label: 'Revenue', value: formatCurrency(completedRevenue), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Completed', value: jobs.filter(j => j.status === 'completed').length.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
  ]);
</script>

<div class="space-y-6">

  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
    <button
      onclick={generateDigest}
      disabled={digestLoading}
      class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {#if digestLoading}
        <Loader class="h-4 w-4 animate-spin" />
        Generating...
      {:else}
        <Sparkles class="h-4 w-4 text-purple-500" />
        AI Digest
      {/if}
    </button>
  </div>

  <!-- AI digest -->
  {#if digest}
    <div class="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5">
      <div class="flex items-center gap-2 mb-2">
        <Sparkles class="h-4 w-4 text-purple-500" />
        <p class="text-xs font-semibold uppercase tracking-wide text-purple-500">AI Weekly Digest</p>
      </div>
      <p class="text-sm text-gray-700 leading-relaxed">{digest}</p>
    </div>
  {/if}

  {#if digestError}
    <p class="text-sm text-red-500">{digestError}</p>
  {/if}

  {#if loading}
    <div class="flex h-48 items-center justify-center">
      <Loader class="h-6 w-6 animate-spin text-gray-300" />
    </div>
  {:else}

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {#each stats as stat}
        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">{stat.label}</span>
            <div class="flex h-8 w-8 items-center justify-center rounded-xl {stat.color}">
              <stat.icon class="h-4 w-4" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{stat.value}</p>
        </div>
      {/each}
    </div>

    <!-- Needs review alert -->
    {#if needsReview.length > 0}
      <a href="/app/jobs"
        class="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 hover:bg-amber-100 transition-colors">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
          <CircleAlert class="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p class="text-sm font-semibold text-amber-900">
            {needsReview.length} job{needsReview.length !== 1 ? 's' : ''} need{needsReview.length === 1 ? 's' : ''} review
          </p>
          <p class="text-xs text-amber-600">Crew marked complete — verify and close</p>
        </div>
        <div class="ml-auto">
          <div class="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
        </div>
      </a>
    {/if}

    <!-- Churn risk panel -->
    {#if visibleChurnRisks.length > 0}
      <div class="rounded-2xl border border-red-100 bg-white overflow-hidden">
        <div class="flex items-center gap-2 border-b border-red-50 bg-red-50 px-5 py-3.5">
          <UserX class="h-4 w-4 text-red-500" />
          <p class="text-sm font-semibold text-red-800">
            {visibleChurnRisks.length} customer{visibleChurnRisks.length !== 1 ? 's' : ''} at risk of churning
          </p>
          <span class="ml-auto text-xs text-red-400">Follow up soon</span>
        </div>
        <div class="divide-y divide-gray-50">
          {#each visibleChurnRisks as risk}
            <div class="flex items-center justify-between px-5 py-3.5">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                  {risk.riskLevel === 'high' ? 'bg-red-50' : 'bg-amber-50'}">
                  <TriangleAlert class="h-4 w-4 {risk.riskLevel === 'high' ? 'text-red-500' : 'text-amber-500'}" />
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-900">{risk.name}</p>
                  <p class="text-xs text-gray-400">{risk.reason}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold
                  {risk.riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">
                  {risk.riskLevel === 'high' ? 'High risk' : 'Watch'}
                </span>
                <button
                  onclick={() => dismissChurn(risk.id)}
                  class="rounded-lg p-1 text-gray-300 hover:text-gray-500 transition-colors"
                  title="Dismiss"
                >
                  <span class="text-sm leading-none">×</span>
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Main grid: weather + upcoming -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">

      <!-- Weather widget -->
      <WeatherWidget flaggedJobs={next7DaysJobs()} />

      <!-- Upcoming jobs -->
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <Calendar class="h-4 w-4 text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Upcoming Jobs</h2>
          </div>
          <a href="/app/jobs" class="text-xs text-gray-400 hover:text-gray-600 transition-colors">View all</a>
        </div>

        {#if upcomingJobs.length === 0}
          <div class="flex flex-col items-center justify-center py-12 text-center">
            <Calendar class="h-8 w-8 text-gray-200 mb-2" />
            <p class="text-sm text-gray-400">No upcoming jobs</p>
          </div>
        {:else}
          <div class="divide-y divide-gray-50">
            {#each upcomingJobs as job}
              <div class="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                    <ClipboardList class="h-4 w-4 text-gray-400" />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900">{job.customers?.name ?? 'No customer'}</p>
                    <p class="text-xs text-gray-500">{job.service_type}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-xs font-medium text-gray-700">{formatDate(job.scheduled_date)}</p>
                  {#if job.price}
                    <p class="text-xs text-gray-400">{formatCurrency(job.price)}</p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  {/if}
</div>
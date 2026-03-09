<script lang="ts">
  // src/routes/(app)/app/accounting/+page.svelte
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import DollarSign from 'lucide-svelte/icons/dollar-sign';
  import TrendingUp from 'lucide-svelte/icons/trending-up';
  import Clock from 'lucide-svelte/icons/clock';
  import Users from 'lucide-svelte/icons/users';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import Plus from 'lucide-svelte/icons/plus';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Download from 'lucide-svelte/icons/download';
  import Calendar from 'lucide-svelte/icons/calendar';
  import X from 'lucide-svelte/icons/x';

  // ── Types ─────────────────────────────────────────────────────────────────
  type Job = {
    id: string;
    service_type: string;
    scheduled_date: string;
    price: number | null;
    status: string;
    contract_signed_at: string | null;
    customers: { name: string } | null;
  };

  type MonthlyData = {
    month: string;
    monthKey: string;
    collected: number;
    outstanding: number;
    jobCount: number;
  };

  type ServiceBreakdown = {
    service: string;
    revenue: number;
    jobCount: number;
    pct: number;
  };

  type TopCustomer = {
    name: string;
    revenue: number;
    jobCount: number;
  };

  type PayrollEntry = {
    id: string;
    name: string;
    role: 'employee' | 'contractor';
    payType: 'hourly' | 'per_job' | 'daily' | 'salary';
    rate: number;
    hoursOrJobs: number;
    period: string;
    total: number;
  };

  // ── State ─────────────────────────────────────────────────────────────────
  let activeTab        = $state<'overview' | 'payroll'>('overview');
  let loading          = $state(true);
  let selectedYear     = $state(new Date().getFullYear());

  let allJobs          = $state<Job[]>([]);
  let monthlyData      = $state<MonthlyData[]>([]);
  let serviceBreakdown = $state<ServiceBreakdown[]>([]);
  let topCustomers     = $state<TopCustomer[]>([]);

  let totalCollected   = $state(0);
  let totalOutstanding = $state(0);
  let totalJobs        = $state(0);
  let avgJobValue      = $state(0);
  let bestMonth        = $state('');
  let bestMonthAmount  = $state(0);
  let chartMax         = $state(1);

  // Payroll
  let payrollEntries   = $state<PayrollEntry[]>([]);
  let showPayrollForm  = $state(false);
  let payrollForm      = $state({
    name: '',
    role: 'contractor' as 'employee' | 'contractor',
    payType: 'per_job' as 'hourly' | 'per_job' | 'daily' | 'salary',
    rate: 0,
    hoursOrJobs: 0,
    period: new Date().toISOString().slice(0, 7),
  });

  // Drill-down modals
  let drillJobs        = $state<Job[]>([]);
  let drillTitle       = $state('');
  let drillSubtitle    = $state('');
  let showDrill        = $state(false);

  // ── Load data ─────────────────────────────────────────────────────────────
  onMount(async () => {
    await loadData();
    loadPayroll();
  });

  async function loadData() {
    loading = true;
    const { data } = await supabase
      .from('jobs')
      .select(`id, service_type, scheduled_date, price, status, contract_signed_at, customers(name)`)
      .gte('scheduled_date', `${selectedYear}-01-01`)
      .lte('scheduled_date', `${selectedYear}-12-31`)
      .order('scheduled_date');

    allJobs = (data ?? []).map(j => ({
      ...j,
      customers: Array.isArray(j.customers) ? j.customers[0] : j.customers,
    }));

    computeStats();
    loading = false;
  }

  function computeStats() {
    const months: Record<string, MonthlyData> = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, '0')}`;
      const label = new Date(`${key}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = { month: label, monthKey: key, collected: 0, outstanding: 0, jobCount: 0 };
    }

    const services: Record<string, { revenue: number; jobCount: number }> = {};
    const customers: Record<string, { revenue: number; jobCount: number }> = {};
    let collected = 0, outstanding = 0, jobCount = 0;

    for (const job of allJobs) {
      if (job.status === 'cancelled') continue;
      const price = job.price ?? 0;
      const monthKey = job.scheduled_date.slice(0, 7);
      const isCollected = job.status === 'completed';

      if (months[monthKey]) {
        months[monthKey].jobCount++;
        if (isCollected) { months[monthKey].collected += price; collected += price; }
        else { months[monthKey].outstanding += price; outstanding += price; }
      }

      if (!services[job.service_type]) services[job.service_type] = { revenue: 0, jobCount: 0 };
      services[job.service_type].revenue += price;
      services[job.service_type].jobCount++;

      const custName = job.customers?.name ?? 'Unknown';
      if (!customers[custName]) customers[custName] = { revenue: 0, jobCount: 0 };
      customers[custName].revenue += price;
      customers[custName].jobCount++;

      jobCount++;
    }

    totalCollected   = collected;
    totalOutstanding = outstanding;
    totalJobs        = jobCount;
    avgJobValue      = jobCount > 0 ? Math.round((collected + outstanding) / jobCount) : 0;

    monthlyData = Object.values(months);
    chartMax = Math.max(...monthlyData.map(m => m.collected + m.outstanding), 1);

    const best = monthlyData.reduce((a, b) => a.collected > b.collected ? a : b, monthlyData[0]);
    bestMonth       = best?.month ?? '';
    bestMonthAmount = best?.collected ?? 0;

    const totalRevenue = collected + outstanding;
    serviceBreakdown = Object.entries(services)
      .map(([service, d]) => ({ service, revenue: d.revenue, jobCount: d.jobCount, pct: totalRevenue > 0 ? Math.round((d.revenue / totalRevenue) * 100) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);

    topCustomers = Object.entries(customers)
      .map(([name, d]) => ({ name, revenue: d.revenue, jobCount: d.jobCount }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }

  // ── Drill-down ─────────────────────────────────────────────────────────────
  function drillByService(svc: ServiceBreakdown) {
    drillJobs = allJobs.filter(j => j.service_type === svc.service && j.status !== 'cancelled');
    drillTitle = svc.service;
    drillSubtitle = `${svc.jobCount} jobs · ${fmt(svc.revenue)} total`;
    showDrill = true;
  }

  function drillByMonth(month: MonthlyData) {
    drillJobs = allJobs.filter(j => j.scheduled_date.startsWith(month.monthKey) && j.status !== 'cancelled');
    drillTitle = month.month;
    drillSubtitle = `${month.jobCount} jobs · ${fmt(month.collected)} collected · ${month.outstanding > 0 ? fmt(month.outstanding) + ' outstanding' : 'nothing outstanding'}`;
    showDrill = true;
  }

  function drillOutstanding() {
    drillJobs = allJobs.filter(j => !['completed','cancelled'].includes(j.status));
    drillTitle = 'Outstanding Jobs';
    drillSubtitle = `${drillJobs.length} unpaid jobs · ${fmt(totalOutstanding)} total`;
    showDrill = true;
  }

  // ── Payroll ───────────────────────────────────────────────────────────────
  function loadPayroll() {
    try {
      const stored = localStorage.getItem('cruzcrewz_payroll');
      if (stored) payrollEntries = JSON.parse(stored);
    } catch {}
  }

  function savePayroll() {
    localStorage.setItem('cruzcrewz_payroll', JSON.stringify(payrollEntries));
  }

  function addPayrollEntry() {
    if (!payrollForm.name.trim()) return;
    const total = payrollForm.rate * payrollForm.hoursOrJobs;
    const entry: PayrollEntry = {
      id: crypto.randomUUID(),
      name: payrollForm.name.trim(),
      role: payrollForm.role,
      payType: payrollForm.payType,
      rate: payrollForm.rate,
      hoursOrJobs: payrollForm.hoursOrJobs,
      period: payrollForm.period,
      total,
    };
    payrollEntries = [...payrollEntries, entry];
    savePayroll();
    showPayrollForm = false;
    payrollForm = { name: '', role: 'contractor', payType: 'per_job', rate: 0, hoursOrJobs: 0, period: new Date().toISOString().slice(0, 7) };
  }

  function removePayrollEntry(id: string) {
    payrollEntries = payrollEntries.filter(e => e.id !== id);
    savePayroll();
  }

  let totalPayroll = $derived(payrollEntries.reduce((sum, e) => sum + e.total, 0));
  let netRevenue   = $derived(totalCollected - totalPayroll);
  let profitMargin = $derived(totalCollected > 0 ? Math.round((netRevenue / totalCollected) * 100) : 0);

  let payrollByPeriod = $derived(() => {
    const groups: Record<string, PayrollEntry[]> = {};
    for (const e of payrollEntries) {
      if (!groups[e.period]) groups[e.period] = [];
      groups[e.period].push(e);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([period, entries]) => ({
        period,
        label: new Date(`${period}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        entries,
        total: entries.reduce((s, e) => s + e.total, 0),
      }));
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function fmt(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
  }

  function payTypeLabel(t: string) {
    return t === 'hourly' ? 'hr' : t === 'per_job' ? 'job' : t === 'daily' ? 'day' : 'mo';
  }

  const SERVICE_COLORS: Record<string, string> = {
    'Lawn Mowing':                 '#16a34a',
    'Trimming & Edging':           '#2563eb',
    'Bush, Shrub & Tree Care':     '#7c3aed',
    'Spring & Fall Cleanups':      '#d97706',
    'Landscape Maintenance':       '#0891b2',
    'Lawn Aeration & Overseeding': '#65a30d',
  };

  function serviceColor(s: string) {
    return SERVICE_COLORS[s] ?? '#6b7280';
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      completed:   'bg-emerald-100 text-emerald-700',
      scheduled:   'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      pending:     'bg-gray-100 text-gray-600',
      cancelled:   'bg-red-100 text-red-600',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Customer', 'Service', 'Status', 'Price'],
      ...allJobs
        .filter(j => j.status !== 'cancelled')
        .map(j => [j.scheduled_date, j.customers?.name ?? 'Unknown', j.service_type, j.status, j.price ?? 0])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cruzcrewz-revenue-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  $effect(() => { selectedYear; loadData(); });
</script>

<div class="space-y-6">

  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">Accounting</h1>
      <p class="mt-0.5 text-sm text-gray-500">Revenue, payroll, and financial overview</p>
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={exportCSV}
        class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Download class="h-4 w-4" />
        Export CSV
      </button>
      <div class="relative">
        <select
          bind:value={selectedYear}
          class="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm font-medium text-gray-700 focus:border-emerald-500 focus:outline-none"
        >
          {#each [2024, 2025, 2026, 2027] as y}
            <option value={y}>{y}</option>
          {/each}
        </select>
        <ChevronDown class="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
    {#each [['overview', 'Overview'], ['payroll', 'Payroll']] as [tab, label]}
      <button
        onclick={() => (activeTab = tab as any)}
        class="rounded-lg px-4 py-2 text-sm font-medium transition-colors
          {activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
      >
        {label}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="flex h-64 items-center justify-center">
      <p class="text-sm text-gray-400">Loading financial data...</p>
    </div>

  {:else if activeTab === 'overview'}

    <!-- Summary cards -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-500">Collected</p>
          <div class="rounded-lg bg-emerald-50 p-2"><DollarSign class="h-4 w-4 text-emerald-600" /></div>
        </div>
        <p class="mt-3 text-2xl font-bold text-gray-900">{fmt(totalCollected)}</p>
        <p class="mt-1 text-xs text-gray-400">{selectedYear} completed jobs</p>
      </div>

      <!-- Outstanding — clickable -->
      <button
        onclick={drillOutstanding}
        class="rounded-xl border border-amber-200 bg-white p-5 text-left hover:bg-amber-50 transition-colors"
      >
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-500">Outstanding</p>
          <div class="rounded-lg bg-amber-50 p-2"><Clock class="h-4 w-4 text-amber-600" /></div>
        </div>
        <p class="mt-3 text-2xl font-bold text-gray-900">{fmt(totalOutstanding)}</p>
        <p class="mt-1 text-xs text-amber-600">click to view unpaid jobs →</p>
      </button>

      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-500">Avg Job Value</p>
          <div class="rounded-lg bg-blue-50 p-2"><TrendingUp class="h-4 w-4 text-blue-600" /></div>
        </div>
        <p class="mt-3 text-2xl font-bold text-gray-900">{fmt(avgJobValue)}</p>
        <p class="mt-1 text-xs text-gray-400">{totalJobs} total jobs</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-500">Best Month</p>
          <div class="rounded-lg bg-purple-50 p-2"><Calendar class="h-4 w-4 text-purple-600" /></div>
        </div>
        <p class="mt-3 text-2xl font-bold text-gray-900">{bestMonth || '—'}</p>
        <p class="mt-1 text-xs text-gray-400">{bestMonthAmount > 0 ? fmt(bestMonthAmount) : 'no data yet'}</p>
      </div>
    </div>

    <!-- Payroll summary if entries exist -->
    {#if payrollEntries.length > 0}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-sm font-medium text-gray-500">Total Payroll</p>
          <p class="mt-2 text-2xl font-bold text-red-600">{fmt(totalPayroll)}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-sm font-medium text-gray-500">Net Revenue ({selectedYear})</p>
          <p class="mt-2 text-2xl font-bold {netRevenue >= 0 ? 'text-emerald-600' : 'text-red-600'}">{fmt(netRevenue)}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-sm font-medium text-gray-500">Profit Margin</p>
          <p class="mt-2 text-2xl font-bold {profitMargin >= 40 ? 'text-emerald-600' : profitMargin >= 20 ? 'text-amber-600' : 'text-red-600'}">{profitMargin}%</p>
        </div>
      </div>
    {/if}

    <!-- Monthly revenue chart -->
    <div class="rounded-xl border border-gray-200 bg-white p-6">
      <h2 class="mb-6 text-base font-semibold text-gray-900">Monthly Revenue — {selectedYear}</h2>
      <div class="flex items-end gap-2 h-48">
        {#each monthlyData as month}
          {@const collectedH = chartMax > 0 ? (month.collected / chartMax) * 100 : 0}
          {@const outstandingH = chartMax > 0 ? (month.outstanding / chartMax) * 100 : 0}
          <button
            onclick={() => month.jobCount > 0 && drillByMonth(month)}
            class="flex flex-1 flex-col items-center gap-1 group"
            disabled={month.jobCount === 0}
          >
            <div class="flex w-full flex-col-reverse items-stretch gap-0.5 rounded-t-sm overflow-hidden
              {month.jobCount > 0 ? 'cursor-pointer group-hover:opacity-80' : 'cursor-default'}"
              style="height: 160px; justify-content: flex-end; flex-direction: column-reverse;">
              {#if month.outstanding > 0}
                <div class="w-full bg-amber-300 transition-all" style="height: {outstandingH}%"
                  title="{month.month} outstanding: {fmt(month.outstanding)}"></div>
              {/if}
              {#if month.collected > 0}
                <div class="w-full bg-emerald-500 transition-all" style="height: {collectedH}%"
                  title="{month.month} collected: {fmt(month.collected)}"></div>
              {/if}
              {#if month.collected === 0 && month.outstanding === 0}
                <div class="w-full bg-gray-100" style="height: 4px"></div>
              {/if}
            </div>
            <p class="text-xs text-gray-400 {month.jobCount > 0 ? 'group-hover:text-gray-700' : ''}">{month.month.split(' ')[0]}</p>
          </button>
        {/each}
      </div>
      <div class="mt-4 flex items-center gap-6">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-sm bg-emerald-500"></div>
          <span class="text-xs text-gray-500">Collected</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-sm bg-amber-300"></div>
          <span class="text-xs text-gray-500">Outstanding</span>
        </div>
        <span class="text-xs text-gray-400 ml-auto">Click a bar to see jobs</span>
      </div>
    </div>

    <!-- Service breakdown + top customers -->
    <div class="grid gap-6 lg:grid-cols-2">

      <!-- Service breakdown — clickable rows -->
      <div class="rounded-xl border border-gray-200 bg-white p-6">
        <h2 class="mb-5 text-base font-semibold text-gray-900">Revenue by Service</h2>
        {#if serviceBreakdown.length === 0}
          <p class="text-sm text-gray-400">No data for {selectedYear}</p>
        {:else}
          <div class="space-y-4">
            {#each serviceBreakdown as svc}
              <button
                onclick={() => drillByService(svc)}
                class="w-full text-left group"
              >
                <div class="mb-1.5 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-2.5 w-2.5 rounded-full" style="background-color: {serviceColor(svc.service)}"></div>
                    <span class="text-sm text-gray-700 group-hover:text-gray-900">{svc.service}</span>
                    <span class="text-xs text-gray-400">({svc.jobCount} job{svc.jobCount !== 1 ? 's' : ''})</span>
                  </div>
                  <div class="text-right flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">{fmt(svc.revenue)}</span>
                    <span class="text-xs text-gray-400">{svc.pct}%</span>
                    <span class="text-xs text-gray-300 group-hover:text-gray-500">→</span>
                  </div>
                </div>
                <div class="h-2 w-full rounded-full bg-gray-100">
                  <div class="h-2 rounded-full transition-all group-hover:opacity-80"
                    style="width: {svc.pct}%; background-color: {serviceColor(svc.service)}"></div>
                </div>
              </button>
            {/each}
          </div>
          <p class="mt-4 text-xs text-gray-400">Click a service to see job details</p>
        {/if}
      </div>

      <!-- Top customers -->
      <div class="rounded-xl border border-gray-200 bg-white p-6">
        <h2 class="mb-5 text-base font-semibold text-gray-900">Top Customers by Revenue</h2>
        {#if topCustomers.length === 0}
          <p class="text-sm text-gray-400">No data for {selectedYear}</p>
        {:else}
          <div class="space-y-3">
            {#each topCustomers as customer, i}
              <div class="flex items-center gap-3">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                  {i + 1}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="truncate text-sm font-medium text-gray-900">{customer.name}</p>
                  <p class="text-xs text-gray-400">{customer.jobCount} job{customer.jobCount !== 1 ? 's' : ''}</p>
                </div>
                <span class="text-sm font-semibold text-gray-900">{fmt(customer.revenue)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Monthly detail table — clickable rows -->
    <div class="rounded-xl border border-gray-200 bg-white">
      <div class="border-b border-gray-100 px-6 py-4">
        <h2 class="text-base font-semibold text-gray-900">Monthly Detail</h2>
        <p class="text-xs text-gray-400 mt-0.5">Click any row to see the jobs for that month</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
              <th class="px-6 py-3">Month</th>
              <th class="px-6 py-3">Jobs</th>
              <th class="px-6 py-3">Collected</th>
              <th class="px-6 py-3">Outstanding</th>
              <th class="px-6 py-3">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            {#each [...monthlyData].reverse() as month}
              {#if month.jobCount > 0}
                <tr
                  class="hover:bg-emerald-50 cursor-pointer transition-colors"
                  onclick={() => drillByMonth(month)}
                >
                  <td class="px-6 py-3 font-medium text-gray-900">{month.month}</td>
                  <td class="px-6 py-3 text-gray-500">{month.jobCount}</td>
                  <td class="px-6 py-3 text-emerald-700 font-medium">{fmt(month.collected)}</td>
                  <td class="px-6 py-3 {month.outstanding > 0 ? 'text-amber-600 font-medium' : 'text-gray-300'}">
                    {month.outstanding > 0 ? fmt(month.outstanding) : '—'}
                  </td>
                  <td class="px-6 py-3 font-semibold text-gray-900">{fmt(month.collected + month.outstanding)}</td>
                </tr>
              {/if}
            {/each}
            {#if monthlyData.every(m => m.jobCount === 0)}
              <tr>
                <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-400">No jobs found for {selectedYear}</td>
              </tr>
            {/if}
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td class="px-6 py-3 text-gray-900">Total</td>
              <td class="px-6 py-3 text-gray-900">{totalJobs}</td>
              <td class="px-6 py-3 text-emerald-700">{fmt(totalCollected)}</td>
              <td class="px-6 py-3 {totalOutstanding > 0 ? 'text-amber-600' : 'text-gray-300'}">{totalOutstanding > 0 ? fmt(totalOutstanding) : '—'}</td>
              <td class="px-6 py-3 text-gray-900">{fmt(totalCollected + totalOutstanding)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

  {:else if activeTab === 'payroll'}

    <!-- Payroll tab -->
    <div class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-sm font-medium text-gray-500">Total Payroll (all time)</p>
          <p class="mt-2 text-2xl font-bold text-gray-900">{fmt(totalPayroll)}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-sm font-medium text-gray-500">Net Revenue ({selectedYear})</p>
          <p class="mt-2 text-2xl font-bold {netRevenue >= 0 ? 'text-emerald-600' : 'text-red-600'}">{fmt(netRevenue)}</p>
          <p class="mt-1 text-xs text-gray-400">collected minus payroll</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-sm font-medium text-gray-500">Profit Margin</p>
          <p class="mt-2 text-2xl font-bold {profitMargin >= 40 ? 'text-emerald-600' : profitMargin >= 20 ? 'text-amber-600' : 'text-red-600'}">{profitMargin}%</p>
          <p class="mt-1 text-xs text-gray-400">
            {profitMargin >= 40 ? 'Healthy margin' : profitMargin >= 20 ? 'Watch expenses' : 'Margin is tight'}
          </p>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-900">Payroll Entries</h2>
        <button
          onclick={() => (showPayrollForm = !showPayrollForm)}
          class="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          <Plus class="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {#if showPayrollForm}
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h3 class="text-sm font-semibold text-gray-900">New Payroll Entry</h3>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div class="sm:col-span-2">
              <label for="payroll-name" class="mb-1 block text-xs font-medium text-gray-700">Name <span class="text-red-500">*</span></label>
              <input id="payroll-name" type="text" bind:value={payrollForm.name} placeholder="e.g. Carlos M."
                class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label for="payroll-period" class="mb-1 block text-xs font-medium text-gray-700">Pay Period</label>
              <input id="payroll-period" type="month" bind:value={payrollForm.period}
                class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label for="payroll-role" class="mb-1 block text-xs font-medium text-gray-700">Role</label>
              <select id="payroll-role" bind:value={payrollForm.role}
                class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                <option value="contractor">Contractor</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <div>
              <label for="payroll-paytype" class="mb-1 block text-xs font-medium text-gray-700">Pay Type</label>
              <select id="payroll-paytype" bind:value={payrollForm.payType}
                class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                <option value="per_job">Per Job</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="salary">Monthly Salary</option>
              </select>
            </div>
            <div>
              <label for="payroll-rate" class="mb-1 block text-xs font-medium text-gray-700">
                Rate ($/{payTypeLabel(payrollForm.payType)})
              </label>
              <input id="payroll-rate" type="number" bind:value={payrollForm.rate} min="0" step="0.01"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label for="payroll-qty" class="mb-1 block text-xs font-medium text-gray-700">
                {payrollForm.payType === 'hourly' ? 'Hours' : payrollForm.payType === 'per_job' ? 'Jobs' : payrollForm.payType === 'daily' ? 'Days' : 'Months'}
              </label>
              <input id="payroll-qty" type="number" bind:value={payrollForm.hoursOrJobs} min="0"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-gray-900">Total: {fmt(payrollForm.rate * payrollForm.hoursOrJobs)}</p>
            <div class="flex gap-2">
              <button onclick={() => (showPayrollForm = false)}
                class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onclick={addPayrollEntry}
                class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Save Entry</button>
            </div>
          </div>
        </div>
      {/if}

      {#if payrollByPeriod().length === 0}
        <div class="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
          <Users class="mx-auto h-8 w-8 text-gray-300" />
          <p class="mt-3 text-sm text-gray-400">No payroll entries yet</p>
          <p class="text-xs text-gray-400">Add entries for each crew member per pay period</p>
        </div>
      {:else}
        {#each payrollByPeriod() as group}
          <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
              <p class="text-sm font-semibold text-gray-900">{group.label}</p>
              <p class="text-sm font-bold text-gray-900">{fmt(group.total)}</p>
            </div>
            <table class="w-full text-sm">
              <tbody class="divide-y divide-gray-50">
                {#each group.entries as entry}
                  <tr class="hover:bg-gray-50">
                    <td class="px-5 py-3">
                      <p class="font-medium text-gray-900">{entry.name}</p>
                      <p class="text-xs text-gray-400 capitalize">{entry.role}</p>
                    </td>
                    <td class="px-5 py-3 text-gray-500">
                      {fmt(entry.rate)}/{payTypeLabel(entry.payType)} × {entry.hoursOrJobs}
                    </td>
                    <td class="px-5 py-3 font-semibold text-gray-900">{fmt(entry.total)}</td>
                    <td class="px-5 py-3 text-right">
                      <button onclick={() => removePayrollEntry(entry.id)}
                        class="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/each}
      {/if}
    </div>

  {/if}
</div>

<!-- Drill-down modal -->
{#if showDrill}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => (showDrill = false)}>
    <div class="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onclick={(e) => e.stopPropagation()}>

      <!-- Modal header -->
      <div class="flex items-start justify-between border-b border-gray-100 px-6 py-5">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{drillTitle}</h2>
          <p class="mt-0.5 text-sm text-gray-500">{drillSubtitle}</p>
        </div>
        <button onclick={() => (showDrill = false)}
          class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Job list -->
      <div class="overflow-y-auto">
        {#if drillJobs.length === 0}
          <p class="p-6 text-center text-sm text-gray-400">No jobs found</p>
        {:else}
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-gray-50">
              <tr class="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                <th class="px-6 py-3">Customer</th>
                <th class="px-6 py-3">Service</th>
                <th class="px-6 py-3">Date</th>
                <th class="px-6 py-3">Status</th>
                <th class="px-6 py-3 text-right">Price</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              {#each drillJobs as job}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-3 font-medium text-gray-900">{job.customers?.name ?? 'Unknown'}</td>
                  <td class="px-6 py-3 text-gray-600">{job.service_type}</td>
                  <td class="px-6 py-3 text-gray-500">
                    {new Date(job.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td class="px-6 py-3">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium {statusBadge(job.status)}">
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td class="px-6 py-3 text-right font-semibold {job.status === 'completed' ? 'text-emerald-700' : 'text-amber-600'}">
                    {fmt(job.price ?? 0)}
                  </td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td colspan="4" class="px-6 py-3 text-gray-900">Total</td>
                <td class="px-6 py-3 text-right text-gray-900">
                  {fmt(drillJobs.reduce((s, j) => s + (j.price ?? 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        {/if}
      </div>
    </div>
  </div>
{/if}
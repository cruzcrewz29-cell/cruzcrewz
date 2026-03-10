<script lang="ts">
  // src/routes/(customer)/my/dashboard/+page.svelte
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Loader from 'lucide-svelte/icons/loader';
  import Calendar from 'lucide-svelte/icons/calendar';
  import CheckCircle from 'lucide-svelte/icons/check-circle';
  import Clock from 'lucide-svelte/icons/clock';
  import FileText from 'lucide-svelte/icons/file-text';
  import ChevronRight from 'lucide-svelte/icons/chevron-right';
  import LogOut from 'lucide-svelte/icons/log-out';
  import AlertCircle from 'lucide-svelte/icons/alert-circle';

  type Customer = {
    id: string;
    name: string;
    email: string;
    address: string | null;
    phone: string | null;
  };

  type Job = {
    id: string;
    service_type: string;
    status: string;
    scheduled_date: string;
    price: number | null;
    invoice_number: string | null;
    invoice_sent: boolean;
    reschedule_requested: boolean;
    description: string | null;
  };

  let customer   = $state<Customer | null>(null);
  let jobs       = $state<Job[]>([]);
  let loading    = $state(true);
  let error      = $state('');
  let token      = $state('');

  onMount(async () => {
    // Read token from URL or localStorage
    const urlToken = $page.url.searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('cruzcrewz_customer_token', urlToken);
      // Clean URL
      window.history.replaceState({}, '', '/my/dashboard');
    }
    token = localStorage.getItem('cruzcrewz_customer_token') ?? '';

    if (!token) {
      window.location.href = '/my';
      return;
    }

    try {
      const res = await fetch(`/api/customer-portal?token=${token}`);
      const data = await res.json();
      if (!res.ok || !data.customer) {
        localStorage.removeItem('cruzcrewz_customer_token');
        window.location.href = '/my';
        return;
      }
      customer = data.customer;
      jobs     = data.jobs ?? [];
    } catch {
      error = 'Failed to load your account. Please try signing in again.';
    } finally {
      loading = false;
    }
  });

  function signOut() {
    localStorage.removeItem('cruzcrewz_customer_token');
    window.location.href = '/my';
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    pending:     { label: 'Pending',     color: 'bg-gray-100 text-gray-600',    icon: 'clock' },
    scheduled:   { label: 'Scheduled',   color: 'bg-blue-50 text-blue-700',     icon: 'calendar' },
    in_progress: { label: 'In Progress', color: 'bg-yellow-50 text-yellow-700', icon: 'clock' },
    completed:   { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700', icon: 'check' },
    cancelled:   { label: 'Cancelled',   color: 'bg-red-50 text-red-600',       icon: 'x' },
  };

  let upcomingJobs = $derived(
    [...jobs]
      .filter(j => ['pending', 'scheduled', 'in_progress'].includes(j.status))
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  );

  let pastJobs = $derived(
    [...jobs]
      .filter(j => j.status === 'completed' || j.status === 'cancelled')
      .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))
  );

  let totalSpent = $derived(
    jobs.filter(j => j.status === 'completed' && j.price).reduce((sum, j) => sum + Number(j.price), 0)
  );
</script>

<svelte:head>
  <title>My Account | Cruz Crewz</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-50">

  <!-- Header -->
  <div class="border-b border-gray-200 bg-white">
    <div class="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
          <span class="text-sm font-extrabold text-white">CC</span>
        </div>
        <div>
          <p class="text-sm font-semibold text-gray-900">Cruz Crewz</p>
          <p class="text-xs text-gray-400">Customer Portal</p>
        </div>
      </div>
      {#if customer}
        <button onclick={signOut} class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <LogOut class="h-3.5 w-3.5" />
          Sign out
        </button>
      {/if}
    </div>
  </div>

  <div class="mx-auto max-w-2xl px-4 py-6 space-y-6">

    {#if loading}
      <div class="flex h-48 items-center justify-center">
        <Loader class="h-6 w-6 animate-spin text-gray-400" />
      </div>

    {:else if error}
      <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p class="text-sm text-red-600">{error}</p>
        <a href="/my" class="mt-3 inline-block text-xs text-emerald-600 underline">Sign in again</a>
      </div>

    {:else if customer}
      <!-- Welcome -->
      <div>
        <h1 class="text-xl font-bold text-gray-900">Welcome back, {customer.name.split(' ')[0]}</h1>
        <p class="text-sm text-gray-500 mt-0.5">{customer.address ?? customer.email}</p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3">
        <div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p class="text-2xl font-bold text-gray-900">{upcomingJobs.length}</p>
          <p class="text-xs text-gray-400 mt-0.5">Upcoming</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p class="text-2xl font-bold text-gray-900">{pastJobs.filter(j => j.status === 'completed').length}</p>
          <p class="text-xs text-gray-400 mt-0.5">Completed</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p class="text-lg font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
          <p class="text-xs text-gray-400 mt-0.5">Total spent</p>
        </div>
      </div>

      <!-- Upcoming jobs -->
      {#if upcomingJobs.length > 0}
        <div>
          <h2 class="text-sm font-semibold text-gray-900 mb-3">Upcoming Services</h2>
          <div class="space-y-2">
            {#each upcomingJobs as job}
              {@const cfg = statusConfig[job.status] ?? statusConfig.pending}
              <a
                href="/my/jobs/{job.id}?token={token}"
                class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    <Calendar class="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900">{job.service_type}</p>
                    <p class="text-xs text-gray-500 mt-0.5">{formatDate(job.scheduled_date)}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="rounded-full px-2.5 py-0.5 text-xs font-medium {cfg.color}">{cfg.label}</span>
                  <ChevronRight class="h-4 w-4 text-gray-300" />
                </div>
              </a>
            {/each}
          </div>
        </div>
      {:else}
        <div class="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <Calendar class="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p class="text-sm font-medium text-gray-500">No upcoming services</p>
          <a href="/quote" class="mt-2 inline-block text-xs text-emerald-600 underline">Request a new service</a>
        </div>
      {/if}

      <!-- Past jobs -->
      {#if pastJobs.length > 0}
        <div>
          <h2 class="text-sm font-semibold text-gray-900 mb-3">Service History</h2>
          <div class="space-y-2">
            {#each pastJobs as job}
              {@const cfg = statusConfig[job.status] ?? statusConfig.completed}
              <a
                href="/my/jobs/{job.id}?token={token}"
                class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
                    <CheckCircle class="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900">{job.service_type}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <p class="text-xs text-gray-500">{formatDate(job.scheduled_date)}</p>
                      {#if job.price}
                        <span class="text-xs text-gray-400">·</span>
                        <p class="text-xs font-medium text-gray-700">{formatCurrency(job.price)}</p>
                      {/if}
                      {#if job.invoice_sent}
                        <span class="text-xs text-gray-400">·</span>
                        <span class="flex items-center gap-1 text-xs text-emerald-600">
                          <FileText class="h-3 w-3" />
                          Invoice sent
                        </span>
                      {/if}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="rounded-full px-2.5 py-0.5 text-xs font-medium {cfg.color}">{cfg.label}</span>
                  <ChevronRight class="h-4 w-4 text-gray-300" />
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}

    {/if}
  </div>
</div>
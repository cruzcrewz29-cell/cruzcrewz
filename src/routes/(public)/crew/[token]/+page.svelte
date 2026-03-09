<script lang="ts">
  // src/routes/(public)/crew/[token]/+page.svelte
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import Loader from 'lucide-svelte/icons/loader';
  import Navigation from 'lucide-svelte/icons/navigation';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import CheckCircle from 'lucide-svelte/icons/check-circle';

  const token = $page.params.token;

  type TrackerRow = {
    id: string;
    status: string;
    jobs: {
      service_type: string;
      scheduled_date: string;
      price: number | null;
      customers: { name: string; address: string | null; phone: string | null } | null;
    } | null;
  };

  let tracker      = $state<TrackerRow | null>(null);
  let loading      = $state(true);
  let updating     = $state(false);
  let error        = $state('');
  let gpsActive    = $state(false);
  let gpsError     = $state('');
  let lastPing     = $state<string | null>(null);
  let watchId: number | null = null;

  onMount(async () => {
    const { data, error: err } = await supabase
      .from('tracker_tokens')
      .select(`id, status, jobs ( service_type, scheduled_date, price, customers ( name, address, phone ) )`)
      .eq('token', token)
      .single();

    if (err || !data) {
      error = 'Invalid tracker link.';
      loading = false;
      return;
    }

    tracker = {
      ...data,
      jobs: Array.isArray(data.jobs) ? data.jobs[0] : data.jobs,
    } as TrackerRow;
    loading = false;
  });

  onDestroy(() => {
    stopGPS();
  });

  async function setStatus(status: string) {
    if (!tracker) return;
    updating = true;

    await fetch('/api/update-tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, status }),
    });

    tracker = { ...tracker, status };

    // Auto-start GPS when "on the way"
    if (status === 'on_the_way') startGPS();
    if (status === 'arrived' || status === 'completed') stopGPS();

    updating = false;
  }

  function startGPS() {
    if (!navigator.geolocation) {
      gpsError = 'GPS not available on this device.';
      return;
    }
    gpsActive = true;
    gpsError = '';

    watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        await fetch('/api/update-tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, lat, lng }),
        });
        lastPing = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      },
      (err) => {
        gpsError = 'GPS error — location sharing paused.';
        gpsActive = false;
        console.error('[gps]', err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  function stopGPS() {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    gpsActive = false;
  }

  function openNav() {
    const address = tracker?.jobs?.customers?.address;
    if (!address) return;
    const encoded = encodeURIComponent(address);
    window.open(`https://maps.google.com/maps?daddr=${encoded}`);
  }
</script>

<svelte:head>
  <title>Cruz Crewz — Crew App</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-900 text-white">

  <!-- Header -->
  <div class="border-b border-gray-800 px-4 py-4">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500">
        <span class="text-sm font-bold text-white">CC</span>
      </div>
      <div>
        <p class="text-sm font-semibold">Cruz Crewz</p>
        <p class="text-xs text-gray-400">Crew Job App</p>
      </div>
      {#if gpsActive}
        <div class="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-900 px-2.5 py-1">
          <div class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></div>
          <span class="text-xs font-medium text-emerald-400">GPS Live</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="mx-auto max-w-sm px-4 py-6 space-y-4">

    {#if loading}
      <div class="flex h-48 items-center justify-center">
        <Loader class="h-6 w-6 animate-spin text-gray-500" />
      </div>

    {:else if error}
      <div class="rounded-xl border border-red-800 bg-red-900/30 p-6 text-center">
        <p class="text-sm text-red-400">{error}</p>
      </div>

    {:else if tracker}
      {@const job = tracker.jobs}
      {@const customer = job?.customers}

      <!-- Job card -->
      <div class="rounded-2xl border border-gray-700 bg-gray-800 p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Your Job</p>
        <p class="mt-2 text-xl font-bold text-white">{customer?.name ?? 'Customer'}</p>
        <p class="mt-1 text-sm text-emerald-400">{job?.service_type ?? ''}</p>
        {#if customer?.address}
          <p class="mt-2 text-sm text-gray-300">{customer.address}</p>
        {/if}
        {#if job?.price}
          <p class="mt-2 text-sm font-semibold text-white">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(job.price)}
          </p>
        {/if}
      </div>

      <!-- Navigate button -->
      {#if customer?.address}
        <button
          onclick={openNav}
          class="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-700 bg-blue-900/40 py-3.5 text-sm font-semibold text-blue-300 hover:bg-blue-900/60 transition-colors"
        >
          <Navigation class="h-4 w-4" />
          Navigate to Job
        </button>
      {/if}

      <!-- Status buttons -->
      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Update Status</p>

        {#if tracker.status === 'pending' || tracker.status === 'on_the_way'}
          <button
            onclick={() => setStatus('on_the_way')}
            disabled={updating || tracker.status === 'on_the_way'}
            class="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold transition-colors
              {tracker.status === 'on_the_way'
                ? 'border-2 border-blue-500 bg-blue-900/30 text-blue-400'
                : 'bg-blue-600 text-white hover:bg-blue-500'}"
          >
            {#if updating}<Loader class="h-4 w-4 animate-spin" />{/if}
            {tracker.status === 'on_the_way' ? '🚗 On the Way (active)' : '🚗 On My Way'}
          </button>
        {/if}

        {#if tracker.status === 'on_the_way' || tracker.status === 'arrived'}
          <button
            onclick={() => setStatus('arrived')}
            disabled={updating || tracker.status === 'arrived'}
            class="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold transition-colors
              {tracker.status === 'arrived'
                ? 'border-2 border-emerald-500 bg-emerald-900/30 text-emerald-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'}"
          >
            {#if updating}<Loader class="h-4 w-4 animate-spin" />{/if}
            {tracker.status === 'arrived' ? '✅ Arrived (active)' : '✅ I\'ve Arrived'}
          </button>
        {/if}

        {#if tracker.status === 'arrived'}
          <button
            onclick={() => setStatus('completed')}
            disabled={updating}
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-4 text-base font-bold text-gray-900 hover:bg-white transition-colors"
          >
            {#if updating}<Loader class="h-4 w-4 animate-spin text-gray-700" />{/if}
            🎉 Mark Job Complete
          </button>
        {/if}

        {#if tracker.status === 'completed'}
          <div class="flex flex-col items-center rounded-xl border border-emerald-700 bg-emerald-900/20 py-8 text-center">
            <CheckCircle class="h-10 w-10 text-emerald-400" />
            <p class="mt-2 text-lg font-bold text-emerald-400">Job Complete!</p>
            <p class="mt-1 text-xs text-gray-400">Great work. The customer has been notified.</p>
          </div>
        {/if}
      </div>

      <!-- GPS status -->
      {#if gpsActive}
        <div class="rounded-xl border border-emerald-800 bg-emerald-900/20 px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></div>
            <p class="text-xs font-medium text-emerald-400">Sharing live location with customer</p>
          </div>
          {#if lastPing}
            <p class="mt-1 text-xs text-gray-500">Last update: {lastPing}</p>
          {/if}
          <button onclick={stopGPS} class="mt-2 text-xs text-gray-500 underline">Stop sharing</button>
        </div>
      {/if}

      {#if gpsError}
        <div class="rounded-xl border border-amber-800 bg-amber-900/20 px-4 py-3">
          <p class="text-xs text-amber-400">{gpsError}</p>
        </div>
      {/if}

      <!-- Customer phone -->
      {#if customer?.phone}
        <div class="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3">
          <p class="text-xs text-gray-400">Customer contact</p>
          <a href="tel:{customer.phone}" class="mt-0.5 block text-sm font-medium text-blue-400">{customer.phone}</a>
        </div>
      {/if}

    {/if}
  </div>
</div>
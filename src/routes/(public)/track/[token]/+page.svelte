<script lang="ts">
  // src/routes/(public)/track/[token]/+page.svelte
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import Clock from 'lucide-svelte/icons/clock';
  import CheckCircle from 'lucide-svelte/icons/check-circle';
  import Loader from 'lucide-svelte/icons/loader';

  const token = $page.params.token;

  type TrackerData = {
    status: string;
    crew_lat: number | null;
    crew_lng: number | null;
    crew_updated_at: string | null;
    jobs: {
      service_type: string;
      scheduled_date: string;
      customers: { name: string; address: string | null } | null;
    } | null;
  };

  let tracker   = $state<TrackerData | null>(null);
  let loading   = $state(true);
  let error     = $state('');
  let mapEl     = $state<HTMLDivElement | null>(null);
  let map       = $state<any>(null);
  let crewMarker = $state<any>(null);
  let pollInterval: ReturnType<typeof setInterval>;

  const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    pending:     { label: 'Crew is being dispatched',   color: 'text-gray-600',   icon: '🕐' },
    on_the_way:  { label: 'Crew is on the way!',        color: 'text-blue-600',   icon: '🚗' },
    arrived:     { label: 'Crew has arrived',           color: 'text-emerald-600', icon: '✅' },
    completed:   { label: 'Job completed!',             color: 'text-emerald-700', icon: '🎉' },
  };

  onMount(async () => {
    await loadTracker();
    await initMap();
    // Poll every 15 seconds for live updates
    pollInterval = setInterval(loadTracker, 15000);
  });

  onDestroy(() => {
    clearInterval(pollInterval);
  });

  async function loadTracker() {
    const { data, error: err } = await supabase
      .from('tracker_tokens')
      .select(`
        status, crew_lat, crew_lng, crew_updated_at,
        jobs ( service_type, scheduled_date, customers ( name, address ) )
      `)
      .eq('token', token)
      .single();

    if (err || !data) {
      error = 'Tracker not found or expired.';
      loading = false;
      return;
    }

    tracker = {
      ...data,
      jobs: Array.isArray(data.jobs) ? data.jobs[0] : data.jobs,
    } as TrackerData;

    loading = false;

    // Update map marker if we have coordinates
    if (tracker.crew_lat && tracker.crew_lng && map) {
      updateMarker(tracker.crew_lat, tracker.crew_lng);
    }
  }

  async function initMap() {
    if (!mapEl || typeof window === 'undefined') return;

    if (!(window as any).google?.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${(window as any).__GOOGLE_MAPS_KEY__ ?? ''}`;
      script.async = true;
      document.head.appendChild(script);
      await new Promise(res => { script.onload = res; });
    }

    const google = (window as any).google;
    const center = { lat: 41.8781, lng: -87.6298 };

    map = new google.maps.Map(mapEl, {
      center,
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });

    if (tracker?.crew_lat && tracker?.crew_lng) {
      updateMarker(tracker.crew_lat, tracker.crew_lng);
    }
  }

  function updateMarker(lat: number, lng: number) {
    const google = (window as any).google;
    if (!map || !google) return;

    const pos = { lat, lng };

    if (crewMarker) {
      crewMarker.setPosition(pos);
    } else {
      crewMarker = new google.maps.Marker({
        position: pos,
        map,
        title: 'Crew location',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new google.maps.Size(40, 40),
        },
        animation: google.maps.Animation.BOUNCE,
      });
    }

    map.panTo(pos);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 min ago';
    return `${mins} mins ago`;
  }
</script>

<svelte:head>
  <title>Cruz Crewz — Job Tracker</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-50">

  <!-- Header -->
  <div class="bg-white border-b border-gray-200 px-4 py-4">
    <div class="mx-auto max-w-lg">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600">
          <span class="text-sm font-bold text-white">CC</span>
        </div>
        <div>
          <p class="text-sm font-semibold text-gray-900">Cruz Crewz</p>
          <p class="text-xs text-gray-500">Live Job Tracker</p>
        </div>
      </div>
    </div>
  </div>

  <div class="mx-auto max-w-lg px-4 py-6 space-y-4">

    {#if loading}
      <div class="flex h-48 items-center justify-center">
        <Loader class="h-6 w-6 animate-spin text-gray-400" />
      </div>

    {:else if error}
      <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p class="text-sm font-medium text-red-700">{error}</p>
        <p class="mt-1 text-xs text-red-500">Contact us at (866) 873-2789 for help.</p>
      </div>

    {:else if tracker}
      {@const statusInfo = STATUS_LABELS[tracker.status] ?? STATUS_LABELS.pending}
      {@const job = tracker.jobs}

      <!-- Status card -->
      <div class="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div class="text-4xl">{statusInfo.icon}</div>
        <p class="mt-3 text-xl font-bold {statusInfo.color}">{statusInfo.label}</p>
        {#if tracker.crew_updated_at && tracker.status === 'on_the_way'}
          <p class="mt-1 text-xs text-gray-400">Location updated {timeAgo(tracker.crew_updated_at)}</p>
        {/if}
        {#if tracker.status === 'completed'}
          <p class="mt-2 text-sm text-gray-500">Thank you for choosing Cruz Crewz!</p>
        {/if}
      </div>

      <!-- Job details -->
      {#if job}
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <h2 class="mb-3 text-sm font-semibold text-gray-700">Your Service</h2>
          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2 text-gray-700">
              <CheckCircle class="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{job.service_type}</span>
            </div>
            {#if job.customers?.address}
              <div class="flex items-start gap-2 text-gray-700">
                <MapPin class="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <span>{job.customers.address}</span>
              </div>
            {/if}
            <div class="flex items-center gap-2 text-gray-700">
              <Clock class="h-4 w-4 text-gray-400 shrink-0" />
              <span>{new Date(job.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Map -->
      {#if tracker.status === 'on_the_way' || tracker.status === 'arrived'}
        <div class="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <div class="border-b border-gray-100 bg-white px-4 py-2.5">
            <p class="text-xs font-semibold text-gray-600">
              {tracker.status === 'on_the_way' ? 'Live Crew Location' : 'Crew is at your location'}
            </p>
          </div>
          <div bind:this={mapEl} class="h-64 w-full bg-gray-100"></div>
        </div>
      {/if}

      <!-- Progress steps -->
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center justify-between">
          {#each [
            { key: 'pending',    label: 'Dispatched' },
            { key: 'on_the_way', label: 'On the Way' },
            { key: 'arrived',    label: 'Arrived' },
            { key: 'completed',  label: 'Done' },
          ] as step, i}
            {@const steps = ['pending','on_the_way','arrived','completed']}
            {@const currentIdx = steps.indexOf(tracker.status)}
            {@const stepIdx = steps.indexOf(step.key)}
            {@const done = stepIdx <= currentIdx}
            <div class="flex flex-1 flex-col items-center">
              <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors
                {done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-200 bg-white'}">
                {#if done}
                  <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                {:else}
                  <span class="text-xs text-gray-400">{i + 1}</span>
                {/if}
              </div>
              <p class="mt-1.5 text-center text-xs {done ? 'font-semibold text-emerald-700' : 'text-gray-400'}">{step.label}</p>
            </div>
            {#if i < 3}
              <div class="mb-4 h-0.5 flex-1 {stepIdx < currentIdx ? 'bg-emerald-500' : 'bg-gray-200'} transition-colors"></div>
            {/if}
          {/each}
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center">
        <p class="text-xs text-gray-400">Questions? Call us at <a href="tel:8668732789" class="text-emerald-600 font-medium">(866) 873-2789</a></p>
        <p class="mt-1 text-xs text-gray-300">Page refreshes automatically every 15 seconds</p>
      </div>
    {/if}
  </div>
</div>
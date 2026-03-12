<script lang="ts">
  // src/routes/(public)/track/[token]/+page.svelte
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import Clock from 'lucide-svelte/icons/clock';
  import CheckCircle from 'lucide-svelte/icons/check-circle';
  import Loader from 'lucide-svelte/icons/loader';
  import Car from 'lucide-svelte/icons/car';
  import * as m from '$lib/paraglide/messages';
  import LanguageToggle from '$lib/components/LanguageToggle.svelte';

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

  let tracker    = $state<TrackerData | null>(null);
  let loading    = $state(true);
  let error      = $state('');
  let mapEl      = $state<HTMLDivElement | null>(null);
  let map        = $state<any>(null);
  let crewMarker = $state<any>(null);
  let pollInterval: ReturnType<typeof setInterval>;

  // ✅ Icon components stored as references, not strings
  const STATUS_CONFIG = $derived({
    pending:    { label: m.status_pending_label(),    color: 'text-gray-600',    Icon: Clock,       iconColor: 'text-gray-400'    },
    on_the_way: { label: m.status_on_the_way_label(), color: 'text-blue-600',    Icon: Car,         iconColor: 'text-blue-500'    },
    arrived:    { label: m.status_arrived_label(),    color: 'text-emerald-600', Icon: MapPin,      iconColor: 'text-emerald-500' },
    completed:  { label: m.status_completed_label(),  color: 'text-emerald-700', Icon: CheckCircle, iconColor: 'text-emerald-600' },
  });

  // ✅ Reactive step labels so they re-derive when language changes
  const STEPS = $derived([
    { key: 'pending',    label: m.step_dispatched() },
    { key: 'on_the_way', label: m.step_on_the_way() },
    { key: 'arrived',    label: m.step_arrived()    },
    { key: 'completed',  label: m.step_done()       },
  ]);

  onMount(async () => {
    await loadTracker();
    await initMap();
    pollInterval = setInterval(loadTracker, 15000);
  });

  onDestroy(() => {
    clearInterval(pollInterval);
    if (map) {
      try { (window as any).google?.maps?.event?.clearInstanceListeners(map); } catch {}
      map = null;
    }
    if (crewMarker) {
      try { crewMarker.setMap(null); } catch {}
      crewMarker = null;
    }
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
      error = m.track_not_found();
      loading = false;
      return;
    }

    tracker = {
      ...data,
      jobs: Array.isArray(data.jobs) ? data.jobs[0] : data.jobs,
    } as TrackerData;

    loading = false;

    if (tracker.crew_lat && tracker.crew_lng && map) {
      updateMarker(tracker.crew_lat, tracker.crew_lng);
    }
  }

  async function initMap() {
    if (!mapEl || typeof window === 'undefined') return;

    if (!(window as any).google?.maps?.Map) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        // ✅ Use actual env var — was window.__GOOGLE_MAPS_KEY__ ?? '' (always empty)
        script.src = `https://maps.googleapis.com/maps/api/js?key=${PUBLIC_GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        script.onload  = () => resolve();
        script.onerror = () => reject(new Error('Maps failed to load'));
        document.head.appendChild(script);
      });
    }

    const google = (window as any).google;

    map = new google.maps.Map(mapEl, {
      center: { lat: 41.8781, lng: -87.6298 },
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
        position:  pos,
        map,
        title:     'Crew location',
        icon: {
          url:        'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
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
    if (mins < 1) return m.time_just_now();
    if (mins === 1) return m.time_1_min_ago();
    return m.time_n_mins_ago({ n: mins });
  }

  function formatDate(dateStr: string) {
    // ✅ .slice(0,10) before appending time — raw scheduled_date may include
    //    timezone offset that shifts the date when parsed, causing Invalid Date
    return new Date(dateStr.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  }
</script>

<svelte:head>
  <title>{m.track_title()}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-50">

  <!-- Header -->
  <div class="border-b border-gray-200 bg-white px-4 py-4">
    <div class="mx-auto max-w-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600">
            <span class="text-sm font-bold text-white">CC</span>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900">{m.brand_name()}</p>
            <p class="text-xs text-gray-500">{m.brand_tagline_tracker()}</p>
          </div>
        </div>
        <LanguageToggle />
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
        <p class="mt-1 text-xs text-red-500">{m.track_contact_help()}</p>
      </div>

    {:else if tracker}
      {@const statusInfo = STATUS_CONFIG[tracker.status] ?? STATUS_CONFIG.pending}
      {@const job = tracker.jobs}
      {@const StatusIcon = statusInfo.Icon}

      <!-- Status card — ✅ renders Lucide component, not a string -->
      <div class="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div class="flex justify-center">
          <StatusIcon class="h-12 w-12 {statusInfo.iconColor}" />
        </div>
        <p class="mt-3 text-xl font-bold {statusInfo.color}">{statusInfo.label}</p>
        {#if tracker.crew_updated_at && tracker.status === 'on_the_way'}
          <p class="mt-1 text-xs text-gray-400">
            {m.track_location_updated({ time_ago: timeAgo(tracker.crew_updated_at) })}
          </p>
        {/if}
        {#if tracker.status === 'completed'}
          <p class="mt-2 text-sm text-gray-500">{m.track_thank_you()}</p>
        {/if}
      </div>

      <!-- Job details -->
      {#if job}
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <h2 class="mb-3 text-sm font-semibold text-gray-700">{m.your_service()}</h2>
          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2 text-gray-700">
              <CheckCircle class="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{job.service_type}</span>
            </div>
            {#if job.customers?.address}
              <div class="flex items-start gap-2 text-gray-700">
                <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span>{job.customers.address}</span>
              </div>
            {/if}
            <div class="flex items-center gap-2 text-gray-700">
              <Clock class="h-4 w-4 shrink-0 text-gray-400" />
              <!-- ✅ formatDate() uses .slice(0,10) — no more Invalid Date -->
              <span>{formatDate(job.scheduled_date)}</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Map — only shown when crew is moving or has arrived -->
      {#if tracker.status === 'on_the_way' || tracker.status === 'arrived'}
        <div class="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <div class="border-b border-gray-100 bg-white px-4 py-2.5">
            <p class="text-xs font-semibold text-gray-600">
              {tracker.status === 'on_the_way' ? m.track_live_location() : m.track_crew_at_location()}
            </p>
          </div>
          <div bind:this={mapEl} class="h-64 w-full bg-gray-100"></div>
        </div>
      {/if}

      <!-- Progress steps -->
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center justify-between">
          {#each STEPS as step, i}
            {@const stepKeys = ['pending','on_the_way','arrived','completed']}
            {@const currentIdx = stepKeys.indexOf(tracker.status)}
            {@const stepIdx = stepKeys.indexOf(step.key)}
            {@const done = stepIdx <= currentIdx}
            <div class="flex flex-1 flex-col items-center">
              <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors
                {done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-200 bg-white'}">
                {#if done}
                  <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                  </svg>
                {:else}
                  <span class="text-xs text-gray-400">{i + 1}</span>
                {/if}
              </div>
              <p class="mt-1.5 text-center text-xs {done ? 'font-semibold text-emerald-700' : 'text-gray-400'}">
                {step.label}
              </p>
            </div>
            {#if i < 3}
              <div class="mb-4 h-0.5 flex-1 transition-colors
                {stepIdx < currentIdx ? 'bg-emerald-500' : 'bg-gray-200'}"></div>
            {/if}
          {/each}
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center">
        <p class="text-xs text-gray-400">
          {m.questions_call()}
          <a href="tel:8668732789" class="font-medium text-emerald-600">{m.contact_phone()}</a>
        </p>
        <p class="mt-1 text-xs text-gray-300">{m.track_page_refreshes()}</p>
      </div>

    {/if}
  </div>
</div>
<script lang="ts">
  // src/routes/(public)/route/[token]/+page.svelte
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import Clock from 'lucide-svelte/icons/clock';
  import Phone from 'lucide-svelte/icons/phone';
  import Navigation from 'lucide-svelte/icons/navigation';
  import CheckCircle from 'lucide-svelte/icons/check-circle';
  import Circle from 'lucide-svelte/icons/circle';

  type Stop = {
    jobId: string;
    order: number;
    customerName: string;
    address: string;
    serviceType: string;
    estimatedMinutes: number;
    arrivalTime: string;
    driveMinutesFromPrev: number;
    driveDistanceMiles: number;
    notes: string | null;
    lat: number | null;
    lng: number | null;
  };

  let plan        = $state<any>(null);
  let crew        = $state<any>(null);
  let stops       = $state<Stop[]>([]);
  let completed   = $state<Set<string>>(new Set());
  let loading     = $state(true);
  let notFound    = $state(false);

  onMount(async () => {
    const token = $page.params.token;

    const { data: routePlan } = await supabase
      .from('route_plans')
      .select(`*, crews(name, color, members)`)
      .eq('share_token', token)
      .single();

    if (!routePlan) { notFound = true; loading = false; return; }

    plan  = routePlan;
    crew  = Array.isArray(routePlan.crews) ? routePlan.crews[0] : routePlan.crews;
    stops = (routePlan.stops as Stop[]).sort((a, b) => a.order - b.order);

    // Load completed state from localStorage
    try {
      const saved = localStorage.getItem(`route-completed-${routePlan.id}`);
      if (saved) completed = new Set(JSON.parse(saved));
    } catch {}

    loading = false;
  });

  function toggleComplete(jobId: string) {
    const next = new Set(completed);
    if (next.has(jobId)) next.delete(jobId);
    else next.add(jobId);
    completed = next;
    try {
      localStorage.setItem(`route-completed-${plan.id}`, JSON.stringify([...next]));
    } catch {}
  }

  function openInMaps(address: string, lat: number | null, lng: number | null) {
    const dest = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
    // Try to open in native Maps app
    window.open(`https://maps.google.com/?daddr=${dest}`);
  }

  function openFullRoute() {
    const waypoints = stops.map(s =>
      s.lat && s.lng ? `${s.lat},${s.lng}` : encodeURIComponent(s.address)
    );
    const dest = waypoints.pop();
    const origin = waypoints.shift();
    const wp = waypoints.join('|');
    const url = wp
      ? `https://maps.google.com/?saddr=${origin}&daddr=${dest}&waypoints=${wp}`
      : `https://maps.google.com/?saddr=${origin}&daddr=${dest}`;
    window.open(url);
  }

  function formatDate(dateStr: string) {
  return new Date(dateStr.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });
}
</script>

<svelte:head>
  <title>{crew?.name ?? 'Crew'} Route | Cruz Crewz</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-50">

  {#if loading}
    <div class="flex h-screen items-center justify-center">
      <div class="text-center">
        <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        <p class="mt-3 text-sm text-gray-500">Loading route...</p>
      </div>
    </div>

  {:else if notFound}
    <div class="flex h-screen items-center justify-center p-6 text-center">
      <div>
        <p class="text-4xl">🗺️</p>
        <h1 class="mt-4 text-xl font-bold text-gray-900">Route not found</h1>
        <p class="mt-2 text-sm text-gray-500">This link may have expired. Contact your supervisor for an updated route.</p>
      </div>
    </div>

  {:else}
    <!-- Header -->
    <div class="sticky top-0 z-10 shadow-sm" style="background-color: {crew?.color ?? '#16a34a'}">
      <div class="px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-white/70">Cruz Crewz</p>
            <h1 class="text-xl font-bold text-white">{crew?.name ?? 'Route'}</h1>
            <p class="text-sm text-white/80">{formatDate(plan.route_date)}</p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-extrabold text-white">{stops.length}</p>
            <p class="text-xs text-white/70">stops</p>
          </div>
        </div>

        {#if crew?.members?.length > 0}
          <p class="mt-2 text-sm text-white/80">{crew.members.join(' · ')}</p>
        {/if}

        <!-- Progress -->
        <div class="mt-3">
          <div class="flex items-center justify-between text-xs text-white/70 mb-1">
            <span>{completed.size} of {stops.length} completed</span>
            <span>{Math.round((completed.size / stops.length) * 100)}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-white/20">
            <div
              class="h-1.5 rounded-full bg-white transition-all duration-500"
              style="width: {(completed.size / stops.length) * 100}%"
            ></div>
          </div>
        </div>
      </div>

      <!-- Open full route in Maps -->
      <button
        onclick={openFullRoute}
        class="flex w-full items-center justify-center gap-2 border-t border-white/20 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
      >
        <Navigation class="h-4 w-4" />
        Open Full Route in Maps
      </button>
    </div>

    <!-- Weather briefing -->
    {#if plan.weather && plan.weather.rainChance >= 40}
      <div class="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p class="text-sm font-semibold text-amber-800">
          ⚠️ {plan.weather.rainChance}% chance of rain · {plan.weather.tempHigh}°F high
        </p>
        {#if plan.summary}
          <p class="mt-0.5 text-xs text-amber-700">{plan.summary}</p>
        {/if}
      </div>
    {/if}

    <!-- Stops -->
    <div class="space-y-3 p-4">
      {#each stops as stop}
        {@const done = completed.has(stop.jobId)}
        <div class="overflow-hidden rounded-2xl border bg-white shadow-sm transition-all
          {done ? 'border-emerald-200 opacity-75' : 'border-gray-200'}">

          <!-- Drive time from prev -->
          {#if stop.driveMinutesFromPrev > 0}
            <div class="flex items-center gap-2 bg-blue-50 px-4 py-2 text-xs text-blue-700">
              <Navigation class="h-3 w-3" />
              {stop.driveMinutesFromPrev}m drive · {stop.driveDistanceMiles.toFixed(1)} mi
            </div>
          {/if}

          <div class="p-4">
            <div class="flex items-start gap-3">
              <!-- Stop number / complete toggle -->
              <button
                onclick={() => toggleComplete(stop.jobId)}
                class="mt-0.5 shrink-0 transition-transform active:scale-90"
              >
                {#if done}
                  <CheckCircle class="h-6 w-6 text-emerald-500" />
                {:else}
                  <Circle class="h-6 w-6 text-gray-300" />
                {/if}
              </button>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                      style="background-color: {crew?.color ?? '#16a34a'}">
                      {stop.order}
                    </span>
                    <p class="font-semibold text-gray-900 {done ? 'line-through text-gray-400' : ''}">{stop.customerName}</p>
                  </div>
                  <span class="shrink-0 text-sm font-bold text-gray-900">{stop.arrivalTime}</span>
                </div>

                <p class="mt-1 text-sm text-gray-600">{stop.serviceType}</p>
                <p class="text-sm text-gray-500">{stop.address}</p>

                <div class="mt-1 flex items-center gap-3 text-xs text-gray-400">
                  <span class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    ~{stop.estimatedMinutes}m on site
                  </span>
                </div>

                {#if stop.notes}
                  <div class="mt-2 rounded-lg bg-amber-50 px-3 py-2">
                    <p class="text-xs text-amber-800"><strong>Note:</strong> {stop.notes}</p>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Action buttons -->
            <div class="mt-3 flex gap-2">
              <button
                onclick={() => openInMaps(stop.address, stop.lat, stop.lng)}
                class="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
                style="background-color: {crew?.color ?? '#16a34a'}"
              >
                <Navigation class="h-4 w-4" />
                Navigate
              </button>
            </div>
          </div>
        </div>
      {/each}

      <!-- All done state -->
      {#if completed.size === stops.length && stops.length > 0}
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p class="text-3xl">🎉</p>
          <p class="mt-2 font-bold text-emerald-800">All stops completed!</p>
          <p class="mt-1 text-sm text-emerald-600">Great work today, {crew?.name}.</p>
        </div>
      {/if}

      <p class="py-4 text-center text-xs text-gray-400">Cruz Crewz · cruzcrewz.com</p>
    </div>
  {/if}
</div>
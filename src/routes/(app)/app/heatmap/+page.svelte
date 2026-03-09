<script lang="ts">
  // src/routes/(app)/app/heatmap/+page.svelte
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import Loader from 'lucide-svelte/icons/loader';
  import Users from 'lucide-svelte/icons/users';
  import DollarSign from 'lucide-svelte/icons/dollar-sign';
  import MapPin from 'lucide-svelte/icons/map-pin';

  type CustomerPoint = {
    id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
    jobCount: number;
    totalRevenue: number;
  };

  let loading     = $state(true);
  let mode        = $state<'revenue' | 'frequency'>('revenue');
  let points      = $state<CustomerPoint[]>([]);
  let mapEl       = $state<HTMLDivElement | null>(null);
  let map         = $state<any>(null);
  let markers     = $state<any[]>([]);
  let selectedPt  = $state<CustomerPoint | null>(null);
  let totalRevenue = $state(0);
  let totalJobs   = $state(0);
  let error       = $state('');

  // Stats by city/suburb for the sidebar list
  let neighborhoodStats = $derived(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const p of points) {
      if (!p.address) continue;
      const parts = p.address.split(',');
      const city = parts[parts.length - 2]?.trim() ?? 'Unknown';
      if (!map[city]) map[city] = { count: 0, revenue: 0 };
      map[city].count += p.jobCount;
      map[city].revenue += p.totalRevenue;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, d]) => ({ name, ...d }));
  });

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    error = '';

    // Get all customers with their geocoded lat/lng from jobs
    const { data: jobs, error: err } = await supabase
      .from('jobs')
      .select('customer_id, price, status, customers(id, name, address, lat, lng)')
      .neq('status', 'cancelled');

    if (err) { error = 'Failed to load data'; loading = false; return; }

    // Aggregate by customer
    const customerMap: Record<string, CustomerPoint> = {};
    for (const job of jobs ?? []) {
      const c = Array.isArray(job.customers) ? job.customers[0] : job.customers;
      if (!c?.id || !c.lat || !c.lng) continue;
      if (!customerMap[c.id]) {
        customerMap[c.id] = {
          id: c.id,
          name: c.name,
          address: c.address,
          lat: c.lat,
          lng: c.lng,
          jobCount: 0,
          totalRevenue: 0,
        };
      }
      customerMap[c.id].jobCount++;
      if (job.status === 'completed') {
        customerMap[c.id].totalRevenue += job.price ?? 0;
      }
    }

    points = Object.values(customerMap);
    totalRevenue = points.reduce((s, p) => s + p.totalRevenue, 0);
    totalJobs = points.reduce((s, p) => s + p.jobCount, 0);

    loading = false;

    // Init map after data loads
    setTimeout(() => initMap(), 50);
  }

  async function initMap() {
    if (!mapEl || typeof window === 'undefined') return;

    // Load Google Maps if not already loaded
    if (!(window as any).google?.maps) {
      const script = document.createElement('script');
      // Use PUBLIC_GOOGLE_MAPS_API_KEY via a meta tag set in app.html, or inline here
      script.src = `https://maps.googleapis.com/maps/api/js?key=${(window as any).__GOOGLE_MAPS_KEY__ ?? ''}&libraries=visualization`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      await new Promise(res => { script.onload = res; });
    }

    const google = (window as any).google;

    // Chicago center
    const center = { lat: 41.8781, lng: -87.6298 };

    map = new google.maps.Map(mapEl, {
      center,
      zoom: 10,
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    });

    renderMarkers();
  }

  function renderMarkers() {
    if (!map) return;
    const google = (window as any).google;

    // Clear old markers
    for (const m of markers) m.setMap(null);
    markers = [];

    if (points.length === 0) return;

    const maxVal = mode === 'revenue'
      ? Math.max(...points.map(p => p.totalRevenue), 1)
      : Math.max(...points.map(p => p.jobCount), 1);

    for (const pt of points) {
      const val = mode === 'revenue' ? pt.totalRevenue : pt.jobCount;
      const ratio = val / maxVal;

      // Scale: min 12px, max 40px
      const size = 12 + Math.round(ratio * 28);

      // Color: green → yellow → red by density
      const r = Math.round(ratio * 220);
      const g = Math.round((1 - ratio) * 180 + 60);
      const color = `rgb(${r},${g},40)`;

      const marker = new google.maps.Marker({
        position: { lat: pt.lat, lng: pt.lng },
        map,
        title: pt.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: color,
          fillOpacity: 0.75,
          strokeColor: '#fff',
          strokeWeight: 1.5,
        },
      });

      marker.addListener('click', () => {
        selectedPt = pt;
      });

      markers.push(marker);
    }
  }

  // Re-render when mode changes
  $effect(() => {
    mode;
    if (map) renderMarkers();
  });

  function fmt(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
  }
</script>

<svelte:head>
  <script>
    // Expose key for map init — set via PUBLIC_GOOGLE_MAPS_API_KEY
    window.__GOOGLE_MAPS_KEY__ = '';
  </script>
</svelte:head>

<div class="flex h-[calc(100vh-3.5rem)] flex-col">

  <!-- Header bar -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3">
    <div>
      <h1 class="text-lg font-semibold text-gray-900">Customer Heat Map</h1>
      <p class="text-xs text-gray-500">{points.length} mapped customers · {fmt(totalRevenue)} total revenue · {totalJobs} jobs</p>
    </div>

    <!-- Toggle -->
    <div class="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
      <button
        onclick={() => (mode = 'revenue')}
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors
          {mode === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
      >
        <DollarSign class="h-3.5 w-3.5" />
        Revenue
      </button>
      <button
        onclick={() => (mode = 'frequency')}
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors
          {mode === 'frequency' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
      >
        <Users class="h-3.5 w-3.5" />
        Job Frequency
      </button>
    </div>
  </div>

  <div class="flex flex-1 overflow-hidden">

    <!-- Map -->
    <div class="relative flex-1">
      {#if loading}
        <div class="flex h-full items-center justify-center bg-gray-50">
          <div class="text-center">
            <Loader class="mx-auto h-6 w-6 animate-spin text-gray-400" />
            <p class="mt-2 text-sm text-gray-400">Loading customer data...</p>
          </div>
        </div>
      {:else if error}
        <div class="flex h-full items-center justify-center bg-gray-50">
          <p class="text-sm text-red-500">{error}</p>
        </div>
      {:else if points.length === 0}
        <div class="flex h-full flex-col items-center justify-center bg-gray-50 text-center">
          <MapPin class="h-10 w-10 text-gray-300" />
          <p class="mt-3 text-sm font-medium text-gray-500">No mapped customers yet</p>
          <p class="mt-1 text-xs text-gray-400 max-w-xs">Customers need lat/lng coordinates to appear on the map. These are set when a job is created via the quote flow.</p>
        </div>
      {:else}
        <div bind:this={mapEl} class="h-full w-full"></div>

        <!-- Legend -->
        <div class="absolute bottom-6 left-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
          <p class="mb-2 text-xs font-semibold text-gray-700">
            {mode === 'revenue' ? 'Revenue' : 'Job Visits'}
          </p>
          <div class="flex items-center gap-2">
            <div class="h-3 w-3 rounded-full bg-[rgb(0,180,40)] opacity-75"></div>
            <span class="text-xs text-gray-500">Low</span>
            <div class="h-0.5 w-8 bg-gradient-to-r from-[rgb(0,180,40)] to-[rgb(220,60,40)]"></div>
            <div class="h-5 w-5 rounded-full bg-[rgb(220,60,40)] opacity-75"></div>
            <span class="text-xs text-gray-500">High</span>
          </div>
          <p class="mt-1.5 text-xs text-gray-400">Larger = more {mode === 'revenue' ? 'revenue' : 'visits'}</p>
        </div>
      {/if}

      <!-- Selected customer popup -->
      {#if selectedPt}
        <div class="absolute right-4 top-4 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          <div class="flex items-start justify-between">
            <p class="font-semibold text-gray-900">{selectedPt.name}</p>
            <button onclick={() => (selectedPt = null)} class="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
          </div>
          {#if selectedPt.address}
            <p class="mt-1 text-xs text-gray-500">{selectedPt.address}</p>
          {/if}
          <div class="mt-3 grid grid-cols-2 gap-2">
            <div class="rounded-lg bg-gray-50 p-2 text-center">
              <p class="text-lg font-bold text-gray-900">{selectedPt.jobCount}</p>
              <p class="text-xs text-gray-400">jobs</p>
            </div>
            <div class="rounded-lg bg-emerald-50 p-2 text-center">
              <p class="text-lg font-bold text-emerald-700">{fmt(selectedPt.totalRevenue)}</p>
              <p class="text-xs text-gray-400">revenue</p>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Sidebar: top neighborhoods -->
    <div class="hidden w-64 flex-col border-l border-gray-200 bg-white lg:flex overflow-y-auto">
      <div class="border-b border-gray-100 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Top Areas by Revenue</p>
      </div>
      <div class="flex-1 divide-y divide-gray-50">
        {#each neighborhoodStats() as nb, i}
          <div class="px-4 py-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">{i + 1}</span>
                <p class="text-sm font-medium text-gray-900">{nb.name}</p>
              </div>
              <p class="text-sm font-semibold text-gray-900">{fmt(nb.revenue)}</p>
            </div>
            <p class="ml-7 mt-0.5 text-xs text-gray-400">{nb.count} job{nb.count !== 1 ? 's' : ''}</p>
          </div>
        {/each}
        {#if neighborhoodStats().length === 0}
          <div class="px-4 py-8 text-center">
            <p class="text-xs text-gray-400">No neighborhood data yet</p>
          </div>
        {/if}
      </div>
    </div>

  </div>
</div>
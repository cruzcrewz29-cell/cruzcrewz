<script lang="ts">
  // src/routes/(app)/app/routes/+page.svelte
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { toast } from 'svelte-sonner';
  import Plus from 'lucide-svelte/icons/plus';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Zap from 'lucide-svelte/icons/zap';
  import Share2 from 'lucide-svelte/icons/share-2';
  import CloudRain from 'lucide-svelte/icons/cloud-rain';
  import Sun from 'lucide-svelte/icons/sun';
  import Clock from 'lucide-svelte/icons/clock';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import Users from 'lucide-svelte/icons/users';
  import X from 'lucide-svelte/icons/x';
  import GripVertical from 'lucide-svelte/icons/grip-vertical';
  import Loader from 'lucide-svelte/icons/loader';
  import Copy from 'lucide-svelte/icons/copy';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import ChevronUp from 'lucide-svelte/icons/chevron-up';

  const CREW_COLORS = [
    '#16a34a', '#2563eb', '#dc2626', '#d97706',
    '#7c3aed', '#0891b2', '#db2777', '#65a30d',
  ];

  const SERVICE_DURATIONS: Record<string, number> = {
    'Lawn Mowing':              45,
    'Trimming & Edging':        30,
    'Bush, Shrub & Tree Care':  90,
    'Spring & Fall Cleanups':   120,
    'Landscape Maintenance':    60,
    'Lawn Aeration & Overseeding': 120,
  };

  // ── Types ─────────────────────────────────────────────────────────────────
  type Job = {
    id: string;
    service_type: string;
    scheduled_date: string;
    price: number | null;
    status: string;
    notes: string | null;
    customer_phone: string | null;
    customers: { name: string; address: string | null; lat: number | null; lng: number | null } | null;
  };

  type Crew = {
    id: string;
    name: string;
    color: string;
    members: string[];
    active: boolean;
  };

  type AssignedJob = Job & { estimatedMinutes: number };

  type CrewAssignment = {
    crew: Crew;
    jobs: AssignedJob[];
  };

  type OptimizedStop = {
    jobId: string;
    address: string;
    customerName: string;
    serviceType: string;
    estimatedMinutes: number;
    lat: number | null;
    lng: number | null;
    notes: string | null;
    order: number;
    driveMinutesFromPrev: number;
    driveDistanceMiles: number;
    arrivalTime: string;
  };

  type OptimizedCrew = {
    crewId: string;
    crewName: string;
    color: string;
    stops: OptimizedStop[];
    summary: string;
    totalDriveMinutes: number;
    totalJobMinutes: number;
    startTime: string;
  };

  // ── State ─────────────────────────────────────────────────────────────────
  let selectedDate   = $state(todayString());
  let allJobs        = $state<Job[]>([]);
  let unassignedJobs = $state<Job[]>([]);
  let assignments    = $state<CrewAssignment[]>([]);
  let savedCrews     = $state<Crew[]>([]);
  let weather        = $state<any>(null);
  let loading        = $state(false);
  let optimizing     = $state(false);
  let optimizedResult = $state<OptimizedCrew[] | null>(null);
  let weatherBriefing = $state('');
  let weatherWarnings = $state<string[]>([]);
  let startTime      = $state('8:00 AM');
  let shareLinks     = $state<Record<string, string>>({});

  // New crew form
  let showNewCrew    = $state(false);
  let newCrewName    = $state('');
  let newCrewMembers = $state('');
  let newCrewColor   = $state(CREW_COLORS[0]);

  // Drag state
  let draggingJobId  = $state<string | null>(null);
  let dragOverCrewId = $state<string | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  onMount(async () => {
    await Promise.all([loadCrews(), loadJobs()]);
  });

  async function loadCrews() {
    const { data } = await supabase
      .from('crews')
      .select('*')
      .eq('active', true)
      .order('created_at');
    savedCrews = data ?? [];
  }

  async function loadJobs() {
    loading = true;
    const { data } = await supabase
      .from('jobs')
      .select(`
        id, service_type, scheduled_date, price, status, notes, customer_phone,
        customers ( name, address )
      `)
      .eq('scheduled_date', selectedDate)
      .not('status', 'in', '("completed","cancelled")');

    allJobs = (data ?? []).map(j => ({
      ...j,
      customers: Array.isArray(j.customers) ? j.customers[0] : j.customers,
    }));

    // Reset assignments, put all jobs in unassigned
    unassignedJobs = [...allJobs];
    assignments = assignments.map(a => ({ ...a, jobs: [] }));
    optimizedResult = null;

    // Fetch weather for Chicago area
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
        latitude:  '41.8781',
        longitude: '-87.6298',
        daily:     'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode',
        temperature_unit: 'fahrenheit',
        timezone:  'America/Chicago',
        forecast_days: '7',
      }));
      const wData = await res.json();
      const dates: string[] = wData.daily.time;
      const idx = dates.indexOf(selectedDate);
      if (idx !== -1) {
        const code = wData.daily.weathercode[idx];
        weather = {
          condition: code >= 95 ? 'stormy' : code >= 51 ? 'rainy' : code >= 1 ? 'cloudy' : 'clear',
          tempHigh:  Math.round(wData.daily.temperature_2m_max[idx]),
          tempLow:   Math.round(wData.daily.temperature_2m_min[idx]),
          rainChance: wData.daily.precipitation_probability_max[idx] ?? 0,
          rainNote:  null,
        };
      }
    } catch {}

    loading = false;
  }

  // ── Crew management ───────────────────────────────────────────────────────
  async function saveCrew() {
    if (!newCrewName.trim()) return;
    const members = newCrewMembers.split(',').map(m => m.trim()).filter(Boolean);
    const { data, error } = await supabase
      .from('crews')
      .insert({ name: newCrewName.trim(), color: newCrewColor, members })
      .select()
      .single();
    if (error) { toast.error('Failed to save crew'); return; }
    savedCrews = [...savedCrews, data];
    showNewCrew = false;
    newCrewName = ''; newCrewMembers = ''; newCrewColor = CREW_COLORS[0];
    toast.success('Crew saved');
  }

  function addCrewToDay(crew: Crew) {
    if (assignments.find(a => a.crew.id === crew.id)) return;
    assignments = [...assignments, { crew, jobs: [] }];
  }

  function removeCrewFromDay(crewId: string) {
    const assignment = assignments.find(a => a.crew.id === crewId);
    if (assignment) {
      unassignedJobs = [...unassignedJobs, ...assignment.jobs];
    }
    assignments = assignments.filter(a => a.crew.id !== crewId);
  }

  // ── Drag & drop job assignment ─────────────────────────────────────────────
  function onDragStart(jobId: string) {
    draggingJobId = jobId;
  }

  function onDragOver(e: DragEvent, crewId: string) {
    e.preventDefault();
    dragOverCrewId = crewId;
  }

  function onDrop(e: DragEvent, crewId: string) {
    e.preventDefault();
    if (!draggingJobId) return;

    const job = allJobs.find(j => j.id === draggingJobId);
    if (!job) { draggingJobId = null; dragOverCrewId = null; return; }

    const assigned: AssignedJob = {
      ...job,
      estimatedMinutes: SERVICE_DURATIONS[job.service_type] ?? 60,
    };

    // Remove from unassigned
    unassignedJobs = unassignedJobs.filter(j => j.id !== draggingJobId);

    // Remove from any existing crew assignment
    assignments = assignments.map(a => ({
      ...a,
      jobs: a.jobs.filter(j => j.id !== draggingJobId),
    }));

    // Add to target crew
    assignments = assignments.map(a =>
      a.crew.id === crewId ? { ...a, jobs: [...a.jobs, assigned] } : a
    );

    draggingJobId = null;
    dragOverCrewId = null;
    optimizedResult = null;
  }

  function onDropUnassigned(e: DragEvent) {
    e.preventDefault();
    if (!draggingJobId) return;
    const job = allJobs.find(j => j.id === draggingJobId);
    if (!job) return;

    assignments = assignments.map(a => ({
      ...a,
      jobs: a.jobs.filter(j => j.id !== draggingJobId),
    }));

    if (!unassignedJobs.find(j => j.id === job.id)) {
      unassignedJobs = [...unassignedJobs, job];
    }

    draggingJobId = null;
    dragOverCrewId = null;
    optimizedResult = null;
  }

  function unassignJob(jobId: string, crewId: string) {
    const job = allJobs.find(j => j.id === jobId);
    if (job && !unassignedJobs.find(j => j.id === jobId)) {
      unassignedJobs = [...unassignedJobs, job];
    }
    assignments = assignments.map(a =>
      a.crew.id === crewId ? { ...a, jobs: a.jobs.filter(j => j.id !== jobId) } : a
    );
    optimizedResult = null;
  }

  // ── AI Optimization ───────────────────────────────────────────────────────
  async function optimizeRoutes() {
    const crewsWithJobs = assignments.filter(a => a.jobs.length > 0);
    if (crewsWithJobs.length === 0) {
      toast.error('Assign at least one job to a crew first');
      return;
    }

    optimizing = true;
    try {
      const crewInput = crewsWithJobs.map(a => ({
        crewId:   a.crew.id,
        crewName: a.crew.name,
        color:    a.crew.color,
        stops:    a.jobs.map(j => ({
          jobId:            j.id,
          address:          j.customers?.address ?? 'Unknown address',
          customerName:     j.customers?.name ?? 'Unknown',
          serviceType:      j.service_type,
          estimatedMinutes: j.estimatedMinutes,
          lat:              j.customers?.lat ?? null,
          lng:              j.customers?.lng ?? null,
          notes:            j.notes,
        })),
      }));

      const res = await fetch('/api/optimize-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crews: crewInput, date: selectedDate, weatherData: weather, startTime }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Optimization failed');

      optimizedResult = [...data.result.crews];
console.log('[debug] optimizedResult:', optimizedResult);
console.log('[debug] assignment crew ids:', assignments.map(a => a.crew.id));
console.log('[debug] result crew ids:', data.result.crews.map((c: any) => c.crewId));
      weatherBriefing   = data.result.weatherBriefing;
      weatherWarnings   = data.result.weatherWarnings ?? [];

      // Save route plans to DB and generate share tokens
      for (const crew of data.result.crews) {
      const { data: plan } = await supabase
        .from('route_plans')
        .insert({
            route_date:          selectedDate,
            crew_id:             crew.crewId?.match(/^[0-9a-f-]{36}$/) ? crew.crewId : null,
            stops:               crew.stops,
            summary:             crew.summary,
            weather:             weather,
            total_drive_minutes: crew.totalDriveMinutes,
            status:              'active',
        })
        .select('share_token')
        .single();

        if (plan) {
          shareLinks = { ...shareLinks, [crew.crewId]: `${window.location.origin}/route/${plan.share_token}` };
        }
      }

      toast.success('Routes optimized!');
    } catch (err) {
      console.error('[routes] optimize error:', err);
      toast.error('Optimization failed. Try again.');
    } finally {
      optimizing = false;
    }
  }

  async function copyShareLink(crewId: string) {
    const link = shareLinks[crewId];
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  }

  async function sendRouteText(crewId: string) {
    const link = shareLinks[crewId];
    const crew = optimizedResult?.find(c => c.crewId === crewId);
    if (!link || !crew) return;
    // Open SMS with pre-filled message
    const msg = `Cruz Crewz Route for ${selectedDate} — ${crew.crewName}: ${link}`;
    window.open(`sms:?body=${encodeURIComponent(msg)}`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function todayString() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  }

  function weatherIcon(condition: string) {
    return condition === 'rainy' || condition === 'stormy' ? '🌧️' :
           condition === 'cloudy' ? '⛅' : '☀️';
  }

  function formatMinutes(mins: number) {
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  $effect(() => { loadJobs(); });
</script>

<div class="space-y-6">

  <!-- Page header -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">Route Optimizer</h1>
      <p class="mt-0.5 text-sm text-gray-500">AI-powered daily route planning for your crews</p>
    </div>
    <div class="flex items-center gap-3">
      <input
        type="date"
        bind:value={selectedDate}
        class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
      <select
        bind:value={startTime}
        class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      >
        {#each ['7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM'] as t}
          <option value={t}>{t}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Weather bar -->
  {#if weather}
    <div class="flex items-center gap-4 rounded-xl border px-5 py-3
      {weather.rainChance >= 70 ? 'border-red-200 bg-red-50' :
       weather.rainChance >= 40 ? 'border-amber-200 bg-amber-50' :
       'border-emerald-200 bg-emerald-50'}">
      <span class="text-2xl">{weatherIcon(weather.condition)}</span>
      <div class="flex-1">
        <p class="text-sm font-semibold text-gray-900">
          {weather.tempHigh}°F / {weather.tempLow}°F · {weather.rainChance}% rain
          {#if weather.rainChance >= 70} · <span class="text-red-700">⚠ High rain risk</span>{/if}
        </p>
        {#if weatherBriefing}
          <p class="text-xs text-gray-600 mt-0.5">{weatherBriefing}</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Weather warnings -->
  {#if weatherWarnings.length > 0}
    {#each weatherWarnings as warning}
      <div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <CloudRain class="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <p class="text-sm text-amber-800">{warning}</p>
      </div>
    {/each}
  {/if}

  <div class="grid gap-6 lg:grid-cols-3">

    <!-- ── Left: Unassigned jobs + crew setup ── -->
    <div class="space-y-4">

      <!-- Unassigned jobs -->
      <div
        class="rounded-xl border-2 border-dashed transition-colors
          {dragOverCrewId === 'unassigned' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-white'}"
        ondragover={(e) => { e.preventDefault(); dragOverCrewId = 'unassigned'; }}
        ondragleave={() => { if (dragOverCrewId === 'unassigned') dragOverCrewId = null; }}
        ondrop={onDropUnassigned}
      >
        <div class="border-b border-gray-100 px-4 py-3">
          <p class="text-sm font-semibold text-gray-900">
            Unassigned Jobs
            <span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{unassignedJobs.length}</span>
          </p>
        </div>

        {#if loading}
          <div class="p-6 text-center text-sm text-gray-400">Loading...</div>
        {:else if allJobs.length === 0}
          <div class="p-6 text-center text-sm text-gray-400">No scheduled jobs for this date</div>
        {:else if unassignedJobs.length === 0}
          <div class="p-4 text-center text-sm text-gray-400">All jobs assigned ✓</div>
        {:else}
          <div class="space-y-1 p-2">
            {#each unassignedJobs as job}
              <div
                draggable="true"
                ondragstart={() => onDragStart(job.id)}
                class="flex cursor-grab items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-emerald-200 hover:bg-emerald-50 transition-colors active:cursor-grabbing"
              >
                <GripVertical class="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900">{job.customers?.name ?? 'Unknown'}</p>
                  <p class="truncate text-xs text-gray-500">{job.service_type}</p>
                  {#if job.customers?.address}
                    <p class="truncate text-xs text-gray-400">{job.customers.address}</p>
                  {/if}
                </div>
                <span class="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">
                  {SERVICE_DURATIONS[job.service_type] ?? 60}m
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Saved crews -->
      <div class="rounded-xl border border-gray-200 bg-white">
        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p class="text-sm font-semibold text-gray-900">Crews</p>
          <button
            onclick={() => (showNewCrew = !showNewCrew)}
            class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <Plus class="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {#if showNewCrew}
          <div class="border-b border-gray-100 p-4 space-y-3 bg-gray-50">
            <input
              type="text"
              bind:value={newCrewName}
              placeholder="Crew name (e.g. Crew A)"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="text"
              bind:value={newCrewMembers}
              placeholder="Members (comma separated)"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <div class="flex items-center gap-2">
              <p class="text-xs text-gray-500">Color:</p>
              {#each CREW_COLORS as color}
                <button
                  onclick={() => (newCrewColor = color)}
                  class="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110
                    {newCrewColor === color ? 'border-gray-900 scale-110' : 'border-transparent'}"
                  style="background-color: {color}"
                ></button>
              {/each}
            </div>
            <div class="flex gap-2">
              <button onclick={() => (showNewCrew = false)}
                class="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button onclick={saveCrew}
                class="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                Save Crew
              </button>
            </div>
          </div>
        {/if}

        <div class="divide-y divide-gray-50">
          {#each savedCrews as crew}
            {@const alreadyAdded = assignments.some(a => a.crew.id === crew.id)}
            <div class="flex items-center gap-3 px-4 py-3">
              <div class="h-3 w-3 rounded-full shrink-0" style="background-color: {crew.color}"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{crew.name}</p>
                {#if crew.members.length > 0}
                  <p class="text-xs text-gray-400 truncate">{crew.members.join(', ')}</p>
                {/if}
              </div>
              <button
                onclick={() => alreadyAdded ? removeCrewFromDay(crew.id) : addCrewToDay(crew)}
                class="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors
                  {alreadyAdded
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}"
              >
                {alreadyAdded ? 'Remove' : 'Add to Day'}
              </button>
            </div>
          {/each}
          {#if savedCrews.length === 0}
            <p class="px-4 py-4 text-sm text-gray-400">No crews yet — create one above</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- ── Right: Crew assignment lanes ── -->
    <div class="space-y-4 lg:col-span-2">

      {#if assignments.length === 0}
        <div class="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-center">
          <div>
            <Users class="mx-auto h-8 w-8 text-gray-300" />
            <p class="mt-2 text-sm text-gray-400">Add crews from the left panel to start assigning jobs</p>
          </div>
        </div>
      {:else}
        {#each assignments as assignment}
          {@const optimizedCrew = optimizedResult?.find(c => c.crewId === assignment.crew.id)}
          <div
            class="overflow-hidden rounded-xl border-2 transition-colors
              {dragOverCrewId === assignment.crew.id ? 'border-opacity-100' : 'border-gray-200'}"
            style={dragOverCrewId === assignment.crew.id ? `border-color: ${assignment.crew.color}` : ''}
            ondragover={(e) => onDragOver(e, assignment.crew.id)}
            ondragleave={() => { if (dragOverCrewId === assignment.crew.id) dragOverCrewId = null; }}
            ondrop={(e) => onDrop(e, assignment.crew.id)}
          >
            <!-- Crew header -->
            <div class="flex items-center justify-between px-4 py-3"
              style="background-color: {assignment.crew.color}15; border-bottom: 2px solid {assignment.crew.color}30">
              <div class="flex items-center gap-2.5">
                <div class="h-3.5 w-3.5 rounded-full" style="background-color: {assignment.crew.color}"></div>
                <p class="font-semibold text-gray-900">{assignment.crew.name}</p>
                {#if assignment.crew.members.length > 0}
                  <span class="text-xs text-gray-500">{assignment.crew.members.join(', ')}</span>
                {/if}
                <span class="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {assignment.jobs.length} job{assignment.jobs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onclick={() => removeCrewFromDay(assignment.crew.id)}
                class="rounded-lg p-1.5 text-gray-400 hover:bg-white/50 hover:text-gray-700 transition-colors"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- Optimized result view -->
            {#if optimizedCrew}
              <div class="bg-white">
                <!-- Summary -->
                <div class="border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-sm text-gray-700">{optimizedCrew.summary}</p>
                      <div class="mt-1.5 flex items-center gap-4 text-xs text-gray-500">
                        <span class="flex items-center gap-1">
                          <Clock class="h-3.5 w-3.5" />
                          {formatMinutes(optimizedCrew.totalDriveMinutes)} driving
                        </span>
                        <span class="flex items-center gap-1">
                          <MapPin class="h-3.5 w-3.5" />
                          {formatMinutes(optimizedCrew.totalJobMinutes)} on jobs
                        </span>
                      </div>
                    </div>
                    <!-- Share buttons -->
                    {#if shareLinks[assignment.crew.id]}
                      <div class="flex shrink-0 gap-2">
                        <button
                          onclick={() => copyShareLink(assignment.crew.id)}
                          class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Copy class="h-3.5 w-3.5" />
                          Copy Link
                        </button>
                        <button
                          onclick={() => sendRouteText(assignment.crew.id)}
                          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                          style="background-color: {assignment.crew.color}"
                        >
                          <Share2 class="h-3.5 w-3.5" />
                          Text Crew
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>

                <!-- Ordered stops -->
                <div class="divide-y divide-gray-50">
                  {#each optimizedCrew.stops.sort((a, b) => a.order - b.order) as stop}
                    <div class="flex items-start gap-3 px-4 py-3">
                      <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white mt-0.5"
                        style="background-color: {assignment.crew.color}">
                        {stop.order}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2">
                          <p class="truncate text-sm font-medium text-gray-900">{stop.customerName}</p>
                          <span class="shrink-0 text-xs font-semibold text-gray-900">{stop.arrivalTime}</span>
                        </div>
                        <p class="text-xs text-gray-500">{stop.serviceType} · ~{stop.estimatedMinutes}m</p>
                        <p class="truncate text-xs text-gray-400">{stop.address}</p>
                        {#if stop.driveMinutesFromPrev > 0}
                          <p class="mt-0.5 text-xs text-blue-600">
                            ↑ {stop.driveMinutesFromPrev}m drive · {stop.driveDistanceMiles.toFixed(1)} mi
                          </p>
                        {/if}
                        {#if stop.notes}
                          <p class="mt-0.5 text-xs text-amber-600">Note: {stop.notes}</p>
                        {/if}
                      </div>
                      <a
                        href="https://maps.google.com/?q={encodeURIComponent(stop.address)}"
                        target="_blank"
                        rel="noopener"
                        class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      >
                        <MapPin class="h-4 w-4" />
                      </a>
                    </div>
                  {/each}
                </div>
              </div>

            <!-- Unoptimized job list -->
            {:else}
              <div class="bg-white">
                {#if assignment.jobs.length === 0}
                  <div class="px-4 py-6 text-center text-sm text-gray-400">
                    Drag jobs here to assign to {assignment.crew.name}
                  </div>
                {:else}
                  <div class="divide-y divide-gray-50">
                    {#each assignment.jobs as job}
                      <div class="flex items-center gap-3 px-4 py-3">
                        <div class="h-2 w-2 rounded-full shrink-0" style="background-color: {assignment.crew.color}"></div>
                        <div class="flex-1 min-w-0">
                          <p class="truncate text-sm font-medium text-gray-900">{job.customers?.name ?? 'Unknown'}</p>
                          <p class="text-xs text-gray-500">{job.service_type} · {job.customers?.address ?? 'No address'}</p>
                        </div>
                        <button
                          onclick={() => unassignJob(job.id, assignment.crew.id)}
                          class="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <X class="h-4 w-4" />
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      {/if}

      <!-- Optimize button -->
      {#if assignments.some(a => a.jobs.length > 0)}
        <button
          onclick={optimizeRoutes}
          disabled={optimizing}
          class="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-6 py-4 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60 transition-colors shadow-lg"
        >
          {#if optimizing}
            <Loader class="h-5 w-5 animate-spin" />
            Optimizing routes with AI...
          {:else}
            <Zap class="h-5 w-5 text-emerald-400" />
            Optimize All Routes with AI
          {/if}
        </button>
      {/if}
    </div>
  </div>
</div>
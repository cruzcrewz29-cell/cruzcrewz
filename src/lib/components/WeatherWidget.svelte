<script lang="ts">
  // src/lib/components/WeatherWidget.svelte
  import { onMount } from 'svelte';
  import CloudRain from 'lucide-svelte/icons/cloud-rain';
  import CloudSnow from 'lucide-svelte/icons/cloud-snow';
  import Sun from 'lucide-svelte/icons/sun';
  import Cloud from 'lucide-svelte/icons/cloud';
  import Thermometer from 'lucide-svelte/icons/thermometer';
  import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
  import Loader from 'lucide-svelte/icons/loader';

  type WeatherDay = {
    date: string;
    precipProbability: number;
    tempMin: number;
    tempMax: number;
    weatherCode: number;
  };

  type FlaggedJob = {
    id: string;
    service_type: string;
    scheduled_date: string;
    customers?: { name: string };
    reason: string;
  };

  let { flaggedJobs = [] }: { flaggedJobs: FlaggedJob[] } = $props();

  let forecast = $state<WeatherDay[]>([]);
  let loading  = $state(true);
  let error    = $state('');

  // Chicago center coords — good enough for the metro area
  const LAT = 41.8827;
  const LNG = -87.6233;

  onMount(async () => {
    try {
      const res = await fetch(`/api/weather-forecast?lat=${LAT}&lng=${LNG}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      forecast = data.days;
    } catch {
      error = 'Could not load forecast.';
    } finally {
      loading = false;
    }
  });

  function formatDay(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }

  function isFlagged(day: WeatherDay) {
    return day.precipProbability > 50 || day.tempMin < 35;
  }

  function weatherIcon(code: number) {
    if (code === 0) return 'sun';
    if (code <= 3) return 'cloud';
    if (code <= 67) return 'rain';
    if (code <= 77) return 'snow';
    if (code <= 82) return 'rain';
    return 'rain';
  }

  function precipColor(pct: number) {
    if (pct > 70) return 'text-red-500';
    if (pct > 50) return 'text-amber-500';
    return 'text-gray-400';
  }

  let flaggedDates = $derived(
    new Set(forecast.filter(isFlagged).map(d => d.date))
  );

  let affectedJobs = $derived(
    flaggedJobs.filter(j => flaggedDates.has(j.scheduled_date.slice(0, 10)))
  );
</script>

<div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
    <div class="flex items-center gap-2">
      <CloudRain class="h-4 w-4 text-blue-500" />
      <h2 class="text-sm font-semibold text-gray-900">7-Day Weather</h2>
      <span class="text-xs text-gray-400">Chicago Metro</span>
    </div>
    {#if affectedJobs.length > 0}
      <div class="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1">
        <TriangleAlert class="h-3 w-3 text-amber-500" />
        <span class="text-xs font-semibold text-amber-700">
          {affectedJobs.length} job{affectedJobs.length !== 1 ? 's' : ''} at risk
        </span>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-8">
      <Loader class="h-5 w-5 animate-spin text-gray-300" />
    </div>

  {:else if error}
    <div class="px-5 py-4 text-sm text-gray-400">{error}</div>

  {:else}
    <!-- 7-day strip -->
    <div class="grid grid-cols-7 divide-x divide-gray-100">
      {#each forecast as day}
        {@const flagged = isFlagged(day)}
        {@const icon = weatherIcon(day.weatherCode)}
        <div class="flex flex-col items-center gap-1 px-1 py-3
          {flagged ? 'bg-amber-50' : ''}">
          <span class="text-xs font-semibold {flagged ? 'text-amber-700' : 'text-gray-500'}">
            {formatDay(day.date)}
          </span>

          <!-- Weather icon -->
          <div class="my-1">
            {#if icon === 'sun'}
              <Sun class="h-5 w-5 text-yellow-400" />
            {:else if icon === 'snow'}
              <CloudSnow class="h-5 w-5 text-blue-300" />
            {:else if icon === 'rain'}
              <CloudRain class="h-5 w-5 {flagged ? 'text-amber-500' : 'text-blue-400'}" />
            {:else}
              <Cloud class="h-5 w-5 text-gray-300" />
            {/if}
          </div>

          <!-- Precip -->
          <span class="text-xs font-bold {precipColor(day.precipProbability)}">
            {day.precipProbability}%
          </span>

          <!-- Temp range -->
          <div class="flex items-center gap-0.5">
            {#if day.tempMin < 35}
              <Thermometer class="h-3 w-3 text-blue-400" />
            {/if}
            <span class="text-xs text-gray-500">{Math.round(day.tempMin)}-{Math.round(day.tempMax)}°</span>
          </div>

          {#if flagged}
            <div class="h-1 w-1 rounded-full bg-amber-400"></div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Affected jobs list -->
    {#if affectedJobs.length > 0}
      <div class="border-t border-gray-100 px-5 py-4 space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Jobs Potentially Affected</p>
        {#each affectedJobs as job}
          {@const day = forecast.find(d => d.date === job.scheduled_date.slice(0, 10))}
          <div class="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
            <div>
              <p class="text-sm font-semibold text-gray-900">{job.customers?.name ?? 'Customer'}</p>
              <p class="text-xs text-gray-500">{job.service_type} · {formatDay(job.scheduled_date.slice(0, 10))}</p>
            </div>
            <div class="text-right">
              {#if day}
                {#if day.precipProbability > 50}
                  <div class="flex items-center gap-1 text-amber-600">
                    <CloudRain class="h-3.5 w-3.5" />
                    <span class="text-xs font-semibold">{day.precipProbability}% rain</span>
                  </div>
                {/if}
                {#if day.tempMin < 35}
                  <div class="flex items-center gap-1 text-blue-500">
                    <Thermometer class="h-3.5 w-3.5" />
                    <span class="text-xs font-semibold">Low {Math.round(day.tempMin)}°F</span>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="border-t border-gray-100 px-5 py-3">
        <p class="text-xs text-gray-400">No jobs at weather risk this week.</p>
      </div>
    {/if}
  {/if}
</div>
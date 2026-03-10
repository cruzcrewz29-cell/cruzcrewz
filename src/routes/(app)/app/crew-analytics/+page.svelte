<script lang="ts">
  // src/routes/(app)/app/crew-analytics/+page.svelte
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import TrendingUp from 'lucide-svelte/icons/trending-up';
  import Star from 'lucide-svelte/icons/star';
  import Clock from 'lucide-svelte/icons/clock';
  import Briefcase from 'lucide-svelte/icons/briefcase';
  import Trophy from 'lucide-svelte/icons/trophy';
  import Users from 'lucide-svelte/icons/users';
  import BarChart3 from 'lucide-svelte/icons/bar-chart-3';

  type Score = {
    id: string;
    crew_name: string;
    job_id: string | null;
    jobs_completed: number;
    on_time: boolean;
    customer_rating: number;
    worked_date: string;
  };

  type CrewSummary = {
    name: string;
    totalJobs: number;
    onTimeCount: number;
    onTimePct: number;
    avgRating: number;
    ratings: number[];
    weeklyJobs: Record<string, number>;
    streak: number;
    entries: Score[];
  };

  let scores = $state<Score[]>([]);
  let loading = $state(true);
  let selectedCrew = $state<string | null>(null);
  let timeRange = $state<'30' | '90' | 'all'>('30');

  onMount(async () => {
    await fetchScores();
    loading = false;
  });

  async function fetchScores() {
    const { data } = await supabase
      .from('crew_scores')
      .select('*')
      .order('worked_date', { ascending: false });
    if (data) scores = data as Score[];
  }

  function filteredScores() {
    if (timeRange === 'all') return scores;
    const days = parseInt(timeRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return scores.filter(s => new Date(s.worked_date) >= cutoff);
  }

  function crewSummaries(): CrewSummary[] {
    const fs = filteredScores();
    const map = new Map<string, Score[]>();
    for (const s of fs) {
      if (!map.has(s.crew_name)) map.set(s.crew_name, []);
      map.get(s.crew_name)!.push(s);
    }

    return [...map.entries()].map(([name, entries]) => {
      const totalJobs   = entries.reduce((sum, e) => sum + e.jobs_completed, 0);
      const onTimeCount = entries.filter(e => e.on_time).length;
      const onTimePct   = entries.length ? Math.round((onTimeCount / entries.length) * 100) : 0;
      const ratings     = entries.map(e => e.customer_rating).filter(r => r > 0);
      const avgRating   = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;

      // Weekly jobs
      const weeklyJobs: Record<string, number> = {};
      for (const e of entries) {
        const week = getWeekLabel(e.worked_date);
        weeklyJobs[week] = (weeklyJobs[week] || 0) + e.jobs_completed;
      }

      // Streak — consecutive days worked
      const sortedDates = [...new Set(entries.map(e => e.worked_date))].sort().reverse();
      let streak = 0;
      let prev: Date | null = null;
      for (const d of sortedDates) {
        const cur = new Date(d + 'T12:00:00');
        if (!prev) { streak = 1; prev = cur; continue; }
        const diff = (prev.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24);
        if (diff <= 1) { streak++; prev = cur; } else break;
      }

      return { name, totalJobs, onTimeCount, onTimePct, avgRating, ratings, weeklyJobs, streak, entries };
    }).sort((a, b) => b.totalJobs - a.totalJobs);
  }

  function getWeekLabel(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function topPerformer(): CrewSummary | null {
    const summaries = crewSummaries();
    if (!summaries.length) return null;
    return summaries.reduce((best, c) => {
      const score = c.totalJobs * 10 + c.onTimePct + c.avgRating * 5;
      const bestScore = best.totalJobs * 10 + best.onTimePct + best.avgRating * 5;
      return score > bestScore ? c : best;
    });
  }

  function ratingBar(rating: number) {
    return Math.round((rating / 5) * 100);
  }

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  let summaries = $derived(crewSummaries());
  let top = $derived(topPerformer());
  let selectedSummary = $derived(summaries.find(s => s.name === selectedCrew) ?? null);
  let allCrewNames = $derived([...new Set(scores.map(s => s.crew_name))]);
</script>

<div class="space-y-6">

  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-semibold text-gray-900">Crew Analytics</h1>
      {#if allCrewNames.length > 0}
        <span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {allCrewNames.length} crew member{allCrewNames.length !== 1 ? 's' : ''}
        </span>
      {/if}
    </div>
    <!-- Time range selector -->
    <div class="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
      {#each [['30', '30 days'], ['90', '90 days'], ['all', 'All time']] as [val, label]}
        <button
          onclick={() => timeRange = val as typeof timeRange}
          class="px-3 py-1.5 text-xs font-medium transition-colors
            {timeRange === val ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}"
        >{label}</button>
      {/each}
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-64">
      <p class="text-gray-500">Loading...</p>
    </div>

  {:else if scores.length === 0}
    <!-- Empty state -->
    <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
      <BarChart3 class="h-12 w-12 text-gray-200 mb-4" />
      <p class="text-lg font-semibold text-gray-500">No crew data yet</p>
      <p class="mt-1 text-sm text-gray-400 max-w-sm">Start logging scores on the Leaderboard page and analytics will appear here automatically.</p>
      <a href="/app/leaderboard"
        class="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
        Go to Leaderboard
      </a>
    </div>

  {:else}

    <!-- Top performer banner -->
    {#if top}
      <div class="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Trophy class="h-5 w-5" />
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-amber-100">Top Performer</p>
            <p class="text-xl font-bold">{top.name}</p>
          </div>
          <div class="ml-auto flex gap-6 text-center">
            <div>
              <p class="text-2xl font-extrabold">{top.totalJobs}</p>
              <p class="text-xs text-amber-100">Jobs</p>
            </div>
            <div>
              <p class="text-2xl font-extrabold">{top.onTimePct}%</p>
              <p class="text-xs text-amber-100">On-time</p>
            </div>
            <div>
              <p class="text-2xl font-extrabold">{top.avgRating}</p>
              <p class="text-xs text-amber-100">Avg rating</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Crew summary cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each summaries as crew}
        <button
          onclick={() => selectedCrew = selectedCrew === crew.name ? null : crew.name}
          class="rounded-2xl border bg-white p-5 text-left transition-all hover:shadow-md
            {selectedCrew === crew.name ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-200'}"
        >
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                {crew.name.slice(0, 2).toUpperCase()}
              </div>
              <span class="font-semibold text-gray-900">{crew.name}</span>
            </div>
            {#if crew.streak >= 3}
              <span class="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
                <TrendingUp class="h-3 w-3" />
                {crew.streak} day streak
              </span>
            {/if}
          </div>

          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="rounded-xl bg-gray-50 p-2">
              <div class="flex items-center justify-center gap-1 mb-0.5">
                <Briefcase class="h-3 w-3 text-gray-400" />
              </div>
              <p class="text-xl font-bold text-gray-900">{crew.totalJobs}</p>
              <p class="text-xs text-gray-400">Jobs</p>
            </div>
            <div class="rounded-xl bg-gray-50 p-2">
              <div class="flex items-center justify-center gap-1 mb-0.5">
                <Clock class="h-3 w-3 text-gray-400" />
              </div>
              <p class="text-xl font-bold {crew.onTimePct >= 80 ? 'text-emerald-600' : crew.onTimePct >= 60 ? 'text-amber-600' : 'text-red-500'}">{crew.onTimePct}%</p>
              <p class="text-xs text-gray-400">On-time</p>
            </div>
            <div class="rounded-xl bg-gray-50 p-2">
              <div class="flex items-center justify-center gap-1 mb-0.5">
                <Star class="h-3 w-3 text-gray-400" />
              </div>
              <p class="text-xl font-bold {crew.avgRating >= 4.5 ? 'text-emerald-600' : crew.avgRating >= 3.5 ? 'text-amber-600' : 'text-red-500'}">{crew.avgRating}</p>
              <p class="text-xs text-gray-400">Rating</p>
            </div>
          </div>

          <!-- Rating bar -->
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-400">Rating</span>
              <span class="text-xs font-medium text-gray-600">{crew.avgRating} / 5</span>
            </div>
            <div class="h-1.5 w-full rounded-full bg-gray-100">
              <div
                class="h-1.5 rounded-full transition-all
                  {crew.avgRating >= 4.5 ? 'bg-emerald-500' : crew.avgRating >= 3.5 ? 'bg-amber-500' : 'bg-red-500'}"
                style="width: {ratingBar(crew.avgRating)}%"
              ></div>
            </div>
          </div>
        </button>
      {/each}
    </div>

    <!-- Drill-down for selected crew -->
    {#if selectedSummary}
      <div class="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">{selectedSummary.name} — Detail</h2>
          <button onclick={() => selectedCrew = null} class="text-xs text-gray-400 hover:text-gray-600">Close</button>
        </div>

        <!-- Weekly jobs chart (simple bar) -->
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Jobs by Week</p>
          {#if Object.keys(selectedSummary.weeklyJobs).length > 0}
            {@const maxJobs = Math.max(...Object.values(selectedSummary.weeklyJobs))}
            <div class="flex items-end gap-2 h-24">
              {#each Object.entries(selectedSummary.weeklyJobs).slice(-8) as [week, count]}
                <div class="flex flex-1 flex-col items-center gap-1">
                  <span class="text-xs font-medium text-gray-700">{count}</span>
                  <div
                    class="w-full rounded-t-md bg-gray-900 transition-all"
                    style="height: {maxJobs > 0 ? Math.round((count / maxJobs) * 64) : 4}px; min-height: 4px;"
                  ></div>
                  <span class="text-xs text-gray-400 truncate w-full text-center">{week}</span>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-sm text-gray-400">No weekly data available.</p>
          {/if}
        </div>

        <!-- Recent entries -->
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Recent Entries</p>
          <div class="space-y-2">
            {#each selectedSummary.entries.slice(0, 10) as entry}
              <div class="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span class="text-sm text-gray-600">{formatDate(entry.worked_date)}</span>
                <div class="flex items-center gap-4">
                  <span class="text-sm font-medium text-gray-900">{entry.jobs_completed} job{entry.jobs_completed !== 1 ? 's' : ''}</span>
                  <span class="flex items-center gap-1 text-xs font-medium
                    {entry.on_time ? 'text-emerald-600' : 'text-red-500'}">
                    <Clock class="h-3 w-3" />
                    {entry.on_time ? 'On time' : 'Late'}
                  </span>
                  <span class="flex items-center gap-1 text-xs font-medium text-amber-600">
                    <Star class="h-3 w-3" />
                    {entry.customer_rating}/5
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Comparison table -->
    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <Users class="h-4 w-4 text-gray-400" />
          <h2 class="text-sm font-semibold text-gray-900">Team Comparison</h2>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Crew Member</th>
              <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Jobs</th>
              <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">On-Time %</th>
              <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Avg Rating</th>
              <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Streak</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            {#each summaries as crew, i}
              <tr class="hover:bg-gray-50 transition-colors {i === 0 ? 'bg-amber-50/50' : ''}">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    {#if i === 0}
                      <Trophy class="h-3.5 w-3.5 text-amber-500" />
                    {/if}
                    <span class="font-medium text-gray-900">{crew.name}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-right font-medium text-gray-900">{crew.totalJobs}</td>
                <td class="px-6 py-4 text-right">
                  <span class="font-medium {crew.onTimePct >= 80 ? 'text-emerald-600' : crew.onTimePct >= 60 ? 'text-amber-600' : 'text-red-500'}">
                    {crew.onTimePct}%
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <Star class="h-3 w-3 text-amber-400" />
                    <span class="font-medium text-gray-900">{crew.avgRating}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-right text-gray-500">
                  {crew.streak >= 3 ? `${crew.streak} days` : '—'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  {/if}
</div>
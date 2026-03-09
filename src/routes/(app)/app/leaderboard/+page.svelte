<script lang="ts">
  // src/routes/(app)/app/leaderboard/+page.svelte
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import Loader from 'lucide-svelte/icons/loader';
  import Trophy from 'lucide-svelte/icons/trophy';
  import Star from 'lucide-svelte/icons/star';
  import Flame from 'lucide-svelte/icons/flame';
  import Plus from 'lucide-svelte/icons/plus';
  import X from 'lucide-svelte/icons/x';

  type CrewStat = {
    crew_name: string;
    jobsCompleted: number;
    onTimeCount: number;
    onTimePct: number;
    avgRating: number | null;
    ratingCount: number;
    streak: number;
    points: number;
    rank: number;
  };

  type ScoreRow = {
    crew_name: string;
    jobs_completed: number;
    on_time: boolean;
    customer_rating: number | null;
    worked_date: string;
  };

  let stats        = $state<CrewStat[]>([]);
  let loading      = $state(true);
  let showForm     = $state(false);
  let submitting   = $state(false);

  let form = $state({
    crew_name: '',
    jobs_completed: 1,
    on_time: true,
    customer_rating: null as number | null,
    worked_date: new Date().toISOString().slice(0, 10),
  });

  // Known crews (pulled from existing score entries + any new ones)
  let knownCrews = $state<string[]>([]);

  onMount(loadData);

  async function loadData() {
    loading = true;

    const { data } = await supabase
      .from('crew_scores')
      .select('crew_name, jobs_completed, on_time, customer_rating, worked_date')
      .order('worked_date', { ascending: false });

    const rows: ScoreRow[] = data ?? [];

    // Extract known crew names
    knownCrews = [...new Set(rows.map(r => r.crew_name))].sort();

    // Aggregate per crew
    const map: Record<string, {
      jobs: number; onTime: number; total: number;
      ratings: number[]; dates: string[];
    }> = {};

    for (const r of rows) {
      if (!map[r.crew_name]) map[r.crew_name] = { jobs: 0, onTime: 0, total: 0, ratings: [], dates: [] };
      map[r.crew_name].jobs += r.jobs_completed;
      map[r.crew_name].total++;
      if (r.on_time) map[r.crew_name].onTime++;
      if (r.customer_rating) map[r.crew_name].ratings.push(r.customer_rating);
      map[r.crew_name].dates.push(r.worked_date);
    }

    // Compute streak (consecutive days with at least one entry, counting back from today)
    function calcStreak(dates: string[]): number {
      if (!dates.length) return 0;
      const unique = [...new Set(dates)].sort().reverse();
      let streak = 0;
      let cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      for (const d of unique) {
        const day = new Date(d);
        day.setHours(0, 0, 0, 0);
        const diff = Math.round((cursor.getTime() - day.getTime()) / 86400000);
        if (diff <= 1) { streak++; cursor = day; }
        else break;
      }
      return streak;
    }

    // Points formula: 10 per job + 5 per on-time + 20 per 5-star rating
    const crewStats: CrewStat[] = Object.entries(map).map(([name, d]) => {
      const avgRating = d.ratings.length > 0
        ? Math.round((d.ratings.reduce((s, r) => s + r, 0) / d.ratings.length) * 10) / 10
        : null;
      const onTimePct = d.total > 0 ? Math.round((d.onTime / d.total) * 100) : 0;
      const streak = calcStreak(d.dates);
      const fiveStars = d.ratings.filter(r => r === 5).length;
      const points = d.jobs * 10 + d.onTime * 5 + fiveStars * 20 + streak * 3;
      return { crew_name: name, jobsCompleted: d.jobs, onTimeCount: d.onTime, onTimePct, avgRating, ratingCount: d.ratings.length, streak, points, rank: 0 };
    });

    // Rank by points
    crewStats.sort((a, b) => b.points - a.points);
    crewStats.forEach((s, i) => s.rank = i + 1);

    stats = crewStats;
    loading = false;
  }

  async function submitScore() {
    if (!form.crew_name.trim()) return;
    submitting = true;

    await supabase.from('crew_scores').insert({
      crew_name:       form.crew_name.trim(),
      jobs_completed:  form.jobs_completed,
      on_time:         form.on_time,
      customer_rating: form.customer_rating,
      worked_date:     form.worked_date,
    });

    showForm = false;
    form = { crew_name: '', jobs_completed: 1, on_time: true, customer_rating: null, worked_date: new Date().toISOString().slice(0, 10) };
    submitting = false;
    await loadData();
  }

  function medalColor(rank: number) {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-300';
  }

  function rankBg(rank: number) {
    if (rank === 1) return 'border-yellow-200 bg-yellow-50';
    if (rank === 2) return 'border-gray-200 bg-gray-50';
    if (rank === 3) return 'border-amber-100 bg-amber-50';
    return 'border-gray-200 bg-white';
  }
</script>

<div class="space-y-6">

  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">Crew Leaderboard</h1>
      <p class="mt-0.5 text-sm text-gray-500">Points: 10/job · 5/on-time · 20/five-star · 3/streak day</p>
    </div>
    <button
      onclick={() => (showForm = !showForm)}
      class="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
    >
      <Plus class="h-4 w-4" />
      Log Score
    </button>
  </div>

  <!-- Log score form -->
  {#if showForm}
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-900">Log Crew Score</h3>
        <button onclick={() => (showForm = false)}><X class="h-4 w-4 text-gray-400" /></button>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-700">Crew Name</label>
          {#if knownCrews.length > 0}
            <select bind:value={form.crew_name}
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
              <option value="">Select or type below...</option>
              {#each knownCrews as name}
                <option value={name}>{name}</option>
              {/each}
            </select>
          {:else}
            <input type="text" bind:value={form.crew_name} placeholder="e.g. Team Alpha"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
          {/if}
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Date</label>
          <input type="date" bind:value={form.worked_date}
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Jobs Completed</label>
          <input type="number" bind:value={form.jobs_completed} min="1"
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Customer Rating (optional)</label>
          <select bind:value={form.customer_rating}
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
            <option value={null}>No rating</option>
            <option value={5}>⭐⭐⭐⭐⭐ 5 stars</option>
            <option value={4}>⭐⭐⭐⭐ 4 stars</option>
            <option value={3}>⭐⭐⭐ 3 stars</option>
            <option value={2}>⭐⭐ 2 stars</option>
            <option value={1}>⭐ 1 star</option>
          </select>
        </div>
        <div class="flex items-center gap-3 pt-5">
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" bind:checked={form.on_time} class="rounded" />
            On time
          </label>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button onclick={() => (showForm = false)}
          class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
        <button onclick={submitScore} disabled={submitting || !form.crew_name.trim()}
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? 'Saving...' : 'Save Score'}
        </button>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="flex h-48 items-center justify-center">
      <Loader class="h-5 w-5 animate-spin text-gray-400" />
    </div>

  {:else if stats.length === 0}
    <div class="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
      <Trophy class="mx-auto h-10 w-10 text-gray-300" />
      <p class="mt-3 text-sm font-medium text-gray-500">No scores yet</p>
      <p class="mt-1 text-xs text-gray-400">Log a crew score to start the leaderboard</p>
    </div>

  {:else}
    <!-- Leaderboard -->
    <div class="space-y-3">
      {#each stats as crew}
        <div class="rounded-xl border p-5 transition-all {rankBg(crew.rank)}">
          <div class="flex items-center gap-4">

            <!-- Rank + medal -->
            <div class="flex flex-col items-center w-10 shrink-0">
              <Trophy class="h-5 w-5 {medalColor(crew.rank)}" />
              <span class="text-lg font-black {medalColor(crew.rank)}">{crew.rank}</span>
            </div>

            <!-- Name + stats -->
            <div class="flex-1 min-w-0">
              <p class="text-base font-bold text-gray-900">{crew.crew_name}</p>
              <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span>{crew.jobsCompleted} job{crew.jobsCompleted !== 1 ? 's' : ''}</span>
                <span class="{crew.onTimePct >= 90 ? 'text-emerald-600 font-semibold' : crew.onTimePct >= 70 ? 'text-amber-600' : 'text-red-500'}">
                  {crew.onTimePct}% on-time
                </span>
                {#if crew.avgRating}
                  <span class="flex items-center gap-0.5 text-yellow-600 font-semibold">
                    <Star class="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {crew.avgRating} ({crew.ratingCount})
                  </span>
                {/if}
                {#if crew.streak > 1}
                  <span class="flex items-center gap-0.5 text-orange-600 font-semibold">
                    <Flame class="h-3 w-3" />
                    {crew.streak}-day streak
                  </span>
                {/if}
              </div>
            </div>

            <!-- Points -->
            <div class="text-right shrink-0">
              <p class="text-2xl font-black {crew.rank === 1 ? 'text-yellow-500' : 'text-gray-900'}">{crew.points}</p>
              <p class="text-xs text-gray-400">pts</p>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Points legend -->
    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <p class="text-xs font-semibold text-gray-500 mb-2">How points are earned</p>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs text-gray-600">
        <div class="flex items-center gap-1.5"><span class="text-base">📋</span> 10 pts / job completed</div>
        <div class="flex items-center gap-1.5"><span class="text-base">⏱️</span> 5 pts / on-time arrival</div>
        <div class="flex items-center gap-1.5"><span class="text-base">⭐</span> 20 pts / 5-star rating</div>
        <div class="flex items-center gap-1.5"><span class="text-base">🔥</span> 3 pts / streak day</div>
      </div>
    </div>
  {/if}
</div>
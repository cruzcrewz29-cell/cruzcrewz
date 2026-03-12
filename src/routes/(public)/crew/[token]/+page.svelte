<script lang="ts">
  // src/routes/(public)/crew/[token]/+page.svelte
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import Loader from 'lucide-svelte/icons/loader';
  import Navigation from 'lucide-svelte/icons/navigation';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import CheckCircle from 'lucide-svelte/icons/check-circle';
  import Camera from 'lucide-svelte/icons/camera';
  import Upload from 'lucide-svelte/icons/upload';
  import X from 'lucide-svelte/icons/x';
  import ImageIcon from 'lucide-svelte/icons/image';
  import * as m from '$lib/paraglide/messages';
  import LanguageToggle from '$lib/components/LanguageToggle.svelte';

  const token = $page.params.token;

  type Photo = { url: string; type: 'before' | 'after'; uploaded_at: string; };

  type TrackerRow = {
    id: string;
    job_id: string;
    status: string;
    jobs: {
      id: string;
      service_type: string;
      scheduled_date: string;
      price: number | null;
      photos: Photo[] | null;
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

  // Photo state
  let uploadingBefore = $state(false);
  let uploadingAfter  = $state(false);
  let photos          = $state<Photo[]>([]);
  let photoError      = $state('');

  onMount(async () => {
    const { data, error: err } = await supabase
      .from('tracker_tokens')
      .select(`id, job_id, status, jobs ( id, service_type, scheduled_date, price, photos, customers ( name, address, phone ) )`)
      .eq('token', token)
      .single();

    if (err || !data) {
      error = m.crew_invalid_link();
      loading = false;
      return;
    }

    tracker = {
      ...data,
      jobs: Array.isArray(data.jobs) ? data.jobs[0] : data.jobs,
    } as TrackerRow;

    photos = tracker.jobs?.photos ?? [];
    loading = false;
  });

  onDestroy(() => { stopGPS(); });

  async function setStatus(status: string) {
    if (!tracker) return;
    updating = true;
    await fetch('/api/update-tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, status }),
    });
    tracker = { ...tracker, status };
    if (status === 'on_the_way') startGPS();
    if (status === 'arrived' || status === 'completed') stopGPS();
    updating = false;
  }

  function startGPS() {
    if (!navigator.geolocation) { gpsError = m.crew_gps_unavailable(); return; }
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
      (err) => { gpsError = m.crew_gps_error(); gpsActive = false; },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  function stopGPS() {
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    gpsActive = false;
  }

  function openNav() {
    const address = tracker?.jobs?.customers?.address;
    if (!address) return;
    window.open(`https://maps.google.com/maps?daddr=${encodeURIComponent(address)}`);
  }

  // ── Photo upload ──────────────────────────────────────────────────────────
  async function uploadPhoto(e: Event, type: 'before' | 'after') {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !tracker?.jobs?.id) return;

    if (type === 'before') uploadingBefore = true;
    else uploadingAfter = true;
    photoError = '';

    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${tracker.jobs.id}/${type}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('job-photos')
        .upload(path, file, { upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('job-photos')
        .getPublicUrl(path);

      const newPhoto: Photo = {
        url: urlData.publicUrl,
        type,
        uploaded_at: new Date().toISOString(),
      };

      const updatedPhotos = [...photos, newPhoto];

      const { error: dbErr } = await supabase
        .from('jobs')
        .update({ photos: updatedPhotos })
        .eq('id', tracker.jobs.id);

      if (dbErr) throw dbErr;

      photos = updatedPhotos;
    } catch (err) {
      console.error('[uploadPhoto]', err);
      photoError = m.crew_upload_failed();
    } finally {
      if (type === 'before') uploadingBefore = false;
      else uploadingAfter = false;
      input.value = '';
    }
  }

  function removePhoto(photo: Photo) {
    // Just remove from local state — keep in storage for audit trail
    photos = photos.filter(p => p.url !== photo.url);
    if (tracker?.jobs?.id) {
      supabase.from('jobs').update({ photos }).eq('id', tracker.jobs.id);
    }
  }

  let beforePhotos = $derived(photos.filter(p => p.type === 'before'));
  let afterPhotos  = $derived(photos.filter(p => p.type === 'after'));

  // Show before upload after arrived, after upload after arrived too (can upload both)
  let canUploadBefore = $derived(
    tracker?.status === 'arrived' || tracker?.status === 'completed'
  );
  let canUploadAfter = $derived(
    tracker?.status === 'arrived' || tracker?.status === 'completed'
  );
</script>

<svelte:head>
  <title>{m.crew_title()}</title>
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
        <p class="text-sm font-semibold">{m.brand_name()}</p>
        <p class="text-xs text-gray-400">{m.brand_tagline_crew()}</p>
      </div>
      {#if gpsActive}
        <div class="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-900 px-2.5 py-1">
          <div class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></div>
          <span class="text-xs font-medium text-emerald-400">{m.crew_gps_live()}</span>
        </div>
      {:else}
        <div class="ml-auto">
          <LanguageToggle />
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
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">{m.crew_your_job()}</p>
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
          {m.crew_navigate()}
        </button>
      {/if}

      <!-- Status buttons -->
      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">{m.crew_update_status()}</p>

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
            {tracker.status === 'on_the_way' ? m.crew_on_the_way_active() : m.crew_on_my_way()}
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
            {tracker.status === 'arrived' ? m.crew_arrived_active() : m.crew_arrived()}
          </button>
        {/if}

        <!-- Photo upload — unlocks after arrived -->
        {#if canUploadBefore || canUploadAfter}
          <div class="rounded-2xl border border-gray-700 bg-gray-800 p-4 space-y-4">
            <div class="flex items-center gap-2">
              <Camera class="h-4 w-4 text-gray-400" />
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">{m.crew_job_photos()}</p>
            </div>

            <!-- Before photos -->
            <div class="space-y-2">
              <p class="text-xs font-medium text-gray-300">{m.crew_before()}</p>
              {#if beforePhotos.length > 0}
                <div class="grid grid-cols-3 gap-2">
                  {#each beforePhotos as photo}
                    <div class="relative">
                      <img src={photo.url} alt="Before" class="h-20 w-full rounded-lg object-cover" />
                      <button
                        onclick={() => removePhoto(photo)}
                        class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
              {#if canUploadBefore}
                <label class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-600 py-3 text-sm font-medium text-gray-400 hover:border-gray-400 hover:text-gray-300 transition-colors">
                  {#if uploadingBefore}
                    <Loader class="h-4 w-4 animate-spin" />
                    {m.crew_uploading()}
                  {:else}
                    <Upload class="h-4 w-4" />
                    {m.crew_add_before_photo()}
                  {/if}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    class="hidden"
                    onchange={(e) => uploadPhoto(e, 'before')}
                    disabled={uploadingBefore}
                  />
                </label>
              {/if}
            </div>

            <!-- After photos -->
            <div class="space-y-2">
              <p class="text-xs font-medium text-gray-300">{m.crew_after()}</p>
              {#if afterPhotos.length > 0}
                <div class="grid grid-cols-3 gap-2">
                  {#each afterPhotos as photo}
                    <div class="relative">
                      <img src={photo.url} alt="After" class="h-20 w-full rounded-lg object-cover" />
                      <button
                        onclick={() => removePhoto(photo)}
                        class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
              {#if canUploadAfter}
                <label class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-600 py-3 text-sm font-medium text-gray-400 hover:border-gray-400 hover:text-gray-300 transition-colors">
                  {#if uploadingAfter}
                    <Loader class="h-4 w-4 animate-spin" />
                    {m.crew_uploading()}
                  {:else}
                    <Upload class="h-4 w-4" />
                    {m.crew_add_after_photo()}
                  {/if}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    class="hidden"
                    onchange={(e) => uploadPhoto(e, 'after')}
                    disabled={uploadingAfter}
                  />
                </label>
              {/if}
            </div>

            {#if photoError}
              <p class="text-xs text-red-400">{photoError}</p>
            {/if}
          </div>
        {/if}

        {#if tracker.status === 'arrived'}
          <button
            onclick={() => setStatus('completed')}
            disabled={updating}
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-4 text-base font-bold text-gray-900 hover:bg-white transition-colors"
          >
            {#if updating}<Loader class="h-4 w-4 animate-spin text-gray-700" />{/if}
            {m.crew_mark_complete()}
          </button>
        {/if}

        {#if tracker.status === 'completed'}
          <div class="flex flex-col items-center rounded-xl border border-emerald-700 bg-emerald-900/20 py-8 text-center">
            <CheckCircle class="h-10 w-10 text-emerald-400" />
            <p class="mt-2 text-lg font-bold text-emerald-400">{m.crew_job_complete()}</p>
            <p class="mt-1 text-xs text-gray-400">{m.crew_job_complete_sub()}</p>
            {#if photos.length > 0}
              <p class="mt-1 text-xs text-gray-400">
                {photos.length !== 1
                  ? m.crew_photos_uploaded_plural({ n: photos.length })
                  : m.crew_photos_uploaded({ n: photos.length })}
              </p>
            {/if}
          </div>
        {/if}
      </div>

      <!-- GPS status -->
      {#if gpsActive}
        <div class="rounded-xl border border-emerald-800 bg-emerald-900/20 px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></div>
            <p class="text-xs font-medium text-emerald-400">{m.crew_sharing_location()}</p>
          </div>
          {#if lastPing}
            <p class="mt-1 text-xs text-gray-500">{m.crew_last_update({ time: lastPing })}</p>
          {/if}
          <button onclick={stopGPS} class="mt-2 text-xs text-gray-500 underline">{m.crew_stop_sharing()}</button>
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
          <p class="text-xs text-gray-400">{m.crew_customer_contact()}</p>
          <a href="tel:{customer.phone}" class="mt-0.5 block text-sm font-medium text-blue-400">{customer.phone}</a>
        </div>
      {/if}

    {/if}
  </div>
</div>
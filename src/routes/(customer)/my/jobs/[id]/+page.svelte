<script lang="ts">
  // src/routes/(customer)/my/jobs/[id]/+page.svelte
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Loader from 'lucide-svelte/icons/loader';
  import Calendar from 'lucide-svelte/icons/calendar';
  import CheckCircle from 'lucide-svelte/icons/check-circle';
  import ArrowLeft from 'lucide-svelte/icons/arrow-left';
  import FileText from 'lucide-svelte/icons/file-text';
  import RefreshCw from 'lucide-svelte/icons/refresh-cw';
  import Camera from 'lucide-svelte/icons/camera';
  import X from 'lucide-svelte/icons/x';

  type Photo = { url: string; type: 'before' | 'after'; uploaded_at: string; };

  type Job = {
    id: string;
    service_type: string;
    status: string;
    scheduled_date: string;
    price: number | null;
    description: string | null;
    invoice_number: string | null;
    invoice_sent: boolean;
    reschedule_requested: boolean;
    reschedule_note: string | null;
    photos: Photo[] | null;
  };

  let job         = $state<Job | null>(null);
  let loading     = $state(true);
  let error       = $state('');
  let token       = $state('');

  // Reschedule
  let showReschedule   = $state(false);
  let rescheduleNote   = $state('');
  let submittingReschedule = $state(false);

  // Lightbox
  let showLightbox   = $state(false);
  let lightboxIndex  = $state(0);
  let lightboxPhotos = $derived(job?.photos ?? []);
  let lightboxPhoto  = $derived(lightboxPhotos[lightboxIndex] ?? null);

  onMount(async () => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) localStorage.setItem('cruzcrewz_customer_token', urlToken);
    token = localStorage.getItem('cruzcrewz_customer_token') ?? '';

    if (!token) { window.location.href = '/my'; return; }

    try {
      const res = await fetch(`/api/customer-portal?token=${token}&jobId=${window.location.pathname.split('/').pop()}`);
      const data = await res.json();
      if (!res.ok || !data.job) {
        error = 'Job not found.';
        loading = false;
        return;
      }
      job = data.job;
    } catch {
      error = 'Failed to load job details.';
    } finally {
      loading = false;
    }
  });

  function handleLightboxKey(e: KeyboardEvent) {
    if (!showLightbox) return;
    if (e.key === 'ArrowLeft')  lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    if (e.key === 'ArrowRight') lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
    if (e.key === 'Escape')     showLightbox = false;
  }

  async function submitReschedule() {
    if (!rescheduleNote.trim()) {
      toast.error('Please describe when you would like to reschedule.');
      return;
    }
    submittingReschedule = true;
    try {
      const res = await fetch('/api/reschedule-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, jobId: job!.id, note: rescheduleNote }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      toast.success('Reschedule request sent! We\'ll be in touch shortly.');
      job = { ...job!, reschedule_requested: true, reschedule_note: rescheduleNote };
      showReschedule = false;
    } catch {
      toast.error('Failed to send request. Please try again.');
    } finally {
      submittingReschedule = false;
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending:     { label: 'Pending',     color: 'bg-gray-100 text-gray-600' },
    scheduled:   { label: 'Scheduled',   color: 'bg-blue-50 text-blue-700' },
    in_progress: { label: 'In Progress', color: 'bg-yellow-50 text-yellow-700' },
    completed:   { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700' },
    cancelled:   { label: 'Cancelled',   color: 'bg-red-50 text-red-600' },
  };

  let beforePhotos = $derived((job?.photos ?? []).filter(p => p.type === 'before'));
  let afterPhotos  = $derived((job?.photos ?? []).filter(p => p.type === 'after'));
  let canReschedule = $derived(
    job?.status === 'scheduled' || job?.status === 'pending'
  );
</script>

<svelte:head>
  <title>Job Details | Cruz Crewz</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<svelte:window onkeydown={handleLightboxKey} />

<div class="min-h-screen bg-gray-50">

  <!-- Header -->
  <div class="border-b border-gray-200 bg-white">
    <div class="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
      <a href="/my/dashboard" class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft class="h-4 w-4" />
        Back
      </a>
      <span class="text-gray-200">|</span>
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
          <span class="text-xs font-extrabold text-white">CC</span>
        </div>
        <span class="text-sm font-semibold text-gray-700">Cruz Crewz</span>
      </div>
    </div>
  </div>

  <div class="mx-auto max-w-2xl px-4 py-6 space-y-4">

    {#if loading}
      <div class="flex h-48 items-center justify-center">
        <Loader class="h-6 w-6 animate-spin text-gray-400" />
      </div>

    {:else if error || !job}
      <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p class="text-sm text-red-600">{error || 'Job not found.'}</p>
        <a href="/my/dashboard" class="mt-3 inline-block text-xs text-emerald-600 underline">Back to dashboard</a>
      </div>

    {:else}
      {@const cfg = statusConfig[job.status] ?? statusConfig.pending}

      <!-- Job header card -->
      <div class="rounded-2xl border border-gray-200 bg-white p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Service</p>
            <p class="mt-1 text-xl font-bold text-gray-900">{job.service_type}</p>
          </div>
          <span class="rounded-full px-3 py-1 text-xs font-semibold {cfg.color}">{cfg.label}</span>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-4">
          <div class="rounded-xl bg-gray-50 p-3">
            <p class="text-xs text-gray-400">Scheduled</p>
            <p class="mt-0.5 text-sm font-semibold text-gray-900">{formatDate(job.scheduled_date)}</p>
          </div>
          {#if job.price}
            <div class="rounded-xl bg-gray-50 p-3">
              <p class="text-xs text-gray-400">Price</p>
              <p class="mt-0.5 text-sm font-semibold text-gray-900">{formatCurrency(job.price)}</p>
            </div>
          {/if}
        </div>

        {#if job.description}
          <div class="mt-3 rounded-xl bg-gray-50 p-3">
            <p class="text-xs text-gray-400">Notes</p>
            <p class="mt-0.5 text-sm text-gray-700">{job.description}</p>
          </div>
        {/if}
      </div>

      <!-- Invoice -->
      {#if job.invoice_sent && job.invoice_number}
        <div class="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div class="flex items-center gap-2">
            <FileText class="h-4 w-4 text-emerald-600" />
            <div>
              <p class="text-sm font-semibold text-emerald-900">Invoice sent</p>
              <p class="text-xs text-emerald-600">{job.invoice_number}</p>
            </div>
          </div>
          <CheckCircle class="h-4 w-4 text-emerald-500" />
        </div>
      {/if}

      <!-- Reschedule request -->
      {#if job.reschedule_requested}
        <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div class="flex items-center gap-2">
            <RefreshCw class="h-4 w-4 text-amber-600" />
            <p class="text-sm font-semibold text-amber-900">Reschedule requested</p>
          </div>
          {#if job.reschedule_note}
            <p class="mt-1 text-xs text-amber-700 ml-6">{job.reschedule_note}</p>
          {/if}
          <p class="mt-1 text-xs text-amber-600 ml-6">We'll contact you to confirm a new date.</p>
        </div>
      {:else if canReschedule}
        <button
          onclick={() => showReschedule = true}
          class="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw class="h-4 w-4" />
          Request Reschedule
        </button>
      {/if}

      <!-- Photos -->
      {#if beforePhotos.length > 0 || afterPhotos.length > 0}
        <div class="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div class="flex items-center gap-2">
            <Camera class="h-4 w-4 text-gray-400" />
            <p class="text-sm font-semibold text-gray-900">Job Photos</p>
          </div>

          {#if beforePhotos.length > 0}
            <div>
              <p class="text-xs font-medium text-gray-500 mb-2">Before</p>
              <div class="grid grid-cols-3 gap-2">
                {#each beforePhotos as photo, i}
                  <button
                    onclick={() => { lightboxIndex = (job?.photos ?? []).indexOf(photo); showLightbox = true; }}
                    class="relative overflow-hidden rounded-xl"
                  >
                    <img src={photo.url} alt="Before" class="h-24 w-full object-cover hover:opacity-90 transition-opacity" />
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          {#if afterPhotos.length > 0}
            <div>
              <p class="text-xs font-medium text-gray-500 mb-2">After</p>
              <div class="grid grid-cols-3 gap-2">
                {#each afterPhotos as photo, i}
                  <button
                    onclick={() => { lightboxIndex = (job?.photos ?? []).indexOf(photo); showLightbox = true; }}
                    class="relative overflow-hidden rounded-xl"
                  >
                    <img src={photo.url} alt="After" class="h-24 w-full object-cover hover:opacity-90 transition-opacity" />
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- CTA -->
      <div class="rounded-xl border border-gray-100 bg-white px-4 py-4 text-center">
        <p class="text-xs text-gray-400">Questions about this service?</p>
        <a href="tel:+13125550100" class="mt-1 inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700">
          Call or text us
        </a>
      </div>

    {/if}
  </div>
</div>

<!-- Reschedule modal -->
{#if showReschedule && job}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => showReschedule = false}>
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-gray-900">Request Reschedule</h2>
        <button onclick={() => showReschedule = false} class="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <X class="h-4 w-4" />
        </button>
      </div>
      <p class="text-sm text-gray-500 mb-4">Let us know when works better for you and we'll get back to you to confirm.</p>
      <textarea
        bind:value={rescheduleNote}
        rows="3"
        placeholder="e.g. Any day next week works, preferably morning..."
        class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
      ></textarea>
      <div class="mt-4 flex gap-3">
        <button onclick={() => showReschedule = false}
          class="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onclick={submitReschedule} disabled={submittingReschedule}
          class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {submittingReschedule ? 'Sending...' : 'Send Request'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Photo lightbox -->
{#if showLightbox && lightboxPhoto}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onclick={() => showLightbox = false}>
    <div class="relative max-w-lg w-full" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between mb-3">
        <span class="rounded-full px-3 py-1 text-xs font-bold
          {lightboxPhoto.type === 'before' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}">
          {lightboxPhoto.type === 'before' ? 'Before' : 'After'}
        </span>
        <button onclick={() => showLightbox = false} class="rounded-lg p-2 text-gray-400 hover:text-white">
          <X class="h-5 w-5" />
        </button>
      </div>
      <img src={lightboxPhoto.url} alt={lightboxPhoto.type} class="w-full rounded-xl object-contain max-h-[70vh]" />
      {#if lightboxPhotos.length > 1}
        <div class="flex justify-center gap-2 mt-3">
          {#each lightboxPhotos as photo, i}
            <button onclick={() => lightboxIndex = i}>
              <img src={photo.url} alt={photo.type}
                class="h-10 w-10 rounded-lg object-cover transition-all
                  {i === lightboxIndex ? 'ring-2 ring-white opacity-100' : 'opacity-40 hover:opacity-70'}" />
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
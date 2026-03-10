<script lang="ts">
  // src/routes/(app)/app/conquest/[jobId]/+page.svelte
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';
  import Loader from 'lucide-svelte/icons/loader';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import Copy from 'lucide-svelte/icons/copy';
  import Printer from 'lucide-svelte/icons/printer';
  import Crosshair from 'lucide-svelte/icons/crosshair';

  type ConquestData = {
    nearbyAddresses: string[];
    quoteUrl: string;
    flyerUrl: string;
    jobAddress: string;
    customerName: string;
    serviceType: string;
  };

  let jobId     = $derived($page.params.jobId);
  let loading   = $state(true);
  let error     = $state('');
  let data      = $state<ConquestData | null>(null);
  let copied    = $state(false);

  onMount(async () => {
    try {
      const res = await fetch('/api/generate-conquest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Failed');
      data = result;
    } catch (e: any) {
      error = e.message ?? 'Failed to generate conquest data';
    } finally {
      loading = false;
    }
  });

  async function copyQuoteLink() {
    if (!data?.quoteUrl) return;
    await navigator.clipboard.writeText(data.quoteUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
    toast.success('Quote link copied!');
  }

  function printFlyer() {
    window.print();
  }
</script>

<svelte:head>
  <style>
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }
    }
  </style>
</svelte:head>

<div class="space-y-6 no-print">
  <div class="flex items-center gap-3">
    <Crosshair class="h-5 w-5 text-emerald-600" />
    <h1 class="text-2xl font-semibold text-gray-900">Neighborhood Conquest</h1>
  </div>

  {#if loading}
    <div class="flex h-64 items-center justify-center">
      <Loader class="h-6 w-6 animate-spin text-gray-400" />
    </div>

  {:else if error}
    <div class="rounded-xl border border-red-200 bg-red-50 p-6">
      <p class="text-sm text-red-600">{error}</p>
      <p class="mt-1 text-xs text-gray-500">Make sure this job has a customer with a geocoded address.</p>
    </div>

  {:else if data}
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">

      <!-- Left: nearby addresses -->
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="border-b border-gray-100 px-5 py-4">
          <h2 class="text-sm font-semibold text-gray-900">Nearby Addresses</h2>
          <p class="text-xs text-gray-400 mt-0.5">Drop flyers at these homes after completing the job</p>
        </div>
        <div class="divide-y divide-gray-50">
          {#each data.nearbyAddresses as address, i}
            <div class="flex items-center gap-3 px-5 py-3">
              <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <span class="text-xs font-bold text-emerald-700">{i + 1}</span>
              </div>
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <MapPin class="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span class="text-sm text-gray-700 truncate">{address}</span>
              </div>
            </div>
          {/each}
        </div>
        <div class="border-t border-gray-100 px-5 py-3 flex items-center gap-2">
          <button
            onclick={copyQuoteLink}
            class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Copy class="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy quote link'}
          </button>
          <button
            onclick={printFlyer}
            class="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <Printer class="h-3.5 w-3.5" />
            Print Flyer
          </button>
        </div>
      </div>

      <!-- Right: printable flyer preview -->
      <div class="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Flyer Preview</p>

        <!-- Flyer content -->
        <div id="conquest-flyer" class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <!-- Header -->
          <div class="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600">
              <span class="text-lg font-extrabold text-white">CC</span>
            </div>
            <div>
              <p class="text-lg font-extrabold text-gray-900">Cruz Crewz</p>
              <p class="text-xs text-gray-500">Professional Lawn Care</p>
            </div>
          </div>

          <!-- Neighborhood callout -->
          <div class="rounded-xl bg-emerald-50 px-4 py-3">
            <p class="text-sm font-bold text-emerald-800">We just finished a job in your neighborhood!</p>
            {#if data.customerName}
              <p class="text-xs text-emerald-600 mt-1">Your neighbor at {data.jobAddress} hired us for {data.serviceType}.</p>
            {/if}
          </div>

          <!-- Services list -->
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Our Services</p>
            <div class="grid grid-cols-2 gap-1">
              {#each ['Lawn Mowing', 'Trimming & Edging', 'Spring & Fall Cleanups', 'Bush & Shrub Care', 'Landscape Maintenance', 'Lawn Aeration'] as service}
                <div class="flex items-center gap-1.5">
                  <div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span class="text-xs text-gray-700">{service}</span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Testimonial -->
          <div class="rounded-xl bg-gray-50 px-4 py-3">
            <div class="flex gap-0.5 mb-1">
              {#each [1,2,3,4,5] as _}
                <span class="text-yellow-400 text-sm">★</span>
              {/each}
            </div>
            <p class="text-xs italic text-gray-600">"Cruz Crewz transformed our lawn. Reliable, professional, and affordable. Highly recommend!"</p>
          </div>

          <!-- CTA -->
          <div class="rounded-xl bg-gray-900 px-4 py-3 text-center">
            <p class="text-sm font-bold text-white">Get a Free Quote</p>
            <p class="text-xs text-gray-300 mt-1 break-all">{data.quoteUrl}</p>
          </div>

          <!-- Footer -->
          <p class="text-center text-xs text-gray-400">Chicago Metro & Northwest Indiana · cruzcrewz.com</p>
        </div>
      </div>

    </div>
  {/if}
</div>

<!-- Print-only flyer -->
<div class="print-only hidden">
  {#if data}
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
      <div style="display: flex; align-items: center; gap: 1rem; border-bottom: 2px solid #059669; padding-bottom: 1rem; margin-bottom: 1rem;">
        <div style="background: #059669; color: white; font-weight: 900; font-size: 1.25rem; width: 3rem; height: 3rem; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem;">CC</div>
        <div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #111;">Cruz Crewz</div>
          <div style="font-size: 0.75rem; color: #6b7280;">Professional Lawn Care · Chicago Metro & NW Indiana</div>
        </div>
      </div>
      <div style="background: #ecfdf5; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
        <p style="font-weight: 700; color: #065f46; margin: 0 0 0.25rem;">We just finished a job in your neighborhood!</p>
        <p style="font-size: 0.8rem; color: #047857; margin: 0;">Your neighbor hired us — and we'd love to help you too.</p>
      </div>
      <p style="font-weight: 700; margin-bottom: 0.5rem;">Get your free quote today:</p>
      <p style="font-size: 1rem; color: #059669; font-weight: 700; word-break: break-all;">{data.quoteUrl}</p>
    </div>
  {/if}
</div>
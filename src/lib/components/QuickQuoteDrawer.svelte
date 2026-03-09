<script lang="ts">
  // src/lib/components/QuickQuoteDrawer.svelte
  import { supabase } from '$lib/supabase';
  import { toast } from 'svelte-sonner';
  import X from 'lucide-svelte/icons/x';
  import Zap from 'lucide-svelte/icons/zap';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import Send from 'lucide-svelte/icons/send';
  import DollarSign from 'lucide-svelte/icons/dollar-sign';
  import Loader from 'lucide-svelte/icons/loader';

  let { open = $bindable(false) } = $props();

  const SERVICES = [
    'Lawn Mowing',
    'Trimming & Edging',
    'Bush, Shrub & Tree Care',
    'Spring & Fall Cleanups',
    'Landscape Maintenance',
    'Lawn Aeration & Overseeding'
  ];

  const FREQUENCIES = [
    'One-time',
    'Weekly',
    'Bi-weekly',
    'Monthly',
    'Seasonal',
  ];

  // ── Form state ────────────────────────────────────────────────────────────
  let step = $state<'details' | 'price' | 'confirm'>('details');

  let name        = $state('');
  let email       = $state('');
  let phone       = $state('');
  let address     = $state('');
  let service     = $state(SERVICES[0]);
  let frequency   = $state(FREQUENCIES[2]);
  let startDate   = $state('');
  let notes       = $state('');

  // Price
  let calculatedPrice = $state<number | null>(null);
  let manualPrice     = $state('');
  let priceLoading    = $state(false);
  let priceSource     = $state<'calculated' | 'manual' | null>(null);

  // Address autocomplete
  let addressSuggestions  = $state<any[]>([]);
  let addressLoading      = $state(false);
  let addressDebounce: ReturnType<typeof setTimeout>;
  let resolvedAddress     = $state<any | null>(null);

  // Submission
  let submitting  = $state(false);
  let submitted   = $state(false);
  let createdJobId = $state<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  let finalPrice = $derived(
    manualPrice ? parseFloat(manualPrice) : (calculatedPrice ?? 0)
  );

  let detailsValid = $derived(
    name.trim().length > 0 &&
    (email.trim().length > 0 || phone.trim().length > 0) &&
    address.trim().length > 0 &&
    service.length > 0
  );

  // ── Address autocomplete ─────────────────────────────────────────────────
  async function handleAddressInput(val: string) {
    address = val;
    resolvedAddress = null;
    clearTimeout(addressDebounce);
    if (val.length < 4) { addressSuggestions = []; return; }
    addressDebounce = setTimeout(async () => {
      addressLoading = true;
      try {
        const res = await fetch(`/api/autocomplete-address?query=${encodeURIComponent(val)}`);
        const data = await res.json();
        addressSuggestions = (data.predictions ?? []).map((p: any) => ({
        description: p.description,
        place_id: p.place_id,
        }));
      } finally {
        addressLoading = false;
      }
    }, 350);
  }

  function selectAddress(suggestion: any) {
  address = suggestion.description;
  addressSuggestions = [];
}

  // ── Price calculation ────────────────────────────────────────────────────
  async function calculatePrice() {
    if (!resolvedAddress && address) {
      // Geocode the address first
      try {
        const res = await fetch('/api/lookup-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const data = await res.json();
        if (data.success) resolvedAddress = data.data;
      } catch {}
    }

    priceLoading = true;
    calculatedPrice = null;

    try {
      // Check for customer price override first
      if (email.trim()) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', email.trim())
          .maybeSingle();

        if (customer) {
          const { data: override } = await supabase
            .from('customer_price_overrides')
            .select('price')
            .eq('customer_id', customer.id)
            .eq('service_type', service)
            .maybeSingle();

          if (override?.price) {
            calculatedPrice = override.price;
            priceSource = 'calculated';
            priceLoading = false;
            step = 'price';
            return;
          }
        }
      }

      // Get lot size
      let lotSqft: number | null = null;
      if (resolvedAddress?.lat && resolvedAddress?.lng) {
        const lotRes = await fetch('/api/lookup-lot-size', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: resolvedAddress.lat,
            lng: resolvedAddress.lng,
            county: resolvedAddress.county,
            state: resolvedAddress.state,
          }),
        });
        const lotData = await lotRes.json();
        lotSqft = lotData.lot_size_sqft;
      }

      // Fetch pricing rules from Supabase
      let price: number | null = null;
      if (lotSqft) {
        const { data: rules } = await supabase
          .from('pricing_rules')
          .select('*')
          .eq('service_type', service)
          .limit(10);

        if (rules && rules.length > 0) {
          // Find most specific rule
          const rule = rules.find(r =>
            r.county === resolvedAddress?.county && r.state === resolvedAddress?.state
          ) ?? rules.find(r =>
            r.county === resolvedAddress?.county
          ) ?? rules.find(r =>
            r.state === resolvedAddress?.state
          ) ?? rules[0];

          const rate    = rule.price_per_sqft ?? 0.0095;
          const minP    = rule.min_price ?? 45;
          const maxP    = rule.max_price ?? 350;
          price = Math.min(Math.max(Math.round(lotSqft * rate), minP), maxP);
        }
      }

      // Fallback: sensible defaults by service
      if (!price) {
        const defaults: Record<string, number> = {
          'Lawn Mowing': 65,
          'Trimming & Edging': 55,
          'Bush, Shrub & Tree Care': 120,
          'Spring & Fall Cleanups': 150,
          'Landscape Maintenance': 100,
        };
        price = defaults[service] ?? 75;
      }

      calculatedPrice = price;
      priceSource = 'calculated';
    } catch (err) {
      console.error('[quick-quote] price calc error:', err);
      calculatedPrice = null;
    } finally {
      priceLoading = false;
      step = 'price';
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!finalPrice || finalPrice <= 0) {
      toast.error('Please enter a price before sending.');
      return;
    }

    submitting = true;
    try {
      // Upsert customer
      let customerId: string;
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
        await supabase.from('customers').update({
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
        }).eq('id', customerId);
      } else {
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert({
            name: name.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            address: address.trim() || null,
          })
          .select('id')
          .single();
        if (error) throw error;
        customerId = newCustomer.id;
      }

      // Create job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          customer_id:    customerId,
          service_type:   service,
          scheduled_date: startDate || null,
          price:          finalPrice,
          status:         'pending',
          notes:          notes.trim() || null,
          customer_phone: phone.trim() || null,
          description:    `${frequency} ${service} — Quick Quote`,
        })
        .select('id')
        .single();

      if (jobError) throw jobError;
      createdJobId = job.id;

      // Send quote email if we have an email address
      if (email.trim()) {
        await fetch('/api/send-quote-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName:  name.trim(),
            customerEmail: email.trim(),
            services:      [service],
            schedule:      frequency,
            totalPrice:    finalPrice,
            jobId:         job.id,
          }),
        });
      }

      submitted = true;
      step = 'confirm';
      toast.success(email.trim() ? 'Quote sent!' : 'Job created!');
    } catch (err) {
      console.error('[quick-quote] submit error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      submitting = false;
    }
  }

  function resetAndClose() {
    open = false;
    // Reset after transition
    setTimeout(() => {
      step = 'details';
      name = ''; email = ''; phone = ''; address = '';
      service = SERVICES[0]; frequency = FREQUENCIES[2];
      startDate = ''; notes = '';
      calculatedPrice = null; manualPrice = '';
      priceSource = null; resolvedAddress = null;
      submitted = false; createdJobId = null;
    }, 300);
  }
</script>

<!-- Backdrop -->
{#if open}
  <div
    class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
    onclick={resetAndClose}
  ></div>
{/if}

<!-- Drawer -->
<div class="fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col
  {open ? 'translate-x-0' : 'translate-x-full'}">

  <!-- Header -->
  <div class="flex items-center justify-between border-b border-gray-100 bg-gray-900 px-5 py-4">
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
        <Zap class="h-4 w-4 text-white" />
      </div>
      <div>
        <p class="text-sm font-bold text-white">Quick Quote</p>
        <p class="text-xs text-gray-400">Create & send instantly</p>
      </div>
    </div>
    <button onclick={resetAndClose} class="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
      <X class="h-5 w-5" />
    </button>
  </div>

  <!-- Step indicators -->
  {#if step !== 'confirm'}
    <div class="flex border-b border-gray-100">
      {#each [['details', 'Details'], ['price', 'Price']] as [s, label]}
        <div class="flex-1 px-4 py-2.5 text-center text-xs font-medium transition-colors
          {step === s ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-gray-400'}">
          {label}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Scrollable body -->
  <div class="flex-1 overflow-y-auto">

    <!-- ── Step: Details ── -->
    {#if step === 'details'}
      <div class="p-5 space-y-4">

        <!-- Name -->
        <div>
          <label class="mb-1 block text-xs font-semibold text-gray-700">Customer Name <span class="text-red-500">*</span></label>
          <input
            type="text"
            bind:value={name}
            placeholder="Maria Garcia"
            class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <!-- Email + Phone -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700">Email</label>
            <input
              type="email"
              bind:value={email}
              placeholder="email@example.com"
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700">Phone</label>
            <input
              type="tel"
              bind:value={phone}
              placeholder="(555) 000-0000"
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <!-- Address with autocomplete -->
        <div class="relative">
          <label class="mb-1 block text-xs font-semibold text-gray-700">Property Address <span class="text-red-500">*</span></label>
          <input
            type="text"
            value={address}
            oninput={(e) => handleAddressInput((e.target as HTMLInputElement).value)}
            placeholder="123 Main St, Chicago, IL"
            class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {#if addressLoading}
            <div class="absolute right-3 top-8">
              <Loader class="h-4 w-4 animate-spin text-gray-400" />
            </div>
          {/if}
          {#if addressSuggestions.length > 0}
            <div class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {#each addressSuggestions as s}
                <button
                  type="button"
                  onclick={() => selectAddress(s)}
                  class="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-gray-50 last:border-0"
                >
                  {s.description ?? s.formatted ?? s}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Service -->
        <div>
          <label class="mb-1 block text-xs font-semibold text-gray-700">Service <span class="text-red-500">*</span></label>
          <div class="relative">
            <select
              bind:value={service}
              class="w-full appearance-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {#each SERVICES as s}
                <option value={s}>{s}</option>
              {/each}
            </select>
            <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <!-- Frequency + Start date -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700">Frequency</label>
            <div class="relative">
              <select
                bind:value={frequency}
                class="w-full appearance-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {#each FREQUENCIES as f}
                  <option value={f}>{f}</option>
                {/each}
              </select>
              <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700">Start Date</label>
            <input
              type="date"
              bind:value={startDate}
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="mb-1 block text-xs font-semibold text-gray-700">Notes <span class="text-gray-400 font-normal">(optional)</span></label>
          <textarea
            bind:value={notes}
            rows="2"
            placeholder="Gate code, access instructions, special requests..."
            class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
          ></textarea>
        </div>
      </div>

    <!-- ── Step: Price ── -->
    {:else if step === 'price'}
      <div class="p-5 space-y-5">

        <!-- Summary card -->
        <div class="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
          <div class="flex justify-between px-4 py-3">
            <span class="text-xs text-gray-500">Customer</span>
            <span class="text-sm font-medium text-gray-900">{name}</span>
          </div>
          <div class="flex justify-between px-4 py-3">
            <span class="text-xs text-gray-500">Service</span>
            <span class="text-sm font-medium text-gray-900">{service}</span>
          </div>
          <div class="flex justify-between px-4 py-3">
            <span class="text-xs text-gray-500">Frequency</span>
            <span class="text-sm font-medium text-gray-900">{frequency}</span>
          </div>
          {#if address}
            <div class="flex justify-between px-4 py-3">
              <span class="text-xs text-gray-500">Address</span>
              <span class="text-sm font-medium text-gray-900 text-right max-w-[60%] truncate">{address}</span>
            </div>
          {/if}
        </div>

        <!-- Calculated price -->
        {#if priceLoading}
          <div class="flex items-center justify-center gap-2 py-6 text-gray-500">
            <Loader class="h-5 w-5 animate-spin" />
            <span class="text-sm">Calculating price...</span>
          </div>
        {:else if calculatedPrice}
          <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Suggested Price</p>
                <p class="mt-0.5 text-3xl font-extrabold text-emerald-700">${calculatedPrice.toFixed(2)}</p>
                <p class="mt-1 text-xs text-emerald-600">Based on property size & service rules</p>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <DollarSign class="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
        {/if}

        <!-- Manual override -->
        <div>
          <label class="mb-1 block text-xs font-semibold text-gray-700">
            {calculatedPrice ? 'Override Price' : 'Set Price'}
            {#if calculatedPrice}<span class="ml-1 font-normal text-gray-400">(leave blank to use suggested)</span>{/if}
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">$</span>
            <input
              type="number"
              bind:value={manualPrice}
              min="0"
              step="0.01"
              placeholder={calculatedPrice ? calculatedPrice.toFixed(2) : '0.00'}
              class="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          {#if manualPrice}
            <p class="mt-1.5 text-xs text-amber-600">
              Manual price set — this overrides the calculated amount
            </p>
          {/if}
        </div>

        <!-- Final price display -->
        {#if finalPrice > 0}
          <div class="rounded-xl bg-gray-900 px-5 py-4 flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-300">Quote Total</span>
            <span class="text-2xl font-extrabold text-white">${finalPrice.toFixed(2)}</span>
          </div>
        {/if}

        <!-- Send options -->
        <div class="space-y-2">
          {#if email}
            <div class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span class="text-xs text-emerald-700">Quote email will be sent to <strong>{email}</strong></span>
            </div>
          {:else}
            <div class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <div class="h-2 w-2 rounded-full bg-amber-500"></div>
              <span class="text-xs text-amber-700">No email — job will be created without sending a quote link</span>
            </div>
          {/if}
        </div>
      </div>

    <!-- ── Step: Confirm ── -->
    {:else if step === 'confirm'}
      <div class="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full min-h-[400px]">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg class="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <div>
          <p class="text-xl font-bold text-gray-900">{email ? 'Quote Sent!' : 'Job Created!'}</p>
          <p class="mt-1 text-sm text-gray-500">
            {#if email}
              A quote email with a sign link was sent to <strong>{email}</strong>
            {:else}
              The job has been created and is visible in your dashboard
            {/if}
          </p>
        </div>
        <div class="rounded-xl border border-gray-100 bg-gray-50 w-full divide-y divide-gray-100 text-left">
          <div class="flex justify-between px-4 py-3">
            <span class="text-xs text-gray-500">Customer</span>
            <span class="text-sm font-semibold text-gray-900">{name}</span>
          </div>
          <div class="flex justify-between px-4 py-3">
            <span class="text-xs text-gray-500">Service</span>
            <span class="text-sm font-medium text-gray-900">{service}</span>
          </div>
          <div class="flex justify-between bg-emerald-50 px-4 py-3 rounded-b-xl">
            <span class="text-sm font-bold text-gray-900">Quote Total</span>
            <span class="text-lg font-extrabold text-emerald-600">${finalPrice.toFixed(2)}</span>
          </div>
        </div>
        {#if createdJobId}
          <a
            href="/app/jobs"
            onclick={resetAndClose}
            class="w-full rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            View in Jobs
          </a>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Footer actions -->
  {#if step === 'details'}
    <div class="border-t border-gray-100 p-4">
      <button
        onclick={calculatePrice}
        disabled={!detailsValid || priceLoading}
        class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        {priceLoading ? 'Calculating...' : 'Calculate Price →'}
      </button>
    </div>

  {:else if step === 'price'}
    <div class="flex gap-3 border-t border-gray-100 p-4">
      <button
        onclick={() => (step = 'details')}
        class="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Back
      </button>
      <button
        onclick={handleSubmit}
        disabled={submitting || finalPrice <= 0}
        class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {#if submitting}
          <Loader class="h-4 w-4 animate-spin" />
          Sending...
        {:else}
          <Send class="h-4 w-4" />
          {email ? 'Send Quote' : 'Create Job'}
        {/if}
      </button>
    </div>
  {/if}
</div>
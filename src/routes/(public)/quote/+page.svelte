<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { services, serviceAreas } from '$lib/data/services';
  import ContractAgreement from '$lib/components/ContractAgreement.svelte';
  import { toast } from 'svelte-sonner';
  import { debounce } from '$lib/utils';
  import { lookupCookCountyLotSize } from '$lib/lot-size/cook-county-client';

  let addressSuggestions = $state<string[]>([]);
  let showSuggestions = $state(false);
  let lookingUpAddress = $state(false);

  const zipToState: Record<string, string> = { '46': 'IN', '60': 'IL' };
  function getStateFromZip(zip: string) {
    if (!zip || zip.length < 2) return '';
    return zipToState[zip.substring(0, 2)] || '';
  }

  let currentStep = $state(1);
  let formData = $state({
    selectedService: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    frequency: 'weekly',
    startDate: '',
    additionalNotes: ''
  });

  let errors = $state<Record<string, string>>({});
  let isValidZip = $state(true);
  let estimatedPrice = $state<number | null>(null);
  let showContract = $state(false);
  let showQuoteOptions = $state(false);
  let contractData = $state<any>(null);
  let submitting = $state(false);

  const stepMeta = [
    { label: 'Service',  heading: 'What service do you need?',      sub: 'Choose from our professional lawn care services.' },
    { label: 'Property', heading: 'Where is the property?',         sub: 'We\'ll use your address to calculate an accurate price.' },
    { label: 'Contact',  heading: 'How do we reach you?',           sub: 'We\'ll only contact you to confirm your appointment.' },
    { label: 'Details',  heading: 'Just a few final details.',      sub: 'Review your quote and choose a start date.' },
  ];

  const searchAddresses = debounce(async (query: string) => {
    if (query.length < 3) { addressSuggestions = []; showSuggestions = false; return; }
    try {
      const res = await fetch(`/api/autocomplete-address?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.predictions) {
        addressSuggestions = data.predictions.map((p: any) => p.description);
        showSuggestions = addressSuggestions.length > 0;
      }
    } catch (e) { console.error('Address search error:', e); }
  }, 300);

  async function selectAddress(address: string) {
    showSuggestions = false;
    addressSuggestions = [];
    lookingUpAddress = true;
    formData.city = '';
    formData.zipCode = '';
    try {
      // Step 1: geocode on server (gets city/state/zip/county)
      const res = await fetch('/api/lookup-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      const result = await res.json();
      if (result.success && result.data) {
        const info = result.data;
        formData.address = info.street_address || address.split(',')[0];
        formData.city    = info.city  || '';
        formData.state   = info.state || '';
        formData.zipCode = info.zip   || '';
        isValidZip = serviceAreas.includes(formData.zipCode);
        errors = {};

        // Step 2: lot size lookup direct from browser (bypasses Netlify network block)
        if (info.county === 'Cook' && info.state === 'IL' && info.street_address) {
          const sqft = await lookupCookCountyLotSize(info.street_address);
          if (sqft) {
            await calculatePriceFromLotSize(sqft, info.county);
          }
        }
      }
    } catch (e) {
      console.error('Address lookup failed:', e);
      toast.error('Could not load address details.');
    } finally {
      lookingUpAddress = false;
    }
  }

  $effect(() => {
    if (formData.zipCode.length >= 2) {
      const d = getStateFromZip(formData.zipCode);
      if (d) formData.state = d;
    }
  });

  $effect(() => {
    const sp = $page.url.searchParams.get('service');
    if (sp) {
      const s = services.find(s => s.slug === sp);
      if (s) formData.selectedService = s.id;
    }
  });

  let selectedServiceData = $derived(services.find(s => s.id === formData.selectedService));

  function validateZipCode() {
    if (formData.zipCode.length === 5) isValidZip = serviceAreas.includes(formData.zipCode);
  }

  function validateStep(step: number) {
    const e: Record<string, string> = {};
    if (step === 1 && !formData.selectedService) e.selectedService = 'Please select a service';
    if (step === 2) {
      if (!formData.address) e.address = 'Address is required';
      if (!formData.city)    e.city    = 'City is required';
      if (!formData.zipCode) e.zipCode = 'ZIP code is required';
      if (!formData.state)   e.state   = 'State is required';
      if (formData.zipCode && !isValidZip) e.zipCode = "Sorry, we don't service this area yet";
    }
    if (step === 3) {
      if (!formData.firstName) e.firstName = 'First name is required';
      if (!formData.lastName)  e.lastName  = 'Last name is required';
      if (!formData.email)     e.email     = 'Email is required';
      if (!formData.phone)     e.phone     = 'Phone is required';
    }
    errors = e;
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (validateStep(currentStep)) { currentStep++; errors = {}; }
    else toast.error('Please check the highlighted fields.');
  }
  function prevStep() { currentStep--; errors = {}; }

  async function submitQuote() {
    if (!validateStep(4)) return;
    submitting = true;
    try {
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`;
      let customerId;
      const { data: existing } = await supabase.from('customers').select('id').eq('email', formData.email).single();
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: nc, error: ce } = await supabase.from('customers').insert({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email, phone: formData.phone, address: fullAddress
        }).select().single();
        if (ce) throw ce;
        customerId = nc.id;
      }
      const { data: job, error: je } = await supabase.from('jobs').insert({
        customer_id: customerId,
        service_type: selectedServiceData!.name,
        description: formData.additionalNotes || '',
        status: 'pending',
        scheduled_date: formData.startDate || new Date().toISOString(),
        price: estimatedPrice,
        customer_phone: formData.phone
      }).select().single();
      if (je) throw je;
      contractData = {
        jobId: job.id, customerId,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email, customerPhone: formData.phone,
        services: [selectedServiceData!.name],
        schedule: `${formData.frequency} service starting ${formData.startDate || 'as soon as possible'}`,
        totalPrice: estimatedPrice || 0
      };
      showQuoteOptions = true;
    } catch (e) {
      console.error('Quote submission error:', e);
      toast.error('Failed to submit quote. Please try again.');
    } finally { submitting = false; }
  }

  function handleSignNow() { showQuoteOptions = false; showContract = true; }

  async function handleSignLater() {
    const res = await fetch('/api/send-quote-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: contractData.customerEmail, customerName: contractData.customerName,
        services: contractData.services, schedule: contractData.schedule,
        totalPrice: contractData.totalPrice, jobId: contractData.jobId
      })
    });
    showQuoteOptions = false;
    if (res.ok) toast.success('Quote saved! Check your email for the contract signing link.');
    else toast.error('Quote saved, but email failed to send. Please contact us directly.');
    setTimeout(() => { window.location.href = '/'; }, 2000);
  }

  function handleContractComplete() {
    showContract = false;
    toast.success("Thank you! Your service agreement has been signed. We'll contact you shortly.");
    setTimeout(() => { window.location.href = '/'; }, 2000);
  }
  function handleContractCancel() { showContract = false; showQuoteOptions = true; }

  async function calculatePriceFromLotSize(sqft: number, county: string) {
    if (!selectedServiceData) return;
    const { data: rule } = await supabase.from('pricing_rules').select('*')
      .eq('county', county).eq('state', formData.state)
      .eq('service_type', selectedServiceData.name).single();
    if (rule) {
      let price = sqft * rule.price_per_sqft;
      if (rule.min_price && price < rule.min_price) price = rule.min_price;
      if (rule.max_price && price > rule.max_price) price = rule.max_price;
      estimatedPrice = Math.round(price);
    } else {
      estimatedPrice = Math.max(60, Math.round(sqft * 0.01));
    }
  }
</script>

<svelte:head>
  <title>Get a Free Quote | Cruz Crewz Lawn Care</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-10 sm:py-14">
  <div class="mx-auto max-w-2xl px-4 sm:px-6">

    <!-- Progress Stepper -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        {#each stepMeta as step, i}
          {@const num = i + 1}
          {@const done = currentStep > num}
          {@const active = currentStep === num}
          <div class="flex items-center {num !== 4 ? 'flex-1' : ''}">
            <div class="flex flex-col items-center">
              <div class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300
                {done   ? 'bg-green-600 text-white' :
                 active ? 'bg-green-600 text-white ring-4 ring-green-100' :
                          'bg-white text-gray-400 border-2 border-gray-200'}">
                {#if done}
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                {:else}
                  {num}
                {/if}
              </div>
              <span class="mt-1.5 text-xs font-medium {active ? 'text-green-700' : 'text-gray-400'}">
                {step.label}
              </span>
            </div>
            {#if num !== 4}
              <div class="mx-2 mb-5 h-0.5 flex-1 transition-all duration-500
                {currentStep > num ? 'bg-green-500' : 'bg-gray-200'}"></div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Card -->
    <div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">

      <!-- Dynamic Header -->
      <div class="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-green-500 px-6 py-7 text-white">
        <!-- Decorative circle -->
        <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
        <div class="absolute -bottom-6 right-16 h-20 w-20 rounded-full bg-white/5"></div>
        <div class="relative">
          <div class="mb-1 text-xs font-semibold uppercase tracking-widest text-green-200">
            Step {currentStep} of 4
          </div>
          <h1 class="text-2xl font-bold leading-tight sm:text-3xl">
            {stepMeta[currentStep - 1].heading}
          </h1>
          <p class="mt-1.5 text-sm text-green-100">
            {stepMeta[currentStep - 1].sub}
          </p>
        </div>
      </div>

      <!-- Step Content -->
      <div class="p-6 sm:p-8">

        <!-- ── Step 1: Service Selection ── -->
        {#if currentStep === 1}
          <div class="space-y-3">
            {#each services as service}
              <button
                type="button"
                onclick={() => formData.selectedService = service.id}
                class="group relative flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150
                  {formData.selectedService === service.id
                    ? 'border-green-600 bg-green-50 shadow-sm'
                    : 'border-gray-100 bg-gray-50 hover:border-green-300 hover:bg-white'}"
              >
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-150
                  {formData.selectedService === service.id
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 shadow-sm'}">
                  {#if service.id === 'lawn-mowing'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  {:else if service.id === 'trimming-edging'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                  {:else if service.id === 'tree-care'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14c.69-.36 1-.72 1-1.19C18 11.25 16.5 10 15 10c0-2.21-1.79-4-4-4S7 7.79 7 10c-1.5 0-3 1.25-3 2.81 0 .47.31.83 1 1.19"/><line x1="12" y1="22" x2="12" y2="14"/><path d="M9 18l3-3 3 3"/></svg>
                  {:else if service.id === 'seasonal-cleanup'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V8l7-6 7 6v12"/><path d="M9 20v-5h6v5"/></svg>
                  {:else if service.id === 'landscape-maintenance'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-gray-900">{service.name}</span>
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full
                      {service.frequency === 'recurring' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}">
                      {service.frequency === 'recurring' ? 'Recurring' : service.frequency === 'seasonal' ? 'Seasonal' : 'One-time'}
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-gray-500">{service.description}</p>
                </div>
                {#if formData.selectedService === service.id}
                  <div class="shrink-0 text-green-600">
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                {/if}
              </button>
            {/each}
            {#if errors.selectedService}
              <p class="text-sm text-red-600">{errors.selectedService}</p>
            {/if}
            <p class="pt-1 text-center text-xs text-gray-400">
              Pricing is calculated from your property's lot size once you enter your address.
            </p>
          </div>
        {/if}

        <!-- ── Step 2: Property Details ── -->
        {#if currentStep === 2}
          <div class="space-y-5">

            <!-- Address with search icon -->
            <div>
              <label for="address" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Street Address</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <svg class="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <input
                  type="text" id="address"
                  bind:value={formData.address}
                  oninput={(e) => searchAddresses(e.currentTarget.value)}
                  onfocus={() => { if (addressSuggestions.length > 0) showSuggestions = true; }}
                  onblur={() => setTimeout(() => showSuggestions = false, 200)}
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  class:border-red-400={errors.address}
                  placeholder="Start typing your address..."
                  autocomplete="off"
                />
                {#if lookingUpAddress}
                  <div class="absolute inset-y-0 right-3 flex items-center">
                    <svg class="h-4 w-4 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                {/if}
                {#if showSuggestions && addressSuggestions.length > 0}
                  <div class="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    {#each addressSuggestions as suggestion}
                      <button
                        type="button"
                        onclick={() => selectAddress(suggestion)}
                        class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-800 border-b border-gray-50 last:border-none transition-colors"
                      >
                        <svg class="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {suggestion}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
              {#if errors.address}<p class="mt-1 text-xs text-red-500">{errors.address}</p>{/if}
            </div>

            <!-- City + ZIP -->
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="city" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">City</label>
                <input
                  type="text" id="city"
                  bind:value={formData.city}
                  disabled={lookingUpAddress}
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-60 transition-all"
                  placeholder={lookingUpAddress ? 'Looking up...' : 'City'}
                />
                {#if errors.city}<p class="mt-1 text-xs text-red-500">{errors.city}</p>{/if}
              </div>
              <div>
                <label for="zipCode" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">ZIP Code</label>
                <input
                  type="text" id="zipCode"
                  bind:value={formData.zipCode}
                  onblur={validateZipCode}
                  maxlength="5"
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  class:border-red-400={errors.zipCode || !isValidZip}
                  placeholder="60601"
                />
                {#if !isValidZip && formData.zipCode.length === 5}
                  <p class="mt-1 text-xs text-red-500 font-medium">📍 We don't service this area yet.</p>
                {:else if errors.zipCode}
                  <p class="mt-1 text-xs text-red-500">{errors.zipCode}</p>
                {/if}
              </div>
            </div>

            <!-- Price result -->
            {#if lookingUpAddress}
              <div class="flex items-center gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                <svg class="h-4 w-4 shrink-0 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Calculating your property price...
              </div>
            {:else if estimatedPrice}
              <div class="rounded-xl bg-green-600 p-4 text-white">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide text-green-200">Your Estimated Price</p>
                    <p class="mt-0.5 text-3xl font-bold">${estimatedPrice}</p>
                  </div>
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <p class="mt-2 text-xs text-green-200">Based on your lot size · Final price may vary slightly</p>
              </div>
            {/if}
          </div>
        {/if}

        <!-- ── Step 3: Contact Info ── -->
        {#if currentStep === 3}
          <div class="space-y-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="firstName" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">First Name</label>
                <input
                  type="text" id="firstName"
                  bind:value={formData.firstName}
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  class:border-red-400={errors.firstName}
                  placeholder="Jane"
                />
                {#if errors.firstName}<p class="mt-1 text-xs text-red-500">{errors.firstName}</p>{/if}
              </div>
              <div>
                <label for="lastName" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Last Name</label>
                <input
                  type="text" id="lastName"
                  bind:value={formData.lastName}
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  class:border-red-400={errors.lastName}
                  placeholder="Smith"
                />
                {#if errors.lastName}<p class="mt-1 text-xs text-red-500">{errors.lastName}</p>{/if}
              </div>
            </div>

            <div>
              <label for="email" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Email</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <svg class="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <input
                  type="email" id="email"
                  bind:value={formData.email}
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  class:border-red-400={errors.email}
                  placeholder="jane@example.com"
                />
              </div>
              {#if errors.email}<p class="mt-1 text-xs text-red-500">{errors.email}</p>{/if}
            </div>

            <div>
              <label for="phone" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Phone</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <svg class="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <input
                  type="tel" id="phone"
                  bind:value={formData.phone}
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  class:border-red-400={errors.phone}
                  placeholder="(312) 555-0100"
                />
              </div>
              {#if errors.phone}<p class="mt-1 text-xs text-red-500">{errors.phone}</p>{/if}
              <p class="mt-1.5 text-xs text-gray-400">We'll only call to confirm your appointment.</p>
            </div>
          </div>
        {/if}

        <!-- ── Step 4: Preferences + Summary ── -->
        {#if currentStep === 4}
          <div class="space-y-6">

            <!-- Frequency pill toggle -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Service Frequency</label>
              <div class="flex rounded-xl bg-gray-100 p-1">
                {#each [{value: 'weekly', label: 'Weekly'}, {value: 'biweekly', label: 'Bi-Weekly'}] as freq}
                  <button
                    type="button"
                    onclick={() => formData.frequency = freq.value}
                    class="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200
                      {formData.frequency === freq.value
                        ? 'bg-white text-green-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'}"
                  >
                    {freq.label}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Start date -->
            <div>
              <label for="startDate" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Preferred Start Date</label>
              <input
                type="date" id="startDate"
                bind:value={formData.startDate}
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
              />
            </div>

            <!-- Notes -->
            <div>
              <label for="notes" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Additional Notes <span class="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="notes"
                bind:value={formData.additionalNotes}
                rows="3"
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all resize-none"
                placeholder="Gate codes, special instructions, or anything else we should know..."
              ></textarea>
            </div>

            <!-- Summary card -->
            <div class="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
              <div class="bg-gray-900 px-5 py-3">
                <h3 class="text-sm font-semibold text-white">Quote Summary</h3>
              </div>
              <div class="divide-y divide-gray-50 bg-white">
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-xs font-medium text-gray-500">Service</span>
                  <span class="text-sm font-semibold text-gray-900">{selectedServiceData?.name}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-xs font-medium text-gray-500">Address</span>
                  <span class="text-sm font-medium text-gray-700 text-right max-w-[60%]">{formData.address}, {formData.city}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-xs font-medium text-gray-500">Frequency</span>
                  <span class="text-sm font-medium capitalize text-gray-700">{formData.frequency}</span>
                </div>
                {#if estimatedPrice}
                  <div class="flex items-center justify-between bg-green-50 px-5 py-4">
                    <span class="text-sm font-bold text-gray-900">Estimated Price</span>
                    <span class="text-2xl font-extrabold text-green-600">${estimatedPrice}</span>
                  </div>
                {:else}
                  <div class="flex items-center justify-between bg-amber-50 px-5 py-4">
                    <span class="text-sm font-medium text-amber-800">Price</span>
                    <span class="text-sm font-semibold text-amber-700">Calculated after confirmation</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- Navigation -->
        <div class="mt-8 flex items-center justify-between">
          {#if currentStep > 1}
            <button
              type="button"
              onclick={prevStep}
              class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          {:else}
            <div></div>
          {/if}

          {#if currentStep < 4}
            <button
              type="button"
              onclick={nextStep}
              class="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
            >
              Continue
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          {:else}
            <button
              type="button"
              onclick={submitQuote}
              disabled={submitting}
              class="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Processing...' : 'Get My Quote'}
              {#if !submitting}
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              {/if}
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Trust signals — once, outside the card -->
    <div class="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
      <span class="flex items-center gap-1.5">
        <svg class="h-3.5 w-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Secure & private
      </span>
      <span class="flex items-center gap-1.5">
        <svg class="h-3.5 w-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Responds within 24 hrs
      </span>
      <span class="flex items-center gap-1.5">
        <svg class="h-3.5 w-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        No commitment required
      </span>
    </div>
  </div>
</div>

<!-- Quote Options Modal -->
{#if showQuoteOptions && contractData}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => (showQuoteOptions = false)}>
    <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onclick={(e) => e.stopPropagation()}>
      <div class="bg-gradient-to-br from-green-700 to-green-500 px-6 py-6 text-white text-center">
        <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
          <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold">Your Quote is Ready</h2>
        <div class="mt-2 text-4xl font-extrabold">${contractData.totalPrice.toFixed(2)}</div>
        <p class="mt-1 text-sm text-green-100">Estimated price · {contractData.services[0]}</p>
      </div>
      <div class="p-6 space-y-3">
        <button onclick={handleSignNow} class="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
          Sign Agreement Now
        </button>
        <button onclick={handleSignLater} class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Email Me a Link to Sign Later
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Contract Modal -->
{#if showContract && contractData}
  <ContractAgreement {contractData} onComplete={handleContractComplete} onCancel={handleContractCancel}/>
{/if}

<style>
  input::placeholder, textarea::placeholder { color: #9ca3af; opacity: 0.7; }
</style>
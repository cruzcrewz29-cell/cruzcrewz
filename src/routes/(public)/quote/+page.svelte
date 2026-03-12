<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { services, serviceAreas } from '$lib/data/services';
  import ContractAgreement from '$lib/components/ContractAgreement.svelte';
  import { toast } from 'svelte-sonner';
  import { debounce } from '$lib/utils';
  import {
    YARD_TIERS,
    calcMowing,
    calcEdging,
    calcTreeCare,
    calcCleanup,
    calcLandscape,
    calcAeration,
    type YardTierId,
    type ShrubHeight,
    type TrimCondition,
    type WorkType,
    type DebrisLevel,
    type AdminRule,
  } from '$lib/pricing/calculator';
  import * as m from '$lib/paraglide/messages';
  import LanguageToggle from '$lib/components/LanguageToggle.svelte';

  // ── Address / lot lookup state ───────────────────────────────────────────
  let addressSuggestions = $state<string[]>([]);
  let showSuggestions    = $state(false);
  let lookingUpAddress   = $state(false);
  let lotSizeIsEstimate  = $state(false);
  let resolvedCounty     = $state('');
  let resolvedState      = $state('');
  let resolvedLotSqft    = $state<number | null>(null);

  // Lot size fallback
  let showYardTiers      = $state(false);
  let selectedYardTier   = $state<YardTierId | null>(null);
  let manualSqft         = $state('');
  let showExactSqft      = $state(false);

  // ── Form state ───────────────────────────────────────────────────────────
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
    additionalNotes: '',
    smsOptInTransactional: false, // For reminders
    smsOptInMarketing: false,      // For promos
  });

  // Step 3 service-specific inputs
  let treeCareInputs = $state({
    shrubCount:  0,
    treeCount:   0,
    shrubHeight: 'under-4ft' as ShrubHeight,
    condition:   'maintained' as TrimCondition,
    workType:    'trim-shape' as WorkType,
  });

  let cleanupInputs = $state({
    lotSqft:      0,
    bedCount:     0,
    bedSqft:      0,
    debrisLevel:  'moderate' as DebrisLevel,
    needsHauling: false,
  });

  let landscapeInputs = $state({
    lotSqft:      0,
    bedCount:     0,
    bedSqft:      0,
    debrisLevel:  'moderate' as DebrisLevel,
    needsHauling: false,
  });

  let errors     = $state<Record<string, string>>({});
  let isValidZip = $state(true);

  let estimatedPrice   = $state<number | null>(null);
  let showContract     = $state(false);
  let showQuoteOptions = $state(false);
  let contractData     = $state<any>(null);
  let submitting       = $state(false);

  // ── Step metadata — $derived so labels react to language changes ─────────
  const stepMeta = $derived([
    { label: m.quote_step_service_label(),  heading: m.quote_step1_heading(), sub: m.quote_step1_sub() },
    { label: m.quote_step_property_label(), heading: m.quote_step2_heading(), sub: m.quote_step2_sub() },
    { label: m.quote_step_details_label(),  heading: m.quote_step3_heading(), sub: m.quote_step3_sub() },
    { label: m.quote_step_contact_label(),  heading: m.quote_step4_heading(), sub: m.quote_step4_sub() },
    { label: m.quote_step_review_label(),   heading: m.quote_step5_heading(), sub: m.quote_step5_sub() },
  ]);

  const TOTAL_STEPS = 5;

  // ── Derived ──────────────────────────────────────────────────────────────
  let selectedServiceData = $derived(services.find(s => s.id === formData.selectedService));

  let isMowing    = $derived(formData.selectedService === 'lawn-mowing');
  let isEdging    = $derived(formData.selectedService === 'trimming-edging');
  let isTreeCare  = $derived(formData.selectedService === 'tree-care');
  let isCleanup   = $derived(formData.selectedService === 'seasonal-cleanup');
  let isLandscape = $derived(formData.selectedService === 'landscape-maintenance');
  let isAeration  = $derived(formData.selectedService === 'lawn-aeration');
  let isLotBased  = $derived(isMowing || isEdging || isAeration);

  // ── Address autocomplete ─────────────────────────────────────────────────
  const searchAddresses = debounce(async (query: string) => {
    if (query.length < 3) { addressSuggestions = []; showSuggestions = false; return; }
    try {
      const res  = await fetch(`/api/autocomplete-address?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.predictions) {
        addressSuggestions = data.predictions.map((p: any) => p.description);
        showSuggestions = addressSuggestions.length > 0;
      }
    } catch (e) { console.error('Address search error:', e); }
  }, 300);

  async function selectAddress(address: string) {
    showSuggestions    = false;
    addressSuggestions = [];
    lookingUpAddress   = true;
    estimatedPrice     = null;
    lotSizeIsEstimate  = false;
    showYardTiers      = false;
    selectedYardTier   = null;
    manualSqft         = '';
    resolvedLotSqft    = null;
    formData.city = formData.zipCode = '';
    resolvedCounty = resolvedState = '';

    try {
      const geoRes = await fetch('/api/lookup-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const geoResult = await geoRes.json();

      if (!geoResult.success || !geoResult.data) {
        toast.error(m.quote_address_failed());
        showYardTiers = isLotBased;
        return;
      }

      const info = geoResult.data;
      formData.address = info.street_address || address.split(',')[0];
      formData.city    = info.city  || '';
      formData.state   = info.state || '';
      formData.zipCode = info.zip   || '';
      resolvedCounty   = info.county || '';
      resolvedState    = info.state  || '';
      isValidZip = serviceAreas.includes(formData.zipCode);
      errors = {};

      if (info.lat && info.lng) {
        const lotRes = await fetch('/api/lookup-lot-size', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: info.lat, lng: info.lng, county: info.county, state: info.state }),
        });
        const lotResult = await lotRes.json();

        if (lotResult.lot_size_sqft) {
          resolvedLotSqft   = lotResult.lot_size_sqft;
          lotSizeIsEstimate = lotResult.is_estimate === true;
          cleanupInputs.lotSqft   = lotResult.lot_size_sqft;
          landscapeInputs.lotSqft = lotResult.lot_size_sqft;
          if (isLotBased) await calculatePriceForMowing(lotResult.lot_size_sqft);
        } else {
          if (isLotBased) showYardTiers = true;
        }
      } else {
        if (isLotBased) showYardTiers = true;
      }
    } catch (e) {
      console.error('Address lookup failed:', e);
      toast.error(m.quote_address_load_failed());
      if (isLotBased) showYardTiers = true;
    } finally {
      lookingUpAddress = false;
    }
  }

  // ── Lot size fallback helpers ────────────────────────────────────────────
  async function selectYardTier(tierId: YardTierId) {
    selectedYardTier = tierId;
    const tier = YARD_TIERS.find(t => t.id === tierId)!;
    resolvedLotSqft = tier.sqft;
    lotSizeIsEstimate = true;
    cleanupInputs.lotSqft   = tier.sqft;
    landscapeInputs.lotSqft = tier.sqft;
    if (isLotBased) await calculatePriceForMowing(tier.sqft);
  }

  async function applyManualSqft() {
    const sqft = parseInt(manualSqft.replace(/,/g, ''), 10);
    if (!sqft || sqft < 500 || sqft > 500000) {
      toast.error(m.quote_invalid_sqft());
      return;
    }
    resolvedLotSqft   = sqft;
    lotSizeIsEstimate = false;
    selectedYardTier  = null;
    cleanupInputs.lotSqft   = sqft;
    landscapeInputs.lotSqft = sqft;
    if (isLotBased) await calculatePriceForMowing(sqft);
  }

  // ── Pricing calculations ─────────────────────────────────────────────────
  async function getAdminRule(): Promise<AdminRule | null> {
    if (!selectedServiceData) return null;
    const { data: rules } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('service_type', selectedServiceData.name)
      .or(
        `and(county.eq.${resolvedCounty},state.eq.${resolvedState}),` +
        `and(county.eq.${resolvedCounty},state.is.null),` +
        `and(county.is.null,state.eq.${resolvedState}),` +
        `and(county.is.null,state.is.null)`
      );
    if (!rules?.length) return null;
    return (
      rules.find(r => r.county === resolvedCounty && r.state === resolvedState) ??
      rules.find(r => r.county === resolvedCounty && !r.state) ??
      rules.find(r => !r.county && r.state === resolvedState) ??
      rules.find(r => !r.county && !r.state) ??
      null
    );
  }

  async function calculatePriceForMowing(sqft: number) {
    const rule = await getAdminRule();
    if (isMowing)        estimatedPrice = calcMowing(sqft, rule);
    else if (isEdging)   estimatedPrice = calcEdging(sqft, rule);
    else if (isAeration) estimatedPrice = calcAeration(sqft, rule);
  }

  function calculatePriceForTreeCare() {
    if (treeCareInputs.shrubCount === 0 && treeCareInputs.treeCount === 0) {
      estimatedPrice = null;
      return;
    }
    estimatedPrice = calcTreeCare(treeCareInputs);
  }

  function calculatePriceForCleanup() {
    estimatedPrice = calcCleanup(cleanupInputs);
  }

  function calculatePriceForLandscape() {
    estimatedPrice = calcLandscape(landscapeInputs);
  }

  // Reactive recalc when Step 3 inputs change
  $effect(() => {
    if (currentStep !== 3) return;
    if (isTreeCare)  { calculatePriceForTreeCare();  return; }
    if (isCleanup)   { calculatePriceForCleanup();   return; }
    if (isLandscape) { calculatePriceForLandscape();  return; }
  });

  // ── ZIP helper ───────────────────────────────────────────────────────────
  const zipToState: Record<string, string> = { '46': 'IN', '60': 'IL' };
  function getStateFromZip(zip: string) {
    if (!zip || zip.length < 2) return '';
    return zipToState[zip.substring(0, 2)] || '';
  }
  $effect(() => {
    if (formData.zipCode.length >= 2) {
      const d = getStateFromZip(formData.zipCode);
      if (d) formData.state = d;
    }
  });

  // Pre-select service from URL
  $effect(() => {
    const sp = $page.url.searchParams.get('service');
    if (sp) {
      const s = services.find(s => s.slug === sp);
      if (s) formData.selectedService = s.id;
    }
  });

  function validateZipCode() {
    if (formData.zipCode.length === 5) isValidZip = serviceAreas.includes(formData.zipCode);
  }

  // ── Step validation ──────────────────────────────────────────────────────
  function validateStep(step: number) {
    const e: Record<string, string> = {};
    if (step === 1 && !formData.selectedService) e.selectedService = m.quote_error_select_service();
    if (step === 2) {
      if (!formData.address) e.address = m.quote_error_address();
      if (!formData.city)    e.city    = m.quote_error_city();
      if (!formData.zipCode) e.zipCode = m.quote_error_zip();
      if (!formData.state)   e.state   = m.quote_error_state();
      if (formData.zipCode && !isValidZip) e.zipCode = m.quote_error_zip_area();
    }
    if (step === 3) {
      if (isTreeCare && treeCareInputs.shrubCount === 0 && treeCareInputs.treeCount === 0) {
        e.treeCount = m.quote_error_trees();
      }
    }
    if (step === 4) {
      if (!formData.firstName) e.firstName = m.quote_error_first_name();
      if (!formData.lastName)  e.lastName  = m.quote_error_last_name();
      if (!formData.email)     e.email     = m.quote_error_email();
      if (!formData.phone)     e.phone     = m.quote_error_phone();
    }
    errors = e;
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (validateStep(currentStep)) { currentStep++; errors = {}; }
    else toast.error(m.quote_error_check_fields());
  }
  function prevStep() { currentStep--; errors = {}; }

  // ── Quote submit ─────────────────────────────────────────────────────────
  async function submitQuote() {
    if (!validateStep(5)) return;
    submitting = true;
    try {
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`;
      let customerId: string;
      const { data: existing } = await supabase.from('customers').select('id').eq('email', formData.email).single();
      if (existing) {
        customerId = existing.id;
        if (formData.smsOptIn) {
          await supabase.from('customers').update({
            sms_opt_in: true,
            sms_opt_in_at: new Date().toISOString(),
          }).eq('id', existing.id);
        }
      } else {
        const { data: nc, error: ce } = await supabase.from('customers').insert({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email, phone: formData.phone, address: fullAddress,
          sms_opt_in: formData.smsOptIn,
          sms_opt_in_at: formData.smsOptIn ? new Date().toISOString() : null,
          frequency: formData.frequency,
        }).select().single();
        if (ce) throw ce;
        customerId = nc.id;
      }
      const { data: job, error: je } = await supabase.from('jobs').insert({
        customer_id:    customerId,
        service_type:   selectedServiceData!.name,
        description:    formData.additionalNotes || '',
        status:         'pending',
        scheduled_date: formData.startDate || new Date().toISOString(),
        price:          estimatedPrice,
        customer_phone: formData.phone,
        frequency: formData.frequency,
      }).select().single();
      if (je) throw je;
      contractData = {
        jobId: job.id, customerId,
        customerName:  `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email, customerPhone: formData.phone,
        services:  [selectedServiceData!.name],
        schedule:  `${formData.frequency} service starting ${formData.startDate || 'as soon as possible'}`,
        totalPrice: estimatedPrice || 0,
      };
      showQuoteOptions = true;
    } catch (e) {
      console.error('Quote submission error:', e);
      toast.error(m.quote_failed());
    } finally { submitting = false; }
  }

  function handleSignNow() { showQuoteOptions = false; showContract = true; }
  async function handleSignLater() {
    const res = await fetch('/api/send-quote-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: contractData.customerEmail, customerName: contractData.customerName,
        services: contractData.services, schedule: contractData.schedule,
        totalPrice: contractData.totalPrice, jobId: contractData.jobId,
      }),
    });
    showQuoteOptions = false;
    toast[res.ok ? 'success' : 'error'](
      res.ok ? m.quote_saved_email() : m.quote_saved_no_email()
    );
    setTimeout(() => { window.location.href = '/'; }, 2000);
  }
  function handleContractComplete() {
    showContract = false;
    toast.success(m.quote_signed());
    setTimeout(() => { window.location.href = '/'; }, 2000);
  }
  function handleContractCancel() { showContract = false; showQuoteOptions = true; }

  // ── Counter helper ───────────────────────────────────────────────────────
  function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
  }
</script>

<svelte:head>
  <title>{m.quote_title()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-10 sm:py-14">
  <div class="mx-auto max-w-2xl px-4 sm:px-6">

    <!-- ── Progress Stepper ── -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        {#each stepMeta as step, i}
          {@const num = i + 1}
          {@const done   = currentStep > num}
          {@const active = currentStep === num}
          <div class="flex items-center {num !== TOTAL_STEPS ? 'flex-1' : ''}">
            <div class="flex flex-col items-center">
              <div class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300
                {done   ? 'bg-green-600 text-white' :
                 active ? 'bg-green-600 text-white ring-4 ring-green-100' :
                          'bg-white text-gray-400 border-2 border-gray-200'}">
                {#if done}
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                {:else}{num}{/if}
              </div>
              <span class="mt-1.5 text-xs font-medium {active ? 'text-green-700' : 'text-gray-400'}">
                {step.label}
              </span>
            </div>
            {#if num !== TOTAL_STEPS}
              <div class="mx-2 mb-5 h-0.5 flex-1 transition-all duration-500
                {currentStep > num ? 'bg-green-500' : 'bg-gray-200'}"></div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- ── Card ── -->
    <div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">

      <!-- Header -->
      <div class="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-green-500 px-6 py-7 text-white">
        <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
        <div class="absolute -bottom-6 right-16 h-20 w-20 rounded-full bg-white/5"></div>
        <div class="relative">
          <div class="flex items-center justify-between mb-1">
            <div class="text-xs font-semibold uppercase tracking-widest text-green-200">
              {m.quote_step({ current: currentStep, total: TOTAL_STEPS })}
            </div>
            <LanguageToggle />
          </div>
          <h1 class="text-2xl font-bold leading-tight sm:text-3xl">
            {stepMeta[currentStep - 1].heading}
          </h1>
          <p class="mt-1.5 text-sm text-green-100">{stepMeta[currentStep - 1].sub}</p>
        </div>
      </div>

      <div class="p-6 sm:p-8">

        <!-- ══════════════════════════════════════════════════════════════════
             STEP 1 — Service Selection
        ══════════════════════════════════════════════════════════════════ -->
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
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  {:else if service.id === 'trimming-edging'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                  {:else if service.id === 'tree-care'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 14c.69-.36 1-.72 1-1.19C18 11.25 16.5 10 15 10c0-2.21-1.79-4-4-4S7 7.79 7 10c-1.5 0-3 1.25-3 2.81 0 .47.31.83 1 1.19"/><line x1="12" y1="22" x2="12" y2="14"/><path d="M9 18l3-3 3 3"/></svg>
                  {:else if service.id === 'seasonal-cleanup'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20"/><path d="M5 20V8l7-6 7 6v12"/><path d="M9 20v-5h6v5"/></svg>
                  {:else if service.id === 'landscape-maintenance'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  {:else if service.id === 'lawn-aeration'}
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22V12M12 12C12 12 8 10 8 6a4 4 0 018 0c0 4-4 6-4 6z"/>
                      <path d="M8 22h8"/>
                    </svg>
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-gray-900">{service.name}</span>
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full
                      {service.frequency === 'recurring' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}">
                      {service.frequency === 'recurring' ? m.quote_recurring() : service.frequency === 'seasonal' ? m.quote_seasonal() : m.quote_one_time()}
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
          </div>

        <!-- ══════════════════════════════════════════════════════════════════
             STEP 2 — Property / Address
        ══════════════════════════════════════════════════════════════════ -->
        {:else if currentStep === 2}
          <div class="space-y-5">

            <!-- Address input -->
            <div>
              <label for="address" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{m.quote_address_label()}</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <svg class="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <input
                  type="text" id="address"
                  bind:value={formData.address}
                  oninput={(e) => searchAddresses(e.currentTarget.value)}
                  onfocus={() => { if (addressSuggestions.length > 0) showSuggestions = true; }}
                  onblur={() => setTimeout(() => showSuggestions = false, 200)}
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  class:border-red-400={errors.address}
                  placeholder={m.quote_address_placeholder()}
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
                <label for="city" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{m.quote_city_label()}</label>
                <input
                  type="text" id="city" bind:value={formData.city} disabled={lookingUpAddress}
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-60 transition-all"
                  placeholder={lookingUpAddress ? m.quote_looking_up() : m.quote_city_label()}
                />
                {#if errors.city}<p class="mt-1 text-xs text-red-500">{errors.city}</p>{/if}
              </div>
              <div>
                <label for="zipCode" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{m.quote_zip_label()}</label>
                <input
                  type="text" id="zipCode" bind:value={formData.zipCode} onblur={validateZipCode} maxlength="5"
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  class:border-red-400={errors.zipCode || !isValidZip}
                  placeholder="60601"
                />
                {#if !isValidZip && formData.zipCode.length === 5}
                  <p class="mt-1 text-xs text-red-500 font-medium">{m.quote_no_service_area()}</p>
                {:else if errors.zipCode}
                  <p class="mt-1 text-xs text-red-500">{errors.zipCode}</p>
                {/if}
              </div>
            </div>

            <!-- Loading -->
            {#if lookingUpAddress}
              <div class="flex items-center gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                <svg class="h-4 w-4 shrink-0 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {m.quote_looking_up_property()}
              </div>

            <!-- Lot-based services: price shown here -->
            {:else if isLotBased && estimatedPrice && !showYardTiers}
              <div class="rounded-xl bg-green-600 p-4 text-white">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide text-green-200">{m.quote_estimated_price()}</p>
                    <p class="mt-0.5 text-3xl font-bold">${estimatedPrice}</p>
                  </div>
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <p class="mt-2 text-xs text-green-200">
                  {lotSizeIsEstimate ? m.quote_price_estimate_note() : m.quote_price_disclaimer()}
                </p>
              </div>

            <!-- Lot size fallback: tier selector + exact entry -->
            {:else if isLotBased && showYardTiers}
              <div class="space-y-3">
                <p class="text-sm font-semibold text-gray-700">{m.quote_select_yard_size()}</p>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {#each YARD_TIERS as tier}
                    <button
                      type="button"
                      onclick={() => selectYardTier(tier.id)}
                      class="flex flex-col items-center rounded-xl border-2 p-3 text-center transition-all
                        {selectedYardTier === tier.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-gray-50 hover:border-green-300'}"
                    >
                      <span class="text-lg font-bold text-green-700">{tier.label}</span>
                      <span class="mt-0.5 text-xs text-gray-500">{tier.sublabel}</span>
                    </button>
                  {/each}
                </div>

                {#if estimatedPrice && selectedYardTier}
                  <div class="rounded-xl bg-green-600 p-3 text-white flex items-center justify-between">
                    <span class="text-sm font-medium text-green-100">{m.quote_estimated_price_short()}</span>
                    <span class="text-2xl font-extrabold">${estimatedPrice}</span>
                  </div>
                {/if}

                <!-- Exact sqft toggle -->
                <button
                  type="button"
                  onclick={() => showExactSqft = !showExactSqft}
                  class="text-xs text-green-700 underline underline-offset-2"
                >
                  {showExactSqft ? m.quote_hide_exact() : m.quote_enter_exact()}
                </button>
                {#if showExactSqft}
                  <div class="flex gap-2">
                    <input
                      type="text" bind:value={manualSqft} placeholder={m.quote_lot_sqft_placeholder()}
                      class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    />
                    <span class="flex items-center text-xs font-medium text-gray-500">{m.quote_sq_ft()}</span>
                    <button
                      type="button" onclick={applyManualSqft}
                      class="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                    >
                      {m.quote_apply()}
                    </button>
                  </div>
                {/if}
              </div>

            <!-- Non-lot services: just confirm address is set -->
            {:else if !isLotBased && formData.address}
              <div class="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {m.quote_price_calculated_next()}
              </div>
            {/if}
          </div>

        <!-- ══════════════════════════════════════════════════════════════════
             STEP 3 — Service-specific Details
        ══════════════════════════════════════════════════════════════════ -->
        {:else if currentStep === 3}
          <div class="space-y-6">

            <!-- ── MOWING / EDGING: nothing extra needed ── -->
            {#if isLotBased}
              <div class="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                <p class="text-sm font-semibold text-green-800">{m.quote_price_already_calculated()}</p>
                <p class="mt-1 text-xs text-green-600">{m.quote_mowing_sub()}</p>
                {#if estimatedPrice}
                  <p class="mt-3 text-3xl font-extrabold text-green-700">${estimatedPrice}</p>
                {/if}
              </div>

            <!-- ── TREE / SHRUB CARE ── -->
            {:else if isTreeCare}
              <!-- Shrub count -->
              <div class="flex flex-col items-center">
                <label class="block text-center text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  {m.quote_shrubs_label()}
                </label>
                <div class="flex items-center gap-4">
                  <button type="button"
                    onclick={() => treeCareInputs.shrubCount = clamp(treeCareInputs.shrubCount - 1, 0, 50)}
                    class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">−</button>
                  <span class="w-12 text-center text-2xl font-bold text-gray-900">{treeCareInputs.shrubCount}</span>
                  <button type="button"
                    onclick={() => treeCareInputs.shrubCount = clamp(treeCareInputs.shrubCount + 1, 0, 50)}
                    class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">+</button>
                </div>
              </div>

              <!-- Shrub height -->
              {#if treeCareInputs.shrubCount > 0}
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{m.quote_shrub_height_label()}</label>
                  <div class="grid grid-cols-3 gap-3">
                    {#each [
                      { id: 'under-4ft', label: m.quote_shrub_under4(), sub: m.quote_shrub_under4_sub() },
                      { id: '4-8ft',     label: m.quote_shrub_4to8(),   sub: m.quote_shrub_4to8_sub()   },
                      { id: 'over-8ft',  label: m.quote_shrub_over8(),  sub: m.quote_shrub_over8_sub()  },
                    ] as h}
                      <button type="button"
                        onclick={() => treeCareInputs.shrubHeight = h.id as ShrubHeight}
                        class="rounded-xl border-2 p-3 text-center transition-all
                          {treeCareInputs.shrubHeight === h.id
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 bg-gray-50 hover:border-green-300'}">
                        <span class="block text-sm font-semibold text-gray-900">{h.label}</span>
                        <span class="block mt-0.5 text-xs text-gray-500">{h.sub}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Tree count -->
              <div class="flex flex-col items-center">
                <label class="block text-center text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  {m.quote_trees_label()}
                </label>
                <div class="flex items-center gap-4">
                  <button type="button"
                    onclick={() => treeCareInputs.treeCount = clamp(treeCareInputs.treeCount - 1, 0, 20)}
                    class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">−</button>
                  <span class="w-12 text-center text-2xl font-bold text-gray-900">{treeCareInputs.treeCount}</span>
                  <button type="button"
                    onclick={() => treeCareInputs.treeCount = clamp(treeCareInputs.treeCount + 1, 0, 20)}
                    class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">+</button>
                </div>
              </div>

              <!-- Condition -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{m.quote_trimmed_label()}</label>
                <div class="grid grid-cols-2 gap-3">
                  {#each [
                    { id: 'maintained', label: m.quote_maintained(), sub: m.quote_maintained_sub() },
                    { id: 'overgrown',  label: m.quote_overgrown(),  sub: m.quote_overgrown_sub()  },
                  ] as c}
                    <button type="button"
                      onclick={() => treeCareInputs.condition = c.id as TrimCondition}
                      class="rounded-xl border-2 p-3 text-center transition-all
                        {treeCareInputs.condition === c.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-gray-50 hover:border-green-300'}">
                      <span class="block text-sm font-semibold text-gray-900">{c.label}</span>
                      <span class="block mt-0.5 text-xs text-gray-500">{c.sub}</span>
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Work type -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{m.quote_work_type_label()}</label>
                <div class="grid grid-cols-2 gap-3">
                  {#each [
                    { id: 'trim-shape', label: m.quote_trim_shape(), sub: m.quote_trim_shape_sub() },
                    { id: 'removal',    label: m.quote_removal(),    sub: m.quote_removal_sub()    },
                  ] as w}
                    <button type="button"
                      onclick={() => treeCareInputs.workType = w.id as WorkType}
                      class="rounded-xl border-2 p-3 text-center transition-all
                        {treeCareInputs.workType === w.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-gray-50 hover:border-green-300'}">
                      <span class="block text-sm font-semibold text-gray-900">{w.label}</span>
                      <span class="block mt-0.5 text-xs text-gray-500">{w.sub}</span>
                    </button>
                  {/each}
                </div>
              </div>

              {#if errors.treeCount}
                <p class="text-sm text-red-600">{errors.treeCount}</p>
              {/if}

            <!-- ── CLEANUP / LANDSCAPE MAINTENANCE ── -->
            {:else if isCleanup || isLandscape}

              <!-- Debris level -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{m.quote_debris_label()}</label>
                <div class="grid grid-cols-3 gap-3">
                  {#each [
                    { id: 'light',    label: m.quote_debris_light(),    sub: m.quote_debris_light_sub()    },
                    { id: 'moderate', label: m.quote_debris_moderate(), sub: m.quote_debris_moderate_sub() },
                    { id: 'heavy',    label: m.quote_debris_heavy(),    sub: m.quote_debris_heavy_sub()    },
                  ] as d}
                    <button type="button"
                      onclick={() => {
                        if (isCleanup) cleanupInputs.debrisLevel = d.id as DebrisLevel;
                        else landscapeInputs.debrisLevel = d.id as DebrisLevel;
                      }}
                      class="rounded-xl border-2 p-3 text-center transition-all
                        {(isCleanup ? cleanupInputs : landscapeInputs).debrisLevel === d.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-gray-50 hover:border-green-300'}">
                      <span class="block text-sm font-semibold text-gray-900">{d.label}</span>
                      <span class="block mt-0.5 text-xs text-gray-500">{d.sub}</span>
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Bed count -->
              <div class="text-center">
                <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{m.quote_beds_label()}</label>
                <div class="flex items-center justify-center gap-5">
                  <button type="button"
                    onclick={() => {
                      if (isCleanup) cleanupInputs.bedCount = clamp(cleanupInputs.bedCount - 1, 0, 20);
                      else landscapeInputs.bedCount = clamp(landscapeInputs.bedCount - 1, 0, 20);
                    }}
                    class="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">−</button>
                  <div class="flex flex-col items-center">
                    <span class="text-4xl font-bold text-gray-900 w-16 text-center">
                      {isCleanup ? cleanupInputs.bedCount : landscapeInputs.bedCount}
                    </span>
                    <span class="text-xs text-gray-400 mt-0.5">{m.quote_beds_unit()}</span>
                  </div>
                  <button type="button"
                    onclick={() => {
                      if (isCleanup) cleanupInputs.bedCount = clamp(cleanupInputs.bedCount + 1, 0, 20);
                      else landscapeInputs.bedCount = clamp(landscapeInputs.bedCount + 1, 0, 20);
                    }}
                    class="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">+</button>
                </div>
              </div>

              <!-- Bed sqft -->
              {#if (isCleanup ? cleanupInputs.bedCount : landscapeInputs.bedCount) > 0}
                <div class="flex flex-col items-center">
                  <label class="block text-center text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    {m.quote_bed_area_label()} <span class="normal-case font-normal text-gray-400">{m.quote_optional()}</span>
                  </label>
                  <div class="flex items-center gap-2">
                    {#if isCleanup}
                      <input
                        type="number" min="0" max="5000"
                        bind:value={cleanupInputs.bedSqft}
                        placeholder={m.quote_bed_area_placeholder()}
                        class="w-40 rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      />
                    {:else}
                      <input
                        type="number" min="0" max="5000"
                        bind:value={landscapeInputs.bedSqft}
                        placeholder={m.quote_bed_area_placeholder()}
                        class="w-40 rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      />
                    {/if}
                    <span class="text-sm text-gray-500">{m.quote_bed_sqft_unit()}</span>
                  </div>
                </div>
              {/if}

              <!-- Hauling -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{m.quote_hauling_label()}</label>
                <div class="grid grid-cols-2 gap-3">
                  {#each [
                    { val: false, label: m.quote_no_hauling(),  sub: m.quote_no_hauling_sub()  },
                    { val: true,  label: m.quote_yes_hauling(), sub: m.quote_yes_hauling_sub() },
                  ] as h}
                    <button type="button"
                      onclick={() => {
                        if (isCleanup) cleanupInputs.needsHauling = h.val;
                        else landscapeInputs.needsHauling = h.val;
                      }}
                      class="rounded-xl border-2 p-3 text-center transition-all
                        {(isCleanup ? cleanupInputs : landscapeInputs).needsHauling === h.val
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-gray-50 hover:border-green-300'}">
                      <span class="block text-sm font-semibold text-gray-900">{h.label}</span>
                      <span class="block mt-0.5 text-xs text-gray-500">{h.sub}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Live price preview (non-lot services) -->
            {#if !isLotBased && estimatedPrice}
              <div class="rounded-xl bg-green-600 p-4 text-white">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide text-green-200">{m.quote_estimated_price()}</p>
                    <p class="mt-0.5 text-3xl font-bold">${estimatedPrice}</p>
                  </div>
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <p class="mt-2 text-xs text-green-200">{m.quote_price_updates()}</p>
              </div>
            {/if}
          </div>

        <!-- ══════════════════════════════════════════════════════════════════
             STEP 4 — Contact Info
        ══════════════════════════════════════════════════════════════════ -->
        {:else if currentStep === 4}
  <div class="space-y-5">
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="firstName" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{m.quote_first_name()}</label>
        <input type="text" id="firstName" bind:value={formData.firstName}
          class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
          class:border-red-400={errors.firstName} placeholder="Jane"/>
        {#if errors.firstName}<p class="mt-1 text-xs text-red-500">{errors.firstName}</p>{/if}
      </div>
      <div>
        <label for="lastName" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{m.quote_last_name()}</label>
        <input type="text" id="lastName" bind:value={formData.lastName}
          class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
          class:border-red-400={errors.lastName} placeholder="Smith"/>
        {#if errors.lastName}<p class="mt-1 text-xs text-red-500">{errors.lastName}</p>{/if}
      </div>
    </div>

    <div>
      <label for="email" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{m.quote_email()}</label>
      <div class="relative">
        <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <svg class="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <input type="email" id="email" bind:value={formData.email}
          class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
          class:border-red-400={errors.email} placeholder="jane@example.com"/>
      </div>
      {#if errors.email}<p class="mt-1 text-xs text-red-500">{errors.email}</p>{/if}
    </div>

    <div>
      <label for="phone" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{m.quote_phone()}</label>
      <div class="relative">
        <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <svg class="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </div>
        <input type="tel" id="phone" bind:value={formData.phone}
          class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
          class:border-red-400={errors.phone} placeholder="(219) 555-0100"/>
      </div>
      {#if errors.phone}<p class="mt-1 text-xs text-red-500">{errors.phone}</p>{/if}
      
      <div class="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Text Message Opt-In</p>
        
        <label class="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={formData.smsOptInTransactional}
            class="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500" />
          <span class="text-xs text-gray-600 leading-tight">
            {m.quote_sms_transactional_label()}
          </span>
        </label>

        <label class="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={formData.smsOptInMarketing}
            class="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500" />
          <span class="text-xs text-gray-600 leading-tight">
            {m.quote_sms_marketing_label()}
          </span>
        </label>

        <p class="text-[10px] text-gray-400 leading-tight pt-1 border-t border-gray-200">
          {m.quote_sms_disclaimer()} 
          <a href="/terms" class="underline hover:text-green-700">Terms</a> & 
          <a href="/privacy" class="underline hover:text-green-700">Privacy Policy</a>.
        </p>
      </div>
    </div>
  </div>

        <!-- ══════════════════════════════════════════════════════════════════
             STEP 5 — Review & Preferences
        ══════════════════════════════════════════════════════════════════ -->
        {:else if currentStep === 5}
          <div class="space-y-6">
            <!-- Frequency -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{m.quote_frequency_label()}</label>
              <div class="flex rounded-xl bg-gray-100 p-1">
                {#each [{value: 'weekly', label: m.quote_weekly()}, {value: 'biweekly', label: m.quote_biweekly()}] as freq}
                  <button type="button" onclick={() => formData.frequency = freq.value}
                    class="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200
                      {formData.frequency === freq.value ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
                    {freq.label}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Start date -->
            <div>
              <label for="startDate" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{m.quote_start_date()}</label>
              <input type="date" id="startDate" bind:value={formData.startDate}
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"/>
            </div>

            <!-- Notes -->
            <div>
              <label for="notes" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                {m.quote_notes_label()} <span class="normal-case font-normal text-gray-400">{m.quote_optional()}</span>
              </label>
              <textarea id="notes" bind:value={formData.additionalNotes} rows="3"
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all resize-none"
                placeholder={m.quote_notes_placeholder()}></textarea>
            </div>

            <!-- Payment method info card -->
            <div class="overflow-hidden rounded-xl border border-blue-100 bg-blue-50">
              <div class="flex items-center gap-3 border-b border-blue-100 bg-blue-600 px-4 py-3">
                <svg class="h-4 w-4 shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="20" height="14" x="2" y="5" rx="2"/>
                  <path d="M2 10h20"/>
                </svg>
                <p class="text-xs font-semibold uppercase tracking-wide text-white">{m.quote_payment_method()}</p>
              </div>
              <div class="p-4">
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <svg class="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="11" x="3" y="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-blue-900">{m.quote_card_on_file()}</p>
                    <p class="mt-1 text-xs leading-relaxed text-blue-700">
                      {m.quote_card_sub()}
                    </p>
                  </div>
                </div>
                <div class="mt-3 flex items-center gap-2 border-t border-blue-100 pt-3">
                  <svg class="h-3.5 w-3.5 shrink-0 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  <p class="text-xs text-blue-500">{m.quote_stripe_secure()}</p>
                </div>
              </div>
            </div>

            <!-- Summary -->
            <div class="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
              <div class="bg-gray-900 px-5 py-3">
                <h3 class="text-sm font-semibold text-white">{m.quote_summary()}</h3>
              </div>
              <div class="divide-y divide-gray-50 bg-white">
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-xs font-medium text-gray-500">{m.quote_summary_service()}</span>
                  <span class="text-sm font-semibold text-gray-900">{selectedServiceData?.name}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-xs font-medium text-gray-500">{m.quote_summary_address()}</span>
                  <span class="text-sm font-medium text-gray-700 text-right max-w-[60%]">{formData.address}, {formData.city}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-xs font-medium text-gray-500">{m.quote_summary_frequency()}</span>
                  <span class="text-sm font-medium capitalize text-gray-700">{formData.frequency}</span>
                </div>
                {#if estimatedPrice}
                  <div class="flex items-center justify-between bg-green-50 px-5 py-4">
                    <span class="text-sm font-bold text-gray-900">{m.quote_summary_price()}</span>
                    <span class="text-2xl font-extrabold text-green-600">${estimatedPrice}</span>
                  </div>
                {:else}
                  <div class="flex items-center justify-between bg-amber-50 px-5 py-4">
                    <span class="text-sm font-medium text-amber-800">{m.quote_summary_price()}</span>
                    <span class="text-sm font-semibold text-amber-700">{m.quote_price_after_confirm()}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- Navigation -->
        <div class="mt-8 flex items-center justify-between">
          {#if currentStep > 1}
            <button type="button" onclick={prevStep}
              class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50 transition-colors">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
              {m.quote_back()}
            </button>
          {:else}
            <div></div>
          {/if}

          {#if currentStep < TOTAL_STEPS}
            <button type="button" onclick={nextStep}
              class="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors">
              {m.quote_continue()}
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          {:else}
            <button type="button" onclick={submitQuote} disabled={submitting}
              class="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {submitting ? m.quote_processing() : m.quote_get_quote()}
              {#if !submitting}
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              {/if}
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Trust signals -->
    <div class="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
      <span class="flex items-center gap-1.5">
        <svg class="h-3.5 w-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        {m.quote_secure_private()}
      </span>
      <span class="flex items-center gap-1.5">
        <svg class="h-3.5 w-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {m.quote_responds()}
      </span>
      <span class="flex items-center gap-1.5">
        <svg class="h-3.5 w-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        {m.quote_no_commitment()}
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
        <h2 class="text-xl font-bold">{m.quote_ready()}</h2>
        <div class="mt-2 text-4xl font-extrabold">${contractData.totalPrice.toFixed(2)}</div>
        <p class="mt-1 text-sm text-green-100">{m.quote_price_label()} · {contractData.services[0]}</p>
      </div>
      <div class="p-6 space-y-3">
        <button onclick={handleSignNow} class="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
          {m.quote_sign_now()}
        </button>
        <button onclick={handleSignLater} class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          {m.quote_sign_later()}
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
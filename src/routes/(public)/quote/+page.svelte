<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { services, serviceAreas } from '$lib/data/services';
  import ContractAgreement from '$lib/components/ContractAgreement.svelte';
  import { toast } from 'svelte-sonner';
  import { debounce } from '$lib/utils';

  let addressSuggestions = $state<string[]>([]);
  let showSuggestions = $state(false);
  let lookingUpAddress = $state(false);

  // ZIP to State mapping
  const zipToState = {
    '46': 'IN',
    '60': 'IL',
  };

  function getStateFromZip(zip: string) {
    if (!zip || zip.length < 2) return '';
    return zipToState[zip.substring(0, 2)] || '';
  }

  // Form state
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

  const searchAddresses = debounce(async (query: string) => {
    if (query.length < 3) {
      addressSuggestions = [];
      showSuggestions = false;
      return;
    }
    try {
      const response = await fetch(`/api/autocomplete-address?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.predictions) {
        addressSuggestions = data.predictions.map((p: any) => p.description);
        showSuggestions = addressSuggestions.length > 0;
      }
    } catch (error) {
      console.error('Address search error:', error);
    }
  }, 300);

  async function selectAddress(address: string) {
    showSuggestions = false;
    addressSuggestions = [];
    lookingUpAddress = true;
    formData.city = '';
    formData.zipCode = '';

    try {
      const response = await fetch('/api/lookup-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      const result = await response.json();

      if (result.success && result.data) {
        const info = result.data;

        formData.address = info.street_address || address.split(',')[0];
        formData.city = info.city || '';
        formData.state = info.state || '';
        formData.zipCode = info.zip || '';

        isValidZip = serviceAreas.includes(formData.zipCode);

        if (info.lot_size_sqft && info.county) {
          await calculatePriceFromLotSize(info.lot_size_sqft, info.county);
        }

        errors = {};
      }
    } catch (error) {
      console.error('Address lookup failed:', error);
      toast.error('Could not load address details.');
    } finally {
      lookingUpAddress = false;
    }
  }

  // Auto-detect state from ZIP
  $effect(() => {
    if (formData.zipCode.length >= 2) {
      const detected = getStateFromZip(formData.zipCode);
      if (detected) formData.state = detected;
    }
  });

  // Pre-select service from URL param
  $effect(() => {
    const serviceParam = $page.url.searchParams.get('service');
    if (serviceParam) {
      const service = services.find(s => s.slug === serviceParam);
      if (service) formData.selectedService = service.id;
    }
  });

  let selectedServiceData = $derived(
    services.find(s => s.id === formData.selectedService)
  );

  function validateZipCode() {
    if (formData.zipCode.length === 5) {
      isValidZip = serviceAreas.includes(formData.zipCode);
    }
  }

  function validateStep(step: number) {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.selectedService) stepErrors.selectedService = 'Please select a service';
    }

    if (step === 2) {
      if (!formData.address) stepErrors.address = 'Address is required';
      if (!formData.city) stepErrors.city = 'City is required';
      if (!formData.zipCode) stepErrors.zipCode = 'ZIP code is required';
      if (!formData.state) stepErrors.state = 'State is required';
      if (formData.zipCode && !isValidZip) stepErrors.zipCode = "Sorry, we don't service this area yet";
    }

    if (step === 3) {
      if (!formData.firstName) stepErrors.firstName = 'First name is required';
      if (!formData.lastName) stepErrors.lastName = 'Last name is required';
      if (!formData.email) stepErrors.email = 'Email is required';
      if (!formData.phone) stepErrors.phone = 'Phone is required';
    }

    errors = stepErrors;
    return Object.keys(stepErrors).length === 0;
  }

  function nextStep() {
    if (validateStep(currentStep)) {
      currentStep++;
      errors = {};
    } else {
      toast.error('Please check the highlighted fields.');
    }
  }

  function prevStep() {
    currentStep--;
    errors = {};
  }

  async function submitQuote() {
    if (!validateStep(4)) return;

    submitting = true;

    try {
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`;

      let customerId;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone,
            address: fullAddress
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          customer_id: customerId,
          service_type: selectedServiceData!.name,
          description: formData.additionalNotes || '',
          status: 'pending',
          scheduled_date: formData.startDate || new Date().toISOString(),
          price: estimatedPrice,
          customer_phone: formData.phone
        })
        .select()
        .single();

      if (jobError) throw jobError;

      contractData = {
        jobId: job.id,
        customerId,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        services: [selectedServiceData!.name],
        schedule: `${formData.frequency} service starting ${formData.startDate || 'as soon as possible'}`,
        totalPrice: estimatedPrice || 0
      };

      showQuoteOptions = true;

    } catch (error) {
      console.error('Quote submission error:', error);
      toast.error('Failed to submit quote. Please try again.');
    } finally {
      submitting = false;
    }
  }

  function handleSignNow() {
    showQuoteOptions = false;
    showContract = true;
  }

  async function handleSignLater() {
    const response = await fetch('/api/send-quote-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: contractData.customerEmail,
        customerName: contractData.customerName,
        services: contractData.services,
        schedule: contractData.schedule,
        totalPrice: contractData.totalPrice,
        jobId: contractData.jobId
      })
    });

    showQuoteOptions = false;

    if (response.ok) {
      toast.success('Quote saved! Check your email for the contract signing link.');
    } else {
      toast.error('Quote saved, but email failed to send. Please contact us directly.');
    }

    setTimeout(() => { window.location.href = '/'; }, 2000);
  }

  function handleContractComplete() {
    showContract = false;
    toast.success("Thank you! Your service agreement has been signed. We'll contact you shortly.");
    setTimeout(() => { window.location.href = '/'; }, 2000);
  }

  function handleContractCancel() {
    showContract = false;
    showQuoteOptions = true;
  }

  async function calculatePriceFromLotSize(sqft: number, county: string) {
    if (!selectedServiceData) return;

    const { data: pricingRule } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('county', county)
      .eq('state', formData.state)
      .eq('service_type', selectedServiceData.name)
      .single();

    if (pricingRule) {
      let price = sqft * pricingRule.price_per_sqft;
      if (pricingRule.min_price && price < pricingRule.min_price) price = pricingRule.min_price;
      if (pricingRule.max_price && price > pricingRule.max_price) price = pricingRule.max_price;
      estimatedPrice = Math.round(price);
    } else {
      estimatedPrice = Math.max(60, Math.round(sqft * 0.01));
    }
  }
</script>

<svelte:head>
  <title>Get a Free Quote | Lawn Care Services</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-12">
  <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

    <!-- Progress Bar -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        {#each [
          { num: 1, label: 'Service' },
          { num: 2, label: 'Property' },
          { num: 3, label: 'Contact' },
          { num: 4, label: 'Details' }
        ] as step}
          <div class="flex items-center {step.num !== 4 ? 'flex-1' : ''}">
            <div class="flex flex-col items-center text-center">
              <div class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold
                {currentStep >= step.num ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}">
                {step.num}
              </div>
              <span class="mt-2 text-xs font-medium text-gray-600">{step.label}</span>
            </div>
            {#if step.num !== 4}
              <div class="mx-4 h-1 flex-1 rounded {currentStep > step.num ? 'bg-green-600' : 'bg-gray-200'}"></div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Form Card -->
    <div class="overflow-hidden rounded-xl bg-white shadow-lg">
      <div class="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8 text-white">
        <h1 class="text-3xl font-bold">Get Your Free Quote</h1>
        <p class="mt-2 text-green-100">Tell us about your property and we'll provide an instant estimate.</p>
      </div>

      <div class="p-6 sm:p-8">

        <!-- Step 1: Service Selection -->
        {#if currentStep === 1}
          <div class="space-y-6">
            <div>
              <label for="service-select" class="block text-sm font-medium text-gray-700">Select Service</label>
              <select
                id="service-select"
                bind:value={formData.selectedService}
                class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                class:border-red-500={errors.selectedService}
              >
                <option value="">Choose a service...</option>
                {#each services as service}
                  <option value={service.id}>{service.name}</option>
                {/each}
              </select>
              {#if errors.selectedService}
                <p class="mt-1 text-sm text-red-600">{errors.selectedService}</p>
              {/if}
            </div>

            <p class="text-sm text-gray-500">
              Your exact price will be calculated automatically based on your property's lot size after you enter your address.
            </p>
          </div>
        {/if}

        <!-- Step 2: Property Details -->
        {#if currentStep === 2}
          <div class="space-y-6">
            <div>
              <label for="address" class="block text-sm font-medium text-gray-700">Street Address</label>
              <div class="relative">
                <input
                  type="text"
                  id="address"
                  bind:value={formData.address}
                  oninput={(e) => searchAddresses(e.currentTarget.value)}
                  onfocus={() => { if (addressSuggestions.length > 0) showSuggestions = true; }}
                  onblur={() => setTimeout(() => showSuggestions = false, 200)}
                  class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  class:border-red-500={errors.address}
                  placeholder="123 Main St"
                  autocomplete="off"
                />

                {#if showSuggestions && addressSuggestions.length > 0}
                  <div class="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {#each addressSuggestions as suggestion}
                      <button
                        type="button"
                        onclick={() => selectAddress(suggestion)}
                        class="w-full text-left px-4 py-2 hover:bg-green-50 hover:text-green-800 text-sm border-b border-gray-50 last:border-none"
                      >
                        {suggestion}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
              {#if errors.address}
                <p class="mt-1 text-sm text-red-600">{errors.address}</p>
              {/if}
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
              <div>
                <label for="city" class="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  id="city"
                  bind:value={formData.city}
                  disabled={lookingUpAddress}
                  class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  class:bg-gray-100={lookingUpAddress}
                  placeholder={lookingUpAddress ? 'Looking up...' : 'City'}
                />
              </div>

              <div>
                <label for="zipCode" class="block text-sm font-medium text-gray-700">ZIP Code</label>
                <input
                  type="text"
                  id="zipCode"
                  bind:value={formData.zipCode}
                  onblur={validateZipCode}
                  maxlength="5"
                  class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  class:border-red-500={errors.zipCode || !isValidZip}
                  placeholder="60601"
                />
                {#if !isValidZip && formData.zipCode.length === 5}
                  <p class="mt-2 text-sm text-red-600 font-medium">📍 Area not serviced yet.</p>
                {:else if errors.zipCode}
                  <p class="mt-2 text-sm text-red-600">{errors.zipCode}</p>
                {/if}
              </div>
            </div>

            <!-- Price shown immediately after address lookup on this step -->
            {#if lookingUpAddress}
              <div class="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 animate-pulse">
                Calculating price for your property...
              </div>
            {:else if estimatedPrice}
              <div class="rounded-lg bg-green-50 p-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-green-900">Estimated Price:</span>
                  <span class="text-2xl font-bold text-green-600">${estimatedPrice}</span>
                </div>
                <p class="mt-1 text-xs text-green-700">Based on your property's lot size. Final price may vary based on property condition.</p>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Step 3: Contact Info -->
        {#if currentStep === 3}
          <div class="space-y-6">
            <div class="grid gap-6 sm:grid-cols-2">
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  bind:value={formData.firstName}
                  class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 placeholder:text-gray-400"
                  class:border-red-500={errors.firstName}
                />
                {#if errors.firstName}
                  <p class="mt-1 text-sm text-red-600">{errors.firstName}</p>
                {/if}
              </div>

              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  bind:value={formData.lastName}
                  class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 placeholder:text-gray-400"
                  class:border-red-500={errors.lastName}
                />
                {#if errors.lastName}
                  <p class="mt-1 text-sm text-red-600">{errors.lastName}</p>
                {/if}
              </div>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray/700">Email</label>
              <input
                type="email"
                id="email"
                bind:value={formData.email}
                class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 placeholder:text-gray-400"
                class:border-red-500={errors.email}
                placeholder="you@example.com"
              />
              {#if errors.email}
                <p class="mt-1 text-sm text-red-600">{errors.email}</p>
              {/if}
            </div>

            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                id="phone"
                bind:value={formData.phone}
                class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 placeholder:text-gray-400"
                class:border-red-500={errors.phone}
                placeholder="(866) 873-2789"
              />
              {#if errors.phone}
                <p class="mt-1 text-sm text-red-600">{errors.phone}</p>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Step 4: Preferences -->
        {#if currentStep === 4}
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700">Service Frequency</label>
              <div class="mt-2 grid gap-3 sm:grid-cols-2">
                {#each [{value: 'weekly', label: 'Weekly'}, {value: 'biweekly', label: 'Bi-Weekly'}] as freq}
                  <button
                    type="button"
                    onclick={() => formData.frequency = freq.value}
                    class="rounded-lg border-2 p-3 text-center transition-all {formData.frequency === freq.value ? 'border-green-600 bg-green-50' : 'border-gray-300'}"
                  >
                    <div class="text-sm font-semibold text-gray-900">{freq.label}</div>
                  </button>
                {/each}
              </div>
            </div>

            <div>
              <label for="startDate" class="block text-sm font-medium text-gray-700">Preferred Start Date</label>
              <input
                type="date"
                id="startDate"
                bind:value={formData.startDate}
                class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <label for="notes" class="block text-sm font-medium text-gray-700">Additional Notes (Optional)</label>
              <textarea
                id="notes"
                bind:value={formData.additionalNotes}
                rows="4"
                class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 placeholder:text-gray-400"
                placeholder="Any specific concerns, gate codes, or special instructions..."
              ></textarea>
            </div>

            <!-- Summary -->
            <div class="rounded-lg border-2 border-green-200 bg-green-50 p-6">
              <h3 class="text-lg font-semibold text-gray-900">Quote Summary</h3>
              <div class="mt-4 space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Service:</span>
                  <span class="font-medium text-gray-900">{selectedServiceData?.name}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Address:</span>
                  <span class="font-medium text-gray-900">{formData.address}, {formData.city}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Frequency:</span>
                  <span class="font-medium capitalize text-gray-900">{formData.frequency}</span>
                </div>
                {#if estimatedPrice}
                  <div class="mt-4 flex justify-between border-t border-green-200 pt-4">
                    <span class="font-semibold text-gray-900">Estimated Price:</span>
                    <span class="text-2xl font-bold text-green-600">${estimatedPrice}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- Navigation Buttons -->
        <div class="mt-8 flex justify-between">
          {#if currentStep > 1}
            <button
              type="button"
              onclick={prevStep}
              class="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Back
            </button>
          {:else}
            <div></div>
          {/if}

          {#if currentStep < 4}
            <button
              type="button"
              onclick={nextStep}
              class="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
            >
              Continue
            </button>
          {:else}
            <button
              type="button"
              onclick={submitQuote}
              disabled={submitting}
              class="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Get Quote'}
            </button>
          {/if}
        </div>

        <!-- Trust Signals -->
        <div class="mt-8 text-center text-sm text-gray-600">
          <div class="flex items-center justify-center gap-2 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-green-600">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p>Your information is secure and will never be shared</p>
          </div>
          <p class="mt-2 flex items-center justify-center gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            We typically respond within 24 hours
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Quote Options Modal -->
{#if showQuoteOptions && contractData}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => (showQuoteOptions = false)}>
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full" onclick={(e) => e.stopPropagation()}>
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">Quote Ready!</h2>
      </div>
      <div class="p-6 space-y-4">
        <div class="text-center">
          <div class="text-4xl font-bold text-green-600 mb-2">
            ${contractData.totalPrice.toFixed(2)}
          </div>
          <p class="text-sm text-gray-600">Estimated price for your service</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-sm">
          <p><strong>Service:</strong> {contractData.services[0]}</p>
          <p class="mt-1"><strong>Schedule:</strong> {contractData.schedule}</p>
        </div>
        <p class="text-sm text-gray-600 text-center">
          Would you like to sign the service agreement now or receive a link via email to sign later?
        </p>
      </div>
      <div class="px-6 py-4 border-t border-gray-200 space-y-3">
        <button onclick={handleSignNow} class="w-full px-4 py-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700">
          Sign Agreement Now
        </button>
        <button onclick={handleSignLater} class="w-full px-4 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
          Email Me a Link to Sign Later
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Contract Modal -->
{#if showContract && contractData}
  <ContractAgreement
    {contractData}
    onComplete={handleContractComplete}
    onCancel={handleContractCancel}
  />
{/if}

<style>
  input::placeholder {
    color: #9ca3af;
    opacity: 0.6;
  }
</style>
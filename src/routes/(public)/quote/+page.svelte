<script>
  // src/routes/(public)/quote/+page.svelte
  import { page } from '$app/stores';
  import { services, serviceAreas } from '$lib/data/services';
  
  // Form state
  let currentStep = $state(1);
  let formData = $state({
    // Step 1: Service Selection
    selectedService: '',
    propertySize: '',
    
    // Step 2: Property Details
    address: '',
    city: '',
    state: 'GA',
    zipCode: '',
    
    // Step 3: Contact Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Step 4: Preferences
    frequency: 'weekly',
    startDate: '',
    additionalNotes: ''
  });
  
  let errors = $state({});
  let isValidZip = $state(true);
  let estimatedPrice = $state(null);
  
  // Pre-select service from URL query param
  $effect(() => {
    const serviceParam = $page.url.searchParams.get('service');
    if (serviceParam) {
      const service = services.find(s => s.slug === serviceParam);
      if (service) {
        formData.selectedService = service.id;
      }
    }
  });
  
  // Calculate estimated price based on service and property size
  let selectedServiceData = $derived(
    services.find(s => s.id === formData.selectedService)
  );
  
  $effect(() => {
    if (selectedServiceData && formData.propertySize) {
      const pricing = selectedServiceData.pricing.find(p => p.tier === formData.propertySize);
      if (pricing) {
        estimatedPrice = pricing.price;
      }
    }
  });
  
  // Validate ZIP code against service areas
  function validateZipCode() {
    if (formData.zipCode.length === 5) {
      isValidZip = serviceAreas.includes(formData.zipCode);
    }
  }
  
  function validateStep(step) {
    const stepErrors = {};
    
    if (step === 1) {
      if (!formData.selectedService) stepErrors.selectedService = 'Please select a service';
      if (!formData.propertySize) stepErrors.propertySize = 'Please select property size';
    }
    
    if (step === 2) {
      if (!formData.address) stepErrors.address = 'Address is required';
      if (!formData.city) stepErrors.city = 'City is required';
      if (!formData.zipCode) stepErrors.zipCode = 'ZIP code is required';
      if (formData.zipCode && !isValidZip) stepErrors.zipCode = 'Sorry, we don\'t service this area yet';
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
    }
  }
  
  function prevStep() {
    currentStep--;
    errors = {};
  }
  
  async function submitQuote() {
    if (!validateStep(4)) return;
    
    // TODO: Submit to backend
    console.log('Quote Request:', formData);
    
    // For now, show success
    alert('Quote request submitted! We\'ll contact you within 24 hours.');
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
        {#each [1, 2, 3, 4] as step}
          <div class="flex flex-1 items-center">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors"
              class:border-green-600={currentStep >= step}
              class:bg-green-600={currentStep >= step}
              class:text-white={currentStep >= step}
              class:border-gray-300={currentStep < step}
              class:bg-white={currentStep < step}
              class:text-gray-400={currentStep < step}
            >
              {step}
            </div>
            {#if step < 4}
              <div
                class="h-1 flex-1 transition-colors"
                class:bg-green-600={currentStep > step}
                class:bg-gray-300={currentStep <= step}
              />
            {/if}
          </div>
        {/each}
      </div>
      <div class="mt-2 flex justify-between text-xs text-gray-600">
        <span>Service</span>
        <span>Property</span>
        <span>Contact</span>
        <span>Details</span>
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
              <label class="block text-sm font-medium text-gray-700">Select Service</label>
              <select
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

            <div>
              <label class="block text-sm font-medium text-gray-700">Property Size</label>
              <div class="mt-2 grid gap-3 sm:grid-cols-3">
                {#each ['small', 'medium', 'large'] as size}
                  <button
                    type="button"
                    onclick={() => formData.propertySize = size}
                    class="rounded-lg border-2 p-4 text-center transition-all"
                    class:border-green-600={formData.propertySize === size}
                    class:bg-green-50={formData.propertySize === size}
                    class:border-gray-300={formData.propertySize !== size}
                  >
                    <div class="text-sm font-semibold capitalize text-gray-900">{size}</div>
                    <div class="mt-1 text-xs text-gray-600">
                      {size === 'small' ? '< 5,000 sq ft' : size === 'medium' ? '5,000-10,000 sq ft' : '> 10,000 sq ft'}
                    </div>
                  </button>
                {/each}
              </div>
              {#if errors.propertySize}
                <p class="mt-1 text-sm text-red-600">{errors.propertySize}</p>
              {/if}
            </div>

            {#if estimatedPrice}
              <div class="rounded-lg bg-green-50 p-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-green-900">Estimated Price:</span>
                  <span class="text-2xl font-bold text-green-600">${estimatedPrice}</span>
                </div>
                <p class="mt-1 text-xs text-green-700">Final price may vary based on property condition</p>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Step 2: Property Details -->
        {#if currentStep === 2}
          <div class="space-y-6">
            <div>
              <label for="address" class="block text-sm font-medium text-gray-700">Street Address</label>
              <input
                type="text"
                id="address"
                bind:value={formData.address}
                class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                class:border-red-500={errors.address}
                placeholder="123 Main St"
              />
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
                  class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  class:border-red-500={errors.city}
                  placeholder="Atlanta"
                />
                {#if errors.city}
                  <p class="mt-1 text-sm text-red-600">{errors.city}</p>
                {/if}
              </div>

              <div>
                <label for="state" class="block text-sm font-medium text-gray-700">State</label>
                <select
                  id="state"
                  bind:value={formData.state}
                  class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="GA">Georgia</option>
                </select>
              </div>
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
                placeholder="30301"
              />
              {#if errors.zipCode}
                <p class="mt-1 text-sm text-red-600">{errors.zipCode}</p>
              {:else if formData.zipCode && !isValidZip}
                <p class="mt-1 text-sm text-red-600">We don't currently service this area. Enter your email to be notified when we do!</p>
              {:else if formData.zipCode && isValidZip}
                <p class="mt-1 text-sm text-green-600">✓ We service your area!</p>
              {/if}
            </div>
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
                  class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
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
                  class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  class:border-red-500={errors.lastName}
                />
                {#if errors.lastName}
                  <p class="mt-1 text-sm text-red-600">{errors.lastName}</p>
                {/if}
              </div>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                id="email"
                bind:value={formData.email}
                class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
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
                class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                class:border-red-500={errors.phone}
                placeholder="(555) 123-4567"
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
              <div class="mt-2 grid gap-3 sm:grid-cols-3">
                {#each [{value: 'weekly', label: 'Weekly'}, {value: 'biweekly', label: 'Bi-Weekly'}, {value: 'monthly', label: 'Monthly'}] as freq}
                  <button
                    type="button"
                    onclick={() => formData.frequency = freq.value}
                    class="rounded-lg border-2 p-3 text-center transition-all"
                    class:border-green-600={formData.frequency === freq.value}
                    class:bg-green-50={formData.frequency === freq.value}
                    class:border-gray-300={formData.frequency !== freq.value}
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
                class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="Any specific concerns, gate codes, or special instructions..."
              />
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
                  <span class="text-gray-600">Property Size:</span>
                  <span class="font-medium capitalize text-gray-900">{formData.propertySize}</span>
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
              class="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
            >
              Submit Quote Request
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Trust Signals -->
    <div class="mt-8 text-center text-sm text-gray-600">
      <p>🔒 Your information is secure and will never be shared</p>
      <p class="mt-1">We typically respond within 24 hours</p>
    </div>
  </div>
</div>
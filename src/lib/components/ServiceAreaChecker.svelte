<script>
  // src/lib/components/ServiceAreaChecker.svelte
  import { serviceAreas } from '$lib/data/services';
  
  let zipCode = $state('');
  let isChecking = $state(false);
  let result = $state(null);
  
  async function checkServiceArea() {
    if (zipCode.length !== 5) return;
    
    isChecking = true;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const isServiced = serviceAreas.includes(zipCode);
    result = {
      isServiced,
      zipCode
    };
    
    isChecking = false;
  }
  
  function reset() {
    zipCode = '';
    result = null;
  }
</script>

<div class="w-full max-w-md">
  {#if !result}
    <div class="space-y-4">
      <div>
        <label for="zipCode" class="block text-sm font-medium text-gray-700">
          Enter Your ZIP Code
        </label>
        <div class="mt-2 flex gap-3">
          <input
            type="text"
            id="zipCode"
            bind:value={zipCode}
            maxlength="5"
            placeholder="30301"
            class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            onkeydown={(e) => e.key === 'Enter' && checkServiceArea()}
          />
          <button
            type="button"
            onclick={checkServiceArea}
            disabled={zipCode.length !== 5 || isChecking}
            class="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Check'}
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="space-y-4">
      {#if result.isServiced}
        <div class="rounded-lg border-2 border-green-200 bg-green-50 p-6">
          <div class="flex items-start gap-3">
            <svg class="h-6 w-6 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 class="text-lg font-semibold text-green-900">Great news!</h3>
              <p class="mt-1 text-sm text-green-800">
                We service ZIP code {result.zipCode}. Get your free quote today!
              </p>
              <div class="mt-4 flex gap-3">
                <a
                  href="/quote"
                  class="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                >
                  Get Free Quote
                  <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>
                <button
                  type="button"
                  onclick={reset}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Check Another
                </button>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="rounded-lg border-2 border-orange-200 bg-orange-50 p-6">
          <div class="flex items-start gap-3">
            <svg class="h-6 w-6 flex-shrink-0 text-orange-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <h3 class="text-lg font-semibold text-orange-900">Not quite yet...</h3>
              <p class="mt-1 text-sm text-orange-800">
                We don't currently service ZIP code {result.zipCode}, but we're expanding!
              </p>
              <div class="mt-4">
                <p class="text-sm font-medium text-orange-900">Want to be notified when we expand to your area?</p>
                <div class="mt-3 flex gap-3">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    class="whitespace-nowrap rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
                  >
                    Notify Me
                  </button>
                </div>
                <button
                  type="button"
                  onclick={reset}
                  class="mt-3 text-sm font-medium text-orange-700 hover:text-orange-800"
                >
                  ← Check a different ZIP code
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
<script>
  import { services } from '$lib/data/services';
  import ServiceIcon from '$lib/components/ServiceIcon.svelte';
  import { siteConfig } from '$lib/config/site';
  
  let selectedFrequency = $state('all');
  
  let filteredServices = $derived(
    selectedFrequency === 'all'
      ? services
      : services.filter(s => s.frequency === selectedFrequency)
  );
</script>

<svelte:head>
  <title>Our Services | Professional Lawn Care & Landscaping</title>
  <meta name="description" content="Professional lawn care and landscaping services including mowing, fertilization, aeration, and more." />
</svelte:head>

<!-- Hero Section -->
<section class="relative overflow-hidden bg-gray-900">
  <!-- Background Image with Overlay -->
  <div class="absolute inset-0">
    <img 
      src={siteConfig.images.servicesHero} 
      alt="Professional lawn care services" 
      class="h-full w-full object-cover opacity-40"
    />
    <div class="absolute inset-0 bg-gradient-to-br from-green-900/80 via-green-800/70 to-green-700/60"></div>
  </div>

  <div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
        Professional Lawn Care Services
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-xl text-green-100">
        From weekly mowing to seasonal treatments, we keep your lawn healthy and beautiful year-round.
      </p>
      <div class="mt-8 flex justify-center gap-4">
        <a
          href="/quote"
          class="rounded-lg bg-white px-8 py-3 text-base font-semibold text-green-700 shadow-lg hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-700"
        >
          Get Free Quote
        </a>
        <a
          href="#services"
          class="rounded-lg border-2 border-white bg-transparent px-8 py-3 text-base font-semibold text-white hover:bg-white hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-700"
        >
          View Services
        </a>
      </div>
    </div>
  </div>
</section>

<!-- Filter Section -->
<section id="services" class="border-b bg-white py-8">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex flex-col items-center gap-4">
      <h2 class="text-2xl font-bold text-gray-900">Our Services</h2>
      <div class="flex gap-2">
        <button
          onclick={() => selectedFrequency = 'all'}
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          class:bg-green-600={selectedFrequency === 'all'}
          class:text-white={selectedFrequency === 'all'}
          class:bg-gray-100={selectedFrequency !== 'all'}
          class:text-gray-700={selectedFrequency !== 'all'}
        >
          All Services
        </button>
        <button
          onclick={() => selectedFrequency = 'recurring'}
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          class:bg-green-600={selectedFrequency === 'recurring'}
          class:text-white={selectedFrequency === 'recurring'}
          class:bg-gray-100={selectedFrequency !== 'recurring'}
          class:text-gray-700={selectedFrequency !== 'recurring'}
        >
          Recurring
        </button>
        <button
          onclick={() => selectedFrequency = 'seasonal'}
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          class:bg-green-600={selectedFrequency === 'seasonal'}
          class:text-white={selectedFrequency === 'seasonal'}
          class:bg-gray-100={selectedFrequency !== 'seasonal'}
          class:text-gray-700={selectedFrequency !== 'seasonal'}
        >
          Seasonal
        </button>
      </div>
    </div>
  </div>
</section>

<!-- Services Grid -->
<section class="bg-gray-50 py-16">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex flex-wrap justify-center gap-8">
      {#each filteredServices as service (service.id)}
        <div class="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-lg w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)]">
          <!-- Rest of the service card code stays the same -->
          <!-- Service Header -->
          <div class="border-b bg-gradient-to-r from-green-50 to-green-100 p-6">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <ServiceIcon name={service.icon} class="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 class="text-xl font-bold text-gray-900">{service.name}</h3>
                <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 capitalize">
                  {service.frequency}
                </span>
              </div>
            </div>
          </div>

          <!-- Service Content -->
          <div class="flex flex-1 flex-col p-6">
            <p class="text-gray-600">{service.description}</p>

            <!-- Features -->
            <div class="mt-6">
              <h4 class="text-sm font-semibold text-gray-900">What's Included:</h4>
              <ul class="mt-3 space-y-2">
                {#each service.features as feature}
                  <li class="flex items-start gap-2 text-sm text-gray-600">
                    <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                {/each}
              </ul>
            </div>

            <!-- Pricing -->
            <div class="mt-6">
            <a
              href="/quote?service={service.slug}"
              class="block w-full rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Get Custom Quote
            </a>
          </div>

            <!-- CTA -->
            <div class="mt-6">
              <a
                href="/quote?service={service.slug}"
                class="block w-full rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Request Quote
              </a>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Trust Section -->
<section class="bg-white py-16">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">Why Choose Us?</h2>
      <div class="mt-12 grid gap-8 md:grid-cols-3">
        <div class="flex flex-col items-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-semibold text-gray-900">Licensed & Insured</h3>
          <p class="mt-2 text-center text-gray-600">Fully licensed, bonded, and insured for your peace of mind.</p>
        </div>
        <div class="flex flex-col items-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-semibold text-gray-900">On-Time Service</h3>
          <p class="mt-2 text-center text-gray-600">Reliable scheduling and timely arrivals, every time.</p>
        </div>
        <div class="flex flex-col items-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-semibold text-gray-900">100% Satisfaction</h3>
          <p class="mt-2 text-center text-gray-600">We guarantee your satisfaction or we'll make it right.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CTA Section -->
<section class="bg-green-600 py-16">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-white">Ready to Get Started?</h2>
      <p class="mt-4 text-xl text-green-100">Get a free quote in less than 2 minutes.</p>
      <div class="mt-8">
        <a
          href="/quote"
          class="inline-flex items-center rounded-lg bg-white px-8 py-3 text-base font-semibold text-green-600 shadow-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-600"
        >
          Get Free Quote
          <svg class="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</section>
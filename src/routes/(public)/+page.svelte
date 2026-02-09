<script>
  // src/routes/(public)/+page.svelte
  import ServiceAreaChecker from '$lib/components/ServiceAreaChecker.svelte';
  
  const stats = [
    { label: 'Happy Customers', value: '2,500+' },
    { label: 'Lawns Serviced', value: '50,000+' },
    { label: 'Years Experience', value: '15+' },
    { label: 'Service Areas', value: '40+' }
  ];
  
  const topServices = [
    {
      name: 'Lawn Mowing',
      description: 'Weekly or bi-weekly professional mowing service',
      price: 'From $60',
      icon: '🌱',
      href: '/quote?service=lawn-mowing'
    },
    {
      name: 'Fertilization',
      description: 'Professional-grade lawn treatment programs',
      price: 'From $95',
      icon: '🌿',
      href: '/quote?service=fertilization-weed-control'
    },
    {
      name: 'Landscape Care',
      description: 'Complete landscape maintenance and design',
      price: 'From $195',
      icon: '🌳',
      href: '/quote?service=landscape-maintenance'
    }
  ];
  
  const testimonials = [
    {
      name: 'Sarah Johnson',
      location: 'Buckhead, GA',
      text: 'Best lawn service we\'ve ever used! Our yard has never looked better and the team is always on time.',
      rating: 5
    },
    {
      name: 'Michael Chen',
      location: 'Midtown, GA',
      text: 'Professional, reliable, and affordable. They transformed our overgrown yard into something we\'re proud of.',
      rating: 5
    },
    {
      name: 'Jennifer Williams',
      location: 'Decatur, GA',
      text: 'Great communication and attention to detail. They even clean up after themselves - highly recommend!',
      rating: 5
    }
  ];
</script>

<svelte:head>
  <title>Professional Lawn Care & Landscaping Services | Cruz Crewz</title>
  <meta name="description" content="Professional lawn mowing, fertilization, and landscaping services. Get your free quote today!" />
</svelte:head>

<!-- Hero Section -->
<section class="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-green-800">
  <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
  
  <div class="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
    <div class="grid gap-12 lg:grid-cols-2 lg:gap-8">
      <!-- Left Column - Hero Content -->
      <div class="flex flex-col justify-center">
        <h1 class="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Your Lawn, Perfected
        </h1>
        <p class="mt-6 text-xl text-green-100">
          Professional lawn care and landscaping services that keep your property looking its best, all year round.
        </p>
        
        <div class="mt-8 flex flex-wrap gap-4">
          <a
            href="/quote"
            class="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-green-700 shadow-lg transition-all hover:bg-green-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-700"
          >
            Get Free Quote
            <svg class="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <a
            href="/services"
            class="inline-flex items-center justify-center rounded-lg border-2 border-white bg-transparent px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-700"
          >
            View Services
          </a>
        </div>
        
        <!-- Trust Badges -->
        <div class="mt-12 flex flex-wrap items-center gap-6">
          <div class="flex items-center gap-2 text-white">
            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span class="text-sm font-medium">4.9/5 Rating</span>
          </div>
          <div class="flex items-center gap-2 text-white">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
            <span class="text-sm font-medium">Licensed & Insured</span>
          </div>
          <div class="flex items-center gap-2 text-white">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span class="text-sm font-medium">2,500+ Customers</span>
          </div>
        </div>
      </div>
      
      <!-- Right Column - Service Area Checker -->
      <div class="flex items-center justify-center">
        <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Check Service Area</h2>
            <p class="mt-2 text-sm text-gray-600">Enter your ZIP code to see if we service your area</p>
          </div>
          <ServiceAreaChecker />
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Stats Section -->
<section class="border-b bg-white py-12">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
      {#each stats as stat}
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">{stat.value}</div>
          <div class="mt-2 text-sm font-medium text-gray-600">{stat.label}</div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Top Services Section -->
<section class="bg-gray-50 py-20">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Our Most Popular Services
      </h2>
      <p class="mt-4 text-lg text-gray-600">
        Professional lawn care solutions tailored to your needs
      </p>
    </div>
    
    <div class="mt-16 grid gap-8 md:grid-cols-3">
      {#each topServices as service}
        <div class="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-sm transition-all hover:shadow-xl">
          <div class="text-5xl mb-4">{service.icon}</div>
          <h3 class="text-xl font-bold text-gray-900">{service.name}</h3>
          <p class="mt-2 text-gray-600">{service.description}</p>
          <div class="mt-4 flex items-baseline justify-between">
            <span class="text-2xl font-bold text-green-600">{service.price}</span>
          </div>
          <a
            href={service.href}
            class="mt-6 block w-full rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            Get Quote
          </a>
        </div>
      {/each}
    </div>
    
    <div class="mt-12 text-center">
      <a
        href="/services"
        class="inline-flex items-center text-base font-semibold text-green-600 hover:text-green-700"
      >
        View All Services
        <svg class="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </a>
    </div>
  </div>
</section>

<!-- How It Works Section -->
<section class="bg-white py-20">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        How It Works
      </h2>
      <p class="mt-4 text-lg text-gray-600">
        Getting started is easy - just three simple steps
      </p>
    </div>
    
    <div class="mt-16 grid gap-12 md:grid-cols-3">
      <div class="text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <span class="text-2xl font-bold text-green-600">1</span>
        </div>
        <h3 class="mt-6 text-xl font-bold text-gray-900">Get Your Quote</h3>
        <p class="mt-2 text-gray-600">
          Tell us about your property and the services you need. Get an instant estimate in under 2 minutes.
        </p>
      </div>
      
      <div class="text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <span class="text-2xl font-bold text-green-600">2</span>
        </div>
        <h3 class="mt-6 text-xl font-bold text-gray-900">Schedule Service</h3>
        <p class="mt-2 text-gray-600">
          Choose your preferred start date and frequency. We'll take care of the rest and keep you updated.
        </p>
      </div>
      
      <div class="text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <span class="text-2xl font-bold text-green-600">3</span>
        </div>
        <h3 class="mt-6 text-xl font-bold text-gray-900">Enjoy Your Lawn</h3>
        <p class="mt-2 text-gray-600">
          Sit back and relax while our professional team keeps your lawn looking perfect all season long.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- Testimonials Section -->
<section class="bg-green-50 py-20">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        What Our Customers Say
      </h2>
      <p class="mt-4 text-lg text-gray-600">
        Don't just take our word for it
      </p>
    </div>
    
    <div class="mt-16 grid gap-8 md:grid-cols-3">
      {#each testimonials as testimonial}
        <div class="rounded-2xl bg-white p-8 shadow-sm">
          <div class="flex gap-1 text-yellow-400">
            {#each Array(testimonial.rating) as _}
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            {/each}
          </div>
          <p class="mt-4 text-gray-700">{testimonial.text}</p>
          <div class="mt-6">
            <div class="font-semibold text-gray-900">{testimonial.name}</div>
            <div class="text-sm text-gray-600">{testimonial.location}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- CTA Section -->
<section class="bg-green-600 py-16">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="rounded-2xl bg-green-700 px-8 py-12 text-center shadow-xl">
      <h2 class="text-3xl font-bold text-white sm:text-4xl">
        Ready for a Beautiful Lawn?
      </h2>
      <p class="mt-4 text-xl text-green-100">
        Get your free, no-obligation quote in less than 2 minutes
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-4">
        <a
          href="/quote"
          class="inline-flex items-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-green-700 shadow-lg transition-all hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-700"
        >
          Get Free Quote
          <svg class="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
        <a
          href="tel:555-123-4567"
          class="inline-flex items-center rounded-lg border-2 border-white bg-transparent px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-700"
        >
          <svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          Call (555) 123-4567
        </a>
      </div>
    </div>
  </div>
</section>
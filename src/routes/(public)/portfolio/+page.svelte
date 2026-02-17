<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  let portfolioItems = $state([]);
  let loading = $state(true);

  onMount(async () => {
    const { data } = await supabase
      .from('portfolio')
      .select('*')
      .order('date', { ascending: false });
    portfolioItems = data || [];
    loading = false;
  });
</script>

<svelte:head>
  <title>Our Work | Cruz Crewz Portfolio</title>
  <meta name="description" content="See our lawn care transformations and landscaping projects." />
</svelte:head>

<!-- Hero Section -->
<section class="bg-gradient-to-br from-green-600 to-green-800 py-20">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Our Portfolio
      </h1>
      <p class="mt-4 text-xl text-green-100">
        See the transformations we've made for homeowners across Illinois and Indiana
      </p>
    </div>
  </div>
</section>

<!-- Portfolio Grid -->
<section class="bg-gray-50 py-20">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    {#if loading}
      <div class="flex items-center justify-center py-20">
        <p class="text-gray-500">Loading...</p>
      </div>
    {:else if portfolioItems.length === 0}
      <div class="text-center py-12">
        <p class="text-gray-600">No portfolio items yet. Check back soon!</p>
      </div>
    {:else}
      <div class="grid gap-12">
        {#each portfolioItems as item}
          <div class="rounded-2xl bg-white p-8 shadow-lg">
            <div class="mb-6">
              <h2 class="text-2xl font-bold text-gray-900">{item.title}</h2>
              <p class="mt-2 text-gray-600">{item.description}</p>
              <div class="mt-3 flex flex-wrap gap-3 text-sm">
                {#if item.service}
                  <span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                    {item.service}
                  </span>
                {/if}
                {#if item.location}
                  <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {item.location}
                  </span>
                {/if}
                <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <!-- Before Image -->
              <div class="relative overflow-hidden rounded-xl bg-gray-100">
                <div class="absolute left-4 top-4 z-10 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  Before
                </div>
                {#if item.before_image_url}
                  <img
                    src={item.before_image_url}
                    alt="Before - {item.title}"
                    class="h-80 w-full object-cover"
                  />
                {:else}
                  <div class="h-80 w-full flex items-center justify-center">
                    <p class="text-gray-400 text-sm">No image</p>
                  </div>
                {/if}
              </div>

              <!-- After Image -->
              <div class="relative overflow-hidden rounded-xl bg-gray-100">
                <div class="absolute left-4 top-4 z-10 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  After
                </div>
                {#if item.after_image_url}
                  <img
                    src={item.after_image_url}
                    alt="After - {item.title}"
                    class="h-80 w-full object-cover"
                  />
                {:else}
                  <div class="h-80 w-full flex items-center justify-center">
                    <p class="text-gray-400 text-sm">No image</p>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>

<!-- CTA Section -->
<section class="bg-green-600 py-16">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
    <h2 class="text-3xl font-bold text-white sm:text-4xl">
      Ready to Transform Your Lawn?
    </h2>
    <p class="mt-4 text-xl text-green-100">
      Get your free quote and join our satisfied customers
    </p>
    <div class="mt-8">
      <a
        href="/quote"
        class="inline-flex items-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-green-700 shadow-lg transition-all hover:bg-green-50"
      >
        Get Free Quote
        <svg class="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </a>
    </div>
  </div>
</section>
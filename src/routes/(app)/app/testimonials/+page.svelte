<script>
  import { testimonialsStore, type Testimonial } from '$lib/data/portfolio';
  import { services } from '$lib/data/services';
  
  let testimonials = $state(testimonialsStore.getAll());
  let showModal = $state(false);
  let editingTestimonial = $state<Testimonial | null>(null);
  
  let formData = $state({
    name: '',
    location: '',
    text: '',
    rating: 5,
    service: '',
    date: new Date().toISOString().split('T')[0],
    featured: false
  });
  
  function openAddModal() {
    editingTestimonial = null;
    formData = {
      name: '',
      location: '',
      text: '',
      rating: 5,
      service: '',
      date: new Date().toISOString().split('T')[0],
      featured: false
    };
    showModal = true;
  }
  
  function openEditModal(testimonial: Testimonial) {
    editingTestimonial = testimonial;
    formData = { ...testimonial };
    showModal = true;
  }
  
  function closeModal() {
    showModal = false;
    editingTestimonial = null;
  }
  
  function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (editingTestimonial) {
      testimonialsStore.update(editingTestimonial.id, formData);
    } else {
      testimonialsStore.create(formData);
    }
    
    testimonials = testimonialsStore.getAll();
    closeModal();
  }
  
  function deleteTestimonial(id: string) {
    if (confirm('Are you sure you want to delete this testimonial?')) {
      testimonialsStore.delete(id);
      testimonials = testimonialsStore.getAll();
    }
  }
  
  function toggleFeatured(id: string, currentValue: boolean) {
    testimonialsStore.update(id, { featured: !currentValue });
    testimonials = testimonialsStore.getAll();
  }
</script>

<svelte:head>
  <title>Testimonials Management | Cruz Crewz</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Testimonials</h1>
      <p class="mt-1 text-sm text-gray-600">Manage customer reviews and testimonials</p>
    </div>
    <button
      onclick={openAddModal}
      class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Add Testimonial
    </button>
  </div>
  
  <!-- Testimonials List -->
  {#if testimonials.length === 0}
    <div class="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
      <h3 class="mt-4 text-lg font-semibold text-gray-900">No testimonials yet</h3>
      <p class="mt-2 text-sm text-gray-600">Start by adding your first customer testimonial.</p>
      <button
        onclick={openAddModal}
        class="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add First Testimonial
      </button>
    </div>
  {:else}
    <div class="space-y-4">
      {#each testimonials as testimonial}
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <div class="flex gap-1 text-yellow-400">
                  {#each Array(testimonial.rating) as _}
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  {/each}
                </div>
                {#if testimonial.featured}
                  <span class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                    <svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Featured
                  </span>
                {/if}
              </div>
              
              <p class="mt-3 text-gray-700">{testimonial.text}</p>
              
              <div class="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <div class="font-semibold text-gray-900">{testimonial.name}</div>
                <div class="text-gray-600">{testimonial.location}</div>
                {#if testimonial.service}
                  <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    {testimonial.service}
                  </span>
                {/if}
                <div class="text-gray-500">
                  {new Date(testimonial.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
            
            <div class="ml-4 flex flex-col gap-2">
              <button
                onclick={() => toggleFeatured(testimonial.id, testimonial.featured)}
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                title={testimonial.featured ? 'Remove from featured' : 'Mark as featured'}
              >
                <svg class="h-4 w-4" fill={testimonial.featured ? 'currentColor' : 'none'} viewBox="0 0 20 20" stroke="currentColor" stroke-width="1.5">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
              <button
                onclick={() => openEditModal(testimonial)}
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onclick={() => deleteTestimonial(testimonial.id)}
                class="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal -->
{#if showModal}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-screen items-center justify-center p-4">
      <div class="fixed inset-0 bg-gray-900/50 transition-opacity" onclick={closeModal}></div>
      
      <div class="relative w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div class="flex items-center justify-between border-b p-6">
          <h2 class="text-xl font-semibold text-gray-900">
            {editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
          </h2>
          <button onclick={closeModal} class="text-gray-400 hover:text-gray-600">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onsubmit={handleSubmit} class="p-6">
          <div class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-gray-700">Customer Name</label>
                <input
                  type="text"
                  bind:value={formData.name}
                  required
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                  placeholder="e.g., John Smith"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  bind:value={formData.location}
                  required
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                  placeholder="e.g., Buckhead, GA"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Testimonial</label>
              <textarea
                bind:value={formData.text}
                required
                rows="4"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                placeholder="What did the customer say about your service?"
              ></textarea>
            </div>
            
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-gray-700">Rating</label>
                <select
                  bind:value={formData.rating}
                  required
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Service (Optional)</label>
                <select
                  bind:value={formData.service}
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Not specified</option>
                  {#each services as service}
                    <option value={service.name}>{service.name}</option>
                  {/each}
                </select>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                bind:value={formData.date}
                required
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                bind:checked={formData.featured}
                class="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label for="featured" class="text-sm font-medium text-gray-700">
                Feature on homepage
              </label>
            </div>
          </div>
          
          <div class="mt-6 flex gap-3">
            <button
              type="button"
              onclick={closeModal}
              class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {editingTestimonial ? 'Update' : 'Add'} Testimonial
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
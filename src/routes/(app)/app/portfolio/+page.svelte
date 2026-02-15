<script>
  import { portfolioStore, type PortfolioItem } from '$lib/data/portfolio';
  import { services } from '$lib/data/services';
  
  let portfolioItems = $state(portfolioStore.getAll());
  let showModal = $state(false);
  let editingItem = $state<PortfolioItem | null>(null);
  
  let formData = $state({
    title: '',
    description: '',
    beforeImage: '',
    afterImage: '',
    service: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    featured: false
  });
  
  function openAddModal() {
    editingItem = null;
    formData = {
      title: '',
      description: '',
      beforeImage: '',
      afterImage: '',
      service: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      featured: false
    };
    showModal = true;
  }
  
  function openEditModal(item: PortfolioItem) {
    editingItem = item;
    formData = { ...item };
    showModal = true;
  }
  
  function closeModal() {
    showModal = false;
    editingItem = null;
  }
  
  function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (editingItem) {
      portfolioStore.update(editingItem.id, formData);
    } else {
      portfolioStore.create(formData);
    }
    
    portfolioItems = portfolioStore.getAll();
    closeModal();
  }
  
  function deleteItem(id: string) {
    if (confirm('Are you sure you want to delete this portfolio item?')) {
      portfolioStore.delete(id);
      portfolioItems = portfolioStore.getAll();
    }
  }
  
  function toggleFeatured(id: string, currentValue: boolean) {
    portfolioStore.update(id, { featured: !currentValue });
    portfolioItems = portfolioStore.getAll();
  }
</script>

<svelte:head>
  <title>Portfolio Management | Cruz Crewz</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Portfolio</h1>
      <p class="mt-1 text-sm text-gray-600">Manage before/after photos and project showcases</p>
    </div>
    <button
      onclick={openAddModal}
      class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Add Project
    </button>
  </div>
  
  <!-- Portfolio Grid -->
  {#if portfolioItems.length === 0}
    <div class="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
      <h3 class="mt-4 text-lg font-semibold text-gray-900">No portfolio items</h3>
      <p class="mt-2 text-sm text-gray-600">Get started by adding your first project showcase.</p>
      <button
        onclick={openAddModal}
        class="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Your First Project
      </button>
    </div>
  {:else}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each portfolioItems as item}
        <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div class="grid grid-cols-2 gap-2 p-2">
            <div class="relative">
              <div class="absolute left-2 top-2 rounded bg-red-500 px-2 py-1 text-xs font-bold text-white">BEFORE</div>
              <img src={item.beforeImage} alt="Before" class="h-32 w-full rounded object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22128%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22128%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3EBefore%3C/text%3E%3C/svg%3E'" />
            </div>
            <div class="relative">
              <div class="absolute left-2 top-2 rounded bg-green-500 px-2 py-1 text-xs font-bold text-white">AFTER</div>
              <img src={item.afterImage} alt="After" class="h-32 w-full rounded object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22128%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22128%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3EAfter%3C/text%3E%3C/svg%3E'" />
            </div>
          </div>
          
          <div class="p-4">
            <div class="flex items-start justify-between">
              <h3 class="font-semibold text-gray-900">{item.title}</h3>
              {#if item.featured}
                <span class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                  <svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Featured
                </span>
              {/if}
            </div>
            <p class="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</p>
            
            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                {item.service}
              </span>
              <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                {item.location}
              </span>
            </div>
            
            <div class="mt-4 flex items-center gap-2">
              <button
                onclick={() => toggleFeatured(item.id, item.featured)}
                class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                title={item.featured ? 'Remove from featured' : 'Mark as featured'}
              >
                <svg class="mx-auto h-4 w-4" fill={item.featured ? 'currentColor' : 'none'} viewBox="0 0 20 20" stroke="currentColor" stroke-width="1.5">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
              <button
                onclick={() => openEditModal(item)}
                class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onclick={() => deleteItem(item.id)}
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
            {editingItem ? 'Edit Project' : 'Add New Project'}
          </h2>
          <button onclick={closeModal} class="text-gray-400 hover:text-gray-600">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onsubmit={handleSubmit} class="p-6">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Project Title</label>
              <input
                type="text"
                bind:value={formData.title}
                required
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                placeholder="e.g., Complete Lawn Transformation"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                bind:value={formData.description}
                required
                rows="3"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                placeholder="Describe the work that was done..."
              ></textarea>
            </div>
            
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-gray-700">Before Image URL</label>
                <input
                  type="url"
                  bind:value={formData.beforeImage}
                  required
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">After Image URL</label>
                <input
                  type="url"
                  bind:value={formData.afterImage}
                  required
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-gray-700">Service Type</label>
                <select
                  bind:value={formData.service}
                  required
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Select a service...</option>
                  {#each services as service}
                    <option value={service.name}>{service.name}</option>
                  {/each}
                </select>
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
              <label class="block text-sm font-medium text-gray-700">Project Date</label>
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
              {editingItem ? 'Update' : 'Add'} Project
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
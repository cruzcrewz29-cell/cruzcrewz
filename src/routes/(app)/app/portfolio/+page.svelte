<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { services } from '$lib/data/services';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Upload from 'lucide-svelte/icons/upload';
	import Star from 'lucide-svelte/icons/star';

	type PortfolioItem = {
		id: string;
		title: string;
		description: string;
		before_image_url: string | null;
		after_image_url: string | null;
		service: string | null;
		location: string | null;
		date: string;
		featured: boolean;
	};

	let items = $state<PortfolioItem[]>([]);
	let loading = $state(true);
	let showModal = $state(false);
	let editingItem = $state<PortfolioItem | null>(null);
	let uploadingBefore = $state(false);
	let uploadingAfter = $state(false);

	let formData = $state({
		title: '',
		description: '',
		before_image_url: '',
		after_image_url: '',
		service: '',
		location: '',
		date: new Date().toISOString().split('T')[0],
		featured: false
	});

	onMount(async () => {
		await loadItems();
		loading = false;
	});

	async function loadItems() {
    const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .order('date', { ascending: false });
    
    console.log('Portfolio data:', data);
    console.log('Portfolio error:', error);
    
    items = data || [];
}

	function openAddModal() {
		editingItem = null;
		formData = {
			title: '',
			description: '',
			before_image_url: '',
			after_image_url: '',
			service: '',
			location: '',
			date: new Date().toISOString().split('T')[0],
			featured: false
		};
		showModal = true;
	}

	function openEditModal(item: PortfolioItem) {
		editingItem = item;
		formData = {
			title: item.title,
			description: item.description,
			before_image_url: item.before_image_url || '',
			after_image_url: item.after_image_url || '',
			service: item.service || '',
			location: item.location || '',
			date: item.date,
			featured: item.featured
		};
		showModal = true;
	}

	async function uploadImage(file: File, type: 'before' | 'after') {
		if (type === 'before') uploadingBefore = true;
		else uploadingAfter = true;

		try {
			const ext = file.name.split('.').pop();
			const filename = `${Date.now()}-${type}.${ext}`;

			const { error } = await supabase.storage
				.from('portfolio')
				.upload(filename, file, { upsert: true });

			if (error) throw error;

			const { data } = supabase.storage
				.from('portfolio')
				.getPublicUrl(filename);

			if (type === 'before') {
				formData.before_image_url = data.publicUrl;
			} else {
				formData.after_image_url = data.publicUrl;
			}
		} catch (error) {
			console.error('Upload error:', error);
			alert('Failed to upload image. Please try again.');
		} finally {
			if (type === 'before') uploadingBefore = false;
			else uploadingAfter = false;
		}
	}

	function handleFileChange(e: Event, type: 'before' | 'after') {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) uploadImage(file, type);
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		const payload = {
			title: formData.title,
			description: formData.description,
			before_image_url: formData.before_image_url || null,
			after_image_url: formData.after_image_url || null,
			service: formData.service || null,
			location: formData.location || null,
			date: formData.date,
			featured: formData.featured
		};

		if (editingItem) {
			await supabase.from('portfolio').update(payload).eq('id', editingItem.id);
		} else {
			await supabase.from('portfolio').insert(payload);
		}

		showModal = false;
		await loadItems();
	}

	async function deleteItem(item: PortfolioItem) {
		if (!confirm('Delete this portfolio item?')) return;

		// Delete images from storage
		const filesToDelete = [];
		if (item.before_image_url) {
			const filename = item.before_image_url.split('/').pop();
			if (filename) filesToDelete.push(filename);
		}
		if (item.after_image_url) {
			const filename = item.after_image_url.split('/').pop();
			if (filename) filesToDelete.push(filename);
		}

		if (filesToDelete.length > 0) {
			await supabase.storage.from('portfolio').remove(filesToDelete);
		}

		await supabase.from('portfolio').delete().eq('id', item.id);
		await loadItems();
	}

	async function toggleFeatured(item: PortfolioItem) {
		await supabase
			.from('portfolio')
			.update({ featured: !item.featured })
			.eq('id', item.id);
		await loadItems();
	}
</script>

<svelte:head>
	<title>Portfolio Management | Cruz Crewz</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Portfolio</h1>
			<p class="mt-1 text-sm text-gray-600">Manage before/after photos and project showcases</p>
		</div>
		<button
			onclick={openAddModal}
			class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
		>
			<Plus class="h-4 w-4" />
			Add Project
		</button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if items.length === 0}
		<div class="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
			</svg>
			<h3 class="mt-4 text-lg font-semibold text-gray-900">No portfolio items</h3>
			<p class="mt-2 text-sm text-gray-600">Add your first before/after project showcase.</p>
			<button
				onclick={openAddModal}
				class="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
			>
				<Plus class="h-4 w-4" />
				Add First Project
			</button>
		</div>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each items as item}
				<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<!-- Before/After Images -->
					<div class="grid grid-cols-2 gap-1 p-2">
						<div class="relative">
							<span class="absolute left-2 top-2 rounded bg-gray-900 px-2 py-0.5 text-xs font-medium text-white">Before</span>
							{#if item.before_image_url}
								<img src={item.before_image_url} alt="Before" class="h-32 w-full rounded object-cover" />
							{:else}
								<div class="h-32 w-full rounded bg-gray-100 flex items-center justify-center">
									<span class="text-xs text-gray-400">No image</span>
								</div>
							{/if}
						</div>
						<div class="relative">
							<span class="absolute left-2 top-2 rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white">After</span>
							{#if item.after_image_url}
								<img src={item.after_image_url} alt="After" class="h-32 w-full rounded object-cover" />
							{:else}
								<div class="h-32 w-full rounded bg-gray-100 flex items-center justify-center">
									<span class="text-xs text-gray-400">No image</span>
								</div>
							{/if}
						</div>
					</div>

					<div class="p-4">
						<div class="flex items-start justify-between">
							<h3 class="font-semibold text-gray-900">{item.title}</h3>
							{#if item.featured}
								<span class="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
									<Star class="h-3 w-3" />
									Featured
								</span>
							{/if}
						</div>

						<p class="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</p>

						<div class="mt-3 flex flex-wrap gap-2">
							{#if item.service}
								<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{item.service}</span>
							{/if}
							{#if item.location}
								<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{item.location}</span>
							{/if}
						</div>

						<div class="mt-4 flex items-center gap-2">
							<button
								onclick={() => toggleFeatured(item)}
								class="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-yellow-500 hover:border-yellow-200 transition-colors"
								title={item.featured ? 'Remove from featured' : 'Mark as featured'}
							>
								<Star class="h-4 w-4" fill={item.featured ? 'currentColor' : 'none'} />
							</button>
							<button
								onclick={() => openEditModal(item)}
								class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200"
							>
								<Pencil class="h-3.5 w-3.5" />
								Edit
							</button>
							<button
								onclick={() => deleteItem(item)}
								class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100"
							>
								<Trash2 class="h-3.5 w-3.5" />
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
			<div class="fixed inset-0 bg-black/50" onclick={() => (showModal = false)}></div>

			<div class="relative w-full max-w-2xl rounded-xl bg-white shadow-xl">
				<div class="flex items-center justify-between border-b px-6 py-4">
					<h2 class="text-lg font-semibold text-gray-900">
						{editingItem ? 'Edit Project' : 'Add New Project'}
					</h2>
					<button onclick={() => (showModal = false)} class="text-gray-400 hover:text-gray-600">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form onsubmit={handleSubmit} class="p-6 space-y-5">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
						<input
							type="text"
							bind:value={formData.title}
							required
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
							placeholder="e.g., Complete Lawn Transformation"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
						<textarea
							bind:value={formData.description}
							required
							rows="3"
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
							placeholder="Describe the work that was done..."
						></textarea>
					</div>

					<!-- Image Uploads -->
					<div class="grid grid-cols-2 gap-4">
						<!-- Before Image -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Before Photo</label>
							{#if formData.before_image_url}
								<div class="relative">
									<img src={formData.before_image_url} alt="Before preview" class="h-32 w-full rounded-lg object-cover border border-gray-200" />
									<button
										type="button"
										onclick={() => formData.before_image_url = ''}
										class="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-500 hover:text-red-600"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{:else}
								<label class="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
									{#if uploadingBefore}
										<span class="text-xs text-gray-500">Uploading...</span>
									{:else}
										<Upload class="h-6 w-6 text-gray-400 mb-1" />
										<span class="text-xs text-gray-500">Click to upload</span>
									{/if}
									<input
										type="file"
										accept="image/*"
										class="hidden"
										onchange={(e) => handleFileChange(e, 'before')}
										disabled={uploadingBefore}
									/>
								</label>
							{/if}
						</div>

						<!-- After Image -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">After Photo</label>
							{#if formData.after_image_url}
								<div class="relative">
									<img src={formData.after_image_url} alt="After preview" class="h-32 w-full rounded-lg object-cover border border-gray-200" />
									<button
										type="button"
										onclick={() => formData.after_image_url = ''}
										class="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-500 hover:text-red-600"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{:else}
								<label class="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
									{#if uploadingAfter}
										<span class="text-xs text-gray-500">Uploading...</span>
									{:else}
										<Upload class="h-6 w-6 text-gray-400 mb-1" />
										<span class="text-xs text-gray-500">Click to upload</span>
									{/if}
									<input
										type="file"
										accept="image/*"
										class="hidden"
										onchange={(e) => handleFileChange(e, 'after')}
										disabled={uploadingAfter}
									/>
								</label>
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
							<select
								bind:value={formData.service}
								class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
							>
								<option value="">Select a service...</option>
								{#each services as service}
									<option value={service.name}>{service.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
							<input
								type="text"
								bind:value={formData.location}
								class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
								placeholder="e.g., Buckhead, IL"
							/>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Project Date</label>
						<input
							type="date"
							bind:value={formData.date}
							required
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
						/>
					</div>

					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="featured"
							bind:checked={formData.featured}
							class="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
						/>
						<label for="featured" class="text-sm font-medium text-gray-700">
							Feature on homepage
						</label>
					</div>

					<div class="flex gap-3 pt-2">
						<button
							type="button"
							onclick={() => (showModal = false)}
							class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={uploadingBefore || uploadingAfter}
							class="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
						>
							{editingItem ? 'Save Changes' : 'Add Project'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
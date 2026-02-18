<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import Upload from 'lucide-svelte/icons/upload';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Copy from 'lucide-svelte/icons/copy';
	import imageCompression from 'browser-image-compression';

	type SiteAsset = {
		name: string;
		url: string;
		size: number;
		created_at: string;
	};

	let assets = $state<SiteAsset[]>([]);
	let loading = $state(true);
	let uploading = $state(false);

	const assetCategories = [
		{ id: 'hero', label: 'Hero Images', description: 'Large background images for page headers' },
		{ id: 'logos', label: 'Logos', description: 'Company logos and branding' },
		{ id: 'icons', label: 'Icons', description: 'Service icons and graphics' },
		{ id: 'misc', label: 'Other', description: 'Miscellaneous site assets' }
	];

	onMount(async () => {
		await loadAssets();
		loading = false;
	});

	async function uploadFile(e: Event) {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;

	uploading = true;

	try {
		// Compress image before upload
		const options = {
			maxSizeMB: 0.5, // Max 500KB
			maxWidthOrHeight: 1920, // Max dimension
			useWebWorker: true,
			fileType: 'image/jpeg'
		};

		const compressedFile = await imageCompression(file, options);
		
		const ext = 'jpg'; // Always save as JPG
		const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.\w+$/, '')}.${ext}`;

		const { error } = await supabase.storage
			.from('site-assets')
			.upload(filename, compressedFile, { upsert: false });

		if (error) throw error;

		await loadAssets();
		input.value = '';
		alert('Image uploaded and optimized!');
	} catch (error) {
		console.error('Upload error:', error);
		alert('Failed to upload file. Please try again.');
	} finally {
		uploading = false;
	}
}

	async function loadAssets() {
		const { data, error } = await supabase.storage.from('site-assets').list();

		if (data) {
			assets = data.map(file => {
				const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(file.name);
				return {
					name: file.name,
					url: urlData.publicUrl,
					size: file.metadata?.size || 0,
					created_at: file.created_at
				};
			});
		}
	}

		try {
			const ext = file.name.split('.').pop();
			const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

			const { error } = await supabase.storage
				.from('site-assets')
				.upload(filename, file, { upsert: false });

			if (error) throw error;

			await loadAssets();
			input.value = '';
		} catch (error) {
			console.error('Upload error:', error);
			alert('Failed to upload file. Please try again.');
		} finally {
			uploading = false;
		}
	}

	async function deleteAsset(filename: string) {
		if (!confirm(`Delete ${filename}?`)) return;

		const { error } = await supabase.storage.from('site-assets').remove([filename]);

		if (!error) {
			await loadAssets();
		}
	}

	function copyToClipboard(url: string) {
		navigator.clipboard.writeText(url);
		alert('URL copied to clipboard!');
	}

	function formatFileSize(bytes: number) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Settings | Site Assets</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold text-gray-900">Site Assets</h1>
		<p class="mt-1 text-sm text-gray-600">Upload and manage images used across your website</p>
	</div>

	<!-- Upload Section -->
	<div class="bg-white rounded-xl border border-gray-200 p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Upload New Asset</h2>

		<label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
			{#if uploading}
				<span class="text-sm text-gray-500">Uploading...</span>
			{:else}
				<Upload class="h-8 w-8 text-gray-400 mb-2" />
				<span class="text-sm text-gray-600">Click to upload image</span>
				<span class="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to 10MB</span>
			{/if}
			<input
				type="file"
				accept="image/*"
				class="hidden"
				onchange={uploadFile}
				disabled={uploading}
			/>
		</label>

		<div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
			{#each assetCategories as category}
				<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
					<div class="font-medium text-sm text-gray-900">{category.label}</div>
					<div class="text-xs text-gray-500 mt-0.5">{category.description}</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Assets Grid -->
	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if assets.length === 0}
		<div class="bg-white rounded-xl border border-gray-200 p-12 text-center">
			<p class="text-gray-500">No assets uploaded yet</p>
		</div>
	{:else}
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each assets as asset}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4">
									<img src={asset.url} alt={asset.name} class="h-12 w-12 rounded object-cover border border-gray-200" />
								</td>
								<td class="px-6 py-4">
									<span class="text-sm font-medium text-gray-900 break-all">{asset.name}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-gray-600">{formatFileSize(asset.size)}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-gray-600">{formatDate(asset.created_at)}</span>
								</td>
								<td class="px-6 py-4">
									<button
										onclick={() => copyToClipboard(asset.url)}
										class="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
									>
										<Copy class="h-3.5 w-3.5" />
										Copy URL
									</button>
								</td>
								<td class="px-6 py-4">
									<button
										onclick={() => deleteAsset(asset.name)}
										class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
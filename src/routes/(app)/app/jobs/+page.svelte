<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	type Customer = { id: string; name: string; };

	type Job = {
		id: string;
		customer_id: string | null;
		service_type: string;
		description: string | null;
		status: string;
		scheduled_date: string;
		price: number | null;
		customers?: Customer;
	};

	let jobs = $state<Job[]>([]);
	let customers = $state<Customer[]>([]);
	let loading = $state(true);
	let showModal = $state(false);
	let editingJob = $state<Job | null>(null);
	let deletingJobId = $state<string | null>(null);

	const STATUS_OPTIONS = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'];

	const columns = [
		{ id: 'pending', label: 'Pending', color: 'bg-gray-100' },
		{ id: 'scheduled', label: 'Scheduled', color: 'bg-blue-100' },
		{ id: 'in_progress', label: 'In Progress', color: 'bg-yellow-100' },
		{ id: 'completed', label: 'Completed', color: 'bg-green-100' }
	];

	let formData = $state({
		customer_id: '',
		service_type: '',
		description: '',
		status: 'pending',
		scheduled_date: '',
		price: ''
	});

	onMount(async () => {
		await Promise.all([fetchJobs(), fetchCustomers()]);
		loading = false;
	});

	async function fetchJobs() {
		const { data } = await supabase
			.from('jobs')
			.select('*, customers(name)')
			.order('scheduled_date');
		if (data) jobs = data as Job[];
	}

	async function fetchCustomers() {
		const { data } = await supabase
			.from('customers')
			.select('id, name')
			.order('name');
		if (data) customers = data;
	}

	function jobsByStatus(status: string) {
		return jobs.filter(j => j.status === status);
	}

	function openAddModal() {
		editingJob = null;
		formData = {
			customer_id: '',
			service_type: '',
			description: '',
			status: 'pending',
			scheduled_date: '',
			price: ''
		};
		showModal = true;
	}

	function openEditModal(job: Job) {
		editingJob = job;
		formData = {
			customer_id: job.customer_id || '',
			service_type: job.service_type,
			description: job.description || '',
			status: job.status,
			scheduled_date: job.scheduled_date.split('T')[0],
			price: job.price?.toString() || ''
		};
		showModal = true;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		const payload = {
			customer_id: formData.customer_id || null,
			service_type: formData.service_type,
			description: formData.description || null,
			status: formData.status,
			scheduled_date: new Date(formData.scheduled_date).toISOString(),
			price: formData.price ? Number(formData.price) : null
		};

		if (editingJob) {
			await supabase.from('jobs').update(payload).eq('id', editingJob.id);
		} else {
			await supabase.from('jobs').insert(payload);
		}

		showModal = false;
		await fetchJobs();
	}

	async function deleteJob(id: string) {
		if (!confirm('Are you sure you want to delete this job?')) return;
		await supabase.from('jobs').delete().eq('id', id);
		await fetchJobs();
	}

	async function updateStatus(jobId: string, newStatus: string) {
		jobs = jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j);
		await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId);
	}

	function handleDrop(e: DragEvent, status: string) {
		e.preventDefault();
		const jobId = e.dataTransfer?.getData('jobId');
		if (jobId) updateStatus(jobId, status);
	}

	function handleDragStart(e: DragEvent, jobId: string) {
		e.dataTransfer?.setData('jobId', jobId);
		e.dataTransfer!.effectAllowed = 'move';
	}

	function revenue() {
		return jobs
			.filter(j => j.status === 'completed' && j.price)
			.reduce((sum, j) => sum + Number(j.price), 0);
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric'
		});
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-semibold text-gray-900">Jobs</h1>
		<div class="flex items-center gap-4">
			<div class="text-right">
				<p class="text-xs text-gray-500">Completed Revenue</p>
				<p class="text-lg font-semibold text-gray-900">{formatCurrency(revenue())}</p>
			</div>
			<button
				onclick={openAddModal}
				class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
			>
				<Plus class="h-4 w-4" />
				Add Job
			</button>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
	{#each columns as column}
		<div
			class="bg-white rounded-xl border border-gray-200 overflow-hidden"
			ondragover={(e) => e.preventDefault()}
			ondrop={(e) => handleDrop(e, column.id)}
		>
					<div class="px-4 py-3 border-b border-gray-200 {column.color}">
						<h3 class="font-medium text-sm text-gray-900">
							{column.label}
							<span class="ml-2 text-gray-500">{jobsByStatus(column.id).length}</span>
						</h3>
					</div>

					<div class="p-3 space-y-2 min-h-[500px]">
						{#each jobsByStatus(column.id) as job (job.id)}
							<div
								draggable="true"
								ondragstart={(e) => handleDragStart(e, job.id)}
								class="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow group break-words"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1 min-w-0 break-words">
										<div class="font-medium text-sm text-gray-900 break-words">
											{job.customers?.name || 'No Customer'}
										</div>
										<div class="text-xs text-gray-600 mt-1 break-words">{job.service_type}</div>
										<div class="text-xs text-gray-500 mt-1">{formatDate(job.scheduled_date)}</div>
										{#if job.price}
											<div class="text-xs font-medium text-gray-900 mt-2">
												{formatCurrency(job.price)}
											</div>
										{/if}
									</div>
									<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
										<button
											onclick={() => openEditModal(job)}
											class="p-1 text-gray-400 hover:text-gray-900 rounded"
										>
											<Pencil class="h-3.5 w-3.5" />
										</button>
										<button
											onclick={() => deleteJob(job.id)}
											class="p-1 text-gray-400 hover:text-red-600 rounded"
										>
											<Trash2 class="h-3.5 w-3.5" />
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add/Edit Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => (showModal = false)}>
		<div class="bg-white rounded-xl shadow-xl max-w-md w-full" onclick={(e) => e.stopPropagation()}>
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">
					{editingJob ? 'Edit Job' : 'Add New Job'}
				</h2>
			</div>

			<form onsubmit={handleSubmit} class="p-6 space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
					<select
						bind:value={formData.customer_id}
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
					>
						<option value="">No customer assigned</option>
						{#each customers as customer}
							<option value={customer.id}>{customer.name}</option>
						{/each}
					</select>
				</div>

				<div>
	<label class="block text-sm font-medium text-gray-700 mb-1">
		Service Type <span class="text-red-500">*</span>
	</label>
	<select
		bind:value={formData.service_type}
		required
		class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
	>
		<option value="">Select a service...</option>
		<option value="Lawn Mowing">Lawn Mowing</option>
		<option value="Trimming & Edging">Trimming & Edging</option>
		<option value="Aeration & Overseeding">Aeration & Overseeding</option>
		<option value="Leaf Removal">Leaf Removal</option>
		<option value="Landscape Maintenance">Landscape Maintenance</option>
	</select>
</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
					<textarea
						bind:value={formData.description}
						rows="2"
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
					></textarea>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
						<select
							bind:value={formData.status}
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
						>
							{#each STATUS_OPTIONS as status}
								<option value={status}>{status.replace('_', ' ')}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
						<input
							type="number"
							bind:value={formData.price}
							min="0"
							step="0.01"
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
							placeholder="0.00"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">
						Scheduled Date <span class="text-red-500">*</span>
					</label>
					<input
						type="date"
						bind:value={formData.scheduled_date}
						required
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
					/>
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
						class="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
					>
						{editingJob ? 'Save Changes' : 'Add Job'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
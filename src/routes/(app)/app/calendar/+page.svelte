<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { browser } from '$app/environment';
	import type { Calendar } from '@fullcalendar/core';
	import CalendarIcon from 'lucide-svelte/icons/calendar';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	type Customer = { id: string; name: string; };

	type Job = {
		id: string;
		customer_id: string | null;
		customer_name: string;
		customer_email: string;
		address: string;
		service_type: string;
		status: string;
		scheduled_date: string;
		price: number;
		description: string | null;
		customers?: { name: string };
	};

	let jobs = $state<Job[]>([]);
	let customers = $state<Customer[]>([]);
	let loading = $state(true);
	let view = $state<'kanban' | 'calendar'>('kanban');
	let calendarEl: HTMLDivElement;
	let calendarInstance: Calendar | null = null;
	let showModal = $state(false);
	let editingJob = $state<Job | null>(null);

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
			.order('scheduled_date', { ascending: true });
		if (data) jobs = data as Job[];
	}

	async function fetchCustomers() {
		const { data } = await supabase
			.from('customers')
			.select('id, name')
			.order('name');
		if (data) customers = data;
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
			scheduled_date: formData.scheduled_date,
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

	async function initCalendar() {
	if (!browser) return;

	if (calendarInstance) {
		calendarInstance.destroy();
		calendarInstance = null;
	}

	const [{ Calendar }, dayGridPlugin, interactionPlugin] = await Promise.all([
		import('@fullcalendar/core'),
		import('@fullcalendar/daygrid').then(m => m.default),
		import('@fullcalendar/interaction').then(m => m.default)
	]);

	const events = jobs.map(job => ({
		id: job.id,
		title: `${job.customers?.name || job.customer_name || 'No Customer'} - ${job.service_type}`,
		start: job.scheduled_date,
		backgroundColor: getStatusColor(job.status),
		borderColor: getStatusColor(job.status)
	}));

	calendarInstance = new Calendar(calendarEl, {
		plugins: [dayGridPlugin, interactionPlugin],
		initialView: 'dayGridMonth',
		height: 'auto',
		headerToolbar: {
			left: 'prev,next',
			center: 'title',
			right: ''
		},
		events,
		eventClick: (info) => {
			const job = jobs.find(j => j.id === info.event.id);
			if (job) openEditModal(job);
		},
		dateClick: (info) => {
			formData.scheduled_date = info.dateStr;
			openAddModal();
		}
	});

	calendarInstance.render();
}

	function getStatusColor(status: string) {
		const colors: Record<string, string> = {
			pending: '#6b7280',
			scheduled: '#3b82f6',
			in_progress: '#eab308',
			completed: '#22c55e'
		};
		return colors[status] || '#6b7280';
	}

	function getJobsByStatus(status: string) {
		return jobs.filter(job => job.status === status);
	}

	async function updateJobStatus(jobId: string, newStatus: string) {
		await supabase
			.from('jobs')
			.update({ status: newStatus })
			.eq('id', jobId);

		jobs = jobs.map(job =>
			job.id === jobId ? { ...job, status: newStatus } : job
		);
	}

	function handleDragStart(e: DragEvent, jobId: string) {
		e.dataTransfer!.effectAllowed = 'move';
		e.dataTransfer!.setData('jobId', jobId);
	}

	function handleDrop(e: DragEvent, newStatus: string) {
		e.preventDefault();
		const jobId = e.dataTransfer!.getData('jobId');
		updateJobStatus(jobId, newStatus);
	}

	function formatDate(date: string) {
  return new Date(date.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  });
}

	$effect(() => {
		if (view === 'calendar' && !loading && calendarEl) {
			setTimeout(() => initCalendar(), 10);
		}
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-semibold text-gray-900">Calendar</h1>

		<div class="flex items-center gap-4">
			<div class="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
				<button
					onclick={() => view = 'kanban'}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors
						{view === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}"
				>
					Kanban
				</button>
				<button
					onclick={() => view = 'calendar'}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors
						{view === 'calendar' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}"
				>
					Calendar
				</button>
			</div>

			{#if view === 'kanban'}
				<button
					onclick={openAddModal}
					class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
				>
					<Plus class="h-4 w-4" />
					Add Job
				</button>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if view === 'kanban'}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each columns as column}
				<div
					class="bg-white rounded-xl border border-gray-200 overflow-hidden"
					ondragover={(e) => e.preventDefault()}
					ondrop={(e) => handleDrop(e, column.id)}
				>
					<div class="px-4 py-3 border-b border-gray-200 {column.color}">
						<h3 class="font-medium text-sm text-gray-900">
							{column.label}
							<span class="ml-2 text-gray-500">
								{getJobsByStatus(column.id).length}
							</span>
						</h3>
					</div>

					<div class="p-3 space-y-2 min-h-[600px]">
						{#each getJobsByStatus(column.id) as job (job.id)}
							<div
								draggable="true"
								ondragstart={(e) => handleDragStart(e, job.id)}
								class="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow group break-words"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1 min-w-0 break-words">
										<div class="font-medium text-sm text-gray-900 break-words">
											{job.customers?.name || job.customer_name || 'No Customer'}
										</div>
										<div class="text-xs text-gray-600 mt-1 break-words">{job.service_type}</div>
										{#if job.address}
											<div class="text-xs text-gray-500 break-words">
												{job.address}
											</div>
										{/if}
										{#if job.scheduled_date}
											<div class="flex items-center gap-1 text-xs text-gray-500 mt-2">
												<CalendarIcon class="h-3 w-3" />
												{formatDate(job.scheduled_date)}
											</div>
										{/if}
										{#if job.price}
											<div class="text-xs font-medium text-gray-900 mt-2">
												${job.price}
											</div>
										{/if}
									</div>
									<div class="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
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
	{:else}
		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div bind:this={calendarEl}></div>
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
						<option value="Lawn Aeration & Overseeding">Lawn Aeration & Overseeding</option>
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

<style>
	:global(.fc) {
		font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif;
		font-size: 0.9rem;
		color: #1d1d1f;
	}
	:global(.fc-scrollgrid), :global(.fc-scrollgrid table) { border: none !important; }
	:global(.fc-theme-standard td), :global(.fc-theme-standard th) { border: 1px solid #f2f2f4; }
	:global(.fc-toolbar) { margin-bottom: 2rem; }
	:global(.fc-toolbar-title) { font-size: 1.4rem; font-weight: 600; letter-spacing: -0.01em; }
	:global(.fc-button) {
		background: transparent;
		border: 1px solid #e5e5ea;
		border-radius: 9999px;
		padding: 6px 14px;
		font-size: 0.8rem;
		font-weight: 500;
		color: #1d1d1f;
		transition: all 0.2s ease;
	}
	:global(.fc-button:hover) { background: #f2f2f7; border-color: #d1d1d6; }
	:global(.fc-button:focus) { box-shadow: none; }
	:global(.fc-button-primary:not(:disabled).fc-button-active) {
		background: #1d1d1f;
		color: white;
		border-color: #1d1d1f;
	}
	:global(.fc-col-header-cell) { background: #fafafa; font-weight: 500; padding: 10px 0; }
	:global(.fc-daygrid-day) { transition: background 0.15s ease; }
	:global(.fc-daygrid-day:hover) { background: #f9f9fb; }
	:global(.fc-daygrid-event) {
		border: none;
		border-radius: 8px;
		padding: 4px 8px;
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.01em;
	}
	:global(.fc-daygrid-event:hover) { opacity: 0.9; }
	:global(.fc-button:focus), :global(.fc-event:focus) { outline: none; }
</style>
<script lang="ts">
	// src/routes/(app)/app/jobs/+page.svelte
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import PaymentForm from '$lib/components/PaymentForm.svelte';
	import CreditCard from 'lucide-svelte/icons/credit-card';
	import Navigation from 'lucide-svelte/icons/navigation';
	import Copy from 'lucide-svelte/icons/copy';

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
	let showPaymentModal = $state(false);
	let paymentJob = $state<Job | null>(null);

	// Tracker state
	let trackerLinks = $state<Record<string, string>>({}); // jobId → tracker URL
	let sendingTracker = $state<string | null>(null);
	let showTrackerModal = $state(false);
	let trackerModalJob = $state<Job | null>(null);
	let trackerUrl = $state('');
	let crewUrl = $state('');
	let copied = $state<'tracker' | 'crew' | null>(null);

	const STATUS_OPTIONS = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'];

	const columns = [
		{ id: 'pending',     label: 'Pending',     color: 'bg-gray-100' },
		{ id: 'scheduled',   label: 'Scheduled',   color: 'bg-blue-100' },
		{ id: 'in_progress', label: 'In Progress',  color: 'bg-yellow-100' },
		{ id: 'completed',   label: 'Completed',   color: 'bg-green-100' }
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
		formData = { customer_id: '', service_type: '', description: '', status: 'pending', scheduled_date: '', price: '' };
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
		return jobs.filter(j => j.status === 'completed' && j.price).reduce((sum, j) => sum + Number(j.price), 0);
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}

	function openPaymentModal(job: Job) {
		paymentJob = job;
		showPaymentModal = true;
	}

	function closePaymentModal() {
		showPaymentModal = false;
		paymentJob = null;
	}

	function handlePaymentSuccess() {
		closePaymentModal();
		toast.success('Payment processed successfully!');
		fetchJobs();
	}

	// ── Tracker ───────────────────────────────────────────────────────────────
	async function sendTracker(job: Job) {
		sendingTracker = job.id;
		try {
			const res = await fetch('/api/create-tracker', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jobId: job.id }),
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error);

			const base = window.location.origin;
			trackerUrl = `${base}/track/${data.token}`;
			crewUrl    = `${base}/crew/${data.token}`;
			trackerLinks = { ...trackerLinks, [job.id]: trackerUrl };
			trackerModalJob = job;
			showTrackerModal = true;
		} catch (err) {
			toast.error('Failed to create tracker link');
		} finally {
			sendingTracker = null;
		}
	}

	async function copyLink(type: 'tracker' | 'crew') {
		const url = type === 'tracker' ? trackerUrl : crewUrl;
		await navigator.clipboard.writeText(url);
		copied = type;
		setTimeout(() => (copied = null), 2000);
		toast.success(type === 'tracker' ? 'Customer link copied!' : 'Crew link copied!');
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
										<!-- Tracker active indicator -->
										{#if trackerLinks[job.id]}
											<div class="mt-2 flex items-center gap-1">
												<div class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
												<span class="text-xs text-emerald-600 font-medium">Tracker active</span>
											</div>
										{/if}
									</div>
									<div class="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
										<!-- Tracker button — only for scheduled/in_progress -->
										{#if ['scheduled', 'in_progress'].includes(job.status)}
											<button
												onclick={() => sendTracker(job)}
												disabled={sendingTracker === job.id}
												class="p-1 text-gray-400 hover:text-blue-600 rounded"
												title="Send Live Tracker"
											>
												{#if sendingTracker === job.id}
													<svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
														<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
														<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
													</svg>
												{:else}
													<Navigation class="h-3.5 w-3.5" />
												{/if}
											</button>
										{/if}
										{#if job.price && job.status !== 'completed'}
											<button
												onclick={() => openPaymentModal(job)}
												class="p-1 text-gray-400 hover:text-green-600 rounded"
												title="Collect Payment"
											>
												<CreditCard class="h-3.5 w-3.5" />
											</button>
										{/if}
										<button onclick={() => openEditModal(job)} class="p-1 text-gray-400 hover:text-gray-900 rounded">
											<Pencil class="h-3.5 w-3.5" />
										</button>
										<button onclick={() => deleteJob(job.id)} class="p-1 text-gray-400 hover:text-red-600 rounded">
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
				<h2 class="text-lg font-semibold text-gray-900">{editingJob ? 'Edit Job' : 'Add New Job'}</h2>
			</div>
			<form onsubmit={handleSubmit} class="p-6 space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
					<select bind:value={formData.customer_id}
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
						<option value="">No customer assigned</option>
						{#each customers as customer}
							<option value={customer.id}>{customer.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Service Type <span class="text-red-500">*</span></label>
					<select bind:value={formData.service_type} required
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
						<option value="">Select a service...</option>
						<option value="Lawn Mowing">Lawn Mowing</option>
						<option value="Trimming & Edging">Trimming & Edging</option>
						<option value="Bush, Shrub & Tree Care">Bush, Shrub & Tree Care</option>
						<option value="Spring & Fall Cleanups">Spring & Fall Cleanups</option>
						<option value="Landscape Maintenance">Landscape Maintenance</option>
						<option value="Lawn Aeration & Overseeding">Lawn Aeration & Overseeding</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
					<textarea bind:value={formData.description} rows="2"
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"></textarea>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
						<select bind:value={formData.status}
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
							{#each STATUS_OPTIONS as status}
								<option value={status}>{status.replace('_', ' ')}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
						<input type="number" bind:value={formData.price} min="0" step="0.01"
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
							placeholder="0.00" />
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Scheduled Date <span class="text-red-500">*</span></label>
					<input type="date" bind:value={formData.scheduled_date} required
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
				</div>
				<div class="flex gap-3 pt-2">
					<button type="button" onclick={() => (showModal = false)}
						class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
					<button type="submit"
						class="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
						{editingJob ? 'Save Changes' : 'Add Job'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Payment Modal -->
{#if showPaymentModal && paymentJob}
	<PaymentForm
		amount={paymentJob.price || 0}
		jobId={paymentJob.id}
		onSuccess={handlePaymentSuccess}
		onCancel={closePaymentModal}
	/>
{/if}

<!-- Tracker Links Modal -->
{#if showTrackerModal && trackerModalJob}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => (showTrackerModal = false)}>
		<div class="bg-white rounded-xl shadow-xl max-w-md w-full" onclick={(e) => e.stopPropagation()}>
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Live Tracker Created</h2>
				<p class="text-sm text-gray-500 mt-0.5">{trackerModalJob.customers?.name} — {trackerModalJob.service_type}</p>
			</div>
			<div class="p-6 space-y-4">

				<!-- Customer link -->
				<div>
					<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer Tracker Link</p>
					<p class="mb-2 text-xs text-gray-400">Send this to the customer so they can track the crew in real time.</p>
					<div class="flex items-center gap-2">
						<input type="text" readonly value={trackerUrl}
							class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700" />
						<button onclick={() => copyLink('tracker')}
							class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
							<Copy class="h-3.5 w-3.5" />
							{copied === 'tracker' ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>

				<!-- Crew link -->
				<div>
					<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Crew App Link</p>
					<p class="mb-2 text-xs text-gray-400">Send this to the crew member's phone. They'll use it to update status and share GPS.</p>
					<div class="flex items-center gap-2">
						<input type="text" readonly value={crewUrl}
							class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700" />
						<button onclick={() => copyLink('crew')}
							class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
							<Copy class="h-3.5 w-3.5" />
							{copied === 'crew' ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>

				<div class="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
					<p class="text-xs text-blue-700">The customer link auto-refreshes every 15 seconds. The crew link works on any phone — no app install needed.</p>
				</div>

				<button onclick={() => (showTrackerModal = false)}
					class="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">Done</button>
			</div>
		</div>
	</div>
{/if}
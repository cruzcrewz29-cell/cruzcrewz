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
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Clock from 'lucide-svelte/icons/clock';
	import X from 'lucide-svelte/icons/x';
	import Camera from 'lucide-svelte/icons/camera';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Crosshair from 'lucide-svelte/icons/crosshair';

	type Customer = { id: string; name: string; email?: string; };

	type Photo = { url: string; type: 'before' | 'after'; uploaded_at: string; };

	type Job = {
		id: string;
		customer_id: string | null;
		service_type: string;
		description: string | null;
		status: string;
		scheduled_date: string;
		price: number | null;
		crew_marked_done: boolean;
		crew_done_at: string | null;
		photos: Photo[] | null;
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
	let trackerLinks = $state<Record<string, string>>({});
	let sendingTracker = $state<string | null>(null);
	let showTrackerModal = $state(false);
	let trackerModalJob = $state<Job | null>(null);
	let trackerUrl = $state('');
	let crewUrl = $state('');
	let copied = $state<'tracker' | 'crew' | null>(null);

	// Verify & close state
	let showVerifyModal = $state(false);
	let verifyJob = $state<Job | null>(null);

	// Photo lightbox state
	let showLightbox = $state(false);
	let lightboxJob = $state<Job | null>(null);
	let lightboxIndex = $state(0);

	let lightboxPhotos = $derived(lightboxJob?.photos ?? []);
	let lightboxPhoto = $derived(lightboxPhotos[lightboxIndex] ?? null);

	// Needs review count for header badge
	let needsReviewCount = $derived(
		jobs.filter(j => j.crew_marked_done && j.status !== 'completed').length
	);

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
			.select('*, customers(id, name, email)')
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
			scheduled_date: job.scheduled_date.slice(0, 10),
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

	function formatDate(dateStr: string) {
		return new Date(dateStr.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
			weekday: 'long', month: 'long', day: 'numeric'
		});
	}

	function formatTime(date: string) {
		return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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

	// ── Conquest ──────────────────────────────────────────────────────────────
	function openConquest(job: Job) {
		window.open(`/app/conquest/${job.id}`, '_blank');
	}

	// ── Photo lightbox ────────────────────────────────────────────────────────
	function openLightbox(job: Job, index = 0) {
		lightboxJob = job;
		lightboxIndex = index;
		showLightbox = true;
	}

	function lightboxPrev() {
		lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
	}

	function lightboxNext() {
		lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
	}

	function handleLightboxKey(e: KeyboardEvent) {
		if (!showLightbox) return;
		if (e.key === 'ArrowLeft') lightboxPrev();
		if (e.key === 'ArrowRight') lightboxNext();
		if (e.key === 'Escape') showLightbox = false;
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

	// ── Verify & Close ────────────────────────────────────────────────────────
	function openVerifyModal(job: Job) {
		verifyJob = job;
		showVerifyModal = true;
	}

	async function confirmComplete(collectPayment: boolean) {
		if (!verifyJob) return;

		if (collectPayment && verifyJob.price) {
			showVerifyModal = false;
			openPaymentModal(verifyJob);
			return;
		}

		await supabase
			.from('jobs')
			.update({ status: 'completed', crew_marked_done: false })
			.eq('id', verifyJob.id);

		if (verifyJob.price && verifyJob.customers?.email) {
			fetch('/api/send-invoice', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jobId: verifyJob.id }),
			});
		}

		fetch('/api/create-recurring-job', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ jobId: verifyJob.id }),
		});

		toast.success(`${verifyJob.customers?.name ?? 'Job'} marked complete`);
		showVerifyModal = false;
		verifyJob = null;
		await fetchJobs();
	}

	async function dismissCrewFlag(job: Job) {
		await supabase
			.from('jobs')
			.update({ crew_marked_done: false })
			.eq('id', job.id);
		await fetchJobs();
	}
</script>

<svelte:window onkeydown={handleLightboxKey} />

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-semibold text-gray-900">Jobs</h1>
			{#if needsReviewCount > 0}
				<div class="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1">
					<div class="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
					<span class="text-xs font-semibold text-amber-700">
						{needsReviewCount} need{needsReviewCount === 1 ? 's' : ''} review
					</span>
				</div>
			{/if}
		</div>
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
							{@const jobPhotos = job.photos ?? []}
							<div
								draggable="true"
								ondragstart={(e) => handleDragStart(e, job.id)}
								class="bg-white border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow group break-words
									{job.crew_marked_done && job.status !== 'completed'
										? 'border-amber-300 ring-1 ring-amber-200'
										: 'border-gray-200'}"
							>
								<!-- Crew done banner -->
								{#if job.crew_marked_done && job.status !== 'completed'}
									<button
										onclick={() => openVerifyModal(job)}
										class="mb-2 flex w-full items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-left hover:bg-amber-100 transition-colors"
									>
										<div class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500"></div>
										<div class="flex-1 min-w-0">
											<p class="text-xs font-semibold text-amber-800">Crew says done</p>
											{#if job.crew_done_at}
												<p class="text-xs text-amber-600">{formatTime(job.crew_done_at)}</p>
											{/if}
										</div>
										<span class="text-xs font-semibold text-amber-700 shrink-0">Verify →</span>
									</button>
								{/if}

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
										{#if trackerLinks[job.id]}
											<div class="mt-2 flex items-center gap-1">
												<div class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
												<span class="text-xs text-emerald-600 font-medium">Tracker active</span>
											</div>
										{/if}
										<!-- Photo badge -->
										{#if jobPhotos.length > 0}
											<button
												onclick={() => openLightbox(job, 0)}
												class="mt-2 flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 hover:bg-gray-200 transition-colors"
											>
												<Camera class="h-3 w-3 text-gray-500" />
												<span class="text-xs text-gray-600 font-medium">{jobPhotos.length} photo{jobPhotos.length !== 1 ? 's' : ''}</span>
											</button>
										{/if}
									</div>
									<div class="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
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
										<!-- Conquest button — completed jobs only -->
										{#if job.status === 'completed'}
											<button
												onclick={() => openConquest(job)}
												class="p-1 text-gray-400 hover:text-emerald-600 rounded"
												title="Generate Conquest Flyer"
											>
												<Crosshair class="h-3.5 w-3.5" />
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
			<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Live Tracker Created</h2>
					<p class="text-sm text-gray-500 mt-0.5">{trackerModalJob.customers?.name} — {trackerModalJob.service_type}</p>
				</div>
				<button onclick={() => (showTrackerModal = false)} class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
					<X class="h-4 w-4" />
				</button>
			</div>
			<div class="p-6 space-y-4">
				<div>
					<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer Tracker Link</p>
					<p class="mb-2 text-xs text-gray-400">Send this to the customer so they can track the crew in real time.</p>
					<div class="flex items-center gap-2">
						<input type="text" readonly value={trackerUrl}
							class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700" />
						<button onclick={() => copyLink('tracker')}
							class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
							<Copy class="h-3.5 w-3.5" />
							{copied === 'tracker' ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>
				<div>
					<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Crew App Link</p>
					<p class="mb-2 text-xs text-gray-400">Send this to the crew member's phone.</p>
					<div class="flex items-center gap-2">
						<input type="text" readonly value={crewUrl}
							class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700" />
						<button onclick={() => copyLink('crew')}
							class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
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

<!-- Verify & Close Modal -->
{#if showVerifyModal && verifyJob}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => (showVerifyModal = false)}>
		<div class="bg-white rounded-xl shadow-xl max-w-sm w-full" onclick={(e) => e.stopPropagation()}>
			<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Verify & Close Job</h2>
					<p class="text-sm text-gray-500 mt-0.5">{verifyJob.customers?.name} — {verifyJob.service_type}</p>
				</div>
				<button onclick={() => (showVerifyModal = false)} class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
					<X class="h-4 w-4" />
				</button>
			</div>
			<div class="p-6 space-y-4">
				<div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
					<div class="flex items-center gap-2 mb-1">
						<div class="h-2 w-2 rounded-full bg-amber-500"></div>
						<p class="text-sm font-semibold text-amber-900">Crew marked this job done</p>
					</div>
					{#if verifyJob.crew_done_at}
						<p class="text-xs text-amber-700 ml-4">
							Completed at {formatTime(verifyJob.crew_done_at)} on {formatDate(verifyJob.crew_done_at)}
						</p>
					{/if}
				</div>

				<!-- Photos in verify modal -->
				{#if (verifyJob.photos ?? []).length > 0}
					<div>
						<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Job Photos</p>
						<div class="grid grid-cols-4 gap-1.5">
							{#each verifyJob.photos ?? [] as photo, i}
								<button onclick={() => openLightbox(verifyJob!, i)} class="relative group">
									<img src={photo.url} alt={photo.type} class="h-16 w-full rounded-lg object-cover" />
									<div class="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors"></div>
									<span class="absolute bottom-1 left-1 rounded text-xs font-bold px-1
										{photo.type === 'before' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}">
										{photo.type}
									</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<p class="text-sm text-gray-600">Has the work been completed to your satisfaction?</p>
				<div class="space-y-2">
					{#if verifyJob.price && verifyJob.status !== 'completed'}
						<button
							onclick={() => confirmComplete(true)}
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
						>
							<CreditCard class="h-4 w-4" />
							Collect Payment & Mark Complete
						</button>
					{/if}
					<button
						onclick={() => confirmComplete(false)}
						class="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
					>
						<CheckCircle class="h-4 w-4" />
						Mark Complete (no payment)
					</button>
					<button
						onclick={() => { showVerifyModal = false; dismissCrewFlag(verifyJob!); }}
						class="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
					>
						<Clock class="h-4 w-4" />
						Not done yet — dismiss flag
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Photo Lightbox -->
{#if showLightbox && lightboxPhoto}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
		onclick={() => (showLightbox = false)}
	>
		<div class="relative max-w-4xl w-full px-4" onclick={(e) => e.stopPropagation()}>

			<!-- Header -->
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<span class="rounded-full px-3 py-1 text-xs font-bold
						{lightboxPhoto.type === 'before' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}">
						{lightboxPhoto.type === 'before' ? 'Before' : 'After'}
					</span>
					<span class="text-sm text-gray-400">
						{lightboxIndex + 1} / {lightboxPhotos.length}
					</span>
					{#if lightboxJob}
						<span class="text-sm text-gray-400">— {lightboxJob.customers?.name} · {lightboxJob.service_type}</span>
					{/if}
				</div>
				<button
					onclick={() => (showLightbox = false)}
					class="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Image -->
			<img
				src={lightboxPhoto.url}
				alt="{lightboxPhoto.type} photo"
				class="w-full max-h-[70vh] rounded-xl object-contain"
			/>

			<!-- Navigation -->
			{#if lightboxPhotos.length > 1}
				<div class="flex items-center justify-between mt-4">
					<button
						onclick={lightboxPrev}
						class="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
					>
						<ChevronLeft class="h-4 w-4" />
						Previous
					</button>

					<!-- Thumbnail strip -->
					<div class="flex gap-2">
						{#each lightboxPhotos as photo, i}
							<button onclick={() => (lightboxIndex = i)}>
								<img
									src={photo.url}
									alt={photo.type}
									class="h-12 w-12 rounded-lg object-cover transition-all
										{i === lightboxIndex ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-75'}"
								/>
							</button>
						{/each}
					</div>

					<button
						onclick={lightboxNext}
						class="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
					>
						Next
						<ChevronRight class="h-4 w-4" />
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
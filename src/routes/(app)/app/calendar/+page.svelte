<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { browser } from '$app/environment';
	import type { Calendar } from '@fullcalendar/core';

	type Job = {
		id: string;
		customer_name: string;
		customer_email: string;
		address: string;
		service_type: string;
		status: string;
		scheduled_date: string;
		price: number;
	};

	let jobs = $state<Job[]>([]);
	let loading = $state(true);
	let view = $state<'kanban' | 'calendar'>('kanban');
	let calendarEl: HTMLDivElement;
	let calendarInstance: Calendar | null = null;

	const columns = [
		{ id: 'pending', label: 'Pending', color: 'bg-gray-100' },
		{ id: 'scheduled', label: 'Scheduled', color: 'bg-blue-100' },
		{ id: 'in_progress', label: 'In Progress', color: 'bg-yellow-100' },
		{ id: 'completed', label: 'Completed', color: 'bg-green-100' }
	];

	onMount(async () => {
		const { data } = await supabase
			.from('jobs')
			.select('*')
			.order('scheduled_date', { ascending: true });

		jobs = data || [];
		loading = false;
	});

	async function initCalendar() {
		if (!browser) return;

		// Destroy existing instance
		if (calendarInstance) {
			calendarInstance.destroy();
			calendarInstance = null;
		}

		const [{ Calendar }, dayGridPlugin] = await Promise.all([
			import('@fullcalendar/core'),
			import('@fullcalendar/daygrid').then(m => m.default)
		]);

		const events = jobs.map(job => ({
			id: job.id,
			title: `${job.customer_name} - ${job.service_type}`,
			start: job.scheduled_date,
			backgroundColor: getStatusColor(job.status),
			borderColor: getStatusColor(job.status)
		}));

		calendarInstance = new Calendar(calendarEl, {
			plugins: [dayGridPlugin],
			initialView: 'dayGridMonth',
			height: 'auto',
			headerToolbar: {
				left: 'prev,next',
				center: 'title',
				right: ''
			},
			events
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
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
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
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if view === 'kanban'}
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">			{#each columns as column}
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
        {job.customers?.name || 'No Customer'}
      </div>
      <div class="text-xs text-gray-600 mt-1 break-words">{job.service_type}</div>
								<div class="text-xs text-gray-500">
									{job.address}
								</div>
								{#if job.scheduled_date}
									<div class="text-xs text-gray-500 mt-2">
										📅 {formatDate(job.scheduled_date)}
									</div>
								{/if}
								{#if job.price}
									<div class="text-xs font-medium text-gray-900 mt-2">
										${job.price}
									</div>
								{/if}
							</div>
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
<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import ClipboardList from 'lucide-svelte/icons/clipboard-list';
	import Users from 'lucide-svelte/icons/users';
	import DollarSign from 'lucide-svelte/icons/dollar-sign';
	import TrendingUp from 'lucide-svelte/icons/trending-up';
	import Calendar from 'lucide-svelte/icons/calendar';

	type Job = {
		id: string;
		customer_id: string;
		service_type: string;
		status: string;
		scheduled_date: string;
		price: number;
		customer?: { name: string; email: string };
	};

	type Stats = {
		totalJobs: number;
		totalCustomers: number;
		pendingJobs: number;
		completedThisMonth: number;
		revenueThisMonth: number;
	};

	let stats = $state<Stats>({
		totalJobs: 0,
		totalCustomers: 0,
		pendingJobs: 0,
		completedThisMonth: 0,
		revenueThisMonth: 0
	});

	let upcomingJobs = $state<Job[]>([]);
	let recentCustomers = $state<{ id: string; name: string; email: string; created_at: string }[]>([]);
	let loading = $state(true);

	onMount(async () => {
		await Promise.all([loadStats(), loadUpcomingJobs(), loadRecentCustomers()]);
		loading = false;
	});

	async function loadStats() {
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

		const [jobsData, customersData, completedData, revenueData] = await Promise.all([
			supabase.from('jobs').select('id, status'),
			supabase.from('customers').select('id'),
			supabase.from('jobs').select('id').eq('status', 'completed').gte('completed_at', monthStart),
			supabase.from('jobs').select('price').eq('status', 'completed').gte('completed_at', monthStart)
		]);

		const jobs = jobsData.data || [];
		const revenue = (revenueData.data || []).reduce((sum, job) => sum + (Number(job.price) || 0), 0);

		stats = {
			totalJobs: jobs.length,
			totalCustomers: customersData.data?.length || 0,
			pendingJobs: jobs.filter(j => j.status === 'pending' || j.status === 'scheduled').length,
			completedThisMonth: completedData.data?.length || 0,
			revenueThisMonth: revenue
		};
	}

	async function loadUpcomingJobs() {
		const { data } = await supabase
			.from('jobs')
			.select('*, customer:customers(name, email)')
			.in('status', ['pending', 'scheduled'])
			.order('scheduled_date', { ascending: true })
			.limit(5);

		upcomingJobs = (data || []) as Job[];
	}

	async function loadRecentCustomers() {
		const { data } = await supabase
			.from('customers')
			.select('id, name, email, created_at')
			.order('created_at', { ascending: false })
			.limit(5);

		recentCustomers = data || [];
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else}
		<!-- Stats Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<button
				onclick={() => goto('/app/jobs')}
				class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow text-left"
			>
				<div class="flex items-center justify-between mb-2">
					<ClipboardList class="h-5 w-5 text-gray-400" />
				</div>
				<div class="text-2xl font-semibold text-gray-900">{stats.totalJobs}</div>
				<div class="text-sm text-gray-600">Total Jobs</div>
			</button>

			<button
				onclick={() => goto('/app/customers')}
				class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow text-left"
			>
				<div class="flex items-center justify-between mb-2">
					<Users class="h-5 w-5 text-gray-400" />
				</div>
				<div class="text-2xl font-semibold text-gray-900">{stats.totalCustomers}</div>
				<div class="text-sm text-gray-600">Total Customers</div>
			</button>

			<button
				onclick={() => goto('/app/calendar')}
				class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow text-left"
			>
				<div class="flex items-center justify-between mb-2">
					<Calendar class="h-5 w-5 text-blue-500" />
				</div>
				<div class="text-2xl font-semibold text-gray-900">{stats.pendingJobs}</div>
				<div class="text-sm text-gray-600">Pending Jobs</div>
			</button>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-center justify-between mb-2">
					<DollarSign class="h-5 w-5 text-green-500" />
				</div>
				<div class="text-2xl font-semibold text-gray-900">
					{formatCurrency(stats.revenueThisMonth)}
				</div>
				<div class="text-sm text-gray-600">Revenue This Month</div>
			</div>
		</div>

		<!-- Two Column Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Upcoming Jobs -->
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
					<h2 class="font-semibold text-gray-900">Upcoming Jobs</h2>
					<button
						onclick={() => goto('/app/calendar')}
						class="text-sm text-blue-600 hover:text-blue-700"
					>
						View All
					</button>
				</div>
				<div class="divide-y divide-gray-200">
					{#if upcomingJobs.length === 0}
						<div class="px-6 py-8 text-center text-gray-500 text-sm">
							No upcoming jobs
						</div>
					{:else}
						{#each upcomingJobs as job}
							<button
								onclick={() => goto('/app/jobs')}
								class="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="font-medium text-gray-900 text-sm">
											{job.customer?.name || 'Unknown Customer'}
										</div>
										<div class="text-xs text-gray-600 mt-1">
											{job.service_type}
										</div>
										<div class="flex items-center gap-2 mt-2">
											<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
												{job.status === 'pending' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}">
												{job.status}
											</span>
											<span class="text-xs text-gray-500">
												{formatDate(job.scheduled_date)}
											</span>
										</div>
									</div>
									{#if job.price}
										<div class="text-sm font-medium text-gray-900 ml-4">
											{formatCurrency(job.price)}
										</div>
									{/if}
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Recent Customers -->
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
					<h2 class="font-semibold text-gray-900">Recent Customers</h2>
					<button
						onclick={() => goto('/app/customers')}
						class="text-sm text-blue-600 hover:text-blue-700"
					>
						View All
					</button>
				</div>
				<div class="divide-y divide-gray-200">
					{#if recentCustomers.length === 0}
						<div class="px-6 py-8 text-center text-gray-500 text-sm">
							No customers yet
						</div>
					{:else}
						{#each recentCustomers as customer}
							<button
								onclick={() => goto('/app/customers')}
								class="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
							>
								<div class="font-medium text-gray-900 text-sm">
									{customer.name}
								</div>
								<div class="text-xs text-gray-600 mt-1">
									{customer.email || 'No email'}
								</div>
								<div class="text-xs text-gray-500 mt-2">
									Added {formatDate(customer.created_at)}
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</div>
		</div>

		<!-- Monthly Performance -->
		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="font-semibold text-gray-900">This Month</h2>
				<TrendingUp class="h-5 w-5 text-green-500" />
			</div>
			<div class="grid grid-cols-2 gap-6">
				<div>
					<div class="text-3xl font-semibold text-gray-900">
						{stats.completedThisMonth}
					</div>
					<div class="text-sm text-gray-600 mt-1">Jobs Completed</div>
				</div>
				<div>
					<div class="text-3xl font-semibold text-gray-900">
						{formatCurrency(stats.revenueThisMonth)}
					</div>
					<div class="text-sm text-gray-600 mt-1">Revenue Generated</div>
				</div>
			</div>
		</div>
	{/if}
</div>
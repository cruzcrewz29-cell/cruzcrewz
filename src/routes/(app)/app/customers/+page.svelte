<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import Plus from 'lucide-svelte/icons/plus';
	import Mail from 'lucide-svelte/icons/mail';
	import Phone from 'lucide-svelte/icons/phone';
	import MapPin from 'lucide-svelte/icons/map-pin';
	import Search from 'lucide-svelte/icons/search';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	type Customer = {
		id: string;
		name: string;
		email: string | null;
		phone: string | null;
		address: string | null;
		created_at: string;
		job_count?: number;
		total_spent?: number;
	};

	let customers = $state<Customer[]>([]);
	let filteredCustomers = $state<Customer[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let showModal = $state(false);
	let editingCustomer = $state<Customer | null>(null);

	let formData = $state({
		name: '',
		email: '',
		phone: '',
		address: ''
	});

	onMount(async () => {
		await loadCustomers();
		loading = false;
	});

	async function loadCustomers() {
		const { data: customersData } = await supabase
			.from('customers')
			.select('*')
			.order('created_at', { ascending: false });

		if (!customersData) { customers = []; filteredCustomers = []; return; }

		const customerIds = customersData.map(c => c.id);
		const { data: jobsData } = await supabase
			.from('jobs')
			.select('customer_id, price')
			.in('customer_id', customerIds);

		const jobStats = (jobsData || []).reduce((acc, job) => {
			if (!job.customer_id) return acc;
			if (!acc[job.customer_id]) acc[job.customer_id] = { count: 0, total: 0 };
			acc[job.customer_id].count++;
			acc[job.customer_id].total += Number(job.price) || 0;
			return acc;
		}, {} as Record<string, { count: number; total: number }>);

		customers = customersData.map(customer => ({
			...customer,
			job_count: jobStats[customer.id]?.count || 0,
			total_spent: jobStats[customer.id]?.total || 0
		}));

		filteredCustomers = customers;
	}

	function openAddModal() {
		editingCustomer = null;
		formData = { name: '', email: '', phone: '', address: '' };
		showModal = true;
	}

	function openEditModal(customer: Customer) {
		editingCustomer = customer;
		formData = {
			name: customer.name,
			email: customer.email || '',
			phone: customer.phone || '',
			address: customer.address || ''
		};
		showModal = true;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!formData.name.trim()) return;

		const payload = {
			name: formData.name.trim(),
			email: formData.email.trim() || null,
			phone: formData.phone.trim() || null,
			address: formData.address.trim() || null
		};

		if (editingCustomer) {
			await supabase.from('customers').update(payload).eq('id', editingCustomer.id);
		} else {
			await supabase.from('customers').insert(payload);
		}

		showModal = false;
		await loadCustomers();
	}

	async function deleteCustomer(id: string) {
		if (!confirm('Delete this customer? Their jobs will be unlinked but not deleted.')) return;
		await supabase.from('customers').delete().eq('id', id);
		await loadCustomers();
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	$effect(() => {
		if (!searchQuery.trim()) {
			filteredCustomers = customers;
		} else {
			const query = searchQuery.toLowerCase();
			filteredCustomers = customers.filter(c =>
				c.name.toLowerCase().includes(query) ||
				c.email?.toLowerCase().includes(query) ||
				c.phone?.includes(query)
			);
		}
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-semibold text-gray-900">Customers</h1>
		<button
			onclick={openAddModal}
			class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
		>
			<Plus class="h-4 w-4" />
			Add Customer
		</button>
	</div>

	<div class="relative">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search customers by name, email, or phone..."
			class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
		/>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if filteredCustomers.length === 0}
		<div class="bg-white rounded-xl border border-gray-200 p-12 text-center">
			<p class="text-gray-500">{searchQuery ? 'No customers found' : 'No customers yet'}</p>
		</div>
	{:else}
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobs</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each filteredCustomers as customer}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="px-6 py-4">
									<div class="font-medium text-gray-900">{customer.name}</div>
									{#if customer.address}
										<div class="flex items-center gap-1 text-xs text-gray-500 mt-1">
											<MapPin class="h-3 w-3" />
											{customer.address}
										</div>
									{/if}
								</td>
								<td class="px-6 py-4">
									{#if customer.email}
										<div class="flex items-center gap-2 text-sm text-gray-600">
											<Mail class="h-4 w-4 text-gray-400" />
											{customer.email}
										</div>
									{/if}
									{#if customer.phone}
										<div class="flex items-center gap-2 text-sm text-gray-600 mt-1">
											<Phone class="h-4 w-4 text-gray-400" />
											{customer.phone}
										</div>
									{/if}
									{#if !customer.email && !customer.phone}
										<span class="text-sm text-gray-400">No contact info</span>
									{/if}
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-gray-900">{customer.job_count || 0}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm font-medium text-gray-900">
										{formatCurrency(customer.total_spent || 0)}
									</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-gray-600">{formatDate(customer.created_at)}</span>
								</td>
								<td class="px-6 py-4">
									<div class="flex items-center gap-2">
										<button
											onclick={() => openEditModal(customer)}
											class="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
										>
											<Pencil class="h-4 w-4" />
										</button>
										<button
											onclick={() => deleteCustomer(customer.id)}
											class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- Add/Edit Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => (showModal = false)}>
		<div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">
					{editingCustomer ? 'Edit Customer' : 'Add New Customer'}
				</h2>
			</div>

			<form onsubmit={handleSubmit} class="p-6 space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">
						Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						bind:value={formData.name}
						required
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
					<input
						type="email"
						bind:value={formData.email}
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
					<input
						type="tel"
						bind:value={formData.phone}
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
					<textarea
						bind:value={formData.address}
						rows="2"
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
					></textarea>
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
						{editingCustomer ? 'Save Changes' : 'Add Customer'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
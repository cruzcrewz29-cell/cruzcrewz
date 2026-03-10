<script lang="ts">
	// src/routes/(app)/app/pricing/+page.svelte
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { toast } from 'svelte-sonner';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import Loader from 'lucide-svelte/icons/loader';

	type PricingRule = {
		id: string;
		county: string;
		state: string;
		service_type: string;
		price_per_sqft: number;
		min_price: number | null;
		max_price: number | null;
	};

	type SeasonalMultiplier = {
		month: number;
		label: string;
		multiplier: number;
		note: string;
	};

	let rules   = $state<PricingRule[]>([]);
	let loading = $state(true);
	let showModal     = $state(false);
	let editingRule   = $state<PricingRule | null>(null);

	// Seasonal pricing
	let seasonalMultipliers = $state<SeasonalMultiplier[]>([
		{ month: 1,  label: 'January',   multiplier: 0.80, note: 'Off-season' },
		{ month: 2,  label: 'February',  multiplier: 0.80, note: 'Off-season' },
		{ month: 3,  label: 'March',     multiplier: 0.90, note: 'Pre-season' },
		{ month: 4,  label: 'April',     multiplier: 1.00, note: 'Peak season' },
		{ month: 5,  label: 'May',       multiplier: 1.10, note: 'Peak season' },
		{ month: 6,  label: 'June',      multiplier: 1.10, note: 'Peak season' },
		{ month: 7,  label: 'July',      multiplier: 1.05, note: 'Peak season' },
		{ month: 8,  label: 'August',    multiplier: 1.05, note: 'Peak season' },
		{ month: 9,  label: 'September', multiplier: 1.00, note: 'Shoulder' },
		{ month: 10, label: 'October',   multiplier: 1.00, note: 'Cleanup season' },
		{ month: 11, label: 'November',  multiplier: 0.85, note: 'Wind-down' },
		{ month: 12, label: 'December',  multiplier: 0.80, note: 'Off-season' },
	]);
	let savingSeasonal  = $state(false);
	let seasonalDirty   = $state(false);
	let generatingSeasonal = $state(false);

	const COUNTIES = {
		IL: ['Cook', 'Will', 'Lake'],
		IN: ['Porter', 'Lake']
	};

	const SERVICE_TYPES = [
		'Lawn Mowing',
		'Trimming & Edging',
		'Bush, Shrub & Tree Care',
		'Spring & Fall Cleanups',
		'Landscape Maintenance',
		'Lawn Aeration & Overseeding'
	];

	let formData = $state({
		county: '',
		state: 'IL',
		service_type: '',
		price_per_sqft: '',
		min_price: '',
		max_price: ''
	});

	onMount(async () => {
		await fetchRules();
		await loadSeasonalMultipliers();
		loading = false;
	});

	async function fetchRules() {
		const { data } = await supabase
			.from('pricing_rules')
			.select('*')
			.order('state, county, service_type');
		if (data) rules = data;
	}

	// ── Seasonal multipliers ──────────────────────────────────────────────────
	async function loadSeasonalMultipliers() {
		const { data } = await supabase
			.from('seasonal_pricing')
			.select('*')
			.order('month');
		if (data && data.length === 12) {
			seasonalMultipliers = seasonalMultipliers.map(m => {
				const row = data.find(r => r.month === m.month);
				return row ? { ...m, multiplier: row.multiplier, note: row.note ?? m.note } : m;
			});
		}
	}

	async function saveSeasonalMultipliers() {
		savingSeasonal = true;
		try {
			for (const m of seasonalMultipliers) {
				await supabase
					.from('seasonal_pricing')
					.upsert({ month: m.month, multiplier: m.multiplier, note: m.note }, { onConflict: 'month' });
			}
			seasonalDirty = false;
			toast.success('Seasonal pricing saved');
		} catch {
			toast.error('Failed to save seasonal pricing');
		} finally {
			savingSeasonal = false;
		}
	}

	async function generateSeasonalWithAI() {
		generatingSeasonal = true;
		try {
			const res = await fetch('/api/generate-seasonal-pricing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ region: 'Chicago metro and northwest Indiana' }),
			});
			const data = await res.json();
			if (!res.ok || !data.multipliers) throw new Error('Failed');
			seasonalMultipliers = seasonalMultipliers.map(m => {
				const ai = data.multipliers.find((r: any) => r.month === m.month);
				return ai ? { ...m, multiplier: ai.multiplier, note: ai.note } : m;
			});
			seasonalDirty = true;
			toast.success('AI suggestions applied — review and save');
		} catch {
			toast.error('Failed to generate AI pricing suggestions');
		} finally {
			generatingSeasonal = false;
		}
	}

	function updateMultiplier(month: number, value: string) {
		const num = parseFloat(value);
		if (isNaN(num) || num <= 0) return;
		seasonalMultipliers = seasonalMultipliers.map(m =>
			m.month === month ? { ...m, multiplier: num } : m
		);
		seasonalDirty = true;
	}

	function multiplierColor(m: number) {
		if (m >= 1.08) return 'text-emerald-700 bg-emerald-50';
		if (m >= 1.0)  return 'text-blue-700 bg-blue-50';
		if (m >= 0.90) return 'text-gray-700 bg-gray-100';
		return 'text-amber-700 bg-amber-50';
	}

	let currentMonth = new Date().getMonth() + 1;

	// ── Pricing rules CRUD ────────────────────────────────────────────────────
	function openAddModal() {
		editingRule = null;
		formData = { county: '', state: 'IL', service_type: '', price_per_sqft: '', min_price: '', max_price: '' };
		showModal = true;
	}

	function openEditModal(rule: PricingRule) {
		editingRule = rule;
		formData = {
			county: rule.county,
			state: rule.state,
			service_type: rule.service_type,
			price_per_sqft: rule.price_per_sqft.toString(),
			min_price: rule.min_price?.toString() || '',
			max_price: rule.max_price?.toString() || ''
		};
		showModal = true;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const payload = {
			county: formData.county,
			state: formData.state,
			service_type: formData.service_type,
			price_per_sqft: parseFloat(formData.price_per_sqft),
			min_price: formData.min_price ? parseFloat(formData.min_price) : null,
			max_price: formData.max_price ? parseFloat(formData.max_price) : null,
			updated_at: new Date().toISOString()
		};
		if (editingRule) {
			const { error } = await supabase.from('pricing_rules').update(payload).eq('id', editingRule.id);
			if (error) { toast.error('Failed to update pricing rule'); return; }
			toast.success('Pricing rule updated');
		} else {
			const { error } = await supabase.from('pricing_rules').insert(payload);
			if (error) { toast.error('Failed to create pricing rule'); return; }
			toast.success('Pricing rule created');
		}
		showModal = false;
		await fetchRules();
	}

	async function deleteRule(id: string) {
		if (!confirm('Are you sure you want to delete this pricing rule?')) return;
		const { error } = await supabase.from('pricing_rules').delete().eq('id', id);
		if (error) { toast.error('Failed to delete pricing rule'); return; }
		toast.success('Pricing rule deleted');
		await fetchRules();
	}

	function getRulesForState(state: string) {
		return rules.filter(r => r.state === state);
	}
</script>

<div class="space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Pricing Rules</h1>
			<p class="mt-1 text-sm text-gray-600">Set pricing rates per square foot by county and service type</p>
		</div>
		<button
			onclick={openAddModal}
			class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
		>
			<Plus class="h-4 w-4" />
			Add Rule
		</button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else}

		<!-- ── Seasonal Pricing ── -->
		<div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
			<div class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
				<div>
					<h2 class="text-base font-semibold text-gray-900">Seasonal Pricing Multipliers</h2>
					<p class="text-xs text-gray-500 mt-0.5">Applied on top of base rates. 1.10 = +10%, 0.80 = −20%.</p>
				</div>
				<div class="flex items-center gap-2">
					<button
						onclick={generateSeasonalWithAI}
						disabled={generatingSeasonal}
						class="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
					>
						{#if generatingSeasonal}
							<Loader class="h-3.5 w-3.5 animate-spin" />
						{:else}
							<Sparkles class="h-3.5 w-3.5" />
						{/if}
						AI Suggest
					</button>
					{#if seasonalDirty}
						<button
							onclick={saveSeasonalMultipliers}
							disabled={savingSeasonal}
							class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
						>
							{#if savingSeasonal}
								<Loader class="h-3.5 w-3.5 animate-spin" />
							{:else}
								Save Changes
							{/if}
						</button>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-3 gap-px bg-gray-100 sm:grid-cols-4 lg:grid-cols-6">
				{#each seasonalMultipliers as m}
					<div class="bg-white px-4 py-3 {m.month === currentMonth ? 'ring-2 ring-inset ring-emerald-400' : ''}">
						<div class="flex items-center justify-between mb-1.5">
							<span class="text-xs font-semibold text-gray-500">{m.label.slice(0, 3).toUpperCase()}</span>
							{#if m.month === currentMonth}
								<span class="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700">Now</span>
							{/if}
						</div>
						<input
							type="number"
							value={m.multiplier}
							oninput={(e) => updateMultiplier(m.month, (e.target as HTMLInputElement).value)}
							step="0.01"
							min="0.1"
							max="3"
							class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm font-bold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20
								{multiplierColor(m.multiplier)}"
						/>
						<p class="mt-1 text-center text-xs text-gray-400 truncate">{m.note}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Illinois Rules -->
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-200 bg-blue-50">
				<h2 class="text-lg font-semibold text-gray-900">Illinois</h2>
			</div>
			{#if getRulesForState('IL').length === 0}
				<div class="px-6 py-8 text-center text-gray-500 text-sm">No pricing rules for Illinois yet</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50 border-b border-gray-200">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">County</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/sq ft</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Price</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Price</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each getRulesForState('IL') as rule}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 text-sm text-gray-900">{rule.county}</td>
									<td class="px-6 py-4 text-sm text-gray-900">{rule.service_type}</td>
									<td class="px-6 py-4 text-sm text-gray-900">${rule.price_per_sqft.toFixed(4)}</td>
									<td class="px-6 py-4 text-sm text-gray-900">{rule.min_price ? `$${rule.min_price}` : '-'}</td>
									<td class="px-6 py-4 text-sm text-gray-900">{rule.max_price ? `$${rule.max_price}` : '-'}</td>
									<td class="px-6 py-4 text-sm">
										<div class="flex gap-2">
											<button onclick={() => openEditModal(rule)} class="p-1 text-gray-400 hover:text-gray-900 rounded">
												<Pencil class="h-4 w-4" />
											</button>
											<button onclick={() => deleteRule(rule.id)} class="p-1 text-gray-400 hover:text-red-600 rounded">
												<Trash2 class="h-4 w-4" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<!-- Indiana Rules -->
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-200 bg-orange-50">
				<h2 class="text-lg font-semibold text-gray-900">Indiana</h2>
			</div>
			{#if getRulesForState('IN').length === 0}
				<div class="px-6 py-8 text-center text-gray-500 text-sm">No pricing rules for Indiana yet</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50 border-b border-gray-200">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">County</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/sq ft</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Price</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Price</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each getRulesForState('IN') as rule}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 text-sm text-gray-900">{rule.county}</td>
									<td class="px-6 py-4 text-sm text-gray-900">{rule.service_type}</td>
									<td class="px-6 py-4 text-sm text-gray-900">${rule.price_per_sqft.toFixed(4)}</td>
									<td class="px-6 py-4 text-sm text-gray-900">{rule.min_price ? `$${rule.min_price}` : '-'}</td>
									<td class="px-6 py-4 text-sm text-gray-900">{rule.max_price ? `$${rule.max_price}` : '-'}</td>
									<td class="px-6 py-4 text-sm">
										<div class="flex gap-2">
											<button onclick={() => openEditModal(rule)} class="p-1 text-gray-400 hover:text-gray-900 rounded">
												<Pencil class="h-4 w-4" />
											</button>
											<button onclick={() => deleteRule(rule.id)} class="p-1 text-gray-400 hover:text-red-600 rounded">
												<Trash2 class="h-4 w-4" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Add/Edit Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => (showModal = false)}>
		<div class="bg-white rounded-xl shadow-xl max-w-md w-full" onclick={(e) => e.stopPropagation()}>
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">
					{editingRule ? 'Edit Pricing Rule' : 'Add Pricing Rule'}
				</h2>
			</div>
			<form onsubmit={handleSubmit} class="p-6 space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">State <span class="text-red-500">*</span></label>
						<select bind:value={formData.state} required
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
							<option value="IL">Illinois</option>
							<option value="IN">Indiana</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">County <span class="text-red-500">*</span></label>
						<select bind:value={formData.county} required
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
							<option value="">Select county...</option>
							{#each COUNTIES[formData.state as 'IL' | 'IN'] as county}
								<option value={county}>{county}</option>
							{/each}
						</select>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Service Type <span class="text-red-500">*</span></label>
					<select bind:value={formData.service_type} required
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
						<option value="">Select service...</option>
						{#each SERVICE_TYPES as service}
							<option value={service}>{service}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Price per Sq Ft <span class="text-red-500">*</span></label>
					<input type="number" bind:value={formData.price_per_sqft} required step="0.0001" min="0" placeholder="0.0100"
						class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
					<p class="mt-1 text-xs text-gray-500">Example: 0.01 = $1 per 100 sq ft · A 6,000 sqft lot at 0.01 = $60</p>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Min Price ($)</label>
						<input type="number" bind:value={formData.min_price} step="0.01" min="0" placeholder="60.00"
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Max Price ($)</label>
						<input type="number" bind:value={formData.max_price} step="0.01" min="0" placeholder="500.00"
							class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
					</div>
				</div>
				<div class="flex gap-3 pt-2">
					<button type="button" onclick={() => (showModal = false)}
						class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
						Cancel
					</button>
					<button type="submit"
						class="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
						{editingRule ? 'Save Changes' : 'Add Rule'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
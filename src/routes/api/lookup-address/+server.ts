<script lang="ts">
	// Add to existing imports
	import { debounce } from '$lib/utils';

	// Add to existing state
	let addressSuggestions = $state<string[]>([]);
	let showSuggestions = $state(false);
	let lookingUpAddress = $state(false);
	let lotSizeInfo = $state<{ size: number; source: string } | null>(null);

	// Add this function
	const searchAddresses = debounce(async (query: string) => {
	if (query.length < 3) {
		addressSuggestions = [];
		return;
	}

	try {
		const response = await fetch(`/api/autocomplete-address?query=${encodeURIComponent(query)}`);
		const data = await response.json();
		
		if (data.predictions) {
			addressSuggestions = data.predictions.map((p: any) => p.description);
		}
	} catch (error) {
		console.error('Address search error:', error);
	}
}, 300);

	async function selectAddress(address: string) {
		formData.address = address;
		showSuggestions = false;
		lookingUpAddress = true;

		try {
			const response = await fetch('/api/lookup-address', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ address })
			});

			const result = await response.json();

			if (result.success && result.data) {
				// Auto-fill city, state, zip if available
				const parts = result.data.formatted_address?.split(', ');
				if (parts && parts.length >= 3) {
					formData.city = parts[1] || formData.city;
					const stateZip = parts[2]?.split(' ');
					if (stateZip) {
						formData.state = stateZip[0] || formData.state;
						formData.zipCode = stateZip[1] || formData.zipCode;
					}
				}

				// Set lot size if available
				if (result.data.lot_size_sqft) {
					lotSizeInfo = {
						size: result.data.lot_size_sqft,
						source: result.data.data_source
					};
					// Auto-calculate price based on lot size
					calculatePriceFromLotSize(result.data.lot_size_sqft);
				}
			}
		} catch (error) {
			console.error('Address lookup failed:', error);
		} finally {
			lookingUpAddress = false;
		}
	}

await calculatePriceFromLotSize(result.data.lot_size_sqft, result.data.county);
	if (!selectedServiceData) return;

	// Get pricing rule for this county/service
	const { data: pricingRule } = await supabase
		.from('pricing_rules')
		.select('*')
		.eq('county', county)
		.eq('state', formData.state)
		.eq('service_type', selectedServiceData.name)
		.single();

	if (pricingRule) {
		let price = sqft * pricingRule.price_per_sqft;
		
		// Apply min/max constraints
		if (pricingRule.min_price && price < pricingRule.min_price) {
			price = pricingRule.min_price;
		}
		if (pricingRule.max_price && price > pricingRule.max_price) {
			price = pricingRule.max_price;
		}
		
		estimatedPrice = Math.round(price);
	} else {
		// Fallback to default pricing
		estimatedPrice = Math.max(60, sqft * 0.01);
	}
}
</script>

<!-- Replace the address input section in Step 2 -->
<div>
	<label for="address" class="block text-sm font-medium text-gray-700">Street Address</label>
	<div class="relative">
		<input
			type="text"
			id="address"
			bind:value={formData.address}
			oninput={(e) => {
				searchAddresses(e.currentTarget.value);
				showSuggestions = true;
			}}
			onfocus={() => showSuggestions = addressSuggestions.length > 0}
			class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
			class:border-red-500={errors.address}
			placeholder="123 Main St"
		/>
		{#if lookingUpAddress}
			<div class="absolute right-3 top-5">
				<div class="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
			</div>
		{/if}
		
		{#if showSuggestions && addressSuggestions.length > 0}
			<div class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
				{#each addressSuggestions as suggestion}
					<button
						type="button"
						onclick={() => selectAddress(suggestion)}
						class="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
					>
						{suggestion}
					</button>
				{/each}
			</div>
		{/if}
	</div>
	{#if errors.address}
		<p class="mt-1 text-sm text-red-600">{errors.address}</p>
	{/if}
	{#if lotSizeInfo}
		<p class="mt-2 text-sm text-green-600">
			✓ Lot size: {lotSizeInfo.size.toLocaleString()} sq ft ({lotSizeInfo.source})
		</p>
	{/if}
</div>
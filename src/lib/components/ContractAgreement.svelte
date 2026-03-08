<script lang="ts">
	import { supabase } from '$lib/supabase';
	import ContractSignature from './ContractSignature.svelte';
	import PaymentForm from './PaymentForm.svelte';
	import { toast } from 'svelte-sonner';

	type ContractData = {
		jobId: string;
		customerId: string;
		customerName: string;
		customerEmail: string;
		customerPhone: string;
		services: string[];
		schedule: string;
		totalPrice: number;
	};

	let { contractData, onComplete, onCancel } = $props<{
		contractData: ContractData;
		onComplete: () => void;
		onCancel: () => void;
	}>();

	// 3 steps: 1 = Review terms, 2 = Sign, 3 = Payment
	let step = $state(1);
	let termsAccepted = $state(false);
	let signatureData = $state('');
	let location = $state<{ lat: number; lng: number } | null>(null);
	let submitting = $state(false);

	const STEP_LABELS = ['Review', 'Sign', 'Payment'];

	const CONTRACT_TERMS = `
Additional Terms and Conditions

1. Liability: • The Service Provider is not liable for any property damage, unless caused by negligence or willful misconduct. • The Client agrees to indemnify and hold the Service Provider harmless from any claims or expenses arising from the services provided, except those arising from the Service Provider's negligence.

2. Termination: • Either party may terminate this contract with a 30-day written notice. • The Service Provider reserves the right to terminate the contract immediately in case of non-payment or breach of terms.

3. Force Majeure: • The Service Provider is not liable for failure to perform services due to circumstances beyond their control, such as severe weather or natural disasters.

4. Governing Law: This contract is governed by the laws of the states of Illinois and Indiana, as applicable to the service location.

5. Estimates and Service Adjustments: All digital estimates are preliminary and based on information provided by the Client. The Service Provider reserves the right to adjust the final price if the actual site conditions (e.g., grass height, debris, property size, or terrain) differ from the description provided. If an adjustment is necessary, the Service Provider will notify the Client before beginning work.

6. Access to Property: The Client must ensure that the service area is accessible (e.g., unlocked gates) and free of obstructions, including pet waste, toys, hoses, and large debris, on the scheduled service day. The Service Provider reserves the right to skip inaccessible areas or charge a "trip fee" if the property cannot be serviced.

7. Underground Installations: The Client is responsible for marking or notifying the Service Provider of any shallow-buried cables, wires, or irrigation heads. The Service Provider is not liable for damage to unmarked or improperly installed underground items (e.g., fiber optic lines, lighting wires, or invisible pet fences).

8. Pet Waste: The Client agrees to clear the lawn of pet waste prior to service. If excessive waste is present, the Service Provider may, at their discretion, charge an additional cleanup fee or decline service for that visit.

9. Payment Terms: Payment is due upon receipt of the invoice unless otherwise agreed. Late payments exceeding 15 days will incur a late fee. The Service Provider may pause all scheduled services until the account is brought current.
	`.trim();

	// Grab location silently — used for contract audit trail
	$effect(() => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => { location = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
				() => {} // silently ignore — not required
			);
		}
	});

	function handleSignatureSave(data: string)  { signatureData = data; }
	function handleSignatureClear()              { signatureData = ''; }

	async function handlePaymentSuccess() {
		await finalizeContract();
	}

	async function finalizeContract() {
		submitting = true;
		try {
			// Save contract record
			const { error: contractError } = await supabase
				.from('contracts')
				.insert({
					job_id:           contractData.jobId,
					customer_id:      contractData.customerId,
					services_provided: contractData.services.join(', '),
					schedule:         contractData.schedule,
					terms_accepted:   termsAccepted,
					signature_data:   signatureData,
					signing_location: location ? `${location.lat},${location.lng}` : null
				});

			if (contractError) throw contractError;

			// Update job status
			const { error: jobError } = await supabase
				.from('jobs')
				.update({
					contract_signed_at:       new Date().toISOString(),
					contract_signature_data:  signatureData,
					signing_location:         location ? `${location.lat},${location.lng}` : null,
					customer_phone:           contractData.customerPhone,
					sms_verified:             true,
					status:                   'scheduled'
				})
				.eq('id', contractData.jobId);

			if (jobError) throw jobError;

			// Send confirmation email — fire and forget, don't block completion
			fetch('/api/send-contract-confirmation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerEmail: contractData.customerEmail,
					customerName:  contractData.customerName,
					services:      contractData.services,
					schedule:      contractData.schedule,
					totalPrice:    contractData.totalPrice,
					signedAt:      new Date().toISOString()
				})
			}).catch((e) => console.error('[contract] confirmation email failed:', e));

			onComplete();
		} catch (err) {
			console.error('[contract] finalize error:', err);
			toast.error('Failed to submit contract. Please try again.');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" onclick={onCancel}>
<div class="my-8 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onclick={(e) => e.stopPropagation()}>
		<!-- Header -->
		<div class="bg-gradient-to-br from-green-700 to-green-600 px-6 py-5 text-white">
			<h2 class="text-lg font-bold">Service Agreement</h2>
			<!-- Step indicator -->
			<div class="mt-3 flex items-center gap-2">
				{#each STEP_LABELS as label, i}
					{@const num = i + 1}
					{@const done   = step > num}
					{@const active = step === num}
					<div class="flex items-center gap-2">
						<div class="flex items-center gap-1.5">
							<div class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
								{done   ? 'bg-white text-green-700' :
								 active ? 'bg-white/30 text-white ring-2 ring-white' :
								          'bg-white/10 text-white/50'}">
								{#if done}
									<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
									</svg>
								{:else}{num}{/if}
							</div>
							<span class="text-xs font-medium {active ? 'text-white' : 'text-white/50'}">{label}</span>
						</div>
						{#if i < STEP_LABELS.length - 1}
							<div class="h-px w-6 {step > num ? 'bg-white' : 'bg-white/20'}"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- ── Step 1: Review ── -->
		{#if step === 1}
			<div class="max-h-[60vh] overflow-y-auto p-6 space-y-5">

				<!-- Summary -->
				<div class="overflow-hidden rounded-xl border border-gray-100">
					<div class="bg-gray-900 px-4 py-2.5">
						<p class="text-xs font-semibold uppercase tracking-wide text-white">Agreement Summary</p>
					</div>
					<div class="divide-y divide-gray-50 bg-white">
						<div class="flex justify-between px-4 py-3">
							<span class="text-xs font-medium text-gray-500">Customer</span>
							<span class="text-sm font-medium text-gray-900">{contractData.customerName}</span>
						</div>
						<div class="flex justify-between px-4 py-3">
							<span class="text-xs font-medium text-gray-500">Service</span>
							<span class="text-sm font-medium text-gray-900">{contractData.services.join(', ')}</span>
						</div>
						<div class="flex justify-between px-4 py-3">
							<span class="text-xs font-medium text-gray-500">Schedule</span>
							<span class="text-sm font-medium text-gray-900">{contractData.schedule}</span>
						</div>
						<div class="flex justify-between bg-green-50 px-4 py-3">
							<span class="text-sm font-bold text-gray-900">Total Price</span>
							<span class="text-xl font-extrabold text-green-600">${contractData.totalPrice.toFixed(2)}</span>
						</div>
					</div>
				</div>

				<!-- Terms -->
				<div>
					<p class="mb-2 text-sm font-semibold text-gray-900">Terms and Conditions</p>
					<div class="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600 whitespace-pre-line">
						{CONTRACT_TERMS}
					</div>
				</div>

				<!-- Accept checkbox -->
				<label class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors">
					<input
						type="checkbox"
						bind:checked={termsAccepted}
						class="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
					/>
					<span class="text-sm text-gray-700">
						I have read and agree to the terms and conditions outlined above.
					</span>
				</label>
			</div>

			<div class="flex gap-3 border-t border-gray-100 px-6 py-4">
				<button onclick={onCancel}
					class="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
					Cancel
				</button>
				<button
					onclick={() => (step = 2)}
					disabled={!termsAccepted}
					class="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					Continue to Signature
				</button>
			</div>
		{/if}

		<!-- ── Step 2: Signature ── -->
		{#if step === 2}
			<div class="p-6 space-y-5">
				<div>
					<p class="text-sm font-semibold text-gray-900">Sign below to accept this agreement</p>
					<p class="mt-1 text-xs text-gray-500">By signing, you agree to the terms and conditions of this service contract.</p>
				</div>

				<ContractSignature onSave={handleSignatureSave} onClear={handleSignatureClear} />

				{#if signatureData}
					<div class="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
						<svg class="h-4 w-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
						</svg>
						<span class="text-sm font-medium text-green-800">Signature saved</span>
					</div>
				{/if}
			</div>

			<div class="flex gap-3 border-t border-gray-100 px-6 py-4">
				<button onclick={() => (step = 1)}
					class="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
					Back
				</button>
				<button
					onclick={() => (step = 3)}
					disabled={!signatureData}
					class="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					Continue to Payment
				</button>
			</div>
		{/if}

		<!-- ── Step 3: Payment ── -->
		{#if step === 3}
			<div class="p-6 space-y-5">
				<div class="overflow-hidden rounded-xl border border-gray-100">
					<div class="bg-gray-900 px-4 py-2.5">
						<p class="text-xs font-semibold uppercase tracking-wide text-white">Amount Due</p>
					</div>
					<div class="flex items-center justify-between bg-green-50 px-4 py-4">
						<span class="text-sm font-bold text-gray-900">{contractData.services[0]}</span>
						<span class="text-2xl font-extrabold text-green-600">${contractData.totalPrice.toFixed(2)}</span>
					</div>
				</div>

				<PaymentForm
					amount={contractData.totalPrice}
					jobId={contractData.jobId}
					onSuccess={handlePaymentSuccess}
					onCancel={onCancel}
/>
			</div>

			<div class="border-t border-gray-100 px-6 py-4">
			<button onclick={() => (step = 2)}
				class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
				Back to signature
				</button>
			</div>
		{/if}
	</div>
</div>
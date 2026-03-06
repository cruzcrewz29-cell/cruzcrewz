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

	let step = $state(1); // 1: Review, 2: Sign, 3: SMS Verify, 4: Payment
	let termsAccepted = $state(false);
	let signatureData = $state('');
	let smsCode = $state('');
	let sentCode = $state('');
	let location = $state<{ lat: number; lng: number } | null>(null);
	let submitting = $state(false);

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

	function getLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					location = {
						lat: position.coords.latitude,
						lng: position.coords.longitude
					};
				},
				(error) => {
					console.log('Location access denied:', error);
				}
			);
		}
	}

	function handleSignatureSave(data: string) {
		signatureData = data;
	}

	function handleSignatureClear() {
		signatureData = '';
	}

	async function sendSMSVerification() {
		sentCode = Math.floor(100000 + Math.random() * 900000).toString();

		console.log('SMS Code:', sentCode, 'to', contractData.customerPhone);

		toast.info(`Verification code: ${sentCode}`, {
			description: 'In production, this will be sent via SMS',
			duration: 8000
		});

		step = 3;
	}

	function verifySMSCode() {
		if (smsCode === sentCode) {
			step = 4; // Go to payment step
		} else {
			toast.error('Invalid verification code. Please try again.');
		}
	}

	async function handlePaymentSuccess() {
		await finalizeContract();
	}

	async function finalizeContract() {
		submitting = true;

		try {
			// Save contract to database
			const { data: contract, error: contractError } = await supabase
				.from('contracts')
				.insert({
					job_id: contractData.jobId,
					customer_id: contractData.customerId,
					services_provided: contractData.services.join(', '),
					schedule: contractData.schedule,
					terms_accepted: termsAccepted,
					signature_data: signatureData,
					signing_location: location ? `${location.lat},${location.lng}` : null
				})
				.select()
				.single();

			if (contractError) throw contractError;

			// Update job with contract info
			const { error: jobError } = await supabase
				.from('jobs')
				.update({
					contract_signed_at: new Date().toISOString(),
					contract_signature_data: signatureData,
					signing_location: location ? `${location.lat},${location.lng}` : null,
					customer_phone: contractData.customerPhone,
					sms_verified: true,
					status: 'scheduled'
				})
				.eq('id', contractData.jobId);

			if (jobError) throw jobError;

			// Send confirmation email
			await fetch('/api/send-contract-confirmation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerEmail: contractData.customerEmail,
					customerName: contractData.customerName,
					services: contractData.services,
					schedule: contractData.schedule,
					totalPrice: contractData.totalPrice,
					signedAt: new Date().toISOString()
				})
			});

			onComplete();
		} catch (error) {
			console.error('Contract submission error:', error);
			toast.error('Failed to submit contract. Please try again.');
		} finally {
			submitting = false;
		}
	}

	$effect(() => {
		getLocation();
	});
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
	<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
		<!-- Header -->
		<div class="px-6 py-4 border-b border-gray-200">
			<h2 class="text-xl font-semibold text-gray-900">Service Agreement</h2>
			<p class="text-sm text-gray-600 mt-1">Step {step} of 4</p>
		</div>

		<!-- Step 1: Review Contract -->
		{#if step === 1}
			<div class="p-6 space-y-6 max-h-96 overflow-y-auto">
				<div>
					<h3 class="font-semibold text-gray-900 mb-2">Customer Information</h3>
					<div class="text-sm text-gray-600 space-y-1">
						<p><strong>Name:</strong> {contractData.customerName}</p>
						<p><strong>Email:</strong> {contractData.customerEmail}</p>
						<p><strong>Phone:</strong> {contractData.customerPhone}</p>
					</div>
				</div>

				<div>
					<h3 class="font-semibold text-gray-900 mb-2">Services Provided</h3>
					<ul class="text-sm text-gray-600 list-disc list-inside space-y-1">
						{#each contractData.services as service}
							<li>{service}</li>
						{/each}
					</ul>
				</div>

				<div>
					<h3 class="font-semibold text-gray-900 mb-2">Schedule</h3>
					<p class="text-sm text-gray-600">{contractData.schedule}</p>
				</div>

				<div>
					<h3 class="font-semibold text-gray-900 mb-2">Total Price</h3>
					<p class="text-2xl font-bold text-green-600">
						${contractData.totalPrice.toFixed(2)}
					</p>
				</div>

				<div>
					<h3 class="font-semibold text-gray-900 mb-2">Terms and Conditions</h3>
					<div class="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg whitespace-pre-line">
						{CONTRACT_TERMS}
					</div>
				</div>

				<div class="flex items-start gap-2">
					<input
						type="checkbox"
						id="terms"
						bind:checked={termsAccepted}
						class="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
					/>
					<label for="terms" class="text-sm text-gray-700">
						I have read and agree to the terms and conditions outlined above.
					</label>
				</div>
			</div>

			<div class="px-6 py-4 border-t border-gray-200 flex gap-3">
				<button
					onclick={onCancel}
					class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					onclick={() => (step = 2)}
					disabled={!termsAccepted}
					class="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Continue to Signature
				</button>
			</div>
		{/if}

		<!-- Step 2: Signature -->
		{#if step === 2}
			<div class="p-6 space-y-6">
				<div>
					<h3 class="font-semibold text-gray-900 mb-2">
						Please sign below to accept this agreement
					</h3>
					<p class="text-sm text-gray-600">
						By signing, you agree to the terms and conditions outlined in this contract.
					</p>
				</div>

				<ContractSignature onSave={handleSignatureSave} onClear={handleSignatureClear} />

				{#if signatureData}
					<div class="bg-green-50 border border-green-200 rounded-lg p-4">
						<p class="text-sm text-green-800">✓ Signature saved</p>
					</div>
				{/if}
			</div>

			<div class="px-6 py-4 border-t border-gray-200 flex gap-3">
				<button
					onclick={() => (step = 1)}
					class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
				>
					Back
				</button>
				<button
					onclick={sendSMSVerification}
					disabled={!signatureData}
					class="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Verify Phone Number
				</button>
			</div>
		{/if}

		<!-- Step 3: SMS Verification -->
		{#if step === 3}
			<div class="p-6 space-y-6">
				<div>
					<h3 class="font-semibold text-gray-900 mb-2">Verify Your Phone Number</h3>
					<p class="text-sm text-gray-600">
						We've sent a verification code to {contractData.customerPhone}
					</p>
				</div>

				<div>
					<label for="sms-code" class="block text-sm font-medium text-gray-700 mb-1">
						Enter 6-digit code
					</label>
					<input
						id="sms-code"
						type="text"
						bind:value={smsCode}
						maxlength="6"
						placeholder="000000"
						class="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
					/>
				</div>

				<button
					onclick={() => sendSMSVerification()}
					class="text-sm text-blue-600 hover:text-blue-700 underline"
				>
					Resend code
				</button>
			</div>

			<div class="px-6 py-4 border-t border-gray-200 flex gap-3">
				<button
					onclick={() => (step = 2)}
					disabled={submitting}
					class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
				>
					Back
				</button>
				<button
					onclick={verifySMSCode}
					disabled={smsCode.length !== 6 || submitting}
					class="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Continue to Payment
				</button>
			</div>
		{/if}

		<!-- Step 4: Payment -->
		{#if step === 4}
			<div class="p-6 space-y-6">
				<div>
					<h3 class="font-semibold text-gray-900 mb-2">Payment</h3>
					<p class="text-sm text-gray-600 mb-4">
						Enter your card details to complete the service agreement.
					</p>
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
						<p class="text-sm text-blue-800">
							<strong>Amount Due:</strong> ${contractData.totalPrice.toFixed(2)}
						</p>
					</div>
				</div>

				<PaymentForm
					amount={contractData.totalPrice}
					jobId={contractData.jobId}
					onSuccess={handlePaymentSuccess}
				/>
			</div>

			<div class="px-6 py-4 border-t border-gray-200">
				<button
					onclick={() => (step = 3)}
					class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
				>
					Back
				</button>
			</div>
		{/if}
	</div>
</div>
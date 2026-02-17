<script lang="ts">
	import { onMount } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import { PUBLIC_STRIPE_KEY } from '$env/static/public';

	let { amount, jobId, onSuccess, onCancel } = $props<{
		amount: number;
		jobId: string;
		onSuccess: () => void;
		onCancel: () => void;
	}>();

	let stripe: any = null;
	let elements: any = null;
	let card: any = null;
	let processing = $state(false);
	let error = $state('');

	onMount(async () => {
		stripe = await loadStripe(PUBLIC_STRIPE_KEY);
		elements = stripe.elements();

		card = elements.create('card', {
			style: {
				base: {
					fontSize: '16px',
					color: '#1f2937',
					fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
					'::placeholder': { color: '#9ca3af' }
				}
			}
		});

		card.mount('#card-element');
	});

	async function handleSubmit() {
		if (!stripe || !card) return;

		processing = true;
		error = '';

		try {
			// Get payment intent from backend
			const response = await fetch('/api/create-payment-intent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount, jobId })
			});

			const { clientSecret } = await response.json();

			// Confirm payment
			const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
				payment_method: { card }
			});

			if (stripeError) {
				error = stripeError.message;
			} else if (paymentIntent.status === 'succeeded') {
				onSuccess();
			}
		} catch (err) {
			error = 'Payment failed. Please try again.';
		} finally {
			processing = false;
		}
	}
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
	<div class="bg-white rounded-xl shadow-xl max-w-md w-full">
		<div class="px-6 py-4 border-b border-gray-200">
			<h2 class="text-xl font-semibold text-gray-900">Payment</h2>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="p-6 space-y-6">
			<div class="text-center">
				<div class="text-3xl font-bold text-gray-900">${amount.toFixed(2)}</div>
				<p class="text-sm text-gray-600 mt-1">Total Amount</p>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Card Information
				</label>
				<div id="card-element" class="p-3 border border-gray-300 rounded-lg"></div>
			</div>

			{#if error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-3">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					type="button"
					onclick={onCancel}
					disabled={processing}
					class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={processing}
					class="flex-1 px-4 py-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
				>
					{processing ? 'Processing...' : 'Pay Now'}
				</button>
			</div>

			<p class="text-xs text-gray-500 text-center">
				Secured by Stripe. Your payment information is encrypted.
			</p>
		</form>
	</div>
</div>
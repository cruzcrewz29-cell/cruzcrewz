import { json } from '@sveltejs/kit';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2024-12-18.acacia'
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { amount, jobId } = await request.json();

		if (!amount || amount <= 0) {
			return json({ error: 'Invalid amount' }, { status: 400 });
		}

		// Create payment intent
		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(amount * 100), // Convert to cents
			currency: 'usd',
			metadata: {
				jobId: jobId || ''
			}
		});

		return json({
			clientSecret: paymentIntent.client_secret
		});
	} catch (error) {
		console.error('Payment intent error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Payment failed'
			},
			{ status: 500 }
		);
	}
};
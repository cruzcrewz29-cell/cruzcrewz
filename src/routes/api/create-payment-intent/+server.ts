import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2024-11-20.acacia'
});

export async function POST({ request }) {
	try {
		const { amount, jobId } = await request.json();

		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(amount * 100), // Convert to cents
			currency: 'usd',
			metadata: { jobId }
		});

		return json({ clientSecret: paymentIntent.client_secret });
	} catch (error) {
		console.error('Stripe error:', error);
		return json({ error: 'Payment failed' }, { status: 500 });
	}
}
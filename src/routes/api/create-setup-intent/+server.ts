// src/routes/api/create-setup-intent/+server.ts
import { json, error } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { customerId, jobId } = await request.json();

  if (!customerId || !jobId) {
    throw error(400, 'customerId and jobId are required');
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch customer to check for existing Stripe customer ID
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, stripe_customer_id')
    .eq('id', customerId)
    .single();

  if (!customer) {
    throw error(404, 'Customer not found');
  }

  let stripeCustomerId = customer.stripe_customer_id;

  // Create Stripe customer if not already linked
  if (!stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({
      name:     customer.name  ?? undefined,
      email:    customer.email ?? undefined,
      metadata: { supabase_customer_id: customerId },
    });
    stripeCustomerId = stripeCustomer.id;

    // Save back to Supabase
    await supabase
      .from('customers')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', customerId);
  }

  // Create SetupIntent — $0 charged, saves card for future use
  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    usage:    'off_session',
    metadata: {
      supabase_customer_id: customerId,
      job_id:               jobId,
    },
  });

  return json({ clientSecret: setupIntent.client_secret });
};
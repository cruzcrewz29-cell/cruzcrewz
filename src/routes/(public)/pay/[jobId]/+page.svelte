<script lang="ts">
  // src/routes/(public)/pay/[jobId]/+page.svelte
  import { onMount } from 'svelte';
  import { loadStripe } from '@stripe/stripe-js';
  import { PUBLIC_STRIPE_PUBLISHABLE_KEY } from '$env/static/public';
  import { supabase } from '$lib/supabase';

  let { data } = $props<{ data: { jobId: string } }>();

  // ── State ────────────────────────────────────────────────────────────────
  let job        = $state<any>(null);
  let customer   = $state<any>(null);
  let loading    = $state(true);
  let notFound   = $state(false);
  let alreadyPaid = $state(false);

  // Stripe
  let stripe:     any = null;
  let elements:   any = null;
  let cardEl:     any = null;
  let stripeReady = $state(false);
  let processing  = $state(false);
  let stripeError = $state('');
  let paid        = $state(false);

  onMount(async () => {
    // Load job + customer
    const { data: jobData, error } = await supabase
      .from('jobs')
      .select(`
        id, service_type, price, status, scheduled_date,
        invoice_number, invoice_sent_at,
        customers ( id, name, email, address )
      `)
      .eq('id', data.jobId)
      .single();

    if (error || !jobData) {
      notFound = true;
      loading  = false;
      return;
    }

    job      = jobData;
    customer = jobData.customers;

    // Check if already paid (status = completed and we mark invoice paid via a column, or just status check)
    if (jobData.status === 'paid') {
      alreadyPaid = true;
      loading     = false;
      return;
    }

    loading = false;

    // Mount Stripe
    try {
      stripe   = await loadStripe(PUBLIC_STRIPE_PUBLISHABLE_KEY);
      elements = stripe.elements();
      cardEl   = elements.create('card', {
        style: {
          base: {
            fontSize:   '16px',
            color:      '#1f2937',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': { color: '#9ca3af' },
          },
        },
      });
      await new Promise(r => setTimeout(r, 80));
      cardEl.mount('#stripe-card-element');
      stripeReady = true;
    } catch (e) {
      console.error('[pay] stripe mount error:', e);
    }
  });

  async function handlePay() {
    if (!stripe || !cardEl || !job) return;
    stripeError = '';
    processing  = true;
    try {
      const res = await fetch('/api/create-payment-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: job.price, jobId: job.id }),
      });
      if (!res.ok) throw new Error('Failed to initialize payment');
      const { clientSecret } = await res.json();

      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardEl },
      });

      if (stripeErr) {
        stripeError = stripeErr.message;
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Mark job as paid
        await supabase
          .from('jobs')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', job.id);

        paid = true;
      }
    } catch (e: any) {
      stripeError = e.message ?? 'Payment failed. Please try again.';
    } finally {
      processing = false;
    }
  }

  function formatDate(d: string) {
    return new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  }
</script>

<svelte:head>
  <title>Pay Invoice | Cruz Crewz</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-10 sm:py-14">
  <div class="mx-auto max-w-lg px-4 sm:px-6">

    <!-- Brand -->
    <div class="mb-8 flex justify-center">
      <div class="flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600">
          <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 22V12M12 12C12 7 8 5 4 6c0 4 3 8 8 6zM12 12C12 7 16 5 20 6c0 4-3 8-8 6z"/>
          </svg>
        </div>
        <span class="text-lg font-bold text-gray-900">Cruz Crewz</span>
      </div>
    </div>

    {#if loading}
      <div class="flex h-48 items-center justify-center">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
      </div>

    {:else if notFound}
      <div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
        <div class="bg-gradient-to-br from-red-500 to-red-400 px-6 py-8 text-center text-white">
          <h1 class="text-2xl font-bold">Invoice Not Found</h1>
          <p class="mt-2 text-red-100">This payment link may have expired or be incorrect.</p>
        </div>
        <div class="p-6 text-center">
          <p class="text-sm text-gray-500">Please contact Cruz Crewz for assistance.</p>
        </div>
      </div>

    {:else if alreadyPaid || paid}
      <div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
        <div class="bg-gradient-to-br from-green-700 to-green-500 px-6 py-8 text-center text-white">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold">Payment Received</h1>
          <p class="mt-2 text-green-100">Thank you{customer?.name ? `, ${customer.name.split(' ')[0]}` : ''}! Your invoice has been paid.</p>
        </div>
        <div class="p-6 space-y-4 text-center">
          {#if job?.invoice_number}
            <p class="text-sm text-gray-500">Invoice {job.invoice_number}</p>
          {/if}
          <p class="text-sm text-gray-600">A receipt has been sent to your email. Thank you for your business!</p>
        </div>
      </div>

    {:else if job}
      <div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">

        <!-- Header -->
        <div class="bg-gradient-to-br from-green-700 via-green-600 to-green-500 px-6 py-6 text-white">
          <p class="text-xs font-semibold uppercase tracking-widest text-green-200">Invoice</p>
          <h1 class="mt-1 text-2xl font-bold">
            {#if job.invoice_number}
              {job.invoice_number}
            {:else}
              Pay Invoice
            {/if}
          </h1>
          {#if customer?.name}
            <p class="mt-0.5 text-sm text-green-100">{customer.name}</p>
          {/if}
        </div>

        <div class="p-6 space-y-6">

          <!-- Invoice details -->
          <div class="overflow-hidden rounded-xl border border-gray-100">
            <div class="divide-y divide-gray-50">
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs font-medium text-gray-500">Service</span>
                <span class="text-sm font-semibold text-gray-900">{job.service_type}</span>
              </div>
              {#if job.scheduled_date}
                <div class="flex items-center justify-between px-4 py-3">
                  <span class="text-xs font-medium text-gray-500">Service Date</span>
                  <span class="text-sm font-medium text-gray-700">{formatDate(job.scheduled_date)}</span>
                </div>
              {/if}
              {#if customer?.address}
                <div class="flex items-center justify-between px-4 py-3">
                  <span class="text-xs font-medium text-gray-500">Property</span>
                  <span class="text-sm font-medium text-gray-700 text-right max-w-[60%]">{customer.address}</span>
                </div>
              {/if}
              <div class="flex items-center justify-between bg-green-50 px-4 py-4">
                <span class="text-sm font-bold text-gray-900">Amount Due</span>
                <span class="text-2xl font-extrabold text-green-600">
                  ${Number(job.price ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <!-- Payment terms notice -->
          <div class="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <svg class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p class="text-xs leading-relaxed text-amber-700">
              Payment terms: <strong>Net-15.</strong> Payment is due within 15 days of the service date. Late payments may incur a fee.
            </p>
          </div>

          <!-- Card input -->
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Card Information
            </label>
            <div
              id="stripe-card-element"
              class="rounded-xl border border-gray-200 bg-gray-50 p-3.5 transition-all focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20"
            ></div>
            {#if !stripeReady}
              <p class="mt-1.5 text-xs text-gray-400">Loading secure payment form...</p>
            {/if}
          </div>

          {#if stripeError}
            <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p class="text-sm text-red-700">{stripeError}</p>
            </div>
          {/if}

          <!-- Pay button -->
          <button
            onclick={handlePay}
            disabled={!stripeReady || processing}
            class="w-full rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Processing...' : `Pay $${Number(job.price ?? 0).toFixed(2)}`}
          </button>

          <!-- Trust signals -->
          <p class="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Secured by Stripe. Your card details are never stored on our servers.
          </p>
        </div>
      </div>
    {/if}

  </div>
</div>
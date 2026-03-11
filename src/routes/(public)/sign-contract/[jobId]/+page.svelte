<script lang="ts">
  // src/routes/(public)/sign-contract/[jobId]/+page.svelte
  import { onMount } from 'svelte';
  import { loadStripe } from '@stripe/stripe-js';
  import { PUBLIC_STRIPE_KEY } from '$env/static/public';
  import { supabase } from '$lib/supabase';
  import ContractSignature from '$lib/components/ContractSignature.svelte';
  import { toast } from 'svelte-sonner';

  let { data } = $props<{ data: { job: any; alreadySigned: boolean; isExpired: boolean } }>();

  // ── Derived job/customer data ────────────────────────────────────────────
  let job      = $derived(data.job);
  let customer = $derived(data.job?.customers);
  let billingMode = $derived(customer?.billing_mode ?? 'card');
  let isInvoice   = $derived(billingMode === 'invoice');

  // Steps:
  //   card:    1 = Review  →  2 = Sign  →  3 = Payment  →  done
  //   invoice: 1 = Review  →  2 = Sign  →  done
  let STEP_LABELS = $derived(isInvoice ? ['Review', 'Sign'] : ['Review', 'Sign', 'Payment']);

  let step          = $state(1);
  let termsAccepted = $state(false);
  let signatureData = $state('');
  let submitting    = $state(false);
  let done          = $state(false);
  let location      = $state<{ lat: number; lng: number } | null>(null);

  // ── Stripe state (card path only) ────────────────────────────────────────
  let stripe:   any = null;
  let elements: any = null;
  let cardEl:   any = null;
  let stripeError   = $state('');
  let stripeReady   = $state(false);

  const CONTRACT_TERMS = `
Additional Terms and Conditions

1. Liability: The Service Provider is not liable for any property damage unless caused by negligence or willful misconduct. The Client agrees to indemnify and hold the Service Provider harmless from any claims or expenses arising from the services provided, except those arising from the Service Provider's negligence.

2. Termination: Either party may terminate this contract with a 30-day written notice. The Service Provider reserves the right to terminate the contract immediately in case of non-payment or breach of terms.

3. Force Majeure: The Service Provider is not liable for failure to perform services due to circumstances beyond their control, such as severe weather or natural disasters.

4. Governing Law: This contract is governed by the laws of the states of Illinois and Indiana, as applicable to the service location.

5. Estimates and Service Adjustments: All digital estimates are preliminary and based on information provided by the Client. The Service Provider reserves the right to adjust the final price if the actual site conditions differ from the description provided.

6. Access to Property: The Client must ensure that the service area is accessible and free of obstructions on the scheduled service day.

7. Underground Installations: The Client is responsible for marking any shallow-buried cables, wires, or irrigation heads. The Service Provider is not liable for damage to unmarked underground items.

8. Pet Waste: The Client agrees to clear the lawn of pet waste prior to service. Excessive waste may result in an additional cleanup fee or declined service for that visit.

9. Payment Terms: Payment is due upon receipt of the invoice unless otherwise agreed. Late payments exceeding 15 days will incur a late fee. Services may be paused until the account is current.
  `.trim();

  // ── Location for audit trail ─────────────────────────────────────────────
  $effect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { location = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {}
      );
    }
  });

  // ── Mount Stripe card element when reaching payment step ─────────────────
  $effect(() => {
    if (!isInvoice && step === 3 && !stripeReady) {
      mountStripe();
    }
  });

  async function mountStripe() {
    try {
      stripe   = await loadStripe(PUBLIC_STRIPE_KEY);
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
      // Tiny delay to ensure DOM is painted
      await new Promise(r => setTimeout(r, 80));
      cardEl.mount('#stripe-card-element');
      stripeReady = true;
    } catch (e) {
      console.error('[sign] stripe mount error:', e);
    }
  }

  // ── Finalize contract (both paths call this) ─────────────────────────────
  async function finalizeContract(setupIntentId?: string) {
    submitting = true;
    try {
      // Save contract record
      await supabase.from('contracts').insert({
        job_id:            job.id,
        customer_id:       customer.id,
        services_provided: job.service_type,
        schedule:          job.frequency ?? 'as scheduled',
        terms_accepted:    termsAccepted,
        signature_data:    signatureData,
        signing_location:  location ? `${location.lat},${location.lng}` : null,
      });

      // Update job + customer contract status
      await supabase
        .from('jobs')
        .update({
          contract_signed_at:      new Date().toISOString(),
          contract_signature_data: signatureData,
          signing_location:        location ? `${location.lat},${location.lng}` : null,
          status:                  'scheduled',
          ...(setupIntentId ? { stripe_setup_intent_id: setupIntentId } : {}),
        })
        .eq('id', job.id);

      await supabase
        .from('customers')
        .update({ contract_signed: true, contract_signed_at: new Date().toISOString() })
        .eq('id', customer.id);

      // Confirmation email — fire and forget
      fetch('/api/send-contract-confirmation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: customer.email,
          customerName:  customer.name,
          services:      [job.service_type],
          schedule:      job.frequency ?? 'as scheduled',
          totalPrice:    job.price ?? 0,
          signedAt:      new Date().toISOString(),
        }),
      }).catch(e => console.error('[sign] confirmation email failed:', e));

      done = true;
    } catch (err) {
      console.error('[sign] finalize error:', err);
      toast.error('Failed to submit agreement. Please try again.');
    } finally {
      submitting = false;
    }
  }

  // ── Card path: save card via SetupIntent ─────────────────────────────────
  async function handleSaveCard() {
    if (!stripe || !cardEl) return;
    stripeError = '';
    submitting  = true;
    try {
      // Create SetupIntent on backend
      const res = await fetch('/api/create-setup-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, jobId: job.id }),
      });
      if (!res.ok) throw new Error('Failed to create setup intent');
      const { clientSecret } = await res.json();

      const { setupIntent, error: stripeErr } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardEl },
      });

      if (stripeErr) {
        stripeError = stripeErr.message;
        submitting  = false;
        return;
      }

      await finalizeContract(setupIntent.id);
    } catch (e: any) {
      stripeError = e.message ?? 'Something went wrong.';
      submitting  = false;
    }
  }

  // ── Invoice path: sign only ───────────────────────────────────────────────
  async function handleInvoiceSign() {
    await finalizeContract();
  }

  function formatDate(d: string) {
    return new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  }
</script>

<svelte:head>
  <title>Service Agreement | Cruz Crewz</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-10 sm:py-14">
  <div class="mx-auto max-w-2xl px-4 sm:px-6">

    <!-- ── Brand header ── -->
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

    <!-- ── Already signed ── -->
    {#if data.alreadySigned}
      <div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
        <div class="bg-gradient-to-br from-green-700 to-green-500 px-6 py-8 text-center text-white">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold">Already Signed</h1>
          <p class="mt-2 text-green-100">This service agreement has already been signed. Thank you!</p>
        </div>
        <div class="p-6 text-center">
          <a href="/" class="text-sm font-medium text-green-700 hover:underline">Return to homepage</a>
        </div>
      </div>

    <!-- ── Expired ── -->
    {:else if data.isExpired}
      <div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
        <div class="bg-gradient-to-br from-amber-500 to-amber-400 px-6 py-8 text-center text-white">
          <h1 class="text-2xl font-bold">Quote Expired</h1>
          <p class="mt-2 text-amber-100">This quote is older than 30 days. Please request a new quote.</p>
        </div>
        <div class="p-6 text-center">
          <a href="/quote" class="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
            Get a New Quote
          </a>
        </div>
      </div>

    <!-- ── Done / success ── -->
    {:else if done}
      <div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
        <div class="bg-gradient-to-br from-green-700 to-green-500 px-6 py-8 text-center text-white">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold">You're all set!</h1>
          <p class="mt-2 text-green-100">
            {isInvoice
              ? 'Your service agreement is signed. We\'ll reach out to confirm your first visit.'
              : 'Your agreement is signed and your card is saved. We\'ll reach out to confirm your first visit.'}
          </p>
        </div>
        <div class="p-6 space-y-4">
          <div class="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-600">
            {#if isInvoice}
              <p>You'll receive a detailed invoice by email within 24 hours of each completed service. Payment terms: Net-15.</p>
            {:else}
              <p>Your card is securely saved. It will only be charged after each service is reviewed and completed — never before. You'll receive an invoice by email after every visit.</p>
            {/if}
          </div>
          <div class="text-center">
            <a href="/" class="text-sm font-medium text-green-700 hover:underline">Return to homepage</a>
          </div>
        </div>
      </div>

    <!-- ── Main flow ── -->
    {:else if job && customer}
      <div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">

        <!-- Header + step indicator -->
        <div class="bg-gradient-to-br from-green-700 via-green-600 to-green-500 px-6 py-6 text-white">
          <h1 class="text-xl font-bold">Service Agreement</h1>
          <p class="mt-0.5 text-sm text-green-100">{customer.name} · {job.service_type}</p>
          <!-- Step dots -->
          <div class="mt-4 flex items-center gap-2">
            {#each STEP_LABELS as label, i}
              {@const num  = i + 1}
              {@const done = step > num}
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

        <!-- ══ STEP 1 — Review ══ -->
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
                  <span class="text-sm font-medium text-gray-900">{customer.name}</span>
                </div>
                <div class="flex justify-between px-4 py-3">
                  <span class="text-xs font-medium text-gray-500">Service</span>
                  <span class="text-sm font-medium text-gray-900">{job.service_type}</span>
                </div>
                <div class="flex justify-between px-4 py-3">
                  <span class="text-xs font-medium text-gray-500">Scheduled</span>
                  <span class="text-sm font-medium text-gray-900">
                    {job.scheduled_date ? formatDate(job.scheduled_date) : 'TBD'}
                  </span>
                </div>
                {#if job.price}
                  <div class="flex justify-between bg-green-50 px-4 py-3">
                    <span class="text-sm font-bold text-gray-900">Estimated Price</span>
                    <span class="text-xl font-extrabold text-green-600">${Number(job.price).toFixed(2)}</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Billing mode info banner -->
            {#if isInvoice}
              <div class="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-4">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <div>
                  <p class="text-sm font-semibold text-amber-900">Invoice billing</p>
                  <p class="mt-0.5 text-xs leading-relaxed text-amber-700">
                    You'll receive a detailed invoice by email within 24 hours of each completed service. Payment terms: Net-15. No card is required today — your signature is all we need.
                  </p>
                </div>
              </div>
            {:else}
              <div class="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>
                </svg>
                <div>
                  <p class="text-sm font-semibold text-blue-900">Card on file — automatic billing</p>
                  <p class="mt-0.5 text-xs leading-relaxed text-blue-700">
                    Your card is saved securely and will only be charged after each service is reviewed and completed — never before. You'll receive an invoice by email after every visit.
                  </p>
                </div>
              </div>
            {/if}

            <!-- Terms -->
            <div>
              <p class="mb-2 text-sm font-semibold text-gray-900">Terms and Conditions</p>
              <div class="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600 whitespace-pre-line">
                {CONTRACT_TERMS}
              </div>
            </div>

            <!-- Accept -->
            <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                bind:checked={termsAccepted}
                class="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span class="text-sm text-gray-700">I have read and agree to the terms and conditions outlined above.</span>
            </label>
          </div>

          <div class="flex gap-3 border-t border-gray-100 px-6 py-4">
            <a href="/" class="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </a>
            <button
              onclick={() => (step = 2)}
              disabled={!termsAccepted}
              class="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Continue to Signature
            </button>
          </div>

        <!-- ══ STEP 2 — Signature ══ -->
        {:else if step === 2}
          <div class="p-6 space-y-5">
            <div>
              <p class="text-sm font-semibold text-gray-900">Sign below to accept this agreement</p>
              <p class="mt-1 text-xs text-gray-500">By signing, you confirm you've read and agree to the terms of this service contract.</p>
            </div>

            <ContractSignature
              onSave={(data: string) => (signatureData = data)}
              onClear={() => (signatureData = '')}
            />

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

            {#if isInvoice}
              <!-- Invoice: sign is the final step -->
              <button
                onclick={handleInvoiceSign}
                disabled={!signatureData || submitting}
                class="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {submitting ? 'Submitting...' : 'Submit Agreement'}
              </button>
            {:else}
              <!-- Card: proceed to payment step -->
              <button
                onclick={() => (step = 3)}
                disabled={!signatureData}
                class="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Continue to Payment
              </button>
            {/if}
          </div>

        <!-- ══ STEP 3 — Save Card (card path only) ══ -->
        {:else if step === 3 && !isInvoice}
          <div class="p-6 space-y-5">
            <!-- Price reminder -->
            {#if job.price}
              <div class="overflow-hidden rounded-xl border border-gray-100">
                <div class="bg-gray-900 px-4 py-2.5">
                  <p class="text-xs font-semibold uppercase tracking-wide text-white">Service</p>
                </div>
                <div class="flex items-center justify-between bg-green-50 px-4 py-4">
                  <span class="text-sm font-bold text-gray-900">{job.service_type}</span>
                  <span class="text-2xl font-extrabold text-green-600">${Number(job.price).toFixed(2)}</span>
                </div>
              </div>
            {/if}

            <!-- Save card explanation -->
            <div class="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
              <svg class="mt-0.5 h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="11" x="3" y="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <div>
                <p class="text-sm font-semibold text-blue-900">Save your card — $0 charged today</p>
                <p class="mt-0.5 text-xs leading-relaxed text-blue-700">
                  Your card is securely stored on file and will only be charged after each completed service is reviewed and approved. You'll receive an email invoice before any charge is made.
                </p>
              </div>
            </div>

            <!-- Stripe card element -->
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

            <p class="flex items-center gap-1.5 text-xs text-gray-400">
              <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Secured by Stripe. Your card details are never stored on our servers.
            </p>
          </div>

          <div class="flex gap-3 border-t border-gray-100 px-6 py-4">
            <button onclick={() => (step = 2)}
              class="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Back
            </button>
            <button
              onclick={handleSaveCard}
              disabled={!stripeReady || submitting}
              class="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {submitting ? 'Saving...' : 'Save Card & Confirm'}
            </button>
          </div>
        {/if}

      </div>

    <!-- ── No job found ── -->
    {:else}
      <div class="rounded-2xl bg-white p-10 text-center shadow-xl ring-1 ring-gray-100">
        <p class="text-gray-500">Quote not found. This link may have expired.</p>
        <a href="/quote" class="mt-4 inline-block text-sm font-medium text-green-700 hover:underline">Get a new quote</a>
      </div>
    {/if}

  </div>
</div>
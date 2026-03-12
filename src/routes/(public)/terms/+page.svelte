<!-- src/routes/(public)/terms/+page.svelte -->
<svelte:head>
  <title>Terms &amp; Conditions | Cruz Crewz</title>
  <meta name="description" content="Cruz Crewz terms and conditions — service agreements, payment terms, and cancellation policy." />
</svelte:head>

<div class="min-h-screen bg-white">

  <!-- Header -->
  <div class="bg-gradient-to-br from-gray-900 to-gray-700 px-6 py-16 text-white text-center">
    <a href="/" class="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-8">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      Back to Home
    </a>
    <h1 class="text-4xl font-bold tracking-tight">Terms &amp; Conditions</h1>
    <p class="mt-3 text-gray-400 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <!-- Content -->
  <div class="mx-auto max-w-3xl px-6 py-16 space-y-12">

    <section>
      <p class="text-gray-600 leading-relaxed">
        These Terms and Conditions ("Terms") govern your use of Cruz Crewz LLC's website and services. 
        By requesting a quote, signing a service agreement, or using our services, you agree to be 
        bound by these Terms. Please read them carefully.
      </p>
    </section>

    <!-- 1. Services -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">1. Services</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>
          Cruz Crewz LLC provides professional lawn care and landscaping services in the Chicago 
          metropolitan area and northwest Indiana, including but not limited to lawn mowing, trimming 
          and edging, shrub and tree care, seasonal cleanups, and landscape maintenance.
        </p>
        <p>
          All quotes are estimates based on information provided by the customer. Cruz Crewz reserves 
          the right to adjust pricing if actual site conditions differ materially from the description 
          provided (e.g., grass height, debris, property size, or terrain). Customers will be notified 
          of any adjustments before work begins.
        </p>
      </div>
    </section>

    <!-- 2. Service Agreements -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">2. Service Agreements</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>
          A digital service agreement must be signed before services are rendered. By signing, 
          you confirm that you have read, understood, and agreed to these Terms and the specific 
          terms outlined in your service agreement.
        </p>
        <p>
          Digital signatures collected through our platform are legally binding under the Electronic 
          Signatures in Global and National Commerce Act (E-SIGN Act).
        </p>
      </div>
    </section>

    <!-- 3. Payment -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">3. Payment Terms</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>
          Payment is collected at the time of service agreement signing via our secure payment 
          processor, Stripe. By providing payment information, you authorize Cruz Crewz to charge 
          the agreed amount.
        </p>
        <p>
          For recurring services, invoices are due upon receipt. Accounts more than 15 days past 
          due will incur a late fee, and all scheduled services may be paused until the account 
          is brought current.
        </p>
        <p>
          Refunds are handled on a case-by-case basis. Contact us within 48 hours of service 
          if you have a concern about the quality of work performed.
        </p>
      </div>
    </section>

    <!-- 4. Scheduling & Cancellation -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">4. Scheduling and Cancellation</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>
          Appointments are scheduled based on availability. Cruz Crewz will make reasonable efforts 
          to honor scheduled times, but reserves the right to reschedule due to weather, equipment 
          issues, or other circumstances beyond our control.
        </p>
        <p>
          Customers may cancel or reschedule a visit by replying S to an appointment reminder text 
          or by calling us at least 24 hours in advance at 
          <a href="tel:2193164822" class="text-green-700 hover:underline">219-316-4822</a>.
        </p>
        <p>
          Either party may terminate a recurring service contract with 30 days' written notice. 
          Cruz Crewz reserves the right to terminate services immediately in cases of non-payment 
          or breach of these Terms.
        </p>
      </div>
    </section>

    <!-- 5. Property Access -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">5. Property Access and Preparation</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>The customer agrees to:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Ensure gates are unlocked and service areas are accessible on scheduled service days</li>
          <li>Clear the lawn of obstacles including pet waste, toys, hoses, and large debris</li>
          <li>Notify Cruz Crewz of any shallow-buried cables, irrigation heads, or other underground installations</li>
        </ul>
        <p>
          Cruz Crewz reserves the right to charge a trip fee or skip inaccessible areas if the 
          property cannot be serviced as scheduled. We are not liable for damage to unmarked 
          underground installations.
        </p>
        <p>
          If excessive pet waste is present, Cruz Crewz may charge an additional cleanup fee or 
          decline service for that visit at our discretion.
        </p>
      </div>
    </section>

    <!-- 6. Liability -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">6. Liability</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>
          Cruz Crewz is not liable for property damage unless caused by our negligence or willful 
          misconduct. The customer agrees to indemnify and hold Cruz Crewz harmless from any claims 
          or expenses arising from services provided, except those arising from our negligence.
        </p>
        <p>
          In no event shall Cruz Crewz's total liability exceed the amount paid by the customer 
          for the specific service giving rise to the claim.
        </p>
      </div>
    </section>

    <!-- 7. Force Majeure -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">7. Force Majeure</h2>
      <p class="text-gray-600 leading-relaxed">
        Cruz Crewz is not liable for failure to perform services due to circumstances beyond our 
        reasonable control, including but not limited to severe weather, natural disasters, 
        government restrictions, or equipment failure.
      </p>
    </section>

    <!-- 8. Website Use -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">8. Website Use</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>
          You agree to use our website only for lawful purposes and in a manner that does not 
          infringe the rights of others. You may not attempt to gain unauthorized access to any 
          part of our platform or interfere with its operation.
        </p>
        <p>
          All content on this website, including text, images, logos, and design, is the property 
          of Cruz Crewz LLC and may not be reproduced without written permission.
        </p>
      </div>
    </section>

    <!-- 9. Governing Law -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">9. Governing Law</h2>
      <p class="text-gray-600 leading-relaxed">
        These Terms are governed by the laws of the State of Illinois and the State of Indiana, 
        as applicable to the service location. Any disputes shall be resolved in the appropriate 
        courts of those jurisdictions.
      </p>
    </section>

    <!-- 10. Changes -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">10. Changes to These Terms</h2>
      <p class="text-gray-600 leading-relaxed">
        We reserve the right to update these Terms at any time. Continued use of our services 
        following notice of changes constitutes your acceptance of the updated Terms. We encourage 
        you to review this page periodically.
      </p>
    </section>

    <!-- 11. Contact -->
   <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">11. SMS/Text Messaging</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>
          By opting in to receive SMS messages from Cruz Crewz LLC, you agree to receive recurring 
          informational and/or marketing text messages. Consent is not a condition of purchase. 
          Message frequency varies. Message and data rates may apply.
        </p>
        <div class="bg-gray-50 rounded-xl p-5 space-y-3 border border-gray-100">
          <p>
            <strong class="text-gray-800">To Stop:</strong> You can cancel the SMS service at any time. 
            Just text <span class="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-green-700">STOP</span> to our number. 
            After you send "STOP," we will send you a confirmation message. You will no longer receive 
            SMS messages from us thereafter unless you opt back in.
          </p>
          <p>
            <strong class="text-gray-800">To Get Help:</strong> If you are experiencing issues, reply with the keyword 
            <span class="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-green-700">HELP</span> 
            for assistance, or email us at 
            <a href="mailto:cruzcrewzllc@yahoo.com" class="text-green-700 hover:underline">cruzcrewzllc@yahoo.com</a>.
          </p>
          <p class="text-xs text-gray-500 italic">
            Carriers are not liable for delayed or undelivered messages.
          </p>
        </div>
      </div>
    </section>

  </div>

  <!-- Footer nav -->
  <div class="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
    <div class="flex items-center justify-center gap-6">
      <a href="/" class="hover:text-green-700 transition-colors">Home</a>
      <a href="/terms" class="text-green-700 font-medium">Terms &amp; Conditions</a>
      <a href="/privacy" class="hover:text-green-700 transition-colors">Privacy Policy</a>
    </div>
    <p class="mt-4">&copy; {new Date().getFullYear()} Cruz Crewz LLC. All rights reserved.</p>
  </div>

</div>
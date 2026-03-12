<!-- src/routes/(public)/privacy/+page.svelte -->
<svelte:head>
  <title>Privacy Policy | Cruz Crewz</title>
  <meta name="description" content="Cruz Crewz privacy policy — how we collect, use, and protect your information." />
</svelte:head>

<div class="min-h-screen bg-white">

  <!-- Header -->
  <div class="bg-gradient-to-br from-green-800 to-green-600 px-6 py-16 text-white text-center">
    <a href="/" class="inline-flex items-center gap-2 text-green-200 hover:text-white transition-colors text-sm mb-8">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      Back to Home
    </a>
    <h1 class="text-4xl font-bold tracking-tight">Privacy Policy</h1>
    <p class="mt-3 text-green-200 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <!-- Content -->
  <div class="mx-auto max-w-3xl px-6 py-16 space-y-12">

    <section>
      <p class="text-gray-600 leading-relaxed">
        Cruz Crewz LLC ("Cruz Crewz," "we," "our," or "us") is committed to protecting your privacy. 
        This Privacy Policy explains how we collect, use, disclose, and safeguard your information when 
        you visit our website at <a href="https://cruzcrewz.com" class="text-green-700 hover:underline">cruzcrewz.com</a> 
        or use our services.
      </p>
    </section>

    <!-- 1. Information We Collect -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">1. Information We Collect</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p><strong class="text-gray-800">Information you provide directly:</strong></p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Name, email address, and phone number when requesting a quote or signing a service agreement</li>
          <li>Property address for service delivery and pricing purposes</li>
          <li>Payment information (processed securely by Stripe — we never store card numbers)</li>
          <li>Digital signature when signing a service contract</li>
          <li>Communications you send us via email, phone, or our website</li>
        </ul>
        <p class="mt-4"><strong class="text-gray-800">Information collected automatically:</strong></p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Device type and browser when you visit our website</li>
          <li>Pages visited and time spent on our site</li>
          <li>Approximate location via IP address</li>
          <li>GPS coordinates at the time of contract signing (used for audit trail only)</li>
        </ul>
      </div>
    </section>

    <!-- 2. How We Use Your Information -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">2. How We Use Your Information</h2>
      <ul class="list-disc pl-6 space-y-2 text-gray-600 leading-relaxed">
        <li>To provide, schedule, and manage lawn care services</li>
        <li>To generate and send quotes and service agreements</li>
        <li>To process payments through Stripe</li>
        <li>To send appointment reminders, service updates, and confirmations</li>
        <li>To respond to your questions and support requests</li>
        <li>To improve our website and services</li>
        <li>To comply with legal obligations</li>
      </ul>
    </section>

    <!-- 3. SMS / Text Messaging -->
    <section class="rounded-2xl border-2 border-green-100 bg-green-50 p-8">
  <h2 class="text-xl font-bold text-gray-900 mb-4">3. SMS and Text Message Communications</h2>
  <div class="space-y-4 text-gray-700 leading-relaxed">
    <div>
      <h3 class="font-semibold text-gray-900 mb-2">Customer Consent for SMS</h3>
      <p>
        Cruz Crewz LLC provides two distinct SMS programs. Consent for one does not automatically enroll you in the other:
      </p>
      <ul class="list-disc pl-6 mt-2 space-y-2">
        <li><strong>Informational/Transactional:</strong> By opting in during the booking or contract process, you agree to receive messages regarding appointment reminders, service updates, and invoices.</li>
        <li><strong>Marketing/Promotional:</strong> If you explicitly opt-in for marketing, you may receive promotional offers or seasonal discounts.</li>
      </ul>
      <p class="mt-2 text-sm italic">Consent is not a condition of purchase. Message and data rates may apply. Message frequency varies.</p>
    </div>

    <div>
      <h3 class="font-semibold text-gray-900 mb-2">Data Privacy & Sharing</h3>
      <p>
        <strong>No mobile information will be shared with third parties/affiliates for marketing/promotional purposes.</strong> 
        All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
      </p>
    </div>
  </div>
</section>

    <!-- 4. Data Sharing -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">4. How We Share Your Information</h2>
      <div class="space-y-4 text-gray-600 leading-relaxed">
        <p>We do not sell your personal information. We may share your information only in the following limited circumstances:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong class="text-gray-800">Service providers:</strong> We use Stripe for payment processing, Supabase for secure data storage, and Resend for email delivery. These providers are contractually obligated to protect your data.</li>
          <li><strong class="text-gray-800">Legal requirements:</strong> We may disclose your information if required by law or to protect the rights and safety of Cruz Crewz, our customers, or others.</li>
          <li><strong class="text-gray-800">Business transfers:</strong> In the event of a merger or acquisition, your information may be transferred as part of that transaction.</li>
        </ul>
        <p class="font-medium text-gray-800 mt-4">
          Mobile opt-in information and consent are never shared with third parties under any circumstances.
        </p>
      </div>
    </section>

    <!-- 5. Data Security -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">5. Data Security</h2>
      <p class="text-gray-600 leading-relaxed">
        We implement industry-standard security measures to protect your information, including encrypted 
        data transmission (HTTPS), secure database storage via Supabase, and PCI-compliant payment 
        processing via Stripe. No method of transmission over the internet is 100% secure, and we 
        cannot guarantee absolute security.
      </p>
    </section>

    <!-- 6. Data Retention -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">6. Data Retention</h2>
      <p class="text-gray-600 leading-relaxed">
        We retain your personal information for as long as necessary to provide our services and comply 
        with legal obligations. Service agreements and payment records are retained for a minimum of 
        7 years for accounting and legal compliance purposes. You may request deletion of your data 
        by contacting us, subject to these legal retention requirements.
      </p>
    </section>

    <!-- 7. Your Rights -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">7. Your Rights</h2>
      <p class="text-gray-600 leading-relaxed mb-4">You have the right to:</p>
      <ul class="list-disc pl-6 space-y-2 text-gray-600 leading-relaxed">
        <li>Access the personal information we hold about you</li>
        <li>Request correction of inaccurate information</li>
        <li>Request deletion of your information (subject to legal retention requirements)</li>
        <li>Opt out of SMS communications at any time by replying STOP</li>
        <li>Request a copy of your signed service agreement</li>
      </ul>
      <p class="text-gray-600 mt-4">To exercise any of these rights, contact us at the information below.</p>
    </section>

    <!-- 8. Children -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">8. Children's Privacy</h2>
      <p class="text-gray-600 leading-relaxed">
        Our services are not directed to individuals under the age of 18. We do not knowingly collect 
        personal information from children.
      </p>
    </section>

    <!-- 9. Changes -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">9. Changes to This Policy</h2>
      <p class="text-gray-600 leading-relaxed">
        We may update this Privacy Policy from time to time. We will notify you of significant changes 
        by posting the new policy on this page with an updated date. Continued use of our services 
        after changes constitutes acceptance of the updated policy.
      </p>
    </section>

    <!-- 10. Contact -->
    <section class="rounded-2xl bg-gray-50 border border-gray-100 p-8">
      <h2 class="text-xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
      <div class="space-y-2 text-gray-600">
        <p class="font-semibold text-gray-900">Cruz Crewz LLC</p>
        <p>
          Email: <a href="mailto:cruzcrewzllc@yahoo.com" class="text-green-700 hover:underline">cruzcrewzllc@yahoo.com</a>
        </p>
        <p>
          Phone: <a href="tel:2193164822" class="text-green-700 hover:underline">219-316-4822</a>
        </p>
        <p>
          Website: <a href="https://cruzcrewz.com" class="text-green-700 hover:underline">cruzcrewz.com</a>
        </p>
      </div>
    </section>

  </div>

  <!-- Footer nav -->
  <div class="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
    <div class="flex items-center justify-center gap-6">
      <a href="/" class="hover:text-green-700 transition-colors">Home</a>
      <a href="/terms" class="hover:text-green-700 transition-colors">Terms &amp; Conditions</a>
      <a href="/privacy" class="text-green-700 font-medium">Privacy Policy</a>
    </div>
    <p class="mt-4">&copy; {new Date().getFullYear()} Cruz Crewz LLC. All rights reserved.</p>
  </div>

</div>
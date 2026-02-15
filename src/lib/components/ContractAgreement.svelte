<script>
  // Digital Contract/Letter of Intent for Quote Form
  let { 
    customerName = '',
    address = '',
    service = '',
    price = 0,
    frequency = '',
    startDate = '',
    onAccept = () => {},
    onDecline = () => {}
  } = $props();
  
  let agreed = $state(false);
  let signature = $state('');
  let signatureDate = $state(new Date().toISOString().split('T')[0]);
  
  function handleAccept() {
    if (!agreed || !signature) {
      alert('Please read the terms, check the agreement box, and provide your signature.');
      return;
    }
    onAccept({ signature, signatureDate, agreed });
  }
  
  function handleDecline() {
    onDecline();
  }
</script>

<div class="mx-auto max-w-4xl rounded-lg border-2 border-gray-300 bg-white p-8 shadow-lg">
  <!-- Header -->
  <div class="border-b border-gray-200 pb-6">
    <h2 class="text-2xl font-bold text-gray-900">Service Agreement</h2>
    <p class="mt-2 text-sm text-gray-600">Cruz Crewz Lawn Care Services</p>
  </div>
  
  <!-- Contract Body -->
  <div class="prose prose-sm max-w-none py-6">
    <h3 class="text-lg font-semibold text-gray-900">Letter of Intent for Lawn Care Services</h3>
    
    <p class="mt-4 text-gray-700">
      This Letter of Intent ("Agreement") is entered into on <strong>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong> 
      between Cruz Crewz Lawn Care Services ("Service Provider") and:
    </p>
    
    <div class="my-6 rounded-lg bg-gray-50 p-4">
      <p class="font-semibold text-gray-900">Customer Information:</p>
      <p class="mt-2 text-gray-700"><strong>Name:</strong> {customerName || '[Customer Name]'}</p>
      <p class="text-gray-700"><strong>Service Address:</strong> {address || '[Service Address]'}</p>
    </div>
    
    <h4 class="mt-6 font-semibold text-gray-900">1. Services to be Provided</h4>
    <p class="text-gray-700">
      Service Provider agrees to provide the following lawn care services:
    </p>
    <ul class="ml-6 list-disc text-gray-700">
      <li><strong>Service Type:</strong> {service || '[Service Name]'}</li>
      <li><strong>Service Frequency:</strong> {frequency || '[Frequency]'}</li>
      <li><strong>Estimated Start Date:</strong> {startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '[Start Date]'}</li>
    </ul>
    
    <h4 class="mt-6 font-semibold text-gray-900">2. Pricing and Payment</h4>
    <p class="text-gray-700">
      The agreed-upon pricing for the services outlined above is:
    </p>
    <div class="my-4 rounded-lg bg-green-50 p-4">
      <p class="text-2xl font-bold text-green-700">
        ${price.toFixed(2)} {frequency ? `per ${frequency.toLowerCase()} service` : ''}
      </p>
    </div>
    <p class="text-gray-700">
      Payment is due upon completion of service. Accepted payment methods include cash, check, credit card, or ACH transfer.
    </p>
    
    <h4 class="mt-6 font-semibold text-gray-900">3. Terms and Conditions</h4>
    <ul class="ml-6 list-disc space-y-2 text-gray-700">
      <li>Service Provider will make every effort to maintain the agreed-upon schedule, subject to weather conditions and equipment availability.</li>
      <li>Customer agrees to provide clear access to the service area and notify Service Provider of any obstacles or hazards.</li>
      <li>Either party may cancel this agreement with 7 days' written notice.</li>
      <li>Service Provider maintains full liability insurance and workers' compensation coverage.</li>
      <li>Customer is responsible for ensuring pets are secured during service visits.</li>
      <li>Missed appointments due to locked gates, aggressive pets, or inaccessible areas may incur a trip charge.</li>
    </ul>
    
    <h4 class="mt-6 font-semibold text-gray-900">4. Warranty and Satisfaction Guarantee</h4>
    <p class="text-gray-700">
      Cruz Crewz stands behind our work. If you're not satisfied with any service, please contact us within 24 hours, 
      and we will return to address any concerns at no additional charge.
    </p>
    
    <h4 class="mt-6 font-semibold text-gray-900">5. Contact Information</h4>
    <div class="my-4 rounded-lg bg-gray-50 p-4 text-gray-700">
      <p><strong>Cruz Crewz Lawn Care Services</strong></p>
      <p>Phone: (555) 123-4567</p>
      <p>Email: info@cruzcrewz.com</p>
      <p>Licensed and Insured in Georgia</p>
    </div>
  </div>
  
  <!-- Agreement Section -->
  <div class="border-t border-gray-200 pt-6">
    <div class="mb-6 rounded-lg bg-yellow-50 p-4">
      <div class="flex items-start gap-3">
        <input
          type="checkbox"
          id="agreement"
          bind:checked={agreed}
          class="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <label for="agreement" class="flex-1 text-sm text-gray-700">
          <strong>I agree to the terms and conditions outlined in this Service Agreement.</strong>
          I understand that this constitutes a binding agreement between myself and Cruz Crewz Lawn Care Services. 
          I authorize the company to begin services as described above.
        </label>
      </div>
    </div>
    
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="block text-sm font-medium text-gray-700">Your Full Name (Signature)</label>
        <input
          type="text"
          bind:value={signature}
          required
          placeholder="Type your full name"
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 font-serif text-lg italic focus:border-green-500 focus:ring-green-500"
          class:border-red-300={!signature && agreed}
        />
        <p class="mt-1 text-xs text-gray-500">By typing your name, you are providing a legal electronic signature</p>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          bind:value={signatureDate}
          required
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-green-500 focus:ring-green-500"
        />
      </div>
    </div>
  </div>
  
  <!-- Action Buttons -->
  <div class="mt-8 flex flex-col gap-3 sm:flex-row">
    <button
      type="button"
      onclick={handleDecline}
      class="flex-1 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
    >
      Decline
    </button>
    <button
      type="button"
      onclick={handleAccept}
      disabled={!agreed || !signature}
      class="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
    >
      Accept & Sign Agreement
    </button>
  </div>
  
  <p class="mt-4 text-center text-xs text-gray-500">
    By clicking "Accept & Sign Agreement", you acknowledge that you have read and agree to all terms outlined in this document. 
    A copy of this agreement will be sent to your email address.
  </p>
</div>
<script lang="ts">
  // src/routes/(app)/app/customers/+page.svelte
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { toast } from 'svelte-sonner';
  import Plus from 'lucide-svelte/icons/plus';
  import Mail from 'lucide-svelte/icons/mail';
  import Phone from 'lucide-svelte/icons/phone';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import Search from 'lucide-svelte/icons/search';
  import Pencil from 'lucide-svelte/icons/pencil';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import X from 'lucide-svelte/icons/x';
  import DollarSign from 'lucide-svelte/icons/dollar-sign';
  import ChevronRight from 'lucide-svelte/icons/chevron-right';
  import Briefcase from 'lucide-svelte/icons/briefcase';
  import CirclePlus from 'lucide-svelte/icons/circle-plus';
  import Trash from 'lucide-svelte/icons/trash';
  import Send from 'lucide-svelte/icons/send';
  import Building2 from 'lucide-svelte/icons/building-2';
  import ShieldCheck from 'lucide-svelte/icons/shield-check';
  import ShieldAlert from 'lucide-svelte/icons/shield-alert';
  import Loader from 'lucide-svelte/icons/loader';

  const SERVICES = [
    'Lawn Mowing',
    'Trimming & Edging',
    'Bush, Shrub & Tree Care',
    'Spring & Fall Cleanups',
    'Landscape Maintenance',
    'Lawn Aeration & Overseeding'
  ];

  type Customer = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    contract_signed: boolean;
    contract_signed_at: string | null;
    created_at: string;
    job_count?: number;
    total_spent?: number;
  };

  type Property = {
    id: string;
    customer_id: string;
    address: string;
    nickname: string | null;
    lat: number | null;
    lng: number | null;
  };

  type PriceOverride = {
    id?: string;
    service_type: string;
    price: number;
  };

  type Job = {
    id: string;
    service_type: string;
    status: string;
    scheduled_date: string | null;
    price: number | null;
  };

  let customers         = $state<Customer[]>([]);
  let filteredCustomers = $state<Customer[]>([]);
  let loading           = $state(true);
  let searchQuery       = $state('');

  // Edit/add modal
  let showModal       = $state(false);
  let editingCustomer = $state<Customer | null>(null);
  let formData        = $state({ name: '', email: '', phone: '', address: '' });

  // Customer detail panel
  let detailOpen      = $state(false);
  let detailCustomer  = $state<Customer | null>(null);
  let detailJobs      = $state<Job[]>([]);
  let detailOverrides = $state<PriceOverride[]>([]);
  let detailProperties = $state<Property[]>([]);
  let detailLoading   = $state(false);

  // Invite
  let sendingInvite = $state<string | null>(null);

  // Property form
  let showPropertyForm    = $state(false);
  let newPropertyAddress  = $state('');
  let newPropertyNickname = $state('');
  let savingProperty      = $state(false);

  // New override form
  let newOverrideService = $state(SERVICES[0]);
  let newOverridePrice   = $state('');
  let savingOverride     = $state(false);

  onMount(async () => {
    await loadCustomers();
    loading = false;
  });

  async function loadCustomers() {
    const { data: customersData } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!customersData) { customers = []; filteredCustomers = []; return; }

    const ids = customersData.map(c => c.id);
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('customer_id, price')
      .in('customer_id', ids);

    const stats = (jobsData || []).reduce((acc, job) => {
      if (!job.customer_id) return acc;
      if (!acc[job.customer_id]) acc[job.customer_id] = { count: 0, total: 0 };
      acc[job.customer_id].count++;
      acc[job.customer_id].total += Number(job.price) || 0;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    customers = customersData.map(c => ({
      ...c,
      job_count:   stats[c.id]?.count || 0,
      total_spent: stats[c.id]?.total || 0,
    }));
    filteredCustomers = customers;
  }

  // ── Customer detail panel ──────────────────────────────────────────────────
  async function openDetail(customer: Customer) {
    detailCustomer = customer;
    detailOpen = true;
    detailLoading = true;
    showPropertyForm = false;
    newPropertyAddress = '';
    newPropertyNickname = '';
    newOverrideService = SERVICES[0];
    newOverridePrice = '';

    const [jobsRes, overridesRes, propertiesRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, service_type, status, scheduled_date, price')
        .eq('customer_id', customer.id)
        .order('scheduled_date', { ascending: false })
        .limit(10),
      supabase
        .from('customer_price_overrides')
        .select('id, service_type, price')
        .eq('customer_id', customer.id),
      supabase
        .from('properties')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at'),
    ]);

    detailJobs       = jobsRes.data      ?? [];
    detailOverrides  = overridesRes.data ?? [];
    detailProperties = propertiesRes.data ?? [];
    detailLoading    = false;
  }

  function closeDetail() {
    detailOpen = false;
    setTimeout(() => {
      detailCustomer = null;
      detailJobs = [];
      detailOverrides = [];
      detailProperties = [];
    }, 300);
  }

  // ── Invite ─────────────────────────────────────────────────────────────────
  async function sendInvite(customer: Customer, e: Event) {
    e.stopPropagation();
    if (!customer.email) {
      toast.error('Customer has no email address.');
      return;
    }
    sendingInvite = customer.id;
    try {
      const res = await fetch('/api/customer-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Portal invite sent to ${customer.email}`);
    } catch {
      toast.error('Failed to send invite.');
    } finally {
      sendingInvite = null;
    }
  }

  // ── Properties ─────────────────────────────────────────────────────────────
  async function saveProperty() {
    if (!detailCustomer || !newPropertyAddress.trim()) return;
    savingProperty = true;
    try {
      const { data, error } = await supabase.from('properties').insert({
        customer_id: detailCustomer.id,
        address: newPropertyAddress.trim(),
        nickname: newPropertyNickname.trim() || null,
      }).select().single();

      if (error) throw error;
      detailProperties = [...detailProperties, data as Property];
      newPropertyAddress = '';
      newPropertyNickname = '';
      showPropertyForm = false;
      toast.success('Property added');
    } catch {
      toast.error('Failed to add property');
    } finally {
      savingProperty = false;
    }
  }

  async function deleteProperty(id: string) {
    await supabase.from('properties').delete().eq('id', id);
    detailProperties = detailProperties.filter(p => p.id !== id);
    toast.success('Property removed');
  }

  // ── Price overrides ────────────────────────────────────────────────────────
  async function saveOverride() {
    if (!detailCustomer || !newOverridePrice || parseFloat(newOverridePrice) <= 0) return;
    savingOverride = true;
    try {
      const existing = detailOverrides.find(o => o.service_type === newOverrideService);
      if (existing?.id) {
        await supabase.from('customer_price_overrides').update({ price: parseFloat(newOverridePrice) }).eq('id', existing.id);
      } else {
        await supabase.from('customer_price_overrides').insert({
          customer_id: detailCustomer.id,
          service_type: newOverrideService,
          price: parseFloat(newOverridePrice),
        });
      }
      const { data } = await supabase.from('customer_price_overrides').select('id, service_type, price').eq('customer_id', detailCustomer.id);
      detailOverrides = data ?? [];
      newOverridePrice = '';
      toast.success('Price override saved');
    } catch {
      toast.error('Failed to save override');
    } finally {
      savingOverride = false;
    }
  }

  async function deleteOverride(id: string) {
    await supabase.from('customer_price_overrides').delete().eq('id', id);
    detailOverrides = detailOverrides.filter(o => o.id !== id);
    toast.success('Override removed');
  }

  // ── Add/Edit modal ─────────────────────────────────────────────────────────
  function openAddModal() {
    editingCustomer = null;
    formData = { name: '', email: '', phone: '', address: '' };
    showModal = true;
  }

  function openEditModal(customer: Customer, e: Event) {
    e.stopPropagation();
    editingCustomer = customer;
    formData = {
      name:    customer.name,
      email:   customer.email   || '',
      phone:   customer.phone   || '',
      address: customer.address || '',
    };
    showModal = true;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const payload = {
      name:    formData.name.trim(),
      email:   formData.email.trim()   || null,
      phone:   formData.phone.trim()   || null,
      address: formData.address.trim() || null,
    };
    if (editingCustomer) {
      await supabase.from('customers').update(payload).eq('id', editingCustomer.id);
    } else {
      await supabase.from('customers').insert(payload);
    }
    showModal = false;
    await loadCustomers();
  }

  async function deleteCustomer(id: string, e: Event) {
    e.stopPropagation();
    if (!confirm('Delete this customer? Their jobs will be unlinked but not deleted.')) return;
    await supabase.from('customers').delete().eq('id', id);
    await loadCustomers();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  function formatDate(date: string) {
    return new Date(date.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function statusColor(status: string) {
    const map: Record<string, string> = {
      pending:   'bg-amber-100 text-amber-700',
      scheduled: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-red-100 text-red-600',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }

  $effect(() => {
    if (!searchQuery.trim()) {
      filteredCustomers = customers;
    } else {
      const q = searchQuery.toLowerCase();
      filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-semibold text-gray-900">Customers</h1>
    <button
      onclick={openAddModal}
      class="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
    >
      <Plus class="h-4 w-4" />
      Add Customer
    </button>
  </div>

  <div class="relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search customers by name, email, or phone..."
      class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
    />
  </div>

  {#if loading}
    <div class="flex h-64 items-center justify-center">
      <p class="text-gray-500">Loading...</p>
    </div>
  {:else if filteredCustomers.length === 0}
    <div class="rounded-xl border border-gray-200 bg-white p-12 text-center">
      <p class="text-gray-500">{searchQuery ? 'No customers found' : 'No customers yet'}</p>
    </div>
  {:else}
    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b border-gray-200 bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contract</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Jobs</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Spent</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each filteredCustomers as customer}
              <tr
                class="cursor-pointer hover:bg-emerald-50/50 transition-colors"
                onclick={() => openDetail(customer)}
              >
                <td class="px-6 py-4">
                  <div class="font-medium text-gray-900">{customer.name}</div>
                  {#if customer.address}
                    <div class="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin class="h-3 w-3" />
                      {customer.address}
                    </div>
                  {/if}
                </td>
                <td class="px-6 py-4">
                  {#if customer.email}
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <Mail class="h-4 w-4 text-gray-400" />
                      {customer.email}
                    </div>
                  {/if}
                  {#if customer.phone}
                    <div class="mt-1 flex items-center gap-2 text-sm text-gray-600">
                      <Phone class="h-4 w-4 text-gray-400" />
                      {customer.phone}
                    </div>
                  {/if}
                  {#if !customer.email && !customer.phone}
                    <span class="text-sm text-gray-400">No contact info</span>
                  {/if}
                </td>
                <td class="px-6 py-4">
                  {#if customer.contract_signed}
                    <div class="flex items-center gap-1.5 text-emerald-600">
                      <ShieldCheck class="h-4 w-4" />
                      <span class="text-xs font-semibold">Signed</span>
                    </div>
                  {:else}
                    <div class="flex items-center gap-1.5 text-amber-500">
                      <ShieldAlert class="h-4 w-4" />
                      <span class="text-xs font-semibold">Unsigned</span>
                    </div>
                  {/if}
                </td>
                <td class="px-6 py-4">
                  <span class="text-sm text-gray-900">{customer.job_count || 0}</span>
                </td>
                <td class="px-6 py-4">
                  <span class="text-sm font-medium text-gray-900">{formatCurrency(customer.total_spent || 0)}</span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-1">
                    <!-- Invite button -->
                    {#if customer.email}
                      <button
                        onclick={(e) => sendInvite(customer, e)}
                        disabled={sendingInvite === customer.id}
                        class="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Send portal invite"
                      >
                        {#if sendingInvite === customer.id}
                          <Loader class="h-4 w-4 animate-spin" />
                        {:else}
                          <Send class="h-4 w-4" />
                        {/if}
                      </button>
                    {/if}
                    <button
                      onclick={(e) => openEditModal(customer, e)}
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      onclick={(e) => deleteCustomer(customer.id, e)}
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                    <ChevronRight class="h-4 w-4 text-gray-300" />
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- ── Customer Detail Drawer ── -->
{#if detailOpen}
  <div class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onclick={closeDetail}></div>
{/if}

<div class="fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col
  {detailOpen ? 'translate-x-0' : 'translate-x-full'}">

  {#if detailCustomer}
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-100 bg-gray-900 px-5 py-4">
      <div>
        <div class="flex items-center gap-2">
          <p class="font-bold text-white">{detailCustomer.name}</p>
          {#if detailCustomer.contract_signed}
            <ShieldCheck class="h-4 w-4 text-emerald-400" />
          {:else}
            <ShieldAlert class="h-4 w-4 text-amber-400" />
          {/if}
        </div>
        <p class="text-xs text-gray-400">{detailCustomer.email ?? detailCustomer.phone ?? 'No contact info'}</p>
      </div>
      <div class="flex items-center gap-2">
        {#if detailCustomer.email}
          <button
            onclick={(e) => sendInvite(detailCustomer!, e)}
            disabled={sendingInvite === detailCustomer.id}
            class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {#if sendingInvite === detailCustomer.id}
              <Loader class="h-3.5 w-3.5 animate-spin" />
            {:else}
              <Send class="h-3.5 w-3.5" />
            {/if}
            Invite to Portal
          </button>
        {/if}
        <button onclick={closeDetail} class="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <X class="h-5 w-5" />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      {#if detailLoading}
        <div class="flex h-48 items-center justify-center text-gray-400 text-sm">Loading...</div>
      {:else}
        <div class="p-5 space-y-6">

          <!-- Stats row -->
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-center">
              <p class="text-2xl font-extrabold text-gray-900">{detailCustomer.job_count ?? 0}</p>
              <p class="text-xs text-gray-500 mt-0.5">Total Jobs</p>
            </div>
            <div class="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
              <p class="text-2xl font-extrabold text-emerald-700">{formatCurrency(detailCustomer.total_spent ?? 0)}</p>
              <p class="text-xs text-gray-500 mt-0.5">Total Spent</p>
            </div>
          </div>

          <!-- Contract status -->
          <div class="rounded-xl border {detailCustomer.contract_signed ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'} px-4 py-3">
            <div class="flex items-center gap-2">
              {#if detailCustomer.contract_signed}
                <ShieldCheck class="h-4 w-4 text-emerald-600" />
                <div>
                  <p class="text-sm font-semibold text-emerald-800">Service agreement signed</p>
                  {#if detailCustomer.contract_signed_at}
                    <p class="text-xs text-emerald-600">{formatDate(detailCustomer.contract_signed_at)}</p>
                  {/if}
                </div>
              {:else}
                <ShieldAlert class="h-4 w-4 text-amber-600" />
                <div class="flex-1">
                  <p class="text-sm font-semibold text-amber-800">No service agreement on file</p>
                  <p class="text-xs text-amber-600">Send a portal invite to collect signature</p>
                </div>
              {/if}
            </div>
          </div>

          <!-- Contact info -->
          <div class="rounded-xl border border-gray-100 divide-y divide-gray-50">
            {#if detailCustomer.address}
              <div class="flex items-center gap-3 px-4 py-3">
                <MapPin class="h-4 w-4 shrink-0 text-gray-400" />
                <span class="text-sm text-gray-700">{detailCustomer.address}</span>
              </div>
            {/if}
            {#if detailCustomer.email}
              <div class="flex items-center gap-3 px-4 py-3">
                <Mail class="h-4 w-4 shrink-0 text-gray-400" />
                <a href="mailto:{detailCustomer.email}" class="text-sm text-emerald-700 hover:underline">{detailCustomer.email}</a>
              </div>
            {/if}
            {#if detailCustomer.phone}
              <div class="flex items-center gap-3 px-4 py-3">
                <Phone class="h-4 w-4 shrink-0 text-gray-400" />
                <a href="tel:{detailCustomer.phone}" class="text-sm text-emerald-700 hover:underline">{detailCustomer.phone}</a>
              </div>
            {/if}
          </div>

          <!-- ── Properties ── -->
          <div>
            <div class="mb-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Building2 class="h-4 w-4 text-gray-500" />
                <p class="text-sm font-semibold text-gray-900">Properties</p>
                {#if detailProperties.length > 0}
                  <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{detailProperties.length}</span>
                {/if}
              </div>
              <button
                onclick={() => showPropertyForm = !showPropertyForm}
                class="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <CirclePlus class="h-3.5 w-3.5" />
                Add Property
              </button>
            </div>

            {#if detailProperties.length > 0}
              <div class="mb-3 overflow-hidden rounded-xl border border-gray-100 divide-y divide-gray-50">
                {#each detailProperties as property}
                  <div class="flex items-start justify-between px-4 py-3">
                    <div class="flex items-start gap-2">
                      <MapPin class="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        {#if property.nickname}
                          <p class="text-xs font-semibold text-gray-700">{property.nickname}</p>
                        {/if}
                        <p class="text-sm text-gray-600">{property.address}</p>
                      </div>
                    </div>
                    <button
                      onclick={() => deleteProperty(property.id)}
                      class="rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash class="h-3.5 w-3.5" />
                    </button>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="mb-3 text-xs text-gray-400">No additional properties. Primary address is used for all jobs.</p>
            {/if}

            {#if showPropertyForm}
              <div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 space-y-3">
                <input
                  type="text"
                  bind:value={newPropertyNickname}
                  placeholder="Nickname (e.g. Rental Property, Lake House)"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <input
                  type="text"
                  bind:value={newPropertyAddress}
                  placeholder="Full address *"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <div class="flex gap-2">
                  <button
                    onclick={() => showPropertyForm = false}
                    class="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                  >Cancel</button>
                  <button
                    onclick={saveProperty}
                    disabled={savingProperty || !newPropertyAddress.trim()}
                    class="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {savingProperty ? 'Saving...' : 'Save Property'}
                  </button>
                </div>
              </div>
            {/if}
          </div>

          <!-- ── Custom Pricing ── -->
          <div>
            <div class="mb-3 flex items-center gap-2">
              <DollarSign class="h-4 w-4 text-emerald-600" />
              <p class="text-sm font-semibold text-gray-900">Custom Pricing</p>
            </div>
            <p class="mb-3 text-xs text-gray-500">
              Set a fixed price for this customer that overrides all global rules and lot-size calculations.
            </p>

            {#if detailOverrides.length > 0}
              <div class="mb-3 overflow-hidden rounded-xl border border-gray-100">
                {#each detailOverrides as override}
                  <div class="flex items-center justify-between border-b border-gray-50 px-4 py-3 last:border-0">
                    <div>
                      <p class="text-sm font-medium text-gray-900">{override.service_type}</p>
                      <p class="text-xs text-emerald-700 font-semibold mt-0.5">{formatCurrency(override.price)}</p>
                    </div>
                    <button
                      onclick={() => override.id && deleteOverride(override.id)}
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash class="h-4 w-4" />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 space-y-3">
              <p class="text-xs font-semibold text-gray-600">
                {detailOverrides.length > 0 ? 'Add Another Override' : 'Add Price Override'}
              </p>
              <select
                bind:value={newOverrideService}
                class="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {#each SERVICES as s}
                  <option value={s}>{s}</option>
                {/each}
              </select>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    bind:value={newOverridePrice}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <button
                  onclick={saveOverride}
                  disabled={savingOverride || !newOverridePrice}
                  class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <CirclePlus class="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>
          </div>

          <!-- ── Recent Jobs ── -->
          <div>
            <div class="mb-3 flex items-center gap-2">
              <Briefcase class="h-4 w-4 text-gray-500" />
              <p class="text-sm font-semibold text-gray-900">Recent Jobs</p>
            </div>
            {#if detailJobs.length === 0}
              <p class="text-sm text-gray-400">No jobs yet</p>
            {:else}
              <div class="overflow-hidden rounded-xl border border-gray-100">
                {#each detailJobs as job}
                  <div class="flex items-center justify-between border-b border-gray-50 px-4 py-3 last:border-0">
                    <div>
                      <p class="text-sm font-medium text-gray-900">{job.service_type}</p>
                      {#if job.scheduled_date}
                        <p class="text-xs text-gray-500 mt-0.5">{formatDate(job.scheduled_date)}</p>
                      {/if}
                    </div>
                    <div class="flex items-center gap-2">
                      {#if job.price}
                        <span class="text-sm font-semibold text-gray-900">{formatCurrency(job.price)}</span>
                      {/if}
                      <span class="rounded-full px-2 py-0.5 text-xs font-medium {statusColor(job.status)}">
                        {job.status}
                      </span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="border-t border-gray-100 p-4">
      <button
        onclick={(e) => { closeDetail(); openEditModal(detailCustomer!, e); }}
        class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Edit Customer Info
      </button>
    </div>
  {/if}
</div>

<!-- ── Add/Edit Modal ── -->
{#if showModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => (showModal = false)}>
    <div class="mx-4 w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl" onclick={(e) => e.stopPropagation()}>
      <div class="border-b border-gray-200 px-6 py-4">
        <h2 class="text-lg font-semibold text-gray-900">
          {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        </h2>
      </div>
      <form onsubmit={handleSubmit} class="space-y-4 p-6">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Name <span class="text-red-500">*</span></label>
          <input type="text" bind:value={formData.name} required
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input type="email" bind:value={formData.email}
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Phone</label>
          <input type="tel" bind:value={formData.phone}
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Address</label>
          <textarea bind:value={formData.address} rows="2"
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"></textarea>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" onclick={() => (showModal = false)}
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit"
            class="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            {editingCustomer ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
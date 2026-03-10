<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  type Job = {
    id: string;
    service_type: string;
    description: string;
    status: string;
    scheduled_date: string;
    price: number;
  };

  let jobs: Job[] = [];
  let draggingJob: Job | null = null;

  const statuses = [
    'pending',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  ];

  let showModal = false;

  let newJob = {
    service_type: '',
    description: '',
    scheduled_date: '',
    price: 0
  };

  onMount(async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*');

    if (!error && data) jobs = data;
  });

  function handleDragStart(job: Job) {
    draggingJob = job;
  }

  async function handleDrop(newStatus: string) {
    if (!draggingJob) return;

    const jobId = draggingJob.id;

    jobs = jobs.map(j =>
      j.id === jobId ? { ...j, status: newStatus } : j
    );

    await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', jobId);

    draggingJob = null;
  }

  async function createJob() {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        service_type: newJob.service_type,
        description: newJob.description,
        scheduled_date: newJob.scheduled_date,
        price: newJob.price,
        status: 'pending'
      })
      .select()
      .single();

    if (!error && data) {
      jobs = [...jobs, data];
    }

    newJob = {
      service_type: '',
      description: '',
      scheduled_date: '',
      price: 0
    };

    showModal = false;
  }
</script>

<div class="p-6 w-full overflow-hidden">

  <!-- Create Button -->
  <button
    class="mb-6 bg-black text-white px-4 py-2 rounded-lg"
    onclick={() => showModal = true}
  >
    + New Job
  </button>

  <!-- Kanban Columns -->
  <div class="flex gap-4 overflow-x-auto pb-4">
    {#each statuses as status}
      <div 
        class="min-w-[280px] flex-shrink-0 bg-gray-100 rounded-xl p-4"
        ondragover={(e) => e.preventDefault()}
        ondrop={() => handleDrop(status)}
      >
        <h2 class="font-bold mb-4 capitalize">
          {status.replace('_', ' ')}
        </h2>

        {#each jobs.filter(j => j.status === status) as job}
          <div
            class="bg-white p-3 rounded-lg shadow mb-3 cursor-grab break-words"
            draggable="true"
            ondragstart={() => handleDragStart(job)}
          >
            <div class="font-semibold break-words">{job.service_type}</div>
            <div class="text-sm text-gray-600 break-words">{job.description}</div>
            <div class="text-sm mt-2 break-words">
              {new Date(job.scheduled_date + 'T12:00:00').toLocaleDateString()}
            </div>
            <div class="text-sm font-bold mt-1">
              ${job.price}
            </div>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<!-- Modal -->
{#if showModal}
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div class="bg-white p-6 rounded-xl w-96 max-w-full">
      <h2 class="font-bold mb-4">Create Job</h2>

      <input
        class="border w-full mb-2 p-2 rounded"
        placeholder="Service Type"
        bind:value={newJob.service_type}
      />

      <textarea
        class="border w-full mb-2 p-2 rounded"
        placeholder="Description"
        bind:value={newJob.description}
      />

      <input
        type="datetime-local"
        class="border w-full mb-2 p-2 rounded"
        bind:value={newJob.scheduled_date}
      />

      <input
        type="number"
        class="border w-full mb-4 p-2 rounded"
        placeholder="Price"
        bind:value={newJob.price}
      />

      <div class="flex justify-end gap-2">
        <button 
          onclick={() => showModal = false}
          class="px-3 py-1 rounded border border-gray-300"
        >
          Cancel
        </button>

        <button
          class="bg-black text-white px-3 py-1 rounded"
          onclick={createJob}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}
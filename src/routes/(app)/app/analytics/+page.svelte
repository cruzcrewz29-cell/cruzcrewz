<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	type CampaignStats = {
		campaign: string;
		scans: number;
		last_scan: string;
	};

	let stats = $state<CampaignStats[]>([]);
	let loading = $state(true);
	let totalScans = $state(0);

	onMount(async () => {
		await loadStats();
		loading = false;
	});

	async function loadStats() {
		// Get all scans
		const { data: scans } = await supabase
			.from('qr_scans')
			.select('*')
			.order('scanned_at', { ascending: false });

		if (!scans) return;

		totalScans = scans.length;

		// Group by campaign
		const grouped = scans.reduce((acc, scan) => {
			if (!acc[scan.campaign]) {
				acc[scan.campaign] = {
					campaign: scan.campaign,
					scans: 0,
					last_scan: scan.scanned_at
				};
			}
			acc[scan.campaign].scans++;
			return acc;
		}, {} as Record<string, CampaignStats>);

		stats = Object.values(grouped).sort((a, b) => b.scans - a.scans);
	}

	function formatDate(date: string) {
  return new Date(date.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

	function generateQRUrl(campaign: string) {
		return `${window.location.origin}/qr/${campaign}`;
	}

	function copyUrl(campaign: string) {
		const url = generateQRUrl(campaign);
		navigator.clipboard.writeText(url);
		alert(`URL copied: ${url}\n\nGenerate QR code at: https://qr-code-generator.com`);
	}
</script>

<svelte:head>
	<title>QR Analytics | Cruz Crewz</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold text-gray-900">QR Code Analytics</h1>
		<p class="mt-1 text-sm text-gray-600">Track scans from door hangers and flyers</p>
	</div>

	<!-- Total Scans -->
	<div class="bg-white rounded-xl border border-gray-200 p-6">
		<div class="text-sm text-gray-600">Total QR Scans</div>
		<div class="text-3xl font-bold text-gray-900 mt-1">{totalScans.toLocaleString()}</div>
	</div>

	<!-- Campaign Suggestions -->
	<div class="bg-blue-50 border border-blue-200 rounded-xl p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-3">Create QR Codes</h2>
		<p class="text-sm text-gray-700 mb-4">
			Use these campaign URLs to create trackable QR codes for your marketing materials:
		</p>
		<div class="space-y-2">
			{#each ['door-hanger-spring-2025', 'flyer-neighborhood', 'postcard-campaign', 'vehicle-magnet'] as suggestion}
				<div class="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
					<code class="text-sm text-gray-700">/qr/{suggestion}</code>
					<button
						onclick={() => copyUrl(suggestion)}
						class="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
					>
						Copy URL
					</button>
				</div>
			{/each}
		</div>
		<p class="text-xs text-gray-600 mt-4">
			💡 After copying, generate QR codes at <a href="https://qr-code-generator.com" target="_blank" class="text-blue-600 underline">qr-code-generator.com</a>
		</p>
	</div>

	<!-- Campaign Stats -->
	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if stats.length === 0}
		<div class="bg-white rounded-xl border border-gray-200 p-12 text-center">
			<p class="text-gray-600">No QR scans yet. Create your first QR code above!</p>
		</div>
	{:else}
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Campaign Performance</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Scans</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Scan</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each stats as stat}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4">
									<span class="text-sm font-medium text-gray-900">{stat.campaign}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-gray-900">{stat.scans}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-gray-600">{formatDate(stat.last_scan)}</span>
								</td>
								<td class="px-6 py-4">
									<button
										onclick={() => copyUrl(stat.campaign)}
										class="text-xs text-blue-600 hover:text-blue-700 underline"
									>
										Copy URL
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
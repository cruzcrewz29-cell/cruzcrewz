<!-- apps/web/src/routes/(app)/app/settings/+page.svelte -->
<script>
	let companyName = 'Foursquare Landscaping';
	let timezone = 'America/New_York';
</script>

<h1 class="text-2xl font-semibold text-text">Settings</h1>
<p class="mt-1 text-sm text-muted">Manage application preferences.</p>

<div class="mt-6 space-y-6 max-w-xl">

	<section class="rounded-lg border border-border bg-surface p-6">
		<h2 class="text-sm font-medium text-text">Company</h2>

		<div class="mt-4 space-y-3">
			<label class="block text-sm text-muted">
				Company name
				<input
					class="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
					bind:value={companyName}
				/>
			</label>
		</div>
	</section>

	<section class="rounded-lg border border-border bg-surface p-6">
		<h2 class="text-sm font-medium text-text">Preferences</h2>

		<label class="mt-4 block text-sm text-muted">
			Timezone
			<select
				class="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
				bind:value={timezone}
			>
				<option>America/New_York</option>
				<option>America/Chicago</option>
				<option>America/Denver</option>
				<option>America/Los_Angeles</option>
			</select>
		</label>
	</section>

	<button class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
		Save changes
	</button>

</div>

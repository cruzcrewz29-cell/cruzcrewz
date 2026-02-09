<script>
	// UI shell only — no auth
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-50">
	<div class="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-slate-200">
		<h1 class="text-2xl font-semibold text-slate-900">LawnOps</h1>
		<p class="mt-1 text-sm text-slate-500">Sign in to your account</p>

		<form class="mt-6 space-y-4">
			<input
				type="email"
				placeholder="Email"
				class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
			/>

			<input
				type="password"
				placeholder="Password"
				class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
			/>

			<button
				type="button"
				class="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
			>
				Sign in
			</button>
		</form>
	</div>
</div>

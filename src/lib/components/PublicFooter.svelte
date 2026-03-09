<!-- src/lib/components/PublicFooter.svelte -->
<!-- Add this to your public layout: src/routes/(public)/+layout.svelte -->

<footer class="border-t border-gray-100 bg-white">
  <div class="mx-auto max-w-6xl px-6 py-10">
    <div class="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">

      <!-- Brand -->
      <div class="flex items-center gap-2 text-gray-900">
        <svg class="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <span class="font-bold text-sm">Cruz Crewz LLC</span>
      </div>

      <!-- Legal links -->
      <div class="flex items-center gap-6 text-sm text-gray-500">
        <a href="/terms" class="hover:text-green-700 transition-colors">Terms &amp; Conditions</a>
        <a href="/privacy" class="hover:text-green-700 transition-colors">Privacy Policy</a>
        <a href="tel:2193164822" class="hover:text-green-700 transition-colors">219-316-4822</a>
      </div>

    </div>
    <p class="mt-6 text-center text-xs text-gray-400">
      &copy; {new Date().getFullYear()} Cruz Crewz LLC. All rights reserved. 
      Serving Chicago &amp; Northwest Indiana.
    </p>
  </div>
</footer>
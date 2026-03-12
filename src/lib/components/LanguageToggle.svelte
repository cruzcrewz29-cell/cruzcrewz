<script lang="ts">
  // src/lib/components/LanguageToggle.svelte
  import { getLocale, setLocale } from '$lib/paraglide/runtime';
  import * as m from '$lib/paraglide/messages';

  const LOCALES = [
    { code: 'en', short: 'EN'   },
    { code: 'es', short: 'ES'   },
    { code: 'zh', short: '中文' },
  ] as const;

  let current = $derived(getLocale());

  function switchLocale(code: string) {
    if (code === current) return;
    setLocale(code as any);
    window.location.reload();
  }
</script>

<div class="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
  {#each LOCALES as locale}
    <button
      onclick={() => switchLocale(locale.code)}
      class="rounded-full px-2.5 py-1 text-xs font-semibold transition-all
        {current === locale.code
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-400 hover:text-gray-700'}"
      aria-label="Switch to {locale.code}"
      title={m[`lang_${locale.code}` as keyof typeof m]?.() ?? locale.code}
    >
      {locale.short}
    </button>
  {/each}
</div>
<script>
  // Bottom sheet modal. Render it conditionally; onclose fires on backdrop tap or ✕.
  import { mdiClose } from '@mdi/js'
  import { AIcon } from 'ace.svelte'

  let { title, subtitle = '', onclose, children } = $props()
</script>

<svelte:window onkeydown={e => e.key === 'Escape' && onclose()} />

<!-- Bottom sheet on phones, centred dialog on desktop -->
<div class="fixed inset-0 z-40 flex items-end justify-center md:items-center md:p-6">
  <button class="absolute inset-0 bg-black/40" aria-label="Close" onclick={onclose}></button>
  <div class="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl md:max-w-lg md:rounded-2xl md:p-6" role="dialog" aria-modal="true">
    <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 md:hidden"></div>
    <div class="mb-4 flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <h2 class="font-mono text-xl font-bold break-words">{title}</h2>
        {#if subtitle}<p class="text-sm text-gray-500">{subtitle}</p>{/if}
      </div>
      <button class="-m-2 p-2 text-gray-500" aria-label="Close" onclick={onclose}><AIcon path={mdiClose} /></button>
    </div>
    {@render children()}
  </div>
</div>

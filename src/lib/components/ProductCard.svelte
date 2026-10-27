<script>
  import { packLabel } from '$lib/qty'

  // title: big label (position in search view, product in map view); subtitle: secondary line
  let { title, subtitle = '', qty, onclick } = $props()
</script>

<button {onclick} class="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm active:bg-gray-100 md:hover:border-blue-300 md:hover:bg-blue-50/40">
  <div class="min-w-0 flex-1">
    <div class="font-mono text-lg font-semibold break-words">{title}</div>
    {#if subtitle}<div class="truncate text-sm text-gray-500">{subtitle}</div>{/if}
  </div>
  <div class="text-right">
    <div class="text-2xl font-bold tabular-nums">{qty}</div>
    {#if packLabel(qty)}<div class="text-xs text-gray-500">{packLabel(qty)}</div>{/if}
  </div>
</button>

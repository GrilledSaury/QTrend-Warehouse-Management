<script>
  import Wheel from './Wheel.svelte'
  import { PACK_SIZE, toPacks } from '$lib/qty'

  // value: total item count. max: upper bound for the total (e.g. what's on the shelf).
  let { value = $bindable(0), max = 999 } = $props()

  let packs = $state(toPacks(value).packs)
  let singles = $state(toPacks(value).singles)

  $effect(() => { value = packs * PACK_SIZE + singles })

  const over = $derived(value > max)
</script>

<div class="flex items-center justify-center gap-3">
  <Wheel bind:value={packs} max={Math.max(Math.floor(max / PACK_SIZE), 0)} label="Packs ×{PACK_SIZE}" />
  <span class="mt-5 text-2xl text-gray-400">+</span>
  <!-- Singles aren't capped at a pack: there may be several opened packs' worth -->
  <Wheel bind:value={singles} {max} label="Singles" />
  <span class="mt-5 text-2xl text-gray-400">=</span>
  <div class="mt-5 flex w-20 flex-col items-center">
    <span class="text-4xl font-bold tabular-nums {over ? 'text-red-600' : ''}">{value}</span>
    <span class="text-xs text-gray-500">total</span>
  </div>
</div>
{#if over}<p class="error mt-1 text-center">Only {max} available</p>{/if}

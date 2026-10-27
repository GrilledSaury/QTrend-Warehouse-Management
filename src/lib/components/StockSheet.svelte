<script>
  import Sheet from './Sheet.svelte'
  import QtyPicker from './QtyPicker.svelte'
  import { inventory } from '$lib/inventory.svelte'
  import { removeStock, setStock, takeToHand } from '$lib/actions'

  // allowCorrect: show the "Correct" tab (map view only)
  let { positionId, productId, allowCorrect = false, onclose } = $props()

  const current = $derived(inventory.stock.find(s => s.positionId === positionId && s.productId === productId)?.qty ?? 0)
  const name = $derived(inventory.products[productId]?.name ?? productId)

  const modes = $derived([
    { id: 'hand', label: 'To hand' },
    { id: 'remove', label: 'Remove' },
    ...(allowCorrect ? [{ id: 'correct', label: 'Correct' }] : [])
  ])
  let mode = $state('hand')
  let qty = $state(0)
  let busy = $state(false)
  let error = $state('')

  // Correct starts at the current count; the others start at 0. QtyPicker remounts per mode.
  function selectMode (id) {
    qty = id === 'correct' ? current : 0
    mode = id
    error = ''
  }

  async function confirm () {
    error = ''
    busy = true
    try {
      if (mode === 'hand') await takeToHand(positionId, productId, qty)
      else if (mode === 'remove') await removeStock(positionId, productId, qty)
      else await setStock(positionId, productId, qty)
      onclose()
    } catch (e) {
      error = e.message
    } finally {
      busy = false
    }
  }

  const buttonLabel = $derived({
    hand: `Move ${qty} to hand`,
    remove: `Remove ${qty}`,
    correct: `Set to ${qty}`
  }[mode])
  const disabled = $derived(busy || (mode === 'correct' ? qty === current : qty <= 0 || qty > current))
</script>

<Sheet title={name} subtitle="at {positionId} · {current} on shelf" {onclose}>
  <div class="mb-4 grid gap-1 rounded-xl bg-gray-100 p-1" style:grid-template-columns="repeat({modes.length}, 1fr)">
    {#each modes as m (m.id)}
      <button class="rounded-lg py-2.5 font-semibold {mode === m.id ? 'bg-white shadow' : 'text-gray-600'}" onclick={() => selectMode(m.id)}>{m.label}</button>
    {/each}
  </div>

  {#key mode}
    <QtyPicker bind:value={qty} max={mode === 'correct' ? 999 : current} />
  {/key}

  {#if error}<p class="error mt-2 text-center">{error}</p>{/if}
  <button class="mt-4 w-full rounded-xl py-4 text-lg font-bold text-white disabled:opacity-40 {mode === 'remove' ? 'bg-red-600' : mode === 'hand' ? 'bg-blue-600' : 'bg-amber-600'}" {disabled} onclick={confirm}>
    {busy ? 'Saving…' : buttonLabel}
  </button>
</Sheet>

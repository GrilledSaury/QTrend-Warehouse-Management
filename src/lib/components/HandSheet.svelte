<script>
  import Sheet from './Sheet.svelte'
  import QtyPicker from './QtyPicker.svelte'
  import { inventory } from '$lib/inventory.svelte'
  import { normalizeCode, putFromHand } from '$lib/actions'

  // positionId: preselected destination (e.g. opened from a position in the map view)
  let { positionId = '', onclose } = $props()

  let target = $state(positionId)
  let selected = $state(null) // productId being put down
  let qty = $state(0)
  let busy = $state(false)
  let error = $state('')

  function select (item) {
    error = ''
    if (selected === item.productId) { selected = null; return }
    qty = item.qty // default: put everything down
    selected = item.productId
  }

  async function put () {
    error = ''
    busy = true
    try {
      const pos = normalizeCode(target)
      if (!inventory.positions[pos]) throw new Error(`Position ${pos} doesn't exist`)
      await putFromHand(pos, selected, qty)
      selected = null
      if (!inventory.hand.length) onclose()
    } catch (e) {
      error = e.message
    } finally {
      busy = false
    }
  }
</script>

<Sheet title="In hand" subtitle={positionId ? `Putting into ${positionId}` : 'Pick an item, then where to put it'} {onclose}>
  {#if !inventory.hand.length}
    <p class="py-6 text-center text-gray-500">Your hand is empty.</p>
  {/if}
  <div class="space-y-2">
    {#each inventory.hand as item (item.id)}
      <div class="rounded-xl border {selected === item.productId ? 'border-blue-500' : 'border-gray-200'}">
        <button class="flex w-full items-center gap-3 p-3 text-left" onclick={() => select(item)}>
          <span class="min-w-0 flex-1 font-mono text-lg font-semibold break-words">{inventory.products[item.productId]?.name ?? item.productId}</span>
          <span class="text-2xl font-bold tabular-nums">{item.qty}</span>
        </button>
        {#if selected === item.productId}
          <div class="border-t border-gray-100 p-3">
            {#if !positionId}
              <input
                class="input mb-3 w-full py-3 font-mono text-lg uppercase"
                list="positions-list"
                placeholder="Position, e.g. A1-1"
                autocapitalize="characters"
                autocomplete="off"
                bind:value={target}
              />
            {/if}
            <QtyPicker bind:value={qty} max={item.qty} />
            {#if error}<p class="error mt-2 text-center">{error}</p>{/if}
            <button class="mt-3 w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white disabled:opacity-40" disabled={busy || !target.trim() || qty <= 0 || qty > item.qty} onclick={put}>
              {busy ? 'Saving…' : `Put ${qty} into ${target.trim().toUpperCase() || '…'}`}
            </button>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</Sheet>

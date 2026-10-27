<script>
  // Map view: record a product at a position that isn't listed there yet (correction).
  import Sheet from './Sheet.svelte'
  import QtyPicker from './QtyPicker.svelte'
  import { inventory } from '$lib/inventory.svelte'
  import { normalizeCode, setStock } from '$lib/actions'

  let { positionId, onclose } = $props()

  let code = $state('')
  let qty = $state(0)
  let busy = $state(false)
  let error = $state('')

  const known = $derived.by(() => {
    try { return inventory.products[normalizeCode(code)] } catch { return null }
  })
  const existing = $derived(known && inventory.stock.find(s => s.positionId === positionId && s.productId === known.id))

  async function save () {
    error = ''
    busy = true
    try {
      await setStock(positionId, normalizeCode(code), qty)
      onclose()
    } catch (e) {
      error = e.message
    } finally {
      busy = false
    }
  }
</script>

<Sheet title="Add product" subtitle="to {positionId}" {onclose}>
  <input
    class="input w-full py-3 font-mono text-lg uppercase"
    list="products-list"
    placeholder="Product code, e.g. K3235-BLK-WHT"
    autocapitalize="characters"
    autocomplete="off"
    bind:value={code}
  />
  <p class="mt-1 mb-3 min-h-5 text-sm text-gray-500">
    {#if !code.trim()}&nbsp;
    {:else if existing}Already here with {existing.qty} — this will overwrite it.
    {:else if known}{known.name}
    {:else}New product — it will be created.{/if}
  </p>
  <QtyPicker bind:value={qty} />
  {#if error}<p class="error mt-2 text-center">{error}</p>{/if}
  <button class="mt-4 w-full rounded-xl bg-amber-600 py-4 text-lg font-bold text-white disabled:opacity-40" disabled={busy || !code.trim() || qty <= 0} onclick={save}>
    {busy ? 'Saving…' : `Set ${qty} at ${positionId}`}
  </button>
</Sheet>

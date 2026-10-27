<script>
  import { mdiHandBackRight, mdiPlus } from '@mdi/js'
  import { AIcon } from 'ace.svelte'
  import { page } from '$app/state'
  import { createPosition } from '$lib/actions'
  import { inventory } from '$lib/inventory.svelte'
  import ProductCard from '$lib/components/ProductCard.svelte'
  import StockSheet from '$lib/components/StockSheet.svelte'
  import HandSheet from '$lib/components/HandSheet.svelte'
  import AddProductSheet from '$lib/components/AddProductSheet.svelte'

  let search = $state(page.url.searchParams.get('q') ?? '')
  let open = $state(null) // stock row being edited
  let putInto = $state(null) // positionId for HandSheet
  let addTo = $state(null) // positionId for AddProductSheet

  let newCode = $state('')
  let createError = $state('')

  // Matches position code/note, or any product (code/name) stored there.
  const rows = $derived.by(() => {
    const q = search.trim().toUpperCase()
    return Object.values(inventory.positions)
      .map(p => ({ ...p, items: inventory.stockAt(p.id) }))
      .filter(p => !q || p.id.includes(q) || p.note?.toUpperCase().includes(q) ||
        p.items.some(s => s.productId.includes(q) || inventory.products[s.productId]?.name.toUpperCase().includes(q)))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  })

  async function create (e) {
    e.preventDefault()
    createError = ''
    try {
      const id = await createPosition(newCode)
      newCode = ''
      search = id
    } catch (e) {
      createError = e.message
    }
  }
</script>

<div class="sticky top-0 z-20 -mx-4 bg-gray-50 px-4 pt-2 pb-3">
  <input
    class="input w-full rounded-xl px-4 py-3 font-mono text-xl uppercase md:max-w-2xl"
    type="search"
    placeholder="Position or product…"
    autocapitalize="characters"
    autocomplete="off"
    autocorrect="off"
    spellcheck="false"
    bind:value={search}
  />
</div>

{#if !rows.length}
  <p class="mt-10 text-center text-gray-500">No positions match.</p>
{/if}

<div class="space-y-5 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 lg:grid-cols-3">
  {#each rows as p (p.id)}
    <section class="md:rounded-xl md:border md:border-gray-200 md:bg-white md:p-3">
      <div class="mb-2 flex items-center gap-2">
        <h2 class="font-mono text-xl font-bold">{p.id}</h2>
        {#if p.note}<span class="truncate text-sm text-gray-500">{p.note}</span>{/if}
        <span class="flex-1"></span>
        {#if inventory.hand.length}
          <button class="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-800" onclick={() => (putInto = p.id)}>
            <AIcon path={mdiHandBackRight} size="1.1rem" /> Put here
          </button>
        {/if}
        <button class="rounded-lg bg-gray-200 p-1.5 text-gray-700" aria-label="Add product to {p.id}" onclick={() => (addTo = p.id)}><AIcon path={mdiPlus} size="1.25rem" /></button>
      </div>
      {#if p.items.length}
        <div class="space-y-2">
          {#each p.items as s (s.id)}
            <ProductCard title={inventory.products[s.productId]?.name ?? s.productId} qty={s.qty} onclick={() => (open = s)} />
          {/each}
        </div>
      {:else}
        <p class="rounded-xl border border-dashed border-gray-300 p-3 text-center text-sm text-gray-400">Empty</p>
      {/if}
    </section>
  {/each}
</div>

<form class="mt-8 rounded-xl border border-gray-200 bg-white p-3 md:max-w-md" onsubmit={create}>
  <div class="mb-2 font-semibold">New position</div>
  <div class="flex gap-2">
    <input class="input min-w-0 flex-1 py-2.5 font-mono text-lg uppercase" placeholder="e.g. A1-5" autocapitalize="characters" autocomplete="off" bind:value={newCode} required />
    <button class="rounded-lg bg-blue-600 px-4 font-semibold text-white">Create</button>
  </div>
  {#if createError}<p class="error mt-2">{createError}</p>{/if}
</form>

{#if open}
  <StockSheet positionId={open.positionId} productId={open.productId} allowCorrect onclose={() => (open = null)} />
{/if}
{#if putInto}
  <HandSheet positionId={putInto} onclose={() => (putInto = null)} />
{/if}
{#if addTo}
  <AddProductSheet positionId={addTo} onclose={() => (addTo = null)} />
{/if}

<script>
  import { mdiClose, mdiPlus } from '@mdi/js'
  import { AIcon } from 'ace.svelte'
  import { page } from '$app/state'
  import { inventory } from '$lib/inventory.svelte'
  import ProductCard from '$lib/components/ProductCard.svelte'
  import StockSheet from '$lib/components/StockSheet.svelte'

  const STORAGE_KEY = 'search-terms'
  const MAX_RESULTS = 30

  // Pinned search terms survive reloads so a picking list isn't lost mid-walk.
  function loadTerms () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [] } catch { return [] }
  }
  let terms = $state(loadTerms())
  let text = $state(page.url.searchParams.get('q') ?? '')
  let open = $state(null) // { positionId, productId }

  $effect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(terms)) } catch {}
  })

  function addTerms (e) {
    e?.preventDefault()
    const added = text.split(',').map(t => t.trim().toUpperCase()).filter(t => t && !terms.includes(t))
    terms = [...terms, ...added]
    text = ''
  }

  // Every space-separated token must appear in the product code or name; codes starting with the first token rank first.
  function match (term) {
    const tokens = term.toUpperCase().split(/\s+/).filter(Boolean)
    return Object.values(inventory.products)
      .filter(p => tokens.every(t => p.id.includes(t) || p.name.toUpperCase().includes(t)))
      .sort((a, b) => (b.id.startsWith(tokens[0]) - a.id.startsWith(tokens[0])) || a.id.localeCompare(b.id, undefined, { numeric: true }))
  }

  const groups = $derived(
    [...terms, ...(text.trim() && !text.includes(',') ? [text.trim().toUpperCase()] : [])]
      .map(term => {
        const products = match(term)
        return {
          term,
          more: Math.max(products.length - MAX_RESULTS, 0),
          products: products.slice(0, MAX_RESULTS).map(p => ({ ...p, locations: inventory.stockOf(p.id) }))
        }
      })
  )
</script>

<form class="sticky top-0 z-20 -mx-4 bg-gray-50 px-4 pt-2 pb-3" onsubmit={addTerms}>
  <div class="flex gap-2 md:max-w-md">
    <input
      class="input min-w-0 flex-1 rounded-xl px-4 py-4 font-mono text-2xl uppercase md:py-2 md:text-lg"
      type="search"
      enterkeyhint="done"
      placeholder="Product code…"
      autocapitalize="characters"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      bind:value={text}
    />
    <button class="rounded-xl bg-blue-600 px-4 text-white disabled:opacity-40 md:px-3" disabled={!text.trim()} aria-label="Add to list"><AIcon path={mdiPlus} size="1.5rem" /></button>
  </div>
  {#if terms.length}
    <div class="mt-2 flex flex-wrap gap-2">
      {#each terms as t (t)}
        <button type="button" class="flex items-center gap-1 rounded-full bg-blue-100 py-1.5 pr-2 pl-3 font-mono font-semibold text-blue-800" onclick={() => (terms = terms.filter(x => x !== t))}>
          {t} <AIcon path={mdiClose} size="1.1rem" />
        </button>
      {/each}
      <button type="button" class="px-2 text-sm text-gray-500 underline" onclick={() => (terms = [])}>Clear all</button>
    </div>
  {/if}
</form>

{#if !groups.length}
  <p class="mt-10 text-center text-gray-500">Type a product code, then tap <b>+</b> to keep it on your list.<br />Separate several codes with commas.</p>
{/if}

{#each groups as g (g.term)}
  <section class="mt-4">
    <h2 class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">“{g.term}” · {g.products.length + g.more} match{g.products.length + g.more === 1 ? '' : 'es'}</h2>
    {#if !g.products.length}
      <p class="rounded-xl border border-dashed border-gray-300 p-4 text-center text-gray-500">No product matches.</p>
    {/if}
    <div class="space-y-4 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-6 md:space-y-0">
      {#each g.products as p (p.id)}
        <div>
          <div class="mb-1 font-mono font-bold">{p.name}</div>
          {#if p.locations.length}
            <div class="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {#each p.locations as s (s.id)}
                <ProductCard title={s.positionId} subtitle={inventory.positions[s.positionId]?.note} qty={s.qty} onclick={() => (open = s)} />
              {/each}
            </div>
          {:else}
            <p class="text-sm text-gray-400">Not on any shelf</p>
          {/if}
        </div>
      {/each}
    </div>
    {#if g.more}<p class="mt-2 text-sm text-gray-500">+{g.more} more — type more of the code to narrow down.</p>{/if}
  </section>
{/each}

{#if open}
  <StockSheet positionId={open.positionId} productId={open.productId} onclose={() => (open = null)} />
{/if}

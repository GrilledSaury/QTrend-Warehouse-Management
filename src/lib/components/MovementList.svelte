<script>
  import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
  import { db } from '$lib/firebase'
  import { inventory } from '$lib/inventory.svelte'

  let { max = 200 } = $props()

  let movements = $state.raw([])
  let error = $state('')
  let now = $state(Date.now())

  $effect(() => {
    const newest = cached[0]?.at
    // >= so a movement sharing the newest timestamp is never missed; duplicates merge by id.
    const q = newest
      ? query(collection(db, 'movements'), where('at', '>=', Timestamp.fromMillis(newest)), orderBy('at', 'desc'), limit(max))
      : query(collection(db, 'movements'), orderBy('at', 'desc'), limit(max))
    return onSnapshot(q, s => {
      const byId = new Map(movements.map(m => [m.id, m]))
      for (const { type, doc } of s.docChanges()) {
        if (type === 'removed') continue // fell out of the limit window, not deleted
        const d = doc.data({ serverTimestamps: 'estimate' })
        byId.set(doc.id, {
          id: doc.id, kind: d.kind, positionId: d.positionId, productId: d.productId,
          delta: d.delta, qtyAfter: d.qtyAfter, by: d.by, at: d.at?.toMillis() ?? Date.now()
        })
      }
      movements = [...byId.values()].sort((a, b) => b.at - a.at).slice(0, max)
      saveCache(movements)
      error = ''
    }, e => { error = e.message })
  })

  // Tick so relative times stay current (display only, no reads).
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 30_000)
    return () => clearInterval(timer)
  })

  const RECENT_MS = 2 * 60 * 60 * 1000

  function when (at) {
    const ago = now - at
    if (ago >= RECENT_MS) return new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const mins = Math.max(Math.floor(ago / 60_000), 0)
    if (mins < 1) return 'just now'
    const h = Math.floor(mins / 60)
    return h ? `${h} h ${mins % 60} min ago` : `${mins} min ago`
  }

  const KIND_LABELS = { 'to-hand': 'to hand', 'from-hand': 'from hand', remove: 'removed', correct: 'corrected' }
</script>

{#if error}
  <p class="error">{error}</p>
{:else if !movements.length}
  <p class="text-gray-500">No movements yet.</p>
{:else}
  <ul class="divide-y divide-gray-100">
    {#each movements as m (m.id)}
      <li class="flex items-center gap-3 py-2.5">
        <div class="min-w-0 flex-1">
          <div class="font-mono font-semibold break-words">{inventory.products[m.productId]?.name ?? m.productId}</div>
          <div class="text-sm text-gray-500">
            <a class="font-mono text-blue-700" href="/map?q={m.positionId}">{m.positionId}</a>
            · {KIND_LABELS[m.kind] ?? m.kind ?? 'change'} · {m.by}
          </div>
          <div class="text-xs text-gray-400">{when(m.at)}</div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold tabular-nums {m.delta > 0 ? 'text-green-700' : 'text-red-700'}">{m.delta > 0 ? '+' : ''}{m.delta}</div>
          <div class="text-xs text-gray-500">→ {m.qtyAfter}</div>
        </div>
      </li>
    {/each}
  </ul>
{/if}

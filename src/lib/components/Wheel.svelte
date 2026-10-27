<script>
  // iOS-style scroll wheel for picking an integer in [min, max].
  let { value = $bindable(0), min = 0, max = 99, label = '' } = $props()

  const ITEM = 44 // px per row; 5 rows visible, selected row in the middle
  let el
  let scrolling = false
  let idleTimer

  const options = $derived(Array.from({ length: max - min + 1 }, (_, i) => min + i))

  // Keep the scroll position in sync when value/min/max change from outside.
  $effect(() => {
    const target = (Math.min(Math.max(value, min), max) - min) * ITEM
    if (el && !scrolling && Math.abs(el.scrollTop - target) > 1) el.scrollTop = target
  })

  function onscroll () {
    scrolling = true
    const v = Math.min(max, Math.max(min, min + Math.round(el.scrollTop / ITEM)))
    if (v !== value) value = v
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => { scrolling = false }, 150)
  }

  function pick (v) {
    el.scrollTo({ top: (v - min) * ITEM, behavior: 'smooth' })
  }
</script>

<div class="flex flex-col items-center">
  {#if label}<div class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>{/if}
  <div class="relative w-20">
    <div class="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 rounded-lg bg-gray-100"></div>
    <div
      bind:this={el}
      {onscroll}
      class="wheel relative h-[220px] snap-y snap-mandatory overflow-y-scroll py-[88px] [scrollbar-width:none]"
      role="listbox"
      aria-label={label}
    >
      {#each options as v (v)}
        <button
          type="button"
          class="flex h-11 w-full snap-center items-center justify-center text-2xl tabular-nums {v === value ? 'font-bold text-gray-900' : 'text-gray-400'}"
          role="option"
          aria-selected={v === value}
          onclick={() => pick(v)}
        >{v}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .wheel::-webkit-scrollbar { display: none; }
  .wheel {
    mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  }
</style>

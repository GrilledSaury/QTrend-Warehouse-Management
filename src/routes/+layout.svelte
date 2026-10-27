<script>
  import '../app.css'
  import { mdiHandBackRight, mdiHistory, mdiLogout, mdiMagnify, mdiMapOutline } from '@mdi/js'
  import { AIcon } from 'ace.svelte'
  import { page } from '$app/state'
  import { session, signIn, signOut } from '$lib/session.svelte'
  import { inventory } from '$lib/inventory.svelte'
  import HandSheet from '$lib/components/HandSheet.svelte'

  let { children } = $props()
  let signInError = $state('')
  let handOpen = $state(false)

  $effect(() => {
    if (session.allowed) inventory.start(session.user.uid)
    else inventory.stop()
  })

  async function login () {
    signInError = ''
    try { await signIn() } catch (e) { signInError = e.message }
  }

  const tabs = [
    { href: '/', label: 'Search', icon: mdiMagnify },
    { href: '/map', label: 'Map', icon: mdiMapOutline }
  ]
  const handTotal = $derived(inventory.hand.reduce((n, h) => n + h.qty, 0))
</script>

<svelte:head>
  <title>QTrend Warehouse</title>
</svelte:head>

<div class="min-h-dvh bg-gray-50 text-gray-900">
<div class="relative mx-auto max-w-md md:mx-0 md:max-w-none md:px-4">
  {#if !session.ready}
    <p class="p-8 text-center text-gray-500">Loading…</p>
  {:else if !session.user}
    <div class="flex min-h-dvh flex-col items-center justify-center p-6 text-center md:mx-auto md:max-w-sm">
      <h1 class="mb-6 text-3xl font-bold">QTrend Warehouse</h1>
      <button class="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white" onclick={login}>Sign in with Google</button>
      {#if signInError}<p class="error mt-3">{signInError}</p>{/if}
    </div>
  {:else if !session.allowed}
    <div class="flex min-h-dvh flex-col items-center justify-center p-6 text-center md:mx-auto md:max-w-md">
      <p class="mb-2">Signed in as <b>{session.user.email}</b>, but this account isn't authorized.</p>
      <p class="mb-6 text-sm text-gray-600">Ask an admin to add your email to <code>allowedUsers</code>, then reload.</p>
      <button class="btn-ghost" onclick={signOut}>Sign out</button>
    </div>
  {:else}
    <header class="flex items-center gap-1 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 md:h-16 md:py-0">
      <span class="flex-1 font-bold md:text-lg">QTrend Warehouse</span>
      <a href="/history" class="p-2 text-gray-600" aria-label="History"><AIcon path={mdiHistory} /></a>
      <button class="p-2 text-gray-600" aria-label="Sign out" onclick={signOut}><AIcon path={mdiLogout} /></button>
    </header>

    <!-- Shared autocomplete lists for code inputs -->
    <datalist id="positions-list">
      {#each Object.values(inventory.positions) as p (p.id)}<option value={p.id}>{p.note}</option>{/each}
    </datalist>
    <datalist id="products-list">
      {#each Object.values(inventory.products) as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
    </datalist>

    <main class="px-4 pb-40 md:pb-24">
      {#if inventory.error}<p class="error mb-4">{inventory.error}</p>{/if}
      {#if inventory.loaded}
        {@render children()}
      {:else}
        <p class="py-8 text-center text-gray-500">Loading inventory…</p>
      {/if}
    </main>

    {#if inventory.hand.length}
      <button
        class="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-blue-600 px-5 py-3 font-bold text-white shadow-lg md:right-8 md:bottom-8 md:left-auto md:translate-x-0 md:hover:bg-blue-700"
        onclick={() => (handOpen = true)}
      >
        <AIcon path={mdiHandBackRight} /> In hand: {handTotal}
      </button>
    {/if}

    <!-- Bottom tab bar on phones; tabs next to the title in the header on desktop -->
    <nav class="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:absolute md:inset-x-auto md:top-0 md:bottom-auto md:left-52 md:h-16 md:items-center md:gap-2 md:border-0 md:bg-transparent md:pb-0">
      {#each tabs as t (t.href)}
        <a href={t.href} class="flex flex-1 flex-col items-center py-2 text-sm md:flex-none md:flex-row md:gap-2 md:rounded-lg md:px-4 md:text-base {page.url.pathname === t.href ? 'font-semibold text-blue-600 md:bg-blue-50' : 'text-gray-500 md:hover:bg-gray-100'}">
          <AIcon path={t.icon} size="1.5rem" />
          {t.label}
        </a>
      {/each}
    </nav>

    {#if handOpen}<HandSheet onclose={() => (handOpen = false)} />{/if}
  {/if}
</div>
</div>

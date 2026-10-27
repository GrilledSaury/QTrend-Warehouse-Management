<script>
  import MovementList from '$lib/components/MovementList.svelte'
</script>

<h1 class="mt-2 mb-2 text-2xl font-bold">History</h1>
<section class="rounded-xl border border-gray-200 bg-white px-3 md:max-w-3xl md:px-5">
  <MovementList max={200} />
</section>

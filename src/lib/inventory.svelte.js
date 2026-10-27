import { collection, doc, getDoc, onSnapshot, query, Timestamp, where } from 'firebase/firestore'
import { db } from './firebase'

// Live mirror of products, positions and stock, with a delta sync:
// a copy is kept in localStorage, and on reload only docs whose `updatedAt` is newer than
// the copy are fetched. Every write must therefore stamp `updatedAt` (stock uses qty 0
// instead of deleting, so removals show up too). /meta/sync.resetAt forces a full reload,
// e.g. after a --clear re-import; a full reload also happens weekly as a safety net.
const CACHE_KEY = 'inventory-cache-v1'
const FULL_REFRESH_MS = 7 * 24 * 60 * 60 * 1000
const COLLECTIONS = ['products', 'positions', 'stock']

// Fields kept per collection, so the local copy stays small.
const PICK = {
  products: d => ({ name: d.name ?? '', model: d.model ?? '', color: d.color ?? '', modifiers: d.modifiers ?? [] }),
  positions: d => ({ note: d.note ?? '' }),
  stock: d => ({ positionId: d.positionId, productId: d.productId, qty: d.qty })
}

function loadCache () {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) } catch { return null }
}

class Inventory {
  products = $state.raw({}) // id -> { id, name, model, color, modifiers }
  positions = $state.raw({}) // id -> { id, note }
  stock = $state.raw([]) // [{ id, positionId, productId, qty }], qty > 0 only
  hand = $state.raw([]) // current user's in-hand items: [{ id, productId, qty }]
  loaded = $state(false)
  error = $state('')

  #unsubs = []
  #run = 0 // bumped by stop() so an in-flight start() knows to bail out
  #data = { products: new Map(), positions: new Map(), stock: new Map() }
  #syncedAt = { products: 0, positions: 0, stock: 0 } // newest updatedAt (ms) seen per collection
  #resetAt = 0
  #fullAt = 0
  #saveTimer

  async start (uid) {
    if (this.#unsubs.length) return
    const run = ++this.#run
    const onError = e => { this.error = e.message }

    this.#unsubs.push(onSnapshot(query(collection(db, 'hand'), where('uid', '==', uid)), s => {
      this.hand = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.productId.localeCompare(b.productId))
    }, onError))

    const cache = loadCache()
    let resetAt = cache?.resetAt ?? 0
    try {
      resetAt = (await getDoc(doc(db, 'meta', 'sync'))).data()?.resetAt?.toMillis() ?? 0
    } catch {} // offline: trust the cache
    if (run !== this.#run) return

    const fresh = cache && cache.resetAt >= resetAt && Date.now() - cache.fullAt < FULL_REFRESH_MS
    if (fresh) {
      for (const name of COLLECTIONS) this.#data[name] = new Map(cache[name].map(x => [x.id, x]))
      this.#syncedAt = cache.syncedAt
      this.#resetAt = cache.resetAt
      this.#fullAt = cache.fullAt
      COLLECTIONS.forEach(name => this.#publish(name))
      this.loaded = true
    } else {
      this.#resetAt = resetAt
      this.#fullAt = Date.now()
    }

    const pending = new Set(COLLECTIONS)
    for (const name of COLLECTIONS) {
      const since = fresh ? this.#syncedAt[name] : 0
      // >= rather than > so a doc sharing the newest timestamp is never missed; re-reading it is harmless.
      const q = since ? query(collection(db, name), where('updatedAt', '>=', Timestamp.fromMillis(since))) : collection(db, name)
      this.#unsubs.push(onSnapshot(q, snap => {
        this.#apply(name, snap)
        pending.delete(name)
        if (!pending.size) this.loaded = true
      }, onError))
    }
  }

  #apply (name, snap) {
    const map = this.#data[name]
    for (const change of snap.docChanges()) {
      const id = change.doc.id
      const d = change.doc.data()
      if (change.type === 'removed' || (name === 'stock' && !(d.qty > 0))) map.delete(id)
      else map.set(id, { id, ...PICK[name](d) })
      const t = d.updatedAt?.toMillis?.() ?? 0 // null while a local write is pending
      if (t > this.#syncedAt[name]) this.#syncedAt[name] = t
    }
    this.#publish(name)
    clearTimeout(this.#saveTimer)
    this.#saveTimer = setTimeout(() => this.#save(), 1000)
  }

  #publish (name) {
    const map = this.#data[name]
    if (name === 'stock') this.stock = [...map.values()]
    else this[name] = Object.fromEntries(map)
  }

  #save () {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        resetAt: this.#resetAt,
        fullAt: this.#fullAt,
        syncedAt: this.#syncedAt,
        ...Object.fromEntries(COLLECTIONS.map(name => [name, [...this.#data[name].values()]]))
      }))
    } catch {} // storage full or blocked: next load just syncs more
  }

  stop () {
    this.#run++
    this.#unsubs.forEach(u => u())
    this.#unsubs = []
    clearTimeout(this.#saveTimer)
    this.#data = { products: new Map(), positions: new Map(), stock: new Map() }
    this.#syncedAt = { products: 0, positions: 0, stock: 0 }
    this.products = {}
    this.positions = {}
    this.stock = []
    this.hand = []
    this.loaded = false
  }

  // /meta/sync.resetAt (ms) as of the last start(); 0 until known.
  get resetAt () {
    return this.#resetAt
  }

  stockAt (positionId) {
    return this.stock.filter(s => s.positionId === positionId).sort((a, b) => a.productId.localeCompare(b.productId))
  }

  stockOf (productId) {
    return this.stock.filter(s => s.productId === productId).sort((a, b) => a.positionId.localeCompare(b.positionId))
  }
}

export const inventory = new Inventory()

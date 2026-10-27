import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from './firebase'

// Live mirror of products, positions and stock. Fine for a warehouse with up to
// tens of thousands of stock rows; beyond that, switch pages to targeted queries.
class Inventory {
  products = $state.raw({}) // id -> { id, name }
  positions = $state.raw({}) // id -> { id, note }
  stock = $state.raw([]) // [{ id, positionId, productId, qty, updatedAt, updatedBy }]
  hand = $state.raw([]) // current user's in-hand items: [{ id, productId, qty }]
  loaded = $state(false)
  error = $state('')

  #unsubs = []

  start (uid) {
    if (this.#unsubs.length) return
    const pending = new Set(['products', 'positions', 'stock'])
    const done = name => {
      pending.delete(name)
      if (!pending.size) this.loaded = true
    }
    const onError = e => { this.error = e.message }
    const byId = snap => Object.fromEntries(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]))

    this.#unsubs = [
      onSnapshot(collection(db, 'products'), s => { this.products = byId(s); done('products') }, onError),
      onSnapshot(collection(db, 'positions'), s => { this.positions = byId(s); done('positions') }, onError),
      onSnapshot(collection(db, 'stock'), s => {
        this.stock = s.docs.map(d => ({ id: d.id, ...d.data() }))
        done('stock')
      }, onError),
      onSnapshot(query(collection(db, 'hand'), where('uid', '==', uid)), s => {
        this.hand = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.productId.localeCompare(b.productId))
      }, onError)
    ]
  }

  stop () {
    this.#unsubs.forEach(u => u())
    this.#unsubs = []
    this.products = {}
    this.positions = {}
    this.stock = []
    this.hand = []
    this.loaded = false
  }

  stockAt (positionId) {
    return this.stock.filter(s => s.positionId === positionId).sort((a, b) => a.productId.localeCompare(b.productId))
  }

  stockOf (productId) {
    return this.stock.filter(s => s.productId === productId).sort((a, b) => a.positionId.localeCompare(b.positionId))
  }
}

export const inventory = new Inventory()

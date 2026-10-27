import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

// Codes are used as Firestore doc IDs, and stock IDs are `${positionId}__${productId}`,
// so restrict to characters that can't collide with that separator or path syntax.
const CODE_RE = /^[A-Z0-9][A-Z0-9.-]{0,49}$/

export function normalizeCode (raw) {
  const code = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '-')
  if (!CODE_RE.test(code)) throw new Error('Codes may use letters, digits, "-" and "." (max 50 chars)')
  return code
}

const stockRef = (positionId, productId) => doc(db, 'stock', `${positionId}__${productId}`)
// Items a user is carrying between positions ("in hand"), one doc per user + product.
const handRef = (uid, productId) => doc(db, 'hand', `${uid}__${productId}`)

function checkQty (qty) {
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('Pick a quantity above 0')
}

// Runs fn(tx, helpers) in a transaction. Firestore requires all reads before writes,
// so fn must finish its read() calls before calling any write helper.
function stockTx (fn) {
  const user = auth.currentUser
  return runTransaction(db, async tx => {
    const read = async ref => {
      const snap = await tx.get(ref)
      return snap.exists() ? snap.data().qty : 0
    }
    // Empty stock is kept at qty 0, not deleted, so other devices' delta sync sees the change.
    const writeStock = (positionId, productId, qty) => {
      tx.set(stockRef(positionId, productId), {
        positionId, productId, qty, updatedAt: serverTimestamp(), updatedBy: user.email
      })
    }
    const writeHand = (productId, qty) => {
      if (qty === 0) tx.delete(handRef(user.uid, productId))
      else tx.set(handRef(user.uid, productId), {
        uid: user.uid, email: user.email, by: user.displayName || user.email, productId, qty, updatedAt: serverTimestamp()
      })
    }
    const log = (kind, positionId, productId, delta, qtyAfter) => {
      tx.set(doc(collection(db, 'movements')), {
        kind, positionId, productId, delta, qtyAfter,
        uid: user.uid, email: user.email, by: user.displayName || user.email, at: serverTimestamp()
      })
    }
    return fn(tx, { read, writeStock, writeHand, log, user })
  })
}

export async function createPosition (code, note = '') {
  const id = normalizeCode(code)
  const ref = doc(db, 'positions', id)
  await runTransaction(db, async tx => {
    if ((await tx.get(ref)).exists()) throw new Error(`Position ${id} already exists`)
    tx.set(ref, { note: String(note).trim(), createdAt: serverTimestamp(), createdBy: auth.currentUser.email, updatedAt: serverTimestamp() })
  })
  return id
}

/** Take items off a shelf for good (sold, shipped, damaged…). */
export function removeStock (positionId, productId, qty) {
  checkQty(qty)
  return stockTx(async (tx, { read, writeStock, log }) => {
    const current = await read(stockRef(positionId, productId))
    if (qty > current) throw new Error(`Only ${current} at ${positionId}`)
    writeStock(positionId, productId, current - qty)
    log('remove', positionId, productId, -qty, current - qty)
  })
}

/** Pick items off a shelf into the current user's hand. */
export function takeToHand (positionId, productId, qty) {
  checkQty(qty)
  return stockTx(async (tx, { read, writeStock, writeHand, log, user }) => {
    const current = await read(stockRef(positionId, productId))
    const inHand = await read(handRef(user.uid, productId))
    if (qty > current) throw new Error(`Only ${current} at ${positionId}`)
    writeStock(positionId, productId, current - qty)
    writeHand(productId, inHand + qty)
    log('to-hand', positionId, productId, -qty, current - qty)
  })
}

/** Put items from the current user's hand onto a shelf. */
export function putFromHand (positionId, productId, qty) {
  checkQty(qty)
  return stockTx(async (tx, { read, writeStock, writeHand, log, user }) => {
    if (!(await tx.get(doc(db, 'positions', positionId))).exists()) throw new Error(`Position ${positionId} doesn't exist`)
    const inHand = await read(handRef(user.uid, productId))
    const current = await read(stockRef(positionId, productId))
    if (qty > inHand) throw new Error(`Only ${inHand} in hand`)
    writeHand(productId, inHand - qty)
    writeStock(positionId, productId, current + qty)
    log('from-hand', positionId, productId, qty, current + qty)
  })
}

/** Correct the count of a product at a position. Creates the product if it's new. */
export function setStock (positionId, productId, qty) {
  if (!Number.isInteger(qty) || qty < 0) throw new Error('Quantity must be 0 or more')
  return stockTx(async (tx, { read, writeStock, log, user }) => {
    const productRef = doc(db, 'products', productId)
    const productExists = (await tx.get(productRef)).exists()
    const current = await read(stockRef(positionId, productId))
    if (qty === current) return
    if (!productExists) {
      tx.set(productRef, { name: productId.replace(/-/g, ' '), createdAt: serverTimestamp(), createdBy: user.email, updatedAt: serverTimestamp() })
    }
    writeStock(positionId, productId, qty)
    log('correct', positionId, productId, qty - current, qty)
  })
}

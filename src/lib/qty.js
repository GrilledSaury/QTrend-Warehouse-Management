export const PACK_SIZE = 8

export const toPacks = n => ({ packs: Math.floor(n / PACK_SIZE), singles: n % PACK_SIZE })

// "3p + 2" style breakdown; empty when under one pack
export function packLabel (n) {
  const { packs, singles } = toPacks(n)
  if (!packs) return ''
  return singles ? `${packs}p + ${singles}` : `${packs}p`
}

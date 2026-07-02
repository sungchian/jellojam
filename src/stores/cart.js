import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'jj_cart'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // storage quota or private mode — silently ignore
  }
}

export const useCartStore = defineStore('cart', () => {
  const items = ref(loadFromStorage())

  // ── Computed ────────────────────────────────────────────────────────────────

  const totalQty = computed(() =>
    items.value.reduce((sum, item) => sum + item.qty, 0)
  )

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0)
  )

  const itemCount = computed(() => items.value.length)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function persist() {
    saveToStorage(items.value)
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  /**
   * Add a product to the cart.
   * @param {Object} product - must contain { id, product_name, price, stock, category_zh }
   * @param {number} qty - quantity to add (default 1)
   */
  // Returns: 'added' | 'capped' | 'out_of_stock'
  function addItem(product, qty = 1) {
    const price  = product.store_price   ?? product.price   ?? 0
    // Never fall back to a large default: an unknown stock must be treated as 0
    // so we don't let customers order phantom inventory. Final authority is the
    // server-side stock check in create_order (see 20260701_p1_hardening.sql).
    const stock  = Number(product.current_stock ?? product.stock ?? 0)
    const catZh  = product.jellycat_category_zh ?? product.category_zh ?? ''

    if (stock <= 0) return 'out_of_stock'

    const existing = items.value.find((i) => i.id === product.id)
    if (existing) {
      if (existing.qty >= existing.stock) return 'capped'
      existing.qty = Math.min(existing.qty + qty, existing.stock)
    } else {
      items.value.push({
        id: product.id,
        product_name: product.product_name,
        price,
        qty: Math.min(qty, stock),
        stock,
        category_zh: catZh,
      })
    }

    persist()
    return 'added'
  }

  /**
   * Remove an item from the cart by product id.
   * @param {string|number} id
   */
  function removeItem(id) {
    items.value = items.value.filter((i) => i.id !== id)
    persist()
  }

  /**
   * Set the quantity for a cart item.
   * If qty <= 0 the item is removed entirely.
   * Quantity is clamped to available stock.
   * @param {string|number} id
   * @param {number} qty
   */
  function setQty(id, qty) {
    if (qty <= 0) {
      removeItem(id)
      return
    }

    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.qty = Math.min(qty, item.stock)
      persist()
    }
  }

  /**
   * Empty the cart and clear localStorage.
   */
  function clear() {
    items.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    items,
    totalQty,
    subtotal,
    itemCount,
    addItem,
    removeItem,
    setQty,
    clear,
  }
})

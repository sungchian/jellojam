import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'jj_store_member'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToStorage(customer) {
  try {
    if (customer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customer))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // storage quota or private mode — silently ignore
  }
}

export const useStoreMemberStore = defineStore('storeMember', () => {
  const customer = ref(loadFromStorage())

  // ── Computed ────────────────────────────────────────────────────────────────

  const isLoggedIn = computed(() => customer.value !== null)

  const displayName = computed(() => {
    if (!customer.value) return ''
    return (
      customer.value.display_name ||
      customer.value.name ||
      customer.value.line_user_id ||
      ''
    )
  })

  // ── Actions ──────────────────────────────────────────────────────────────────

  /**
   * Look up a customer by name, display_name, or LINE user ID.
   * Throws a localised error string if no match is found.
   * @param {string} term - search term
   */
  async function loginByName(term) {
    if (!term || !term.trim()) {
      throw new Error('請輸入姓名或 LINE ID')
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(
        `name.ilike.%${term}%,display_name.ilike.%${term}%,line_user_id.eq.${term}`
      )
      .limit(1)
      .single()

    if (error || !data) {
      throw new Error('找不到會員，請確認姓名或 LINE ID 是否正確')
    }

    customer.value = data
    saveToStorage(data)
    return data
  }

  /**
   * Log the current member out and clear persisted state.
   */
  function logout() {
    customer.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Overwrite the stored customer record with fresh data.
   * @param {Object} data - updated customer object
   */
  function refreshCustomer(data) {
    customer.value = data
    saveToStorage(data)
  }

  return {
    customer,
    isLoggedIn,
    displayName,
    loginByName,
    logout,
    refreshCustomer,
  }
})

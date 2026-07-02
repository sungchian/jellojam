/**
 * storeMember — DEPRECATED legacy store.
 * All storefront auth is now handled by storeAuth.js.
 * This file is kept only to prevent import errors if any legacy code references it.
 * loginByName() has been removed — unauthenticated name-lookup is a security risk.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useStoreMemberStore = defineStore('storeMember', () => {
  const customer = ref(null)
  const isLoggedIn = computed(() => customer.value !== null)
  const displayName = computed(() => customer.value?.display_name || '')

  function logout() {
    customer.value = null
    try { localStorage.removeItem('jj_store_member') } catch {}
  }

  function refreshCustomer(data) {
    customer.value = data
  }

  return { customer, isLoggedIn, displayName, logout, refreshCustomer }
})

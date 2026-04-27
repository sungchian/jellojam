/** Pinia auth store — handles login/logout/role for ERP staff */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref(JSON.parse(localStorage.getItem('jj_user')  || 'null'))
  const token = ref(localStorage.getItem('jj_token') || '')
  const isLoggedIn = computed(() => !!token.value)

  const USERS = [
    { id: 1, name: 'Kelsey', email: 'kelsey@jellojam.com', role: 'super_admin' },
    { id: 2, name: 'Karina', email: 'karina@jellojam.com', role: 'admin' },
  ]

  function login({ email, password }) {
    const found = USERS.find(u => u.email === email)
    if (found && password === 'jellojam2026') {
      user.value  = found
      token.value = 'jj_' + Date.now()
      localStorage.setItem('jj_user',  JSON.stringify(found))
      localStorage.setItem('jj_token', token.value)
      return { success: true }
    }
    return { success: false, message: '帳號或密碼錯誤' }
  }

  function logout() {
    user.value = null; token.value = ''
    localStorage.removeItem('jj_user'); localStorage.removeItem('jj_token')
  }

  function switchUser(u) {
    user.value  = u
    token.value = 'jj_' + Date.now()
    localStorage.setItem('jj_user',  JSON.stringify(u))
    localStorage.setItem('jj_token', token.value)
  }

  const roleLabel = computed(() => ({ super_admin: '超級管理員', admin: '管理員' }[user.value?.role] || ''))
  return { user, token, isLoggedIn, login, logout, switchUser, roleLabel }
})

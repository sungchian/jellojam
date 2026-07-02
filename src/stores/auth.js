/**
 * ERP staff authentication store.
 * Uses real Supabase Auth — JWT is validated server-side on every request.
 * Staff accounts must be created in Supabase Dashboard → Authentication → Users
 * with user_metadata: { name: '...', role: 'super_admin' | 'admin' }
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabaseERP } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const _session = ref(null)
  const _user    = ref(null)

  // ── Computed ───────────────────────────────────────────────────────────────

  const isLoggedIn = computed(() => !!_session.value)

  // Expose user shape compatible with existing ERP views
  const user = computed(() => {
    if (!_user.value) return null
    return {
      id:    _user.value.id,
      name:  _user.value.user_metadata?.name  || _user.value.email,
      email: _user.value.email,
      role:  _user.value.user_metadata?.role  || 'admin',
    }
  })

  const roleLabel = computed(() =>
    ({ super_admin: '超級管理員', admin: '管理員' }[user.value?.role] || ''),
  )

  // ── Init: restore session on app start ────────────────────────────────────

  async function init() {
    const { data: { session } } = await supabaseERP.auth.getSession()
    _session.value = session
    _user.value    = session?.user ?? null

    supabaseERP.auth.onAuthStateChange((_event, s) => {
      _session.value = s
      _user.value    = s?.user ?? null
    })
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async function login({ email, password }) {
    const { data, error } = await supabaseERP.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    })

    if (error) return { success: false, message: _authMsg(error) }

    _session.value = data.session
    _user.value    = data.user
    return { success: true }
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async function logout() {
    await supabaseERP.auth.signOut()
    _session.value = null
    _user.value    = null
  }

  // ── Error messages ────────────────────────────────────────────────────────

  function _authMsg(err) {
    const msg = err?.message || ''
    if (/Invalid login credentials/i.test(msg)) return '帳號或密碼錯誤'
    if (/rate.limit|too.many/i.test(msg))        return '嘗試次數過多，請稍後再試'
    if (/Email not confirmed/i.test(msg))         return '請先至信箱完成驗證'
    return msg || '登入失敗，請稍後再試'
  }

  return { user, isLoggedIn, roleLabel, init, login, logout }
})

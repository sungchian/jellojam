/**
 * storeAuth — enterprise storefront authentication
 * Handles: Google OAuth, LINE OAuth, email/password,
 *          session management, audit logging, banned-user interception.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

// Rate limiting is handled server-side by Supabase (429 responses).
// Client-side RL via localStorage is trivially bypassable and creates
// false security — removed. _authMsg() surfaces Supabase 429 messages.
function rl_clear() {
  // Clear any legacy RL key left from earlier builds
  try { localStorage.removeItem('jj_auth_rl') } catch {}
}

// ── Device fingerprint for session records ─────────────────────────────────
function getDeviceInfo() {
  return {
    ua:       navigator.userAgent.slice(0, 200),
    platform: navigator.platform,
    lang:     navigator.language,
    tz:       Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

// ── Store ──────────────────────────────────────────────────────────────────
export const useStoreAuthStore = defineStore('storeAuth', () => {
  const session   = ref(null)   // Supabase session (JWT)
  const user      = ref(null)   // Supabase auth user
  const customer  = ref(null)   // customers table row
  const loading   = ref(true)   // initial session check in progress
  const authError = ref('')     // displayed to user

  // ── Computed ──────────────────────────────────────────────────────────────

  const isLoggedIn   = computed(() => !!customer.value)
  const isOAuth      = computed(() => !!session.value)   // any Supabase session
  const isGoogleAuth = computed(() => user.value?.app_metadata?.provider === 'google')
  const displayName = computed(() => {
    if (!customer.value) return ''
    return customer.value.display_name || user.value?.email || '會員'
  })
  const avatarUrl   = computed(() =>
    customer.value?.avatar_url ||
    user.value?.user_metadata?.avatar_url ||
    null
  )
  const currentPoints  = computed(() => customer.value?.current_points  ?? 0)
  const lifetimePoints = computed(() => customer.value?.lifetime_points ?? 0)

  const tier = computed(() => {
    const pts = lifetimePoints.value
    if (pts >= 30) return { key: 'platinum', label: '白金會員', color: '#7B5B8E', minPts: 30 }
    if (pts >= 15) return { key: 'gold',     label: '金牌會員', color: '#C8A26B', minPts: 15 }
    if (pts >= 5)  return { key: 'silver',   label: '銀牌會員', color: '#8B9EB7', minPts: 5  }
    return           { key: 'normal',  label: '一般會員', color: '#9CA3AF', minPts: 0  }
  })

  // ── Internal helpers ──────────────────────────────────────────────────────

  async function _audit(action, extra = {}) {
    try {
      await supabase.from('auth_audit_log').insert({
        user_id:     user.value?.id ?? null,
        customer_id: customer.value?.id ?? null,
        action,
        user_agent:  navigator.userAgent.slice(0, 500),
        metadata:    {
          email:    user.value?.email ?? extra.email,
          provider: user.value?.app_metadata?.provider ?? 'name',
          ...extra,
        },
      })
    } catch {
      // Audit is non-critical — never block auth flow on failure
    }
  }

  async function _registerSession() {
    if (!user.value || !customer.value) return
    try {
      await supabase.from('store_sessions').insert({
        customer_id: customer.value.id,
        user_id:     user.value.id,
        device_info: getDeviceInfo(),
        expires_at:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
    } catch {}
  }

  /**
   * Core: fetch or auto-create a customer row for this auth user.
   * Priority: auth_user_id match → email match (link) → create new.
   */
  async function _resolveCustomer(authUser) {
    const email = authUser.email

    // 1. By auth_user_id (returning user)
    let { data } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()

    // 2. By email — link existing customer account
    if (!data && email) {
      const { data: byEmail } = await supabase
        .from('customers')
        .select('*')
        .ilike('email', email)
        .maybeSingle()

      if (byEmail) {
        await supabase
          .from('customers')
          .update({
            auth_user_id: authUser.id,
            avatar_url:   authUser.user_metadata?.avatar_url ?? byEmail.avatar_url,
            email:        email,
          })
          .eq('id', byEmail.id)
        data = { ...byEmail, auth_user_id: authUser.id }
      }
    }

    // 3. New customer — first time Google login
    if (!data) {
      const fullName = authUser.user_metadata?.full_name
                    || authUser.user_metadata?.name
                    || email?.split('@')[0]
                    || '新會員'
      const base = {
        display_name:    fullName,
        email:           email,
        current_points:  0,
        lifetime_points: 0,
      }
      // Try with auth_user_id (requires migration); fall back without it
      let { data: created, error: e1 } = await supabase
        .from('customers')
        .insert({ ...base, auth_user_id: authUser.id, avatar_url: authUser.user_metadata?.avatar_url ?? null })
        .select()
        .single()
      if (e1 || !created) {
        const { data: created2 } = await supabase
          .from('customers')
          .insert(base)
          .select()
          .single()
        created = created2
      }
      data = created
    } else {
      // Update last login timestamp
      await supabase
        .from('customers')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.id)
    }

    return data
  }

  // ── Lifecycle: init on app mount ─────────────────────────────────────────

  let _unsubscribe = null

  async function init() {
    loading.value = true

    try {
      // Restore existing session (handles PKCE callback code automatically)
      // 1. Handle tokens stashed by main.js (implicit flow intercept)
      const stashedRaw = sessionStorage.getItem('jj_oauth_tokens')
      if (stashedRaw) {
        sessionStorage.removeItem('jj_oauth_tokens')
        const { accessToken, refreshToken } = JSON.parse(stashedRaw)
        const { data: setData } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        })
        if (setData?.session) {
          session.value = setData.session
          user.value    = setData.session.user
          const c = await _resolveCustomer(setData.session.user)
          if (c?.is_banned) {
            authError.value = `帳號已被停用${c.ban_reason ? '：' + c.ban_reason : ''}`
            await supabase.auth.signOut()
            session.value = null; user.value = null; customer.value = null
          } else {
            customer.value = c
            rl_clear()
            await _audit('login')
            await _registerSession()
          }
          loading.value = false
          // Set up listener and return — no need for getSession() below
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
            session.value = s ?? null
            user.value    = s?.user ?? null
            if (event === 'SIGNED_OUT') customer.value = null
          })
          _unsubscribe = subscription
          return
        }
      }

      // 2. Normal session restore (returning visitor / PKCE callback)
      const { data: { session: s } } = await supabase.auth.getSession()
      if (s) {
        session.value  = s
        user.value     = s.user
        const c = await _resolveCustomer(s.user)
        if (c?.is_banned) {
          authError.value = `帳號已被停用${c.ban_reason ? '：' + c.ban_reason : ''}`
          await supabase.auth.signOut()
          session.value = null; user.value = null; customer.value = null
        } else {
          customer.value = c
        }
      }

      // (LINE users now hold a REAL Supabase session — restored by step 2 above,
      //  same as Google/email. The old localStorage-UUID restore path is gone:
      //  it was insecure (client-controlled identity) and is no longer needed.)
      localStorage.removeItem('jj_line_customer_id')
    } catch (e) {
      console.error('[storeAuth] init failed, code:', e?.code ?? 'unknown')
    } finally {
      loading.value = false
    }

    // Listen for future auth changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      session.value = s ?? null
      user.value    = s?.user ?? null

      if (event === 'SIGNED_IN' && s?.user) {
        const c = await _resolveCustomer(s.user)
        if (c?.is_banned) {
          authError.value = `帳號已被停用${c.ban_reason ? '：' + c.ban_reason : ''}`
          await supabase.auth.signOut()
          customer.value = null
          await _audit('banned')
        } else {
          customer.value = c
          rl_clear()
          await _audit('login')
          await _registerSession()
        }
      } else if (event === 'SIGNED_OUT') {
        customer.value = null
      }
    })

    _unsubscribe = subscription
  }

  function destroy() {
    _unsubscribe?.unsubscribe()
  }

  // ── Auth actions ──────────────────────────────────────────────────────────

  // ── Error message translation ─────────────────────────────────────────────
  function _authMsg(err) {
    const msg    = typeof err === 'string' ? err : (err?.message || '')
    const status = err?.status ?? err?.code ?? 0

    // 429 — extract wait time if Supabase tells us
    if (status === 429 || /rate.limit|too.many|security.purposes/i.test(msg)) {
      const secs = msg.match(/after\s+(\d+)\s+second/i)?.[1]
      return secs ? `請求過於頻繁，請 ${secs} 秒後再試` : '請求過於頻繁，請稍後再試（約 60 秒）'
    }
    if (/Invalid login credentials/i.test(msg))   return '電子郵件或密碼錯誤'
    if (/Email not confirmed/i.test(msg))          return '請先至信箱點擊驗證連結後再登入'
    if (/User already registered/i.test(msg))     return '此信箱已被註冊，請直接登入'
    if (/Password should be at least/i.test(msg)) return '密碼至少需要 6 個字元'
    if (/Unable to validate|invalid.*email/i.test(msg)) return '電子郵件格式不正確'
    if (/Signups not allowed/i.test(msg))         return '目前不開放新會員註冊'
    if (status === 400)                            return '輸入資料有誤，請確認後再試'
    return msg || '操作失敗，請稍後再試'
  }

  /**
   * Email + password sign in.
   * On success, onAuthStateChange fires SIGNED_IN → _resolveCustomer → customer set.
   */
  async function loginWithEmail(email, password) {
    authError.value = ''
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = _authMsg(error)
      authError.value = msg
      throw new Error(msg)
    }
    rl_clear()
    // SIGNED_IN fires → onAuthStateChange handles customer resolution
  }

  /**
   * Register new account with email + password.
   * Sends verification email; user can log in even before verifying
   * if Supabase "Confirm email" is disabled (recommended for this flow).
   * @returns {{ needsConfirmation: boolean }}
   */
  async function registerWithEmail(email, password, name) {
    authError.value = ''
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, display_name: name } },
    })
    if (error) {
      const msg = _authMsg(error)
      authError.value = msg
      throw new Error(msg)
    }
    // data.session is null when email confirmation is required
    return { needsConfirmation: !data.session }
  }

  /**
   * Google OAuth — opens Google login popup/redirect.
   * Supabase handles PKCE + token exchange on callback.
   */
  async function loginWithGoogle() {
    authError.value = ''

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        queryParams: { prompt: 'select_account' },
      },
    })

    if (error) {
      authError.value = error.message
      throw error
    }
  }

  /**
   * LINE Login — redirects to LINE OAuth.
   * On return, the router saves code to sessionStorage; handleLineCallback() finishes the flow.
   */
  function loginWithLine() {
    authError.value = ''

    const channelId = import.meta.env.VITE_LINE_CHANNEL_ID
    if (!channelId) {
      authError.value = 'LINE 登入尚未設定，請聯繫管理員'
      throw new Error(authError.value)
    }

    // Cryptographically-random state (prevents CSRF; must survive the redirect)
    const arr   = new Uint8Array(24)
    crypto.getRandomValues(arr)
    const state = 'line_' + Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem('line_oauth_state', state)

    // redirect_uri = the Edge Function URL (LINE calls it directly, no CORS)
    const redirectUri = 'https://iifhubablhxibpsyeagi.supabase.co/functions/v1/super-service'

    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     channelId,
      redirect_uri:  redirectUri,
      state,
      scope:         'profile openid',
    })

    window.location.href = 'https://access.line.me/oauth2/v2.1/authorize?' + params.toString()
  }

  /**
   * Called by StoreAuthCallback after Edge Function redirects back.
   *
   * Security model (Issue #9):
   *   - The customer UUID is NEVER in the redirect URL.
   *   - The Edge Function stored { state → customer_id } in the line_tokens
   *     table (server-side, service-role only, expires in 5 min).
   *   - We verify the state matches what we put in sessionStorage (CSRF),
   *     then look up the customer_id from line_tokens using that state.
   *
   * @param {string} stateFromStorage - the state read from sessionStorage by StoreAuthCallback
   */
  async function handleLineCustomer(stateFromStorage) {
    authError.value = ''
    loading.value   = true

    try {
      // 1. CSRF check — compare against what we generated before redirecting to LINE
      const savedState = sessionStorage.getItem('line_oauth_state')
      sessionStorage.removeItem('line_oauth_state')

      if (!savedState || !stateFromStorage || savedState !== stateFromStorage) {
        throw new Error('LINE 登入驗證失敗，請重新嘗試（CSRF 保護）')
      }

      // 2. Exchange state → { customer_id, token_hash } via a single-use RPC.
      //    token_hash is a one-time magic-link token the Edge Function minted.
      const { data: rows, error: tokenErr } = await supabase
        .rpc('exchange_line_token', { p_state: stateFromStorage })
      const token = Array.isArray(rows) ? rows[0] : rows
      if (tokenErr || !token?.token_hash) {
        throw new Error('LINE 登入已逾時，請重新嘗試')
      }

      // 3. Establish a REAL Supabase session from the one-time token, so the
      //    storefront runs authenticated and RLS isolates this customer's data.
      const { data: verified, error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: token.token_hash,
        type: 'email',
      })
      if (verifyErr || !verified?.session) {
        throw new Error('LINE 登入 session 建立失敗，請重新嘗試')
      }
      session.value = verified.session
      user.value    = verified.user

      // 4. Resolve the linked customer via the authenticated session.
      const cust = await _resolveCustomer(verified.user)
      if (!cust) throw new Error('無法載入會員資料，請重新登入')
      if (cust.is_banned) {
        throw new Error(`帳號已被停用${cust.ban_reason ? '：' + cust.ban_reason : ''}`)
      }

      customer.value = cust
      rl_clear()
      await _audit('login_line', { line_user_id: cust.line_user_id })

      return cust
    } catch (e) {
      authError.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign out — optionally revoke all active sessions.
   * @param {'local'|'global'} scope - 'global' signs out all devices
   */
  async function logout(scope = 'local') {
    try {
      if (scope === 'global' && customer.value?.id) {
        await supabase
          .from('store_sessions')
          .update({ is_revoked: true })
          .eq('customer_id', customer.value.id)
          .eq('is_revoked', false)
        await _audit('logout_all')
        await supabase.auth.signOut({ scope: 'global' })
      } else {
        await _audit('logout')
        if (session.value) await supabase.auth.signOut({ scope: 'local' })
      }
    } catch (e) {
      console.error('[storeAuth] logout failed, code:', e?.code ?? 'unknown')
    } finally {
      session.value  = null
      user.value     = null
      customer.value = null
      authError.value = ''
      localStorage.removeItem('jj_line_customer_id')
    }
  }

  /**
   * Fetch latest customer data from DB and update the store.
   */
  async function refreshCustomer() {
    if (!customer.value?.id) return
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer.value.id)
      .single()
    if (data) customer.value = data
  }

  /**
   * Fetch this customer's active sessions.
   * @returns {Promise<Array>}
   */
  async function fetchSessions() {
    if (!customer.value?.id) return []
    const { data } = await supabase
      .from('store_sessions')
      .select('*')
      .eq('customer_id', customer.value.id)
      .eq('is_revoked', false)
      .gt('expires_at', new Date().toISOString())
      .order('last_active', { ascending: false })
      .limit(10)
    return data || []
  }

  /**
   * Fetch this customer's recent auth events.
   * @returns {Promise<Array>}
   */
  async function fetchAuditLog() {
    if (!customer.value?.id) return []
    const { data } = await supabase
      .from('auth_audit_log')
      .select('*')
      .eq('customer_id', customer.value.id)
      .order('created_at', { ascending: false })
      .limit(20)
    return data || []
  }

  /**
   * Handle Supabase implicit flow tokens from URL hash.
   * Called by router when it detects #access_token= in the hash.
   * Extracts tokens, sets the session, then clears the hash.
   * @returns {boolean} true if tokens were found and processed
   */
  async function handleHashTokens() {
    const raw = window.location.hash.replace(/^#\/?/, '')
    if (!raw.includes('access_token=')) return false

    const params = new URLSearchParams(raw)
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return false

    try {
      const { data, error } = await supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      })
      if (error) throw error

      if (data.session) {
        session.value  = data.session
        user.value     = data.session.user
        const c = await _resolveCustomer(data.session.user)
        if (c?.is_banned) {
          authError.value = `帳號已被停用${c.ban_reason ? '：' + c.ban_reason : ''}`
          await supabase.auth.signOut()
          session.value = null; user.value = null; customer.value = null
        } else {
          customer.value = c
          rl_clear()
          await _audit('login')
          await _registerSession()
        }
        // Remove tokens from URL before router navigates
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        return true
      }
    } catch (e) {
      console.error('[storeAuth] handleHashTokens failed, code:', e?.code ?? 'unknown')
      authError.value = '登入失敗，請稍後再試'
    }
    return false
  }

  return {
    // State
    session, user, customer, loading, authError,
    // Computed
    isLoggedIn, isOAuth, isGoogleAuth, displayName, avatarUrl,
    currentPoints, lifetimePoints, tier,
    // Actions
    init, destroy,
    loginWithGoogle, loginWithLine, handleLineCustomer,
    loginWithEmail, registerWithEmail,
    logout, refreshCustomer,
    fetchSessions, fetchAuditLog,
    handleHashTokens,
  }
})

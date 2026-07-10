<template>
  <div class="callback-page">
    <div class="callback-card">
      <svg class="spin-logo" viewBox="0 0 40 40" width="48" height="48">
        <circle cx="20" cy="20" r="17" fill="none" stroke="#F5DDE0" stroke-width="4"/>
        <circle cx="20" cy="20" r="17" fill="none" stroke="#C97B84" stroke-width="4"
          stroke-dasharray="60" stroke-dashoffset="20" />
      </svg>
      <p class="cb-title">{{ message }}</p>
      <p class="cb-sub">{{ sub }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStoreAuthStore } from '@/stores/storeAuth'

const auth    = useStoreAuthStore()
const router  = useRouter()
const message = ref('正在完成登入')
const sub     = ref('請稍候，正在驗證您的身份…')

let redirected = false

function doRedirect() {
  if (redirected) return
  if (!auth.isLoggedIn || !auth.customer?.id) return
  redirected = true
  message.value = '登入成功！'
  sub.value = '即將進入會員中心…'
  if (window.location.search) {
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }
  // Restore the redirect stashed by StoreLogin before the OAuth full-page
  // round-trip. Re-validate with the same open-redirect guard (same-origin
  // path: starts with / but not //); fall back to the member page.
  const stashed = sessionStorage.getItem('jj_login_redirect')
  sessionStorage.removeItem('jj_login_redirect')
  const target = typeof stashed === 'string' && /^\/(?!\/)/.test(stashed)
    ? stashed
    : `/store/member/${auth.customer.id}`
  setTimeout(() => router.replace(target), 500)
}

let fallbackTimer = null
onUnmounted(() => clearTimeout(fallbackTimer))

onMounted(async () => {
  // ── LINE callback (server-side flow) ──────────────────────────────────────
  // Edge Function redirected here via /?line_state=<state>
  // Customer UUID is NOT in the URL — it's looked up via line_tokens table.
  const lineState = sessionStorage.getItem('line_callback_state')
  // PKCE 流程的 ?code= 在 router guard 就被 replaceState 清掉、存進 jj_pkce_code，
  // 所以除了 URL 也要看 sessionStorage 才判斷得出「正在進行 OAuth」。
  const hasOAuthParams =
    new URLSearchParams(window.location.search).has('code') ||
    !!sessionStorage.getItem('jj_pkce_code')

  // 誤闖本頁（無任何登入參數、也沒有進行中的 session 解析）：立即導離，
  // 不讓顧客空等 10 秒 spinner。
  if (!lineState && !hasOAuthParams && !auth.loading && !auth.isLoggedIn) {
    router.replace('/store/auth')
    return
  }

  // 兜底逾時：LINE 與 PKCE 兩條流程都適用 — 10 秒內沒完成就導回登入頁。
  fallbackTimer = setTimeout(() => {
    if (!redirected) {
      sessionStorage.setItem('auth_error', '登入逾時，請重新嘗試')
      router.replace('/store/auth')
    }
  }, 10000)

  if (lineState) {
    sessionStorage.removeItem('line_callback_state')

    message.value = '正在連接 LINE 帳號…'
    sub.value     = '驗證 LINE 身份中，請稍候'

    try {
      await auth.handleLineCustomer(lineState)
      doRedirect()
    } catch (e) {
      // Store error in sessionStorage instead of URL (prevents leaking details in logs/history)
      sessionStorage.setItem('auth_error', e.message || 'LINE 登入失敗')
      router.replace('/store/auth')
    }
  }
})

// Watch 1: fires when Supabase loading completes (Google / email flow)
watch(() => auth.loading, (isLoading) => {
  if (!isLoading) {
    if (auth.authError) {
      sessionStorage.setItem('auth_error', auth.authError)
      router.replace('/store/auth')
    } else {
      doRedirect()
    }
  }
}, { immediate: true })

// Watch 2: fires the moment isLoggedIn becomes true (async SIGNED_IN event)
watch(() => auth.isLoggedIn, (val) => {
  if (val) doRedirect()
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--jj-cream);
}
.callback-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 60px 40px;
  background: var(--jj-white);
  border-radius: 24px;
  box-shadow: 0 8px 48px rgba(160,73,90,0.12);
}
.spin-logo { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.cb-title { font-size: 18px; font-weight: 700; color: var(--jj-text); margin: 0; }
.cb-sub { font-size: 13px; color: var(--jj-text-sub); margin: 0; }
</style>

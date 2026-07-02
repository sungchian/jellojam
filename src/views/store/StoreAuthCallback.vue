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
import { ref, watch, onMounted } from 'vue'
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
  setTimeout(() => router.replace(`/store/member/${auth.customer.id}`), 500)
}

onMounted(async () => {
  // ── LINE callback (server-side flow) ──────────────────────────────────────
  // Edge Function redirected here via /?line_state=<state>
  // Customer UUID is NOT in the URL — it's looked up via line_tokens table.
  const lineState = sessionStorage.getItem('line_callback_state')

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
    return
  }

  // ── Supabase PKCE / Google OAuth callback ─────────────────────────────────
  // Fallback: if still not redirected after 10s, go back to auth
  setTimeout(() => {
    if (!redirected) {
      sessionStorage.setItem('auth_error', '登入逾時，請重新嘗試')
      router.replace('/store/auth')
    }
  }, 10000)
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

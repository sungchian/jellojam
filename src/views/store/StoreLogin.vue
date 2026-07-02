<template>
  <div class="login-page">
    <div class="login-wrap">

      <!-- ── Left panel: branding ── -->
      <div class="brand-panel">
        <div class="brand-logo">🍮</div>
        <h1 class="brand-name">JelloJam</h1>
        <p class="brand-tagline">每一只，都值得被愛</p>
        <div class="benefits">
          <div class="benefit-item" v-for="b in benefits" :key="b.icon">
            <span class="benefit-icon">{{ b.icon }}</span>
            <div>
              <div class="benefit-title">{{ b.title }}</div>
              <div class="benefit-desc">{{ b.desc }}</div>
            </div>
          </div>
        </div>
        <div class="brand-deco">
          <span class="deco-bubble" v-for="e in ['🐰','🐻','🐶','🐱','🦕']" :key="e">{{ e }}</span>
        </div>
      </div>

      <!-- ── Right panel: auth form ── -->
      <div class="auth-panel">

        <!-- ── Registration success screen ── -->
        <div v-if="regSuccess" class="reg-success">
          <div class="rs-icon">📬</div>
          <h3 class="rs-title">帳號已建立！</h3>
          <p class="rs-body">
            驗證信已寄送至<br>
            <b>{{ regSuccessEmail }}</b><br><br>
            請點擊信中連結完成驗證。<br>
            驗證前您也可以先登入使用基本功能。
          </p>
          <button class="rs-btn" @click="regSuccess = false; authTab = 'login'">
            前往登入 →
          </button>
        </div>

        <div v-else class="auth-card">

          <div class="auth-header">
            <h2 class="auth-title">歡迎來到 JelloJam</h2>
            <p class="auth-sub">登入以查看訂單、集點與會員優惠</p>
          </div>

          <!-- Google OAuth -->
          <button class="google-btn" @click="handleGoogleLogin" :disabled="googleLoading || lineLoading">
            <span v-if="googleLoading" class="google-spinner">
              <svg class="spin-icon" viewBox="0 0 24 24" width="20" height="20">
                <circle cx="12" cy="12" r="10" fill="none" stroke="#C97B84" stroke-width="2.5"
                  stroke-dasharray="40" stroke-dashoffset="10" />
              </svg>
            </span>
            <span v-else class="google-logo">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            <span>{{ googleLoading ? '連線中…' : '使用 Google 帳號繼續' }}</span>
          </button>

          <!-- LINE OAuth -->
          <button class="line-btn" @click="handleLineLogin" :disabled="lineLoading || googleLoading">
            <span v-if="lineLoading" class="line-spinner">
              <svg class="spin-icon" viewBox="0 0 24 24" width="20" height="20">
                <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2.5"
                  stroke-dasharray="40" stroke-dashoffset="10" />
              </svg>
            </span>
            <span v-else class="line-logo">
              <!-- LINE official icon -->
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M12 2C6.477 2 2 6.036 2 11.07c0 4.49 3.653 8.243 8.582 8.95.334.072.789.22.904.505.104.259.068.665.033.927l-.146.894c-.044.263-.205 1.028.9.561 1.104-.467 5.958-3.51 8.13-6.007C21.69 14.73 22 12.97 22 11.07 22 6.036 17.523 2 12 2zm-3.3 12.8H6.737a.488.488 0 0 1-.487-.488V9.188a.488.488 0 0 1 .975 0v4.637h1.475a.488.488 0 0 1 0 .975zm1.838 0a.488.488 0 0 1-.975 0V9.188a.488.488 0 0 1 .975 0v5.612zm4.853 0a.487.487 0 0 1-.338.464.474.474 0 0 1-.152.024.487.487 0 0 1-.389-.195l-2.44-3.325v3.028a.488.488 0 0 1-.975 0V9.188a.487.487 0 0 1 .338-.464.48.48 0 0 1 .54.171l2.441 3.326V9.188a.488.488 0 0 1 .975 0v5.612zm2.997-3.85a.488.488 0 0 1 0 .975h-1.474v1.387h1.474a.488.488 0 0 1 0 .976h-1.962a.488.488 0 0 1-.487-.488V9.188a.488.488 0 0 1 .487-.487h1.962a.488.488 0 0 1 0 .975h-1.474v1.274h1.474z"/>
              </svg>
            </span>
            <span>{{ lineLoading ? '連線中…' : '使用 LINE 帳號繼續' }}</span>
          </button>

          <!-- Divider -->
          <div class="divider">
            <span class="divider-line"></span>
            <span class="divider-text">或使用電子郵件</span>
            <span class="divider-line"></span>
          </div>

          <!-- Tab switcher -->
          <div class="auth-tabs">
            <button class="auth-tab" :class="{ active: authTab === 'login' }"
              @click="authTab = 'login'; errorMsg = ''">登入</button>
            <button class="auth-tab" :class="{ active: authTab === 'register' }"
              @click="authTab = 'register'; errorMsg = ''">建立帳號</button>
          </div>

          <!-- ── Login form ── -->
          <form v-if="authTab === 'login'" class="auth-form" @submit.prevent="handleEmailLogin">
            <div class="field-group">
              <label class="field-label">電子郵件</label>
              <input v-model="loginEmail" class="field-input" type="email"
                placeholder="your@email.com" autocomplete="email" required :disabled="emailLoading" />
            </div>
            <div class="field-group">
              <label class="field-label">密碼</label>
              <div class="pw-wrap">
                <input v-model="loginPassword" class="field-input" :type="showPw ? 'text' : 'password'"
                  placeholder="請輸入密碼" autocomplete="current-password" required :disabled="emailLoading" />
                <button type="button" class="pw-toggle" @click="showPw = !showPw" tabindex="-1">
                  {{ showPw ? '隱藏' : '顯示' }}
                </button>
              </div>
            </div>
            <button type="submit" class="submit-btn" :disabled="emailLoading || cooldown > 0">
              <span v-if="emailLoading" class="spin-sm"></span>
              {{ emailLoading ? '登入中…' : cooldown > 0 ? `請等待 ${cooldown} 秒` : '登入' }}
            </button>
          </form>

          <!-- ── Register form ── -->
          <form v-else class="auth-form" @submit.prevent="handleRegister">
            <div class="field-group">
              <label class="field-label">顯示名稱</label>
              <input v-model="regName" class="field-input" type="text"
                placeholder="您的姓名" autocomplete="name" required :disabled="emailLoading" />
            </div>
            <div class="field-group">
              <label class="field-label">電子郵件</label>
              <input v-model="regEmail" class="field-input" type="email"
                placeholder="your@email.com" autocomplete="email" required :disabled="emailLoading" />
            </div>
            <div class="field-group">
              <label class="field-label">密碼 <span class="field-hint-inline">（至少 6 字元）</span></label>
              <div class="pw-wrap">
                <input v-model="regPassword" class="field-input" :type="showRegPw ? 'text' : 'password'"
                  placeholder="設定密碼" autocomplete="new-password" required minlength="6"
                  :disabled="emailLoading" />
                <button type="button" class="pw-toggle" @click="showRegPw = !showRegPw" tabindex="-1">
                  {{ showRegPw ? '隱藏' : '顯示' }}
                </button>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">確認密碼</label>
              <input v-model="regConfirm" class="field-input" :type="showRegPw ? 'text' : 'password'"
                placeholder="再次輸入密碼" autocomplete="new-password" required :disabled="emailLoading" />
              <span v-if="regConfirm && regConfirm !== regPassword" class="pw-mismatch">
                ⚠ 密碼不一致
              </span>
            </div>
            <button type="submit" class="submit-btn"
              :disabled="emailLoading || cooldown > 0 || (regConfirm && regConfirm !== regPassword)">
              <span v-if="emailLoading" class="spin-sm"></span>
              {{ emailLoading ? '建立中…' : cooldown > 0 ? `請等待 ${cooldown} 秒` : '建立帳號' }}
            </button>
            <p class="reg-note">
              建立後將收到驗證信，您可以先登入使用基本功能，驗證後解鎖完整會員權益
            </p>
          </form>

          <!-- Error message -->
          <Transition name="err">
            <div v-if="errorMsg" class="error-box">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
                stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {{ errorMsg }}
            </div>
          </Transition>


        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStoreAuthStore } from '@/stores/storeAuth'

const auth   = useStoreAuthStore()
const router = useRouter()
const route  = useRoute()

// ── Tab state ─────────────────────────────────────────────────────────────
const authTab = ref('login')

// ── Loading / error ───────────────────────────────────────────────────────
const googleLoading = ref(false)
const lineLoading   = ref(false)
const emailLoading  = ref(false)

// Pick up errors forwarded from StoreAuthCallback via sessionStorage
// (avoids exposing error details in URL query params / browser history)
const errorMsg = ref((() => {
  const e = sessionStorage.getItem('auth_error') || ''
  if (e) sessionStorage.removeItem('auth_error')
  return e
})())

// ── Login form ────────────────────────────────────────────────────────────
const loginEmail    = ref('')
const loginPassword = ref('')
const showPw        = ref(false)

// ── Register form ─────────────────────────────────────────────────────────
const regName     = ref('')
const regEmail    = ref('')
const regPassword = ref('')
const regConfirm  = ref('')
const showRegPw   = ref(false)

// ── Register success state ────────────────────────────────────────────────
const regSuccess      = ref(false)
const regSuccessEmail = ref('')

const benefits = [
  { icon: '⭐', title: '集點回饋', desc: '每筆訂單累積點數，兌換好禮' },
  { icon: '🎁', title: '會員專屬', desc: '新品優先通知、生日禮遇' },
  { icon: '📦', title: '訂單追蹤', desc: '即時查詢所有歷史訂單' },
  { icon: '💎', title: '等級升級', desc: '銀牌→金牌→白金，解鎖更多權益' },
]

// ── Redirect after any login ──────────────────────────────────────────────
function redirectAfterLogin() {
  const id = auth.customer?.id
  if (!id) return
  const raw = route.query.redirect
  // Open redirect guard: only allow same-origin paths (must start with /
  // but not // which would be treated as protocol-relative URL)
  const safe = typeof raw === 'string' && /^\/(?!\/)/.test(raw) ? raw : `/store/member/${id}`
  router.replace(safe)
}

// Watch for isLoggedIn to change (handles async SIGNED_IN events)
watch(() => auth.isLoggedIn, (val) => {
  if (val) redirectAfterLogin()
}, { immediate: true })

// ── Google login ──────────────────────────────────────────────────────────
async function handleGoogleLogin() {
  errorMsg.value = ''
  googleLoading.value = true
  try {
    await auth.loginWithGoogle()
    // Browser will redirect to Google — loading stays true
  } catch (e) {
    errorMsg.value = e.message || '登入失敗，請稍後再試'
    googleLoading.value = false
  }
}

// ── LINE login ────────────────────────────────────────────────────────────
async function handleLineLogin() {
  errorMsg.value = ''
  lineLoading.value = true
  try {
    auth.loginWithLine()
    // Browser will redirect to LINE — loading stays true
  } catch (e) {
    errorMsg.value = e.message || 'LINE 登入失敗，請稍後再試'
    lineLoading.value = false
  }
}

// ── Email validation helper ───────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
function validEmail(e) { return EMAIL_RE.test(e) }

// ── Cooldown (after 429 or multiple failures) ─────────────────────────────
const cooldown   = ref(0)
let   cooldownId = null
function startCooldown(secs = 60) {
  cooldown.value = secs
  clearInterval(cooldownId)
  cooldownId = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) clearInterval(cooldownId)
  }, 1000)
}

// ── Email login ───────────────────────────────────────────────────────────
async function handleEmailLogin() {
  errorMsg.value = ''
  const email = loginEmail.value.trim()
  const pw    = loginPassword.value

  if (!validEmail(email))  { errorMsg.value = '請輸入正確的電子郵件格式'; return }
  if (pw.length < 1)       { errorMsg.value = '請輸入密碼'; return }

  emailLoading.value = true
  try {
    await auth.loginWithEmail(email, pw)
  } catch (e) {
    errorMsg.value = e.message
    if (/頻繁|稍後/.test(e.message)) {
      const secs = e.message.match(/(\d+)\s*秒/)?.[1]
      startCooldown(Number(secs) || 60)
    }
  } finally {
    emailLoading.value = false
  }
}

// ── Register ──────────────────────────────────────────────────────────────
async function handleRegister() {
  errorMsg.value = ''
  const name  = regName.value.trim()
  const email = regEmail.value.trim()
  const pw    = regPassword.value
  const cfm   = regConfirm.value

  if (!name)              { errorMsg.value = '請輸入顯示名稱'; return }
  if (!validEmail(email)) { errorMsg.value = '請輸入正確的電子郵件格式'; return }
  if (pw.length < 6)      { errorMsg.value = '密碼至少需要 6 個字元'; return }
  if (pw !== cfm)         { errorMsg.value = '兩次輸入的密碼不一致'; return }

  emailLoading.value = true
  try {
    const { needsConfirmation } = await auth.registerWithEmail(email, pw, name)
    if (needsConfirmation) {
      regSuccessEmail.value = email
      regSuccess.value = true
    }
    // If no confirmation needed, onAuthStateChange fires → isLoggedIn → redirect
  } catch (e) {
    errorMsg.value = e.message
    if (/頻繁|稍後/.test(e.message)) {
      const secs = e.message.match(/(\d+)\s*秒/)?.[1]
      startCooldown(Number(secs) || 60)
    }
  } finally {
    emailLoading.value = false
  }
}


</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--jj-cream);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.login-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 960px;
  width: 100%;
  min-height: 580px;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(160,73,90,0.18);
}

/* ── Brand panel ─────────────────────────────────────────────────────────── */
.brand-panel {
  background: linear-gradient(145deg, var(--jj-rose-dark) 0%, #7B2D3E 60%, #5C2230 100%);
  padding: 52px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  overflow: hidden;
}
.brand-logo { font-size: 52px; }
.brand-name { font-size: 32px; font-weight: 900; color: #fff; margin: 0; letter-spacing: -0.5px; }
.brand-tagline { font-size: 15px; color: rgba(255,255,255,0.7); margin: 0; }
.benefits { display: flex; flex-direction: column; gap: 18px; margin-top: 12px; }
.benefit-item { display: flex; align-items: flex-start; gap: 14px; }
.benefit-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
.benefit-title { font-size: 14px; font-weight: 700; color: #fff; }
.benefit-desc { font-size: 12px; color: rgba(255,255,255,0.62); margin-top: 2px; }
.brand-deco { position: absolute; bottom: -10px; right: -10px; display: flex; flex-wrap: wrap; gap: 4px; width: 120px; opacity: 0.18; }
.deco-bubble { font-size: 40px; }

/* ── Auth panel ──────────────────────────────────────────────────────────── */
.auth-panel {
  background: var(--jj-white);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 36px;
  overflow-y: auto;
}

.auth-card {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-header { text-align: center; }
.auth-title { font-size: 22px; font-weight: 800; color: var(--jj-text); margin: 0 0 5px; }
.auth-sub { font-size: 13px; color: var(--jj-text-sub); margin: 0; }

/* ── Google button ───────────────────────────────────────────────────────── */
.google-btn {
  width: 100%;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #fff;
  border: 1.5px solid #dadce0;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: #3c4043;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.google-btn:hover:not(:disabled) { background: #f8f9fa; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.google-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.google-logo, .google-spinner { display: flex; align-items: center; }

/* ── LINE button ─────────────────────────────────────────────────────────── */
.line-btn {
  width: 100%;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #06c755;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s;
  box-shadow: 0 1px 4px rgba(6,199,85,0.25);
}
.line-btn:hover:not(:disabled) { background: #05b34b; box-shadow: 0 2px 10px rgba(6,199,85,0.35); }
.line-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.line-logo, .line-spinner { display: flex; align-items: center; }

/* ── Divider ─────────────────────────────────────────────────────────────── */
.divider { display: flex; align-items: center; gap: 10px; }
.divider-line { flex: 1; height: 1px; background: var(--jj-border); }
.divider-text { font-size: 11.5px; color: var(--jj-text-sub); white-space: nowrap; }

/* ── Tabs ────────────────────────────────────────────────────────────────── */
.auth-tabs {
  display: flex;
  background: var(--jj-cream);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}
.auth-tab {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--jj-text-sub);
  background: transparent;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}
.auth-tab.active {
  background: var(--jj-white);
  color: var(--jj-rose-dark);
  box-shadow: 0 1px 6px rgba(0,0,0,0.1);
}

/* ── Forms ───────────────────────────────────────────────────────────────── */
.auth-form { display: flex; flex-direction: column; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--jj-text-sub); }
.field-hint-inline { font-weight: 400; opacity: 0.8; }
.field-input {
  height: 44px;
  border: 1.5px solid var(--jj-border);
  border-radius: 10px;
  padding: 0 14px;
  font-size: 14px;
  color: var(--jj-text);
  outline: none;
  background: var(--jj-white);
  transition: border-color 0.18s;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus { border-color: var(--jj-rose); }
.field-input:disabled { background: var(--jj-cream); cursor: not-allowed; }

.pw-wrap { position: relative; }
.pw-wrap .field-input { padding-right: 52px; }
.pw-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 11px;
  color: var(--jj-text-sub);
  cursor: pointer;
  padding: 4px;
}
.pw-mismatch { font-size: 11px; color: #ef4444; }

.submit-btn {
  height: 46px;
  background: var(--jj-rose-dark);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.submit-btn:hover:not(:disabled) { background: var(--jj-rose); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.reg-note {
  font-size: 11.5px;
  color: var(--jj-text-sub);
  text-align: center;
  line-height: 1.6;
  margin: 0;
}

/* ── Error ───────────────────────────────────────────────────────────────── */
.error-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff1f1;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #b91c1c;
}
.err-enter-active, .err-leave-active { transition: all 0.2s ease; }
.err-enter-from, .err-leave-to { opacity: 0; transform: translateY(-6px); }


/* ── Registration success ─────────────────────────────────────────────────── */
.reg-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  padding: 20px 0;
  max-width: 320px;
}
.rs-icon { font-size: 60px; }
.rs-title { font-size: 22px; font-weight: 800; color: var(--jj-text); margin: 0; }
.rs-body { font-size: 14px; color: var(--jj-text-sub); line-height: 1.8; margin: 0; }
.rs-body b { color: var(--jj-rose-dark); }
.rs-btn {
  height: 46px;
  padding: 0 32px;
  background: var(--jj-rose-dark);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.rs-btn:hover { background: var(--jj-rose); }

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.spin-icon { animation: spin 0.9s linear infinite; display: block; }
.spin-sm {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.5);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 680px) {
  .login-wrap { grid-template-columns: 1fr; border-radius: 20px; min-height: unset; }
  .brand-panel { padding: 28px 24px 20px; flex-direction: row; flex-wrap: wrap; gap: 10px; align-items: center; }
  .benefits, .brand-deco { display: none; }
  .auth-panel { padding: 28px 20px; }
}
</style>

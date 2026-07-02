import { createApp } from 'vue'
import * as Sentry from '@sentry/vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import { createI18n } from 'vue-i18n'

import zh from './locales/zh'
import en from './locales/en'
import App from './App.vue'
import router from './router'
import './styles/global.css'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

// ── OAuth implicit flow interception ──────────────────────────────────────
// Must run BEFORE Vue Router initializes so ERP routes never flash.
// Supabase implicit flow puts tokens in URL hash: #access_token=...
// History-mode router: rewrite the path to /store/auth/callback (no hash prefix).
;(function interceptOAuthHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (!raw.includes('access_token=')) return

  const params       = new URLSearchParams(raw)
  const accessToken  = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return

  // Stash tokens for storeAuth.init() to pick up
  try {
    sessionStorage.setItem('jj_oauth_tokens', JSON.stringify({ accessToken, refreshToken }))
  } catch {}

  // Rewrite to the callback path (history mode — no hash prefix)
  window.history.replaceState(null, '', '/store/auth/callback')
})()

// ── PKCE code stash ─────────────────────────────────────────────────────────
// Runs synchronously at module load — BEFORE the router guard or storeAuth.init
// — so the ?code= from a Google/email OAuth redirect is captured before anything
// strips it from the URL. storeAuth.init() then exchanges it for a session.
;(function stashPkceCode() {
  try {
    const sp = new URLSearchParams(window.location.search)
    const code = sp.get('code')
    if (code && sp.get('state')) sessionStorage.setItem('jj_pkce_code', code)
  } catch { /* ignore */ }
})()

// ── i18n ──────────────────────────────────────────────────────────────────
// Chinese-first site: always start in 中文, ignore any stale localStorage value
localStorage.removeItem('jj_lang')
const savedLang = 'zh'

export const i18n = createI18n({
  legacy:        false,
  locale:        savedLang,
  fallbackLocale:'zh',
  messages:      { zh, en },
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhTw })
app.use(i18n)

// ── Sentry ─────────────────────────────────────────────────────────────────
// npm install @sentry/vue  (already in package.json after this commit)
// Set VITE_SENTRY_DSN in .env to enable; leave empty to disable in dev.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn:              import.meta.env.VITE_SENTRY_DSN,
    integrations:     [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,   // 10% in prod, off in dev
    environment:      import.meta.env.MODE,
    // Never capture PII in breadcrumbs
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'xhr' || crumb.category === 'fetch') {
        delete crumb.data?.body   // don't log request bodies (may contain passwords)
      }
      return crumb
    },
  })
}

// ── GA4 ────────────────────────────────────────────────────────────────────
// Set VITE_GA4_ID=G-XXXXXXXXXX in .env to enable.
// Route-change tracking is wired in router.afterEach below.
if (import.meta.env.VITE_GA4_ID) {
  const s = document.createElement('script')
  s.async = true
  s.src   = `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA4_ID}`
  document.head.appendChild(s)

  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', import.meta.env.VITE_GA4_ID, {
    send_page_view: false,   // manual — fired in router.afterEach to get correct titles
  })
}

// ── Page title + GA4 page_view on every navigation ────────────────────────
router.afterEach((to) => {
  const title = to.meta?.title
    ? `${to.meta.title} — JelloJam`
    : 'JelloJam | 北美代購精品'
  document.title = title

  if (window.gtag && import.meta.env.VITE_GA4_ID) {
    window.gtag('event', 'page_view', {
      page_title:    title,
      page_location: window.location.href,
      page_path:     to.fullPath,
    })
  }
})

// Initialize storefront auth (reads stashed tokens or existing session)
import('@/stores/storeAuth').then(({ useStoreAuthStore }) => {
  useStoreAuthStore().init()
})

// Initialize ERP staff auth (restores Supabase session if still valid)
import('@/stores/auth').then(({ useAuthStore }) => {
  useAuthStore().init()
})

app.mount('#app')

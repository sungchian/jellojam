<template>
  <div class="store-app">

    <!-- ══════════════ HEADER ══════════════ -->
    <header class="store-header" :class="{ scrolled: isScrolled }">
      <div class="header-inner">

        <!-- Logo -->
        <RouterLink to="/store" class="logo-link">
          <span class="logo-mark">🍮</span>
          <span class="logo-text">JelloJam</span>
        </RouterLink>

        <!-- Search -->
        <div class="search-wrap">
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            :placeholder="t('nav.search')"
            @keydown.enter="doSearch"
          />
          <button class="search-btn" @click="doSearch" :aria-label="t('nav.search')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>

        <!-- Right icons -->
        <div class="header-actions">
          <!-- Language toggle -->
          <button class="lang-toggle" @click="toggleLang" :title="t('nav.language')">
            {{ locale === 'zh' ? 'EN' : '中文' }}
          </button>

          <!-- Member -->
          <RouterLink to="/store/member" class="icon-btn" active-class="" exact-active-class="">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="icon-label">
              {{ member.isLoggedIn ? member.displayName.slice(0,5) : t('nav.member') }}
            </span>
          </RouterLink>

          <!-- Cart -->
          <RouterLink to="/store/cart" class="icon-btn" active-class="" exact-active-class="">
            <span class="cart-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span v-if="cart.totalQty > 0" class="cart-badge">
                {{ cart.totalQty > 99 ? '99+' : cart.totalQty }}
              </span>
            </span>
            <span class="icon-label">{{ t('nav.cart') }}</span>
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- ══════════════ CATEGORY NAV ══════════════ -->
    <nav class="cat-nav">
      <div class="cat-nav-inner">
        <RouterLink
          to="/store/catalog"
          class="cat-link"
          active-class=""
          exact-active-class=""
          :class="{ 'cat-active': route.path === '/store/catalog' && !route.query.cat }"
        >
          {{ t('nav.allProducts') }}
        </RouterLink>
        <RouterLink
          v-for="cat in displayCategories"
          :key="cat"
          :to="{ path: '/store/catalog', query: { cat } }"
          class="cat-link"
          active-class=""
          exact-active-class=""
          :class="{ 'cat-active': route.query.cat === cat }"
        >
          {{ t(`categories.${cat}`, cat) }}
        </RouterLink>
      </div>
    </nav>

    <!-- ══════════════ MAIN CONTENT ══════════════ -->
    <main class="store-main">
      <RouterView v-slot="{ Component, route: r }">
        <Transition :name="mounted ? 'page' : ''" mode="out-in">
          <component :is="Component" :key="r.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <!-- ══════════════ FOOTER ══════════════ -->
    <footer class="store-footer">
      <div class="footer-inner">
        <div class="footer-col brand-col">
          <div class="footer-logo">🍮 JelloJam</div>
          <p class="footer-tagline">{{ t('footer.tagline') }}</p>
          <a href="#" class="line-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.208 2 11.423c0 4.661 3.671 8.557 8.637 9.285.337.073.795.224.912.514.105.263.069.675.034.94l-.148.89c-.045.268-.209 1.046.916.57 1.125-.476 6.067-3.573 8.277-6.117C22.057 15.174 22 13.327 22 11.423 22 6.208 17.523 2 12 2z"/>
            </svg>
            {{ t('footer.line') }}
          </a>
        </div>

        <div class="footer-col">
          <div class="footer-col-title">{{ t('footer.products') }}</div>
          <RouterLink to="/store/catalog" class="footer-link">{{ t('footer.all') }}</RouterLink>
          <RouterLink to="/store/catalog?cat=Bunnies" class="footer-link">{{ t('footer.bunnies') }}</RouterLink>
          <RouterLink to="/store/catalog?cat=Bears"   class="footer-link">{{ t('footer.bears') }}</RouterLink>
          <RouterLink to="/store/catalog?cat=Dogs"    class="footer-link">{{ t('footer.dogs') }}</RouterLink>
        </div>

        <div class="footer-col">
          <div class="footer-col-title">{{ t('footer.service') }}</div>
          <RouterLink to="/store/member" class="footer-link">{{ t('footer.account') }}</RouterLink>
          <RouterLink to="/store/member" class="footer-link">{{ t('footer.points') }}</RouterLink>
          <RouterLink to="/store/cart"   class="footer-link">{{ t('footer.cart') }}</RouterLink>
          <a href="#" class="footer-link">{{ t('footer.contact') }}</a>
        </div>
      </div>

      <div class="footer-bottom">
        <p>{{ t('footer.copyright') }}</p>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCartStore }        from '@/stores/cart'
import { useStoreMemberStore } from '@/stores/storeMember'
import { useAppDataStore }     from '@/stores/appData'

const { t, locale } = useI18n()
const cart   = useCartStore()
const member = useStoreMemberStore()
const store  = useAppDataStore()
const router = useRouter()
const route  = useRoute()

// ── Language toggle ──────────────────────────────────────────────────────
function toggleLang() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
  localStorage.setItem('jj_lang', locale.value)
}

// ── Scroll shadow ────────────────────────────────────────────────────────
const isScrolled = ref(false)
const mounted    = ref(false)   // prevents enter animation on first load
function onScroll() { isScrolled.value = window.scrollY > 4 }
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  store.fetchAll()
  // delay one tick so initial mount has no transition class
  nextTick(() => { mounted.value = true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

// ── Search ───────────────────────────────────────────────────────────────
const searchQuery = ref('')
function doSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  router.push(`/store/catalog?q=${encodeURIComponent(q)}`)
  searchQuery.value = ''
}

// ── Category nav (top 10) ────────────────────────────────────────────────
const displayCategories = computed(() => store.jellycatCategories.slice(0, 10))
</script>

<style scoped>
/* ══════════════ BRAND TOKENS ══════════════ */
.store-app {
  /* Warm multi-tone palette (inspired by warm editorial/wedding aesthetic) */
  --jj-cream:       #FBF5EE;
  --jj-cream-2:     #F2E8DC;
  --jj-rose:        #C97B84;
  --jj-rose-dark:   #A0495A;
  --jj-rose-light:  #F5DDE0;
  --jj-rose-pale:   #FDF3F4;
  --jj-gold:        #C8A26B;
  --jj-gold-dark:   #9E7840;
  --jj-gold-light:  #F5EAD4;
  --jj-plum:        #7B5B8E;
  --jj-plum-light:  #EDE4F2;
  --jj-sage:        #7A9E7E;
  --jj-sage-light:  #E4F0E4;
  --jj-dark:        #2C1A14;
  --jj-text:        #2C1A14;
  --jj-text-sub:    #8C6E62;
  --jj-border:      #E8D5C4;
  --jj-white:       #FFFFFF;
  --jj-shadow:      0 2px 20px rgba(160, 73, 90, 0.08);
  --jj-shadow-lg:   0 8px 48px rgba(160, 73, 90, 0.16);
  --jj-radius:      14px;
  --jj-radius-sm:   8px;
  --jj-radius-lg:   24px;

  min-height: 100vh;
  background: var(--jj-cream);
  color: var(--jj-text);
  font-family: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif;
}

/* ══════════════ HEADER ══════════════ */
.store-header {
  position: sticky;
  top: 0;
  z-index: 200;
  background: rgba(251, 245, 238, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--jj-border);
  transition: box-shadow 0.2s ease;
}
.store-header.scrolled {
  box-shadow: var(--jj-shadow);
}

.header-inner {
  max-width: 1240px;
  margin: 0 auto;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
}

/* Logo */
.logo-link {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  flex-shrink: 0;
}
.logo-mark { font-size: 24px; line-height: 1; }
.logo-text  {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--jj-rose-dark) 0%, var(--jj-gold-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}
.logo-link:hover .logo-text { opacity: 0.8; }

/* Search */
.search-wrap {
  flex: 1;
  min-width: 0;
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  background: var(--jj-white);
  border: 1.5px solid var(--jj-border);
  border-radius: 999px;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-wrap:focus-within {
  border-color: var(--jj-rose);
  box-shadow: 0 0 0 3px rgba(201,123,132,0.12);
}
.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  padding: 10px 14px;
  font-size: 13.5px;
  color: var(--jj-text);
}
.search-input::placeholder { color: var(--jj-text-sub); }
.search-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--jj-rose) 0%, var(--jj-rose-dark) 100%);
  border: none;
  cursor: pointer;
  color: #fff;
  flex-shrink: 0;
  transition: opacity 0.15s;
  margin: 2px;
  border-radius: 999px;
}
.search-btn:hover { opacity: 0.85; }

/* Right actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.lang-toggle {
  padding: 5px 10px;
  border: 1.5px solid var(--jj-border);
  border-radius: 999px;
  background: transparent;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--jj-text-sub);
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: all 0.15s;
  flex-shrink: 0;
}
.lang-toggle:hover {
  border-color: var(--jj-rose);
  color: var(--jj-rose-dark);
  background: var(--jj-rose-pale);
}

.icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 10px;
  text-decoration: none;
  color: var(--jj-text-sub);
  border-radius: var(--jj-radius-sm);
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
  position: relative;
}
.icon-btn:hover { color: var(--jj-rose-dark); background: var(--jj-rose-pale); }
.icon-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.02em; }

.cart-wrap { position: relative; display: flex; }
.cart-badge {
  position: absolute;
  top: -7px;
  right: -9px;
  background: linear-gradient(135deg, var(--jj-rose) 0%, var(--jj-rose-dark) 100%);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 17px;
  height: 17px;
  padding: 0 3px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* ══════════════ CATEGORY NAV ══════════════ */
.cat-nav {
  position: sticky;
  top: 64px;
  z-index: 190;
  background: var(--jj-white);
  border-bottom: 1px solid var(--jj-border);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.cat-nav::-webkit-scrollbar { display: none; }

.cat-nav-inner {
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 2px;
}

.cat-link {
  white-space: nowrap;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--jj-text-sub);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.cat-link:hover { color: var(--jj-rose-dark); }
.cat-active {
  color: var(--jj-rose-dark);
  border-bottom-color: var(--jj-rose-dark);
  font-weight: 700;
}

/* ══════════════ MAIN ══════════════ */
.store-main {
  min-height: calc(100vh - 64px - 43px);
}

/* ══════════════ ROUTER TRANSITION ══════════════ */
.page-enter-active { transition: opacity 0.18s ease; }
.page-leave-active { transition: opacity 0.12s ease; }
.page-enter-from   { opacity: 0; }
.page-leave-to     { opacity: 0; }

/* ══════════════ FOOTER ══════════════ */
.store-footer {
  background: var(--jj-dark);
  color: rgba(255,255,255,0.65);
  padding: 52px 20px 0;
  margin-top: 80px;
}

.footer-inner {
  max-width: 1240px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr;
  gap: 48px;
  padding-bottom: 48px;
}

.footer-logo {
  font-size: 20px;
  font-weight: 800;
  color: var(--jj-gold);
  margin-bottom: 10px;
  letter-spacing: -0.3px;
}
.footer-tagline {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255,255,255,0.45);
  margin-bottom: 18px;
}
.line-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #06c755;
  color: #fff;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s;
}
.line-btn:hover { opacity: 0.85; }

.footer-col-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--jj-gold);
  margin-bottom: 16px;
}
.footer-link {
  display: block;
  font-size: 13.5px;
  color: rgba(255,255,255,0.55);
  text-decoration: none;
  margin-bottom: 10px;
  transition: color 0.15s;
}
.footer-link:hover { color: var(--jj-gold); }

.footer-bottom {
  max-width: 1240px;
  margin: 0 auto;
  padding: 16px 0;
  border-top: 1px solid rgba(255,255,255,0.07);
  font-size: 12px;
  color: rgba(255,255,255,0.28);
  text-align: center;
}

/* ══════════════ RESPONSIVE ══════════════ */
@media (max-width: 900px) {
  .header-inner { padding: 0 14px; gap: 8px; }
  .search-wrap  { max-width: 340px; }
  .logo-text    { font-size: 17px; }
  .footer-inner { grid-template-columns: 1fr 1fr; gap: 28px; }
}

@media (max-width: 600px) {
  .header-inner { gap: 6px; padding: 0 10px; }
  .logo-text    { display: none; }
  .logo-mark    { font-size: 28px; }
  .search-wrap  { max-width: none; }
  .icon-label   { display: none; }
  .lang-toggle  { padding: 4px 8px; font-size: 11px; }
  .cat-nav-inner{ padding: 0 10px; }
  .footer-inner { grid-template-columns: 1fr; gap: 24px; }
  .store-footer { padding: 36px 14px 0; }
}
</style>

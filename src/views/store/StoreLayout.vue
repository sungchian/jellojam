<template>
  <div class="store-app">

    <!-- ══════════════ HEADER ══════════════ -->
    <header class="store-header" :class="{ scrolled: isScrolled }">
      <div class="header-inner">

        <!-- Logo -->
        <RouterLink to="/store" class="logo-link">
          <img src="/logo.svg" alt="JelloJam" class="logo-img" />
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
          <RouterLink
            :to="member.isLoggedIn ? `/store/member/${member.customer?.id}` : '/store/auth'"
            class="icon-btn"
            active-class=""
            exact-active-class=""
          >
            <span class="member-avatar-wrap">
              <img
                v-if="member.isLoggedIn && member.avatarUrl"
                :src="member.avatarUrl"
                class="member-avatar-img"
                referrerpolicy="no-referrer"
                alt="avatar"
              />
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span v-if="member.isLoggedIn" class="member-online-dot"></span>
            </span>
            <span class="icon-label">
              {{ member.isLoggedIn ? member.displayName.slice(0,6) : t('nav.member') }}
            </span>
          </RouterLink>

          <!-- Cart -->
          <RouterLink to="/store/cart" class="icon-btn" active-class="" exact-active-class="">
            <span class="cart-wrap" :class="{ 'cart-bounce': cartBounce }">
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

        <!-- 商品分類 dropdown -->
        <div class="cat-item cat-has-dropdown">
          <RouterLink
            to="/store/catalog"
            class="cat-link"
            active-class=""
            exact-active-class=""
            :class="{ 'cat-active': route.path === '/store/catalog' }"
          >商品分類 <span class="cat-arrow">▾</span></RouterLink>

          <div class="cat-dropdown">

            <!-- ── Jellycat ── -->
            <div class="drop-row drop-has-sub">
              <RouterLink :to="{ path: '/store/catalog', query: { brand: 'jellycat' } }" class="drop-row-link">
                <span>🐰 Jellycat</span>
                <span class="drop-chevron">›</span>
              </RouterLink>
              <div class="drop-sub">
                <RouterLink :to="{ path: '/store/catalog', query: { brand: 'jellycat', group: 'bunnies'    } }" class="drop-sub-item">🐰 兔兔專區</RouterLink>
                <RouterLink :to="{ path: '/store/catalog', query: { brand: 'jellycat', group: 'amuseables' } }" class="drop-sub-item">🎪 趣味系列</RouterLink>
                <RouterLink :to="{ path: '/store/catalog', query: { brand: 'jellycat', group: 'animals'    } }" class="drop-sub-item">🦁 動物系列</RouterLink>
                <RouterLink :to="{ path: '/store/catalog', query: { brand: 'jellycat', group: 'baby'       } }" class="drop-sub-item">🍼 寶寶專區</RouterLink>
                <RouterLink :to="{ path: '/store/catalog', query: { brand: 'jellycat', group: 'charms'     } }" class="drop-sub-item">🎒 背包吊飾專區</RouterLink>
                <RouterLink :to="{ path: '/store/catalog', query: { brand: 'jellycat', group: 'limited'    } }" class="drop-sub-item">✨ 限定專區</RouterLink>
              </div>
            </div>

            <!-- ── Trader Joe's ── -->
            <div class="drop-row drop-has-sub">
              <RouterLink :to="{ path: '/store/catalog', query: { brand: 'traderjoes' } }" class="drop-row-link">
                <span>🛍️ Trader Joe's</span>
                <span class="drop-chevron">›</span>
              </RouterLink>
              <div class="drop-sub">
                <RouterLink :to="{ path: '/store/catalog', query: { brand: 'traderjoes', cat: '零食'  } }" class="drop-sub-item">🍪 零食</RouterLink>
                <RouterLink :to="{ path: '/store/catalog', query: { brand: 'traderjoes', cat: '保養品' } }" class="drop-sub-item">🧴 保養品</RouterLink>
              </div>
            </div>

          </div>
        </div>

        <RouterLink
          :to="{ path: '/store/catalog', query: { sort: 'new' } }"
          class="cat-link"
          active-class=""
          exact-active-class=""
          :class="{ 'cat-active': route.path === '/store/catalog' && route.query.sort === 'new' }"
        >新品推薦</RouterLink>

        <RouterLink
          :to="{ path: '/store/catalog', query: { stock: 'in_stock' } }"
          class="cat-link"
          active-class=""
          exact-active-class=""
          :class="{ 'cat-active': route.path === '/store/catalog' && route.query.stock === 'in_stock' }"
        >現貨專區</RouterLink>

        <RouterLink
          to="/store/journal"
          class="cat-link"
          active-class=""
          exact-active-class=""
          :class="{ 'cat-active': route.path.startsWith('/store/journal') }"
        >JelloJam日記</RouterLink>

        <RouterLink
          to="/store/membership"
          class="cat-link"
          active-class=""
          exact-active-class=""
          :class="{ 'cat-active': route.path === '/store/membership' }"
        >會員制度</RouterLink>

        <RouterLink
          to="/store/news"
          class="cat-link"
          active-class=""
          exact-active-class=""
          :class="{ 'cat-active': route.path === '/store/news' }"
        >最新消息</RouterLink>

        <RouterLink
          to="/store/order-tracking"
          class="cat-link tracking-link"
          active-class=""
          exact-active-class=""
          :class="{ 'cat-active': route.path === '/store/order-tracking' }"
        >📦 訂單查詢</RouterLink>

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
          <div class="footer-logo">
            <img src="/logo.svg" alt="JelloJam" class="footer-logo-img" />
          </div>
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
          <RouterLink :to="member.isLoggedIn ? `/store/member/${member.customer?.id}` : '/store/auth'" class="footer-link">{{ t('footer.account') }}</RouterLink>
          <RouterLink :to="member.isLoggedIn ? `/store/member/${member.customer?.id}` : '/store/auth'" class="footer-link">{{ t('footer.points') }}</RouterLink>
          <RouterLink to="/store/cart"           class="footer-link">{{ t('footer.cart') }}</RouterLink>
          <RouterLink to="/store/order-tracking" class="footer-link">📦 {{ t('footer.tracking') }}</RouterLink>
          <a href="#" class="footer-link">{{ t('footer.contact') }}</a>
        </div>
      </div>

      <div class="footer-bottom">
        <p>{{ t('footer.copyright') }}</p>
      </div>
    </footer>

  </div>

  <!-- Toast notifications -->
  <ToastContainer />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCartStore }        from '@/stores/cart'
import { useStoreAuthStore } from '@/stores/storeAuth'
import { useAppDataStore }     from '@/stores/appData'
import ToastContainer          from '@/components/store/ToastContainer.vue'

const { t, locale } = useI18n()
const cart   = useCartStore()
const member = useStoreAuthStore()
const store  = useAppDataStore()
const router = useRouter()
const route  = useRoute()

// Force Chinese on every store entry — clears any stale English state
locale.value = 'zh'
localStorage.removeItem('jj_lang')

// ── Language toggle ──────────────────────────────────────────────────────
function toggleLang() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

// ── Scroll shadow ────────────────────────────────────────────────────────
const isScrolled = ref(false)
const mounted    = ref(false)   // prevents enter animation on first load
function onScroll() { isScrolled.value = window.scrollY > 4 }
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  // 前台商店只需要商品目錄（走安全的 public_catalog RPC），不需要整個
  // ERP 資料集 —— 訪客/顧客沒有權限讀 orders/customers 等表（RLS 已鎖）。
  store.fetchPublicCatalog()
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

// ── Cart bounce animation ────────────────────────────────────────────────
const cartBounce = ref(false)
let bounceTimer = null
watch(() => cart.totalQty, (newVal, oldVal) => {
  if (newVal > oldVal) {
    clearTimeout(bounceTimer)
    cartBounce.value = true
    bounceTimer = setTimeout(() => { cartBounce.value = false }, 600)
  }
})
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
  text-decoration: none;
  flex-shrink: 0;
}
.logo-img {
  height: 40px;
  width: auto;
  display: block;
  transition: opacity 0.15s, transform 0.15s;
}
.logo-link:hover .logo-img {
  opacity: 0.85;
  transform: scale(1.03);
}
.footer-logo-img {
  height: 48px;
  width: auto;
  display: block;
}

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

.member-avatar-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.member-avatar-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--jj-rose-light);
}
.member-online-dot {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  border: 1.5px solid var(--jj-white);
}

.cart-wrap { position: relative; display: flex; }
.cart-bounce { animation: cart-wiggle 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
@keyframes cart-wiggle {
  0%, 100% { transform: rotate(0deg) scale(1); }
  15%       { transform: rotate(-18deg) scale(1.2); }
  30%       { transform: rotate(14deg) scale(1.15); }
  45%       { transform: rotate(-10deg) scale(1.1); }
  60%       { transform: rotate(7deg) scale(1.05); }
  75%       { transform: rotate(-4deg) scale(1.02); }
  90%       { transform: rotate(2deg) scale(1); }
}
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
  /* overflow-x: auto を外す — dropdownが clip される */
}

.cat-nav-inner {
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 2px;
}

.cat-item {
  position: relative;
  display: flex;
  align-items: center;
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
  cursor: pointer;
}
.cat-link:hover { color: var(--jj-rose-dark); }
/* Tracking link — subtle visual distinction */
.tracking-link { opacity: .85; }
.tracking-link:hover { opacity: 1; }
.cat-active {
  color: var(--jj-rose-dark);
  border-bottom-color: var(--jj-rose-dark);
  font-weight: 700;
}

.cat-arrow {
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.6;
  transition: transform 0.15s;
}
.cat-has-dropdown:hover .cat-arrow {
  transform: rotate(180deg);
}

/* Dropdown panel */
.cat-dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 1px);
  left: 0;
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 14px;
  padding: 8px;
  min-width: 200px;
  box-shadow: var(--jj-shadow-lg);
  z-index: 300;
  flex-direction: column;
  gap: 2px;
}
.cat-has-dropdown:hover .cat-dropdown {
  display: flex;
}

/* First-level dropdown rows */
.drop-row {
  position: relative;
}
.drop-row-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 9px 12px;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  color: var(--jj-text);
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.drop-row:hover > .drop-row-link {
  background: var(--jj-rose-pale);
  color: var(--jj-rose-dark);
}
.drop-chevron {
  font-size: 14px;
  opacity: 0.5;
  transition: opacity 0.12s;
}
.drop-row:hover .drop-chevron { opacity: 1; }

/* Sub-menu flyout */
.drop-sub {
  display: none;
  position: absolute;
  left: calc(100% + 6px);
  top: 0;
  min-width: 160px;
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 12px;
  padding: 8px;
  box-shadow: var(--jj-shadow-lg);
  z-index: 400;
  flex-direction: column;
  gap: 2px;
}
.drop-has-sub:hover .drop-sub {
  display: flex;
}
/* Bridge gap between row and sub (prevents hover loss when crossing gap) */
.drop-has-sub::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 0;
  width: 6px;
  height: 100%;
}
.drop-sub-item {
  display: block;
  padding: 7px 12px;
  font-size: 13px;
  color: var(--jj-text);
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.drop-sub-item:hover {
  background: var(--jj-rose-pale);
  color: var(--jj-rose-dark);
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
  margin-bottom: 10px;
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
  .logo-img     { height: 34px; }
  .footer-inner { grid-template-columns: 1fr 1fr; gap: 28px; }
}

@media (max-width: 600px) {
  .header-inner { gap: 6px; padding: 0 10px; }
  .logo-img     { height: 30px; }
  .search-wrap  { max-width: none; }
  .icon-label   { display: none; }
  .lang-toggle  { padding: 4px 8px; font-size: 11px; }
  .cat-nav-inner{ padding: 0 10px; }
  .footer-inner { grid-template-columns: 1fr; gap: 24px; }
  .store-footer { padding: 36px 14px 0; }
}
</style>

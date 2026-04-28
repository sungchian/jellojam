<template>
  <div class="store-app">
    <!-- ───────────────── Sticky Header ───────────────── -->
    <header class="store-header" :class="{ scrolled: isScrolled }">
      <div class="header-inner">
        <!-- Logo -->
        <RouterLink to="/store" class="logo-link">🍮 JelloJam</RouterLink>

        <!-- Search -->
        <div class="search-wrap">
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="搜尋娃娃、品類…"
            @keydown.enter="doSearch"
          />
          <button class="search-btn" @click="doSearch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>

        <!-- Header Icons -->
        <div class="header-icons">
          <!-- Member -->
          <RouterLink to="/store/member" class="icon-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>{{ member.isLoggedIn ? member.displayName.slice(0, 4) : '會員' }}</span>
          </RouterLink>

          <!-- Cart -->
          <RouterLink to="/store/cart" class="icon-btn cart-btn">
            <span class="cart-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span v-if="cart.totalQty > 0" class="cart-badge">{{ cart.totalQty > 99 ? '99+' : cart.totalQty }}</span>
            </span>
            <span>購物車</span>
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- ───────────────── Category Nav ───────────────── -->
    <nav class="cat-nav">
      <div class="cat-nav-inner">
        <RouterLink to="/store/catalog" class="cat-link">全部商品</RouterLink>
        <RouterLink
          v-for="cat in displayCategories"
          :key="cat"
          :to="`/store/catalog?cat=${cat}`"
          class="cat-link"
        >
          {{ CATEGORY_ZH_MAP[cat] || cat }}
        </RouterLink>
      </div>
    </nav>

    <!-- ───────────────── Page Content ───────────────── -->
    <main class="store-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- ───────────────── Footer ───────────────── -->
    <footer class="store-footer">
      <div class="footer-inner">
        <div class="footer-col brand-col">
          <div class="footer-logo">🍮 JelloJam</div>
          <p class="footer-tagline">每一只，都值得被愛 🧸</p>
          <a href="#" class="footer-line-btn">
            <span>LINE 官方帳號</span>
          </a>
        </div>

        <div class="footer-col">
          <div class="footer-col-title">商品</div>
          <RouterLink to="/store/catalog" class="footer-link">所有商品</RouterLink>
          <RouterLink to="/store/catalog?cat=Bunnies" class="footer-link">兔子系列</RouterLink>
          <RouterLink to="/store/catalog?cat=Bears" class="footer-link">熊熊系列</RouterLink>
          <RouterLink to="/store/catalog?cat=Dogs" class="footer-link">狗狗系列</RouterLink>
        </div>

        <div class="footer-col">
          <div class="footer-col-title">會員服務</div>
          <RouterLink to="/store/member" class="footer-link">我的帳號</RouterLink>
          <RouterLink to="/store/member" class="footer-link">集點說明</RouterLink>
          <RouterLink to="/store/cart" class="footer-link">購物車</RouterLink>
          <a href="#" class="footer-link">聯絡我們</a>
        </div>
      </div>

      <div class="footer-copyright">
        © 2025 JelloJam · 全台正版 Jellycat 專賣
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useStoreMemberStore } from '@/stores/storeMember'
import { useAppDataStore } from '@/stores/appData'

// ── Stores ───────────────────────────────────────────────────────────────────
const cart   = useCartStore()
const member = useStoreMemberStore()
const store  = useAppDataStore()
const router = useRouter()

// ── Category map (12 Jellycat categories → Chinese) ──────────────────────────
const CATEGORY_ZH_MAP = {
  Bunnies:    '兔子',
  Bears:      '熊熊',
  Dogs:       '狗狗',
  Cats:       '貓咪',
  Elephants:  '大象',
  Foxes:      '狐狸',
  Dinosaurs:  '恐龍',
  Penguins:   '企鵝',
  Monkeys:    '猴子',
  Horses:     '馬馬',
  Jellyfish:  '水母',
  Other:      '其他',
}

// ── Scroll detection ─────────────────────────────────────────────────────────
const isScrolled = ref(false)

function onScroll() {
  isScrolled.value = window.scrollY > 8
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  store.fetchAll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

// ── Search ───────────────────────────────────────────────────────────────────
const searchQuery = ref('')

function doSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  router.push(`/store/catalog?q=${encodeURIComponent(q)}`)
}

// ── Categories: top 8 from appData jellycatCategories ────────────────────────
const displayCategories = computed(() =>
  store.jellycatCategories.slice(0, 8)
)
</script>

<style scoped>
/* ── Brand Variables ─────────────────────────────────────────────────────── */
.store-app {
  --jj-pink:        #f472b6;
  --jj-pink-dark:   #db2777;
  --jj-pink-light:  #fce7f3;
  --jj-pink-pale:   #fff0f7;
  --jj-purple:      #a78bfa;
  --jj-purple-dark: #7c3aed;
  --jj-accent:      #fb923c;
  --jj-bg:          #fff5f9;
  --jj-white:       #ffffff;
  --jj-text:        #1e0a14;
  --jj-text-sub:    #6b7280;
  --jj-border:      #fde8f3;
  --jj-radius:      12px;
  --jj-radius-sm:   8px;
  --jj-radius-lg:   20px;
  --jj-shadow:      0 2px 16px rgba(244, 114, 182, 0.10);
  --jj-shadow-lg:   0 8px 40px rgba(244, 114, 182, 0.18);

  min-height: 100vh;
  background: var(--jj-bg);
  color: var(--jj-text);
  font-family: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
}

/* ── Header ─────────────────────────────────────────────────────────────── */
.store-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  background: var(--jj-white);
  border-bottom: 1px solid var(--jj-border);
  transition: box-shadow 0.2s ease;
}

.store-header.scrolled {
  box-shadow: var(--jj-shadow);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
}

/* Logo */
.logo-link {
  font-size: 22px;
  font-weight: 800;
  color: var(--jj-pink-dark);
  text-decoration: none;
  white-space: nowrap;
  letter-spacing: -0.5px;
  flex-shrink: 0;
}

.logo-link:hover {
  color: var(--jj-pink);
}

/* Search */
.search-wrap {
  flex: 1;
  max-width: 480px;
  display: flex;
  align-items: center;
  border: 2px solid var(--jj-border);
  border-radius: 999px;
  overflow: hidden;
  background: var(--jj-white);
  transition: border-color 0.15s;
}

.search-wrap:focus-within {
  border-color: var(--jj-pink);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px 16px;
  font-size: 14px;
  background: transparent;
  color: var(--jj-text);
}

.search-input::placeholder {
  color: var(--jj-text-sub);
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--jj-pink);
  border: none;
  cursor: pointer;
  color: white;
  flex-shrink: 0;
  transition: background 0.15s;
}

.search-btn:hover {
  background: var(--jj-pink-dark);
}

/* Header Icons */
.header-icons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  text-decoration: none;
  color: var(--jj-text-sub);
  border-radius: var(--jj-radius-sm);
  font-size: 11px;
  transition: color 0.15s, background 0.15s;
  cursor: pointer;
}

.icon-btn:hover {
  color: var(--jj-pink);
  background: var(--jj-pink-pale);
}

.cart-btn {
  position: relative;
}

.cart-icon-wrap {
  position: relative;
  display: flex;
}

.cart-badge {
  position: absolute;
  top: -8px;
  right: -10px;
  background: var(--jj-pink);
  color: white;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* ── Category Nav ────────────────────────────────────────────────────────── */
.cat-nav {
  background: var(--jj-white);
  border-bottom: 1px solid var(--jj-border);
  overflow-x: auto;
  /* hide scrollbar */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.cat-nav::-webkit-scrollbar {
  display: none;
}

.cat-nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.cat-link {
  white-space: nowrap;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--jj-text-sub);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.cat-link:hover {
  color: var(--jj-pink);
}

.cat-link.router-link-active,
.cat-link.router-link-exact-active {
  color: var(--jj-pink-dark);
  border-bottom-color: var(--jj-pink-dark);
  font-weight: 700;
}

/* ── Main Content ────────────────────────────────────────────────────────── */
.store-main {
  min-height: calc(100vh - 64px - 44px - 280px);
}

/* ── Page Transition ─────────────────────────────────────────────────────── */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.store-footer {
  background: #1e0a14;
  color: rgba(255, 255, 255, 0.7);
  padding: 48px 16px 0;
  margin-top: 64px;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 40px;
  padding-bottom: 40px;
}

.footer-logo {
  font-size: 20px;
  font-weight: 800;
  color: var(--jj-pink);
  margin-bottom: 8px;
}

.footer-tagline {
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.55);
}

.footer-line-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #06c755;
  color: white;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s;
}

.footer-line-btn:hover {
  opacity: 0.85;
}

.footer-col-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 14px;
}

.footer-link {
  display: block;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  margin-bottom: 10px;
  transition: color 0.15s;
}

.footer-link:hover {
  color: var(--jj-pink);
}

.footer-copyright {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .header-inner {
    gap: 10px;
    padding: 0 12px;
  }

  .logo-link {
    font-size: 18px;
  }

  .footer-inner {
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .brand-col {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .search-wrap {
    max-width: none;
  }

  .footer-inner {
    grid-template-columns: 1fr;
  }
}
</style>

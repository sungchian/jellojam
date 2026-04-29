<template>
  <div class="catalog-page">
    <!-- Page Header Bar -->
    <div class="page-header-bar">
      <div class="breadcrumb">
        <router-link to="/store">{{ t('catalog.title') }}</router-link>
        <span class="sep">/</span>
        <span>{{ t('catalog.all') }}</span>
      </div>
      <div class="header-right">
        <span class="result-count">{{ t('catalog.filter_title') }} {{ filtered.length }}</span>
        <select class="sort-select" v-model="sortKey">
          <option value="hot">{{ t('catalog.sort_hot') }}</option>
          <option value="new">{{ t('catalog.sort_new') }}</option>
          <option value="price_asc">{{ t('catalog.sort_low') }}</option>
          <option value="price_desc">{{ t('catalog.sort_high') }}</option>
        </select>
      </div>
    </div>

    <!-- Mobile Filter Bar -->
    <div class="mobile-filter-bar">
      <button class="mobile-filter-btn" @click="mobileSheetOpen = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="8" y1="12" x2="20" y2="12"/>
          <line x1="12" y1="18" x2="20" y2="18"/>
        </svg>
        {{ t('catalog.filter') }}
        <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
      </button>
      <span class="result-count-mobile">{{ filtered.length }}</span>
    </div>

    <!-- Main Layout -->
    <div class="catalog-layout">
      <!-- Sidebar -->
      <aside class="catalog-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-title">{{ t('catalog.category') }}</div>
          <button
            class="cat-btn"
            :class="{ active: filterCat === '' }"
            @click="filterCat = ''; page = 1"
          >{{ t('catalog.all') }}</button>
          <button
            v-for="cat in allCategories"
            :key="cat"
            class="cat-btn"
            :class="{ active: filterCat === cat }"
            @click="filterCat = cat; page = 1"
          >
            {{ EMOJI_MAP[cat] || EMOJI_MAP.default }} {{ t('categories.' + cat, cat) }}
          </button>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-title">{{ t('catalog.stock') }}</div>
          <label class="radio-label">
            <input type="radio" v-model="filterStock" value="all" @change="page = 1" /> {{ t('catalog.all_stock') }}
          </label>
          <label class="radio-label">
            <input type="radio" v-model="filterStock" value="in_stock" @change="page = 1" /> {{ t('catalog.in_stock') }}
          </label>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-title">{{ t('catalog.price_range') }}</div>
          <div class="price-inputs">
            <input
              type="number"
              class="price-input"
              v-model.number="priceMinDraft"
              :placeholder="t('catalog.price_min')"
              min="0"
            />
            <span class="price-dash">—</span>
            <input
              type="number"
              class="price-input"
              v-model.number="priceMaxDraft"
              :placeholder="t('catalog.price_max')"
              min="0"
            />
          </div>
          <button class="apply-price-btn" @click="applyPrice">{{ t('catalog.apply') }}</button>
        </div>

        <button class="clear-all-btn" @click="clearFilters">{{ t('catalog.clear') }}</button>
      </aside>

      <!-- Product Grid -->
      <main class="catalog-main">
        <!-- Search bar (if searchQ active) -->
        <div v-if="searchQ" class="search-info">
          {{ t('catalog.price_query') }}「<strong>{{ searchQ }}</strong>」
          <button class="clear-search-btn" @click="searchQ = ''; page = 1">✕</button>
        </div>

        <!-- Empty State -->
        <div v-if="paginated.length === 0" class="empty-state">
          <div class="empty-illustration">🔍</div>
          <p class="empty-title">{{ t('catalog.no_result') }}</p>
          <p class="empty-sub">{{ t('catalog.no_result_sub') }}</p>
          <button class="clear-all-btn" @click="clearFilters">{{ t('catalog.clear') }}</button>
        </div>

        <div v-else>
          <div class="product-grid">
            <div
              v-for="product in paginated"
              :key="product.id"
              class="product-card"
              @click="$router.push(`/store/product/${product.id}`)"
            >
              <!-- Card Image -->
              <div
                class="card-img"
                :style="{ background: getGradient(product.jellycat_category) }"
              >
                <span class="card-emoji">{{ getEmoji(product.jellycat_category) }}</span>
                <!-- Low stock chip -->
                <span
                  v-if="product.current_stock > 0 && product.current_stock <= 2"
                  class="low-stock-chip"
                >{{ t('catalog.almost_gone') }}</span>
                <!-- Sold out overlay -->
                <div v-if="product.current_stock <= 0" class="sold-out-overlay">
                  <span class="sold-out-text">{{ t('catalog.sold_out') }}</span>
                </div>
              </div>

              <!-- Card Body -->
              <div class="card-body">
                <p class="card-name">{{ product.product_name }}</p>
                <span class="cat-tag">
                  {{ t('categories.' + product.jellycat_category, product.jellycat_category_zh || product.jellycat_category) }}
                </span>
                <div class="price-row">
                  <span class="card-price">
                    NT$ {{ formatPrice(product.store_price) }}
                  </span>
                  <span class="sold-count">{{ t('catalog.sold_count', { n: product.sold_qty ?? 0 }) }}</span>
                </div>
              </div>

              <!-- Card Footer -->
              <div class="card-footer">
                <button
                  class="add-cart-btn"
                  :disabled="product.current_stock <= 0"
                  @click.stop="addToCart(product)"
                >
                  {{ product.current_stock <= 0 ? t('catalog.sold_out') : t('catalog.add_cart') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="pagination">
            <button
              class="page-btn"
              :disabled="page === 1"
              @click="page--"
            >‹ {{ t('catalog.prev') }}</button>
            <button
              v-for="p in pageNumbers"
              :key="p"
              class="page-btn page-num"
              :class="{ active: p === page, ellipsis: p === '...' }"
              :disabled="p === '...'"
              @click="p !== '...' && (page = p)"
            >{{ p }}</button>
            <button
              class="page-btn"
              :disabled="page === totalPages"
              @click="page++"
            >{{ t('catalog.next') }} ›</button>
          </div>
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Sheet -->
    <transition name="sheet">
      <div v-if="mobileSheetOpen" class="sheet-backdrop" @click.self="mobileSheetOpen = false">
        <div class="mobile-sheet">
          <div class="sheet-header">
            <span class="sheet-title">{{ t('catalog.filter_title') }}</span>
            <button class="sheet-close" @click="mobileSheetOpen = false">✕</button>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-title">{{ t('catalog.category') }}</div>
            <div class="cat-grid">
              <button
                class="cat-btn"
                :class="{ active: filterCat === '' }"
                @click="filterCat = ''; page = 1"
              >{{ t('catalog.all') }}</button>
              <button
                v-for="cat in allCategories"
                :key="cat"
                class="cat-btn"
                :class="{ active: filterCat === cat }"
                @click="filterCat = cat; page = 1"
              >
                {{ EMOJI_MAP[cat] || EMOJI_MAP.default }} {{ t('categories.' + cat, cat) }}
              </button>
            </div>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-title">{{ t('catalog.stock') }}</div>
            <label class="radio-label">
              <input type="radio" v-model="filterStock" value="all" @change="page = 1" /> {{ t('catalog.all_stock') }}
            </label>
            <label class="radio-label">
              <input type="radio" v-model="filterStock" value="in_stock" @change="page = 1" /> {{ t('catalog.in_stock') }}
            </label>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-title">{{ t('catalog.price_range') }}</div>
            <div class="price-inputs">
              <input type="number" class="price-input" v-model.number="priceMinDraft" :placeholder="t('catalog.price_min')" min="0" />
              <span class="price-dash">—</span>
              <input type="number" class="price-input" v-model.number="priceMaxDraft" :placeholder="t('catalog.price_max')" min="0" />
            </div>
            <button class="apply-price-btn" @click="applyPrice">{{ t('catalog.apply') }}</button>
          </div>

          <div class="sheet-footer">
            <button class="clear-all-btn" @click="clearFilters; mobileSheetOpen = false">{{ t('catalog.clear') }}</button>
            <button class="confirm-btn" @click="mobileSheetOpen = false">{{ t('catalog.apply') }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppDataStore } from '@/stores/appData'
import { useCartStore } from '@/stores/cart'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const appData = useAppDataStore()
const cart = useCartStore()

// ── Constants ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 12

const GRAD_MAP = {
  Bunnies: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
  Bears:   'linear-gradient(135deg,#fef3c7,#fde68a)',
  Dogs:    'linear-gradient(135deg,#dbeafe,#bfdbfe)',
  Cats:    'linear-gradient(135deg,#ede9fe,#ddd6fe)',
  default: 'linear-gradient(135deg,#f3f4f6,#e5e7eb)',
}

const EMOJI_MAP = {
  Bunnies:   '🐰',
  Bears:     '🐻',
  Dogs:      '🐶',
  Cats:      '🐱',
  Birds:     '🐦',
  Dinosaurs: '🦕',
  Horses:    '🐴',
  Fish:      '🐟',
  default:   '🧸',
}

// ── Reactive State ─────────────────────────────────────────────────────────
const filterCat   = ref(route.query.cat || '')
const filterStock = ref('all')
const filterPriceMin = ref(null)
const filterPriceMax = ref(null)
const priceMinDraft  = ref(null)
const priceMaxDraft  = ref(null)
const sortKey        = ref('hot')
const page           = ref(1)
const searchQ        = ref(route.query.q || '')
const mobileSheetOpen = ref(false)

// ── Store data ─────────────────────────────────────────────────────────────
const storeProducts = computed(() => appData.storeProducts || [])

// ── Derived ────────────────────────────────────────────────────────────────
const allCategories = computed(() => {
  const cats = storeProducts.value.map(p => p.jellycat_category).filter(Boolean)
  return [...new Set(cats)].sort()
})

const getGradient = (cat) => GRAD_MAP[cat] || GRAD_MAP.default
const getEmoji    = (cat) => EMOJI_MAP[cat] || EMOJI_MAP.default

const formatPrice = (price) => {
  if (price == null) return t('catalog.price_query')
  return Number(price).toLocaleString('zh-TW')
}

// ── Filters ────────────────────────────────────────────────────────────────
const filtered = computed(() => {
  let list = [...storeProducts.value]

  if (filterCat.value) {
    list = list.filter(p => p.jellycat_category === filterCat.value)
  }
  if (filterStock.value === 'in_stock') {
    list = list.filter(p => p.current_stock > 0)
  }
  if (filterPriceMin.value != null) {
    list = list.filter(p => p.store_price >= filterPriceMin.value)
  }
  if (filterPriceMax.value != null) {
    list = list.filter(p => p.store_price <= filterPriceMax.value)
  }
  if (searchQ.value.trim()) {
    const q = searchQ.value.trim().toLowerCase()
    list = list.filter(p =>
      (p.product_name || '').toLowerCase().includes(q) ||
      (p.jellycat_category || '').toLowerCase().includes(q)
    )
  }

  return list
})

const sorted = computed(() => {
  const list = [...filtered.value]
  switch (sortKey.value) {
    case 'hot':        return list.sort((a, b) => (b.sold_qty ?? 0) - (a.sold_qty ?? 0))
    case 'new':        return list.sort((a, b) => b.id - a.id)
    case 'price_asc':  return list.sort((a, b) => (a.store_price ?? 0) - (b.store_price ?? 0))
    case 'price_desc': return list.sort((a, b) => (b.store_price ?? 0) - (a.store_price ?? 0))
    default:           return list
  }
})

const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)))

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return sorted.value.slice(start, start + PAGE_SIZE)
})

const pageNumbers = computed(() => {
  const total = totalPages.value
  const cur   = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, cur, cur - 1, cur + 1].filter(p => p >= 1 && p <= total))
  const arr = [...pages].sort((a, b) => a - b)
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i] - arr[i - 1] > 1) result.push('...')
    result.push(arr[i])
  }
  return result
})

const activeFilterCount = computed(() => {
  let count = 0
  if (filterCat.value)            count++
  if (filterStock.value !== 'all') count++
  if (filterPriceMin.value != null || filterPriceMax.value != null) count++
  return count
})

// ── Actions ────────────────────────────────────────────────────────────────
const applyPrice = () => {
  filterPriceMin.value = priceMinDraft.value || null
  filterPriceMax.value = priceMaxDraft.value || null
  page.value = 1
}

const clearFilters = () => {
  filterCat.value      = ''
  filterStock.value    = 'all'
  filterPriceMin.value = null
  filterPriceMax.value = null
  priceMinDraft.value  = null
  priceMaxDraft.value  = null
  searchQ.value        = ''
  page.value           = 1
}

const addToCart = (product) => {
  cart.addItem(product, 1)
}

// ── Watchers ───────────────────────────────────────────────────────────────
watch(
  () => route.query,
  (q) => {
    if (q.cat !== undefined) filterCat.value = q.cat || ''
    if (q.q   !== undefined) searchQ.value   = q.q   || ''
    page.value = 1
  }
)

watch([filterCat, filterStock, filterPriceMin, filterPriceMax, searchQ, sortKey], () => {
  page.value = 1
})
</script>

<style scoped>
/* ── Page Layout ──────────────────────────────────────────────────────────── */
.catalog-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--jj-text-sub);
}
.breadcrumb a {
  color: var(--jj-rose-dark);
  text-decoration: none;
}
.breadcrumb a:hover { text-decoration: underline; }
.sep { color: var(--jj-border); }

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.result-count {
  font-size: 13px;
  color: var(--jj-text-sub);
}

.sort-select {
  border: 1px solid var(--jj-border);
  border-radius: var(--jj-radius);
  padding: 6px 10px;
  font-size: 13px;
  background: var(--jj-white);
  color: var(--jj-text);
  cursor: pointer;
  outline: none;
}
.sort-select:focus {
  border-color: var(--jj-rose);
}

/* ── Catalog Layout ─────────────────────────────────────────────────────── */
.catalog-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.catalog-main {
  flex: 1;
  min-width: 0;
}

/* ── Sidebar ────────────────────────────────────────────────────────────── */
.catalog-sidebar {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 84px;
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 16px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--jj-text-sub);
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}

.cat-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--jj-text);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.cat-btn:hover {
  background: var(--jj-rose-pale);
  color: var(--jj-rose-dark);
}
.cat-btn.active {
  background: var(--jj-rose-light);
  color: var(--jj-rose-dark);
  font-weight: 600;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--jj-text);
  cursor: pointer;
  padding: 4px 0;
}
.radio-label input[type="radio"] {
  accent-color: var(--jj-rose-dark);
}

.price-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.price-input {
  flex: 1;
  border: 1px solid var(--jj-border);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  width: 0;
  outline: none;
  color: var(--jj-text);
}
.price-input:focus { border-color: var(--jj-rose); }
.price-dash { font-size: 13px; color: var(--jj-text-sub); }

.apply-price-btn {
  width: 100%;
  background: var(--jj-rose-light);
  color: var(--jj-rose-dark);
  border: none;
  border-radius: 8px;
  padding: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.apply-price-btn:hover { background: var(--jj-rose); color: var(--jj-white); }

.clear-all-btn {
  background: none;
  border: 1px solid var(--jj-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--jj-text-sub);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  width: 100%;
}
.clear-all-btn:hover { border-color: var(--jj-rose); color: var(--jj-rose-dark); }

/* ── Mobile Filter Bar ──────────────────────────────────────────────────── */
.mobile-filter-bar {
  display: none;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 12px;
}
.mobile-filter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  font-size: 14px;
  color: var(--jj-text);
  cursor: pointer;
  font-weight: 500;
}
.filter-badge {
  background: var(--jj-rose-dark);
  color: white;
  border-radius: 999px;
  font-size: 11px;
  padding: 1px 6px;
  font-weight: 700;
}
.result-count-mobile {
  font-size: 13px;
  color: var(--jj-text-sub);
}

/* ── Search Info Bar ────────────────────────────────────────────────────── */
.search-info {
  font-size: 14px;
  color: var(--jj-text-sub);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.clear-search-btn {
  background: var(--jj-rose-pale);
  border: none;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--jj-rose-dark);
  cursor: pointer;
}

/* ── Product Grid ───────────────────────────────────────────────────────── */
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.product-card {
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
}
.product-card:hover {
  box-shadow: var(--jj-shadow-lg);
  transform: translateY(-3px);
}

/* Card Image */
.card-img {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.card-emoji {
  font-size: 80px;
  line-height: 1;
  user-select: none;
}
.low-stock-chip {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #f97316;
  color: white;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  z-index: 1;
}
.sold-out-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.sold-out-text {
  font-size: 18px;
  font-weight: 800;
  color: #9ca3af;
  letter-spacing: 0.05em;
}

/* Card Body */
.card-body {
  padding: 12px 14px 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--jj-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  margin: 0;
}
.cat-tag {
  display: inline-block;
  background: var(--jj-rose-light);
  color: var(--jj-rose-dark);
  border-radius: 999px;
  font-size: 11px;
  padding: 2px 8px;
  font-weight: 500;
  align-self: flex-start;
}
.price-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.card-price {
  font-weight: 700;
  font-size: 15px;
  color: var(--jj-rose-dark);
}
.sold-count {
  font-size: 11px;
  color: var(--jj-text-sub);
  white-space: nowrap;
}

/* Card Footer */
.card-footer {
  padding: 0 14px 14px;
}
.add-cart-btn {
  width: 100%;
  background: var(--jj-rose-dark);
  color: white;
  border: none;
  border-radius: 999px;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.add-cart-btn:hover:not(:disabled) { background: var(--jj-rose); }
.add-cart-btn:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* ── Empty State ────────────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  gap: 12px;
}
.empty-illustration { font-size: 64px; }
.empty-title { font-size: 18px; font-weight: 700; color: var(--jj-text); margin: 0; }
.empty-sub   { font-size: 14px; color: var(--jj-text-sub); margin: 0; }
.empty-state .clear-all-btn { width: auto; padding: 10px 24px; }

/* ── Pagination ─────────────────────────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
  flex-wrap: wrap;
}
.page-btn {
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--jj-text);
  transition: background 0.15s, border-color 0.15s;
}
.page-btn:hover:not(:disabled):not(.ellipsis) {
  background: var(--jj-rose-pale);
  border-color: var(--jj-rose);
}
.page-btn.active {
  background: var(--jj-rose-dark);
  border-color: var(--jj-rose-dark);
  color: white;
  font-weight: 700;
}
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-btn.ellipsis { border: none; background: none; cursor: default; }

/* ── Mobile Bottom Sheet ────────────────────────────────────────────────── */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}
.mobile-sheet {
  background: var(--jj-white);
  border-radius: 20px 20px 0 0;
  padding: 24px 20px 32px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.sheet-title { font-size: 16px; font-weight: 700; color: var(--jj-text); }
.sheet-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--jj-text-sub);
  line-height: 1;
}
.cat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cat-grid .cat-btn {
  width: auto;
  flex: 0 0 auto;
}
.sheet-footer {
  display: flex;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--jj-border);
}
.sheet-footer .clear-all-btn { flex: 1; }
.confirm-btn {
  flex: 2;
  background: var(--jj-rose-dark);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.confirm-btn:hover { background: var(--jj-rose); }

/* Sheet transitions */
.sheet-enter-active, .sheet-leave-active {
  transition: opacity 0.25s;
}
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-active .mobile-sheet,
.sheet-leave-active .mobile-sheet {
  transition: transform 0.25s ease;
}
.sheet-enter-from .mobile-sheet,
.sheet-leave-to .mobile-sheet {
  transform: translateY(100%);
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .catalog-sidebar   { display: none; }
  .mobile-filter-bar { display: flex; }
  .product-grid      { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .page-header-bar   { display: none; }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .product-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>

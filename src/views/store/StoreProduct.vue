<template>
  <div class="product-page">

    <!-- Product Not Found -->
    <div v-if="!product" class="not-found">
      <div class="not-found-icon">😢</div>
      <h2 class="not-found-title">商品不存在</h2>
      <p class="not-found-sub">找不到這件商品，可能已下架或連結有誤。</p>
      <button class="back-btn" @click="$router.push('/store')">← 回到商城</button>
    </div>

    <template v-else>
      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <router-link to="/store">首頁</router-link>
        <span class="sep">/</span>
        <router-link to="/store">商品</router-link>
        <span class="sep">/</span>
        <span class="current">{{ product.product_name }}</span>
      </div>

      <!-- Product Layout -->
      <div class="product-layout">

        <!-- Left: Image Area -->
        <div class="product-img-area">
          <div
            class="main-img-card"
            :style="{ background: getGradient(product.jellycat_category) }"
          >
            <span class="main-emoji">{{ getEmoji(product.jellycat_category) }}</span>
            <!-- Sold out overlay -->
            <div v-if="product.current_stock <= 0" class="sold-out-overlay">
              <span class="sold-out-text">已售完</span>
            </div>
          </div>

          <!-- Thumbnails -->
          <div class="thumbnails">
            <div
              v-for="n in 3"
              :key="n"
              class="thumb"
              :class="{ 'thumb-active': activeThumbnail === n }"
              :style="{ background: getGradient(product.jellycat_category) }"
              @click="activeThumbnail = n"
            >
              <span class="thumb-emoji">{{ getEmoji(product.jellycat_category) }}</span>
            </div>
          </div>
        </div>

        <!-- Right: Product Info -->
        <div class="product-info">
          <!-- Category Tag -->
          <span class="cat-tag">
            {{ CATEGORY_ZH_MAP[product.jellycat_category] || product.jellycat_category_zh || product.jellycat_category }}
          </span>

          <!-- Product Name -->
          <h1 class="product-name">{{ product.product_name }}</h1>

          <!-- Sold Count -->
          <p class="sold-sub">已售出 {{ product.sold_qty ?? 0 }} 件</p>

          <div class="divider"></div>

          <!-- Price -->
          <div class="price-row">
            <span class="price" v-if="product.store_price != null">
              NT$ {{ formatPrice(product.store_price) }}
            </span>
            <span class="price price-consult" v-else>價格洽詢</span>
          </div>

          <!-- Stock Status -->
          <div class="stock-status">
            <span v-if="product.current_stock > 2" class="stock-badge stock-ok">
              ✓ 有庫存（{{ product.current_stock }} 件）
            </span>
            <span v-else-if="product.current_stock > 0" class="stock-badge stock-low">
              ⚠ 剩餘 {{ product.current_stock }} 件
            </span>
            <span v-else class="stock-badge stock-none">
              ✕ 已售完
            </span>
          </div>

          <!-- Qty Selector -->
          <div class="qty-row">
            <span class="qty-label">數量</span>
            <div class="qty-controls" :class="{ disabled: product.current_stock <= 0 }">
              <button class="qty-btn" @click="decQty" :disabled="qty <= 1 || product.current_stock <= 0">−</button>
              <input
                class="qty-input"
                type="number"
                v-model.number="qty"
                :min="1"
                :max="maxQty"
                :disabled="product.current_stock <= 0"
                @change="clampQty"
              />
              <button class="qty-btn" @click="incQty" :disabled="qty >= maxQty || product.current_stock <= 0">+</button>
            </div>
          </div>

          <!-- CTA Buttons -->
          <div class="cta-row">
            <button
              class="cta-btn cta-outline"
              :disabled="product.current_stock <= 0"
              @click="addToCartOnly"
            >加入購物車</button>
            <button
              class="cta-btn cta-solid"
              :disabled="product.current_stock <= 0"
              @click="buyNow"
            >立即購買</button>
          </div>

          <div class="divider"></div>

          <!-- Product Info Accordion -->
          <div class="accordion-section">
            <button class="accordion-header" @click="infoOpen = !infoOpen">
              <span>商品資訊</span>
              <span class="accordion-icon">{{ infoOpen ? '▲' : '▼' }}</span>
            </button>
            <div v-show="infoOpen" class="accordion-body">
              <div class="info-row">
                <span class="info-label">分類</span>
                <span class="info-value">
                  {{ CATEGORY_ZH_MAP[product.jellycat_category] || product.jellycat_category_zh || product.jellycat_category }}
                </span>
              </div>
              <div class="info-row" v-if="product.box_label">
                <span class="info-label">包裝</span>
                <span class="info-value">{{ product.box_label }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">備註</span>
                <span class="info-value">本商品為正版 Jellycat 授權商品</span>
              </div>
            </div>
          </div>

          <!-- Points Info -->
          <div class="points-section">
            <span class="points-icon">⭐</span>
            <span class="points-text">
              購買本商品可獲得
              <strong class="points-value">{{ qty }} 點</strong>
              集點回饋
            </span>
          </div>
        </div>
      </div>

      <!-- Related Products -->
      <div class="related-section" v-if="relatedProducts.length > 0">
        <h2 class="related-title">你可能也喜歡</h2>
        <div class="related-scroll">
          <div
            v-for="rel in relatedProducts"
            :key="rel.id"
            class="related-card"
            @click="$router.push(`/store/product/${rel.id}`)"
          >
            <div
              class="related-img"
              :style="{ background: getGradient(rel.jellycat_category) }"
            >
              <span class="related-emoji">{{ getEmoji(rel.jellycat_category) }}</span>
              <div v-if="rel.current_stock <= 0" class="related-sold-out">已售完</div>
            </div>
            <div class="related-body">
              <p class="related-name">{{ rel.product_name }}</p>
              <p class="related-price" v-if="rel.store_price != null">
                NT$ {{ formatPrice(rel.store_price) }}
              </p>
              <p class="related-price" v-else>洽詢</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppDataStore } from '@/stores/appData'
import { useCartStore } from '@/stores/cart'

const route  = useRoute()
const router = useRouter()
const appData = useAppDataStore()
const cart    = useCartStore()

// ── Constants ──────────────────────────────────────────────────────────────
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

const CATEGORY_ZH_MAP = {
  Bunnies:   '兔子',
  Bears:     '熊熊',
  Dogs:      '狗狗',
  Cats:      '貓咪',
  Birds:     '鳥類',
  Dinosaurs: '恐龍',
  Horses:    '馬兒',
  Fish:      '魚魚',
  Foxes:     '狐狸',
  Elephants: '大象',
  Dragons:   '龍龍',
  default:   '其他',
}

// ── State ──────────────────────────────────────────────────────────────────
const qty             = ref(1)
const activeThumbnail = ref(1)
const infoOpen        = ref(true)

// ── Computed ───────────────────────────────────────────────────────────────
const storeProducts = computed(() => appData.storeProducts || [])

const product = computed(() => {
  const id = Number(route.params.id)
  return storeProducts.value.find(p => p.id === id) || null
})

const maxQty = computed(() => {
  if (!product.value) return 0
  return Math.max(0, product.value.current_stock)
})

const relatedProducts = computed(() => {
  if (!product.value) return []
  return storeProducts.value
    .filter(p => p.jellycat_category === product.value.jellycat_category && p.id !== product.value.id)
    .slice(0, 4)
})

// ── Helpers ────────────────────────────────────────────────────────────────
const getGradient = (cat) => GRAD_MAP[cat] || GRAD_MAP.default
const getEmoji    = (cat) => EMOJI_MAP[cat] || EMOJI_MAP.default

const formatPrice = (price) => Number(price).toLocaleString('zh-TW')

const clampQty = () => {
  if (qty.value < 1) qty.value = 1
  if (qty.value > maxQty.value) qty.value = maxQty.value
}

const incQty = () => { if (qty.value < maxQty.value) qty.value++ }
const decQty = () => { if (qty.value > 1) qty.value-- }

// ── Actions ────────────────────────────────────────────────────────────────
const addToCartOnly = () => {
  if (!product.value || product.value.current_stock <= 0) return
  cart.addItem(product.value, qty.value)
}

const buyNow = () => {
  if (!product.value || product.value.current_stock <= 0) return
  cart.addItem(product.value, qty.value)
  router.push('/store/cart')
}
</script>

<style scoped>
/* ── Page ───────────────────────────────────────────────────────────────── */
.product-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}

/* ── Not Found ──────────────────────────────────────────────────────────── */
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
  gap: 16px;
}
.not-found-icon  { font-size: 64px; }
.not-found-title { font-size: 24px; font-weight: 800; color: var(--jj-text); margin: 0; }
.not-found-sub   { font-size: 15px; color: var(--jj-text-sub); margin: 0; }
.back-btn {
  background: var(--jj-pink-dark);
  color: white;
  border: none;
  border-radius: 999px;
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 8px;
}
.back-btn:hover { background: var(--jj-pink); }

/* ── Breadcrumb ─────────────────────────────────────────────────────────── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--jj-text-sub);
  margin-bottom: 24px;
}
.breadcrumb a {
  color: var(--jj-pink-dark);
  text-decoration: none;
}
.breadcrumb a:hover { text-decoration: underline; }
.sep     { color: var(--jj-border); }
.current { color: var(--jj-text); font-weight: 500; }

/* ── Product Layout ─────────────────────────────────────────────────────── */
.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: flex-start;
  margin-bottom: 60px;
}

/* ── Image Area ─────────────────────────────────────────────────────────── */
.product-img-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.main-img-card {
  height: 400px;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: zoom-in;
  transition: transform 0.2s;
}
.main-img-card:hover { transform: scale(1.01); }

.main-emoji {
  font-size: 140px;
  line-height: 1;
  user-select: none;
}

.sold-out-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
}
.sold-out-text {
  font-size: 28px;
  font-weight: 800;
  color: #9ca3af;
  letter-spacing: 0.1em;
}

/* Thumbnails */
.thumbnails {
  display: flex;
  gap: 8px;
}
.thumb {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.15s, transform 0.15s;
  flex-shrink: 0;
}
.thumb:hover     { transform: translateY(-2px); }
.thumb-active    { border-color: var(--jj-pink-dark); }
.thumb-emoji     { font-size: 36px; user-select: none; }

/* ── Product Info ───────────────────────────────────────────────────────── */
.product-info {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cat-tag {
  display: inline-block;
  background: var(--jj-pink-light);
  color: var(--jj-pink-dark);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  align-self: flex-start;
}

.product-name {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--jj-text);
  line-height: 1.25;
  margin: 0;
}

.sold-sub {
  font-size: 13px;
  color: var(--jj-text-sub);
  margin: 0;
}

.divider {
  height: 1px;
  background: var(--jj-border);
  margin: 4px 0;
}

/* Price */
.price-row { display: flex; align-items: baseline; }
.price {
  font-size: 2rem;
  font-weight: 800;
  color: var(--jj-pink-dark);
}
.price-consult { color: var(--jj-text-sub); font-size: 1.4rem; }

/* Stock */
.stock-status { display: flex; }
.stock-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
}
.stock-ok   { background: #d1fae5; color: #065f46; }
.stock-low  { background: #ffedd5; color: #9a3412; }
.stock-none { background: #f3f4f6; color: #6b7280; }

/* Qty Selector */
.qty-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.qty-label { font-size: 14px; font-weight: 600; color: var(--jj-text); }
.qty-controls {
  display: flex;
  align-items: center;
  border: 1px solid var(--jj-border);
  border-radius: 8px;
  overflow: hidden;
}
.qty-controls.disabled { opacity: 0.5; }
.qty-btn {
  width: 36px;
  height: 36px;
  background: var(--jj-bg);
  border: none;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  color: var(--jj-text);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.qty-btn:hover:not(:disabled) { background: var(--jj-pink-pale); }
.qty-btn:disabled { cursor: not-allowed; color: #d1d5db; }
.qty-input {
  width: 48px;
  height: 36px;
  border: none;
  border-left: 1px solid var(--jj-border);
  border-right: 1px solid var(--jj-border);
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--jj-text);
  outline: none;
  -moz-appearance: textfield;
}
.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }

/* CTA Buttons */
.cta-row {
  display: flex;
  gap: 12px;
}
.cta-btn {
  flex: 1;
  height: 48px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, border-color 0.15s;
}
.cta-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cta-outline {
  background: transparent;
  border: 2px solid var(--jj-pink-dark);
  color: var(--jj-pink-dark);
}
.cta-outline:hover:not(:disabled) {
  background: var(--jj-pink-pale);
}
.cta-solid {
  background: var(--jj-pink-dark);
  border: 2px solid var(--jj-pink-dark);
  color: white;
}
.cta-solid:hover:not(:disabled) {
  background: var(--jj-pink);
  border-color: var(--jj-pink);
}

/* ── Accordion ──────────────────────────────────────────────────────────── */
.accordion-section {
  border: 1px solid var(--jj-border);
  border-radius: 12px;
  overflow: hidden;
}
.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--jj-bg);
  border: none;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 700;
  color: var(--jj-text);
  cursor: pointer;
  text-align: left;
}
.accordion-header:hover { background: var(--jj-pink-pale); }
.accordion-icon { font-size: 11px; color: var(--jj-text-sub); }
.accordion-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid var(--jj-border);
}
.info-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
}
.info-label { width: 48px; color: var(--jj-text-sub); flex-shrink: 0; }
.info-value { color: var(--jj-text); }

/* ── Points ─────────────────────────────────────────────────────────────── */
.points-section {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--jj-pink-pale);
  border-radius: 12px;
  padding: 12px 16px;
}
.points-icon { font-size: 20px; }
.points-text { font-size: 13px; color: var(--jj-text); }
.points-value { color: var(--jj-pink-dark); font-size: 16px; }

/* ── Related Products ───────────────────────────────────────────────────── */
.related-section { margin-top: 8px; }
.related-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--jj-text);
  margin: 0 0 20px;
}
.related-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--jj-pink-light) transparent;
}
.related-scroll::-webkit-scrollbar { height: 4px; }
.related-scroll::-webkit-scrollbar-track { background: transparent; }
.related-scroll::-webkit-scrollbar-thumb { background: var(--jj-pink-light); border-radius: 999px; }

.related-card {
  min-width: 200px;
  flex-shrink: 0;
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.related-card:hover {
  box-shadow: var(--jj-shadow-lg);
  transform: translateY(-3px);
}
.related-img {
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.related-emoji { font-size: 60px; user-select: none; }
.related-sold-out {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #9ca3af;
}
.related-body {
  padding: 10px 12px 12px;
}
.related-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--jj-text);
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}
.related-price {
  font-size: 13px;
  font-weight: 700;
  color: var(--jj-pink-dark);
  margin: 0;
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .main-img-card { height: 280px; }
  .main-emoji    { font-size: 100px; }
  .product-name  { font-size: 1.3rem; }
  .price         { font-size: 1.6rem; }
  .cta-row       { flex-direction: column; }
  .cta-btn       { flex: unset; }
  .related-card  { min-width: 160px; }
}
</style>

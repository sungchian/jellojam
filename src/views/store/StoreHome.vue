<template>
  <div class="store-home">

    <!-- ─────────────── 1. Hero Banner ─────────────── -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-emojis">🐰🐻🦊🐶🐼</div>
        <h1 class="hero-title">{{ t('home.hero_title') }}</h1>
        <p class="hero-sub">{{ t('home.hero_sub') }}</p>
        <RouterLink to="/store/catalog" class="hero-cta">{{ t('home.hero_cta') }}</RouterLink>
      </div>
    </section>

    <div class="content-wrap">

      <!-- ─────────────── 2. 快速分類 ─────────────── -->
      <section class="quick-cats">
        <h2 class="section-title">{{ t('catalog.category') }}</h2>
        <div class="cat-grid">
          <RouterLink
            v-for="cat in quickCats"
            :key="cat.key"
            :to="{ path: '/store/catalog', query: { cat: cat.key } }"
            class="cat-card"
          >
            <div class="cat-emoji">{{ cat.emoji }}</div>
            <div class="cat-name">{{ t('categories.' + cat.key, cat.key) }}</div>
          </RouterLink>
        </div>
      </section>

      <!-- ─────────────── 3. 熱銷排行 ─────────────── -->
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">🔥 {{ t('home.hot_title') }}</h2>
          <RouterLink to="/store/catalog" class="section-more">{{ t('catalog.filter') }} →</RouterLink>
        </div>
        <p class="section-sub">{{ t('home.hot_sub') }}</p>
        <div class="product-grid">
          <ProductCard
            v-for="p in hotProducts"
            :key="p.id"
            :product="p"
            @add="addToCart"
          />
        </div>
      </section>

      <!-- ─────────────── 4. 集點活動 ─────────────── -->
      <section class="points-banner">
        <div class="points-left">
          <div class="points-title">{{ t('home.points_title') }}</div>
          <p class="points-sub">{{ t('home.points_sub') }}</p>
          <ul class="points-rules">
            <li><span class="rule-dot">✦</span> {{ t('home.points_rule1') }}</li>
            <li><span class="rule-dot">✦</span> {{ t('home.points_rule2') }} <span class="tier-badge silver">{{ t('home.tier_silver') }}</span></li>
            <li><span class="rule-dot">✦</span> {{ t('home.points_rule3') }} <span class="tier-badge gold">{{ t('home.tier_gold') }}</span></li>
            <li><span class="rule-dot">✦</span> {{ t('home.points_rule4') }} <span class="tier-badge platinum">{{ t('home.tier_platinum') }}</span></li>
          </ul>
          <RouterLink to="/store/member" class="points-cta">{{ t('home.featured_sub') }}</RouterLink>
        </div>
        <div class="points-right">
          <div class="tier-display">
            <div class="tier-item">
              <div class="tier-icon">🥈</div>
              <div class="tier-label">{{ t('home.tier_silver') }}</div>
              <div class="tier-req">5 點</div>
            </div>
            <div class="tier-item">
              <div class="tier-icon">🥇</div>
              <div class="tier-label">{{ t('home.tier_gold') }}</div>
              <div class="tier-req">15 點</div>
            </div>
            <div class="tier-item">
              <div class="tier-icon">💎</div>
              <div class="tier-label">{{ t('home.tier_platinum') }}</div>
              <div class="tier-req">30 點</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ─────────────── 5. 精選推薦 ─────────────── -->
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">✨ {{ t('home.featured_title') }}</h2>
          <RouterLink to="/store/catalog" class="section-more">{{ t('catalog.filter') }} →</RouterLink>
        </div>
        <p class="section-sub">{{ t('home.featured_sub') }}</p>
        <div class="product-grid">
          <ProductCard
            v-for="p in newProducts"
            :key="p.id"
            :product="p"
            @add="addToCart"
          />
        </div>
      </section>

    </div><!-- /content-wrap -->

    <!-- ─────────────── Toast ─────────────── -->
    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, defineComponent, h } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppDataStore } from '@/stores/appData'
import { useCartStore } from '@/stores/cart'

const { t } = useI18n()

// ── Stores ───────────────────────────────────────────────────────────────────
const store = useAppDataStore()
const cart  = useCartStore()

// ── Category setup ───────────────────────────────────────────────────────────
const CATEGORY_EMOJI_MAP = {
  Bunnies:    '🐰',
  Bears:      '🐻',
  Dogs:       '🐶',
  Cats:       '🐱',
  Elephants:  '🐘',
  Foxes:      '🦊',
  Dinosaurs:  '🦕',
  Penguins:   '🐧',
  Monkeys:    '🐒',
  Horses:     '🐴',
  Jellyfish:  '🪼',
  Other:      '🧸',
}

// Gradient per category (for product card image placeholder)
const CATEGORY_GRADIENT_MAP = {
  Bunnies:    'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
  Bears:      'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
  Dogs:       'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
  Cats:       'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
  Elephants:  'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
  Foxes:      'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
  Dinosaurs:  'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
  Penguins:   'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
  Monkeys:    'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
  Horses:     'linear-gradient(135deg, #fce7f3 0%, #e9d5ff 100%)',
  Jellyfish:  'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)',
  Other:      'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
}

// ── Quick categories (top 8) ──────────────────────────────────────────────────
const quickCats = computed(() =>
  store.jellycatCategories.slice(0, 8).map(key => ({
    key,
    emoji: CATEGORY_EMOJI_MAP[key] || '🧸',
  }))
)

// ── storeProducts: derived from mockInventory ─────────────────────────────────
const storeProducts = computed(() =>
  store.mockInventory.map(inv => ({
    id:                  inv.id || inv.product_id,
    product_name:        inv.product_name,
    jellycat_category:   inv.jellycat_category,
    store_price:         inv.avg_cost_twd > 0 ? Math.round(inv.avg_cost_twd * 1.35) : null,
    current_stock:       inv.current_stock,
    sold_qty:            inv.sold_qty || 0,
    in_stock:            inv.current_stock > 0,
    gradient:            CATEGORY_GRADIENT_MAP[inv.jellycat_category] || CATEGORY_GRADIENT_MAP.Other,
    emoji:               CATEGORY_EMOJI_MAP[inv.jellycat_category]    || '🧸',
  }))
)

// Hot products: top 8 by sold_qty
const hotProducts = computed(() =>
  [...storeProducts.value]
    .sort((a, b) => b.sold_qty - a.sold_qty)
    .slice(0, 8)
)

// New / featured: in_stock products sorted by name, first 8
const newProducts = computed(() =>
  [...storeProducts.value]
    .filter(p => p.in_stock)
    .sort((a, b) => a.product_name.localeCompare(b.product_name))
    .slice(0, 8)
)

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast    = ref('')
let toastTimer = null

function showToast(msg) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2000)
}

// ── Add to Cart ───────────────────────────────────────────────────────────────
function addToCart(product) {
  if (!product.in_stock) return
  cart.addItem({
    id:           product.id,
    product_name: product.product_name,
    price:        product.store_price || 0,
    stock:        product.current_stock,
    category_zh:  t('categories.' + product.jellycat_category, product.jellycat_category),
  })
  showToast(`${t('catalog.add_cart')}：${product.product_name} 🐾`)
}

// ── Inline ProductCard component ──────────────────────────────────────────────
const ProductCard = defineComponent({
  name: 'ProductCard',
  props: {
    product: { type: Object, required: true },
  },
  emits: ['add'],
  setup(props, { emit }) {
    return () => {
      const p = props.product
      const priceText = p.store_price
        ? `NT$ ${p.store_price.toLocaleString()}`
        : t('catalog.price_query')

      return h('div', { class: 'product-card' }, [
        // Image area
        h('div', {
          class: 'product-img',
          style: { background: p.gradient },
        }, [
          h('span', { class: 'product-emoji' }, p.emoji),
        ]),

        // Body
        h('div', { class: 'product-body' }, [
          // Category tag
          h('div', { class: 'product-cat-tag' }, t('categories.' + p.jellycat_category, p.jellycat_category)),

          // Name
          h('div', { class: 'product-name' }, p.product_name),

          // Sold count chip
          p.sold_qty > 0
            ? h('div', { class: 'sold-chip' }, t('catalog.sold_count', { n: p.sold_qty }))
            : null,

          // Stock warning
          p.current_stock > 0 && p.current_stock <= 2
            ? h('div', { class: 'stock-warn' }, `⚠️ ${t('catalog.almost_gone')}`)
            : null,

          // Price row
          h('div', { class: 'product-price-row' }, [
            h('div', { class: 'product-price' }, priceText),
          ]),

          // Add to cart button
          h('button', {
            class: ['add-to-cart-btn', !p.in_stock ? 'disabled' : ''],
            disabled: !p.in_stock,
            onClick: () => emit('add', p),
          }, p.in_stock ? `${t('catalog.add_cart')} 🛍️` : t('catalog.sold_out')),
        ]),
      ])
    }
  },
})
</script>

<style scoped>
/* ── Hero ────────────────────────────────────────────────────────────────── */
.hero {
  width: 100%;
  height: 420px;
  background: linear-gradient(135deg, #fce7f3 0%, #ede9fe 50%, #fce7f3 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 16px;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.hero-emojis {
  font-size: 40px;
  letter-spacing: 4px;
  line-height: 1;
}

.hero-title {
  font-size: 2.4rem;
  font-weight: 800;
  color: var(--jj-rose-dark, #db2777);
  margin: 0;
  line-height: 1.2;
}

.hero-sub {
  font-size: 15px;
  color: var(--jj-text-sub, #6b7280);
  margin: 0;
  line-height: 1.6;
}

.hero-cta {
  display: inline-block;
  background: var(--jj-rose, #f472b6);
  color: white;
  font-size: 16px;
  font-weight: 700;
  padding: 14px 36px;
  border-radius: 999px;
  text-decoration: none;
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 20px rgba(244, 114, 182, 0.35);
}

.hero-cta:hover {
  background: var(--jj-rose-dark, #db2777);
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(244, 114, 182, 0.45);
}

/* ── Content Wrap ────────────────────────────────────────────────────────── */
.content-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px 64px;
}

/* ── Quick Cats ──────────────────────────────────────────────────────────── */
.quick-cats {
  padding: 48px 0 32px;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 12px;
}

.cat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 8px;
  background: var(--jj-white, #ffffff);
  border: 1.5px solid var(--jj-border, #fde8f3);
  border-radius: 16px;
  text-decoration: none;
  color: var(--jj-text, #1e0a14);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s;
  cursor: pointer;
}

.cat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--jj-shadow-lg, 0 8px 40px rgba(244, 114, 182, 0.18));
  border-color: var(--jj-rose, #f472b6);
}

.cat-emoji {
  font-size: 28px;
  line-height: 1;
}

.cat-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--jj-text-sub, #6b7280);
  text-align: center;
}

/* ── Section Headings ────────────────────────────────────────────────────── */
.section {
  padding: 40px 0 32px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 4px;
}

.section-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--jj-text, #1e0a14);
  margin: 0;
}

.section-more {
  font-size: 13px;
  color: var(--jj-rose-dark, #db2777);
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.15s;
}

.section-more:hover {
  opacity: 0.75;
}

.section-sub {
  font-size: 13px;
  color: var(--jj-text-sub, #6b7280);
  margin: 0 0 20px;
}

/* ── Product Grid ────────────────────────────────────────────────────────── */
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* ── Product Card (rendered via defineComponent) ─────────────────────────── */
:deep(.product-card) {
  background: var(--jj-white, #ffffff);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--jj-border, #fde8f3);
  transition: box-shadow 0.18s, transform 0.18s;
  display: flex;
  flex-direction: column;
}

:deep(.product-card:hover) {
  box-shadow: var(--jj-shadow-lg, 0 8px 40px rgba(244, 114, 182, 0.18));
  transform: translateY(-3px);
}

:deep(.product-img) {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

:deep(.product-emoji) {
  font-size: 80px;
  line-height: 1;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.08));
}

:deep(.product-body) {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

:deep(.product-cat-tag) {
  display: inline-block;
  background: var(--jj-rose-light, #fce7f3);
  color: var(--jj-rose-dark, #db2777);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  align-self: flex-start;
}

:deep(.product-name) {
  font-size: 14px;
  font-weight: 700;
  color: var(--jj-text, #1e0a14);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:deep(.sold-chip) {
  font-size: 11px;
  color: var(--jj-text-sub, #6b7280);
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 999px;
  align-self: flex-start;
}

:deep(.stock-warn) {
  font-size: 11px;
  color: var(--jj-gold, #fb923c);
  font-weight: 600;
}

:deep(.product-price-row) {
  display: flex;
  align-items: center;
  margin-top: 2px;
}

:deep(.product-price) {
  font-size: 18px;
  font-weight: 700;
  color: var(--jj-rose-dark, #db2777);
}

:deep(.add-to-cart-btn) {
  margin-top: auto;
  width: 100%;
  padding: 10px 0;
  background: var(--jj-rose, #f472b6);
  color: white;
  border: none;
  border-radius: var(--jj-radius-sm, 8px);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

:deep(.add-to-cart-btn:hover:not(.disabled)) {
  background: var(--jj-rose-dark, #db2777);
}

:deep(.add-to-cart-btn.disabled) {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* ── Points Banner ───────────────────────────────────────────────────────── */
.points-banner {
  border-radius: 20px;
  background: linear-gradient(135deg, #f472b6 0%, #a78bfa 100%);
  padding: 40px 48px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 40px;
  align-items: center;
  color: white;
  margin: 8px 0 40px;
}

.points-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.points-sub {
  font-size: 14px;
  opacity: 0.85;
  margin: 0 0 20px;
  line-height: 1.6;
}

.points-rules {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.points-rules li {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-dot {
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
}

.tier-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.tier-badge.silver {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.tier-badge.gold {
  background: #fbbf24;
  color: #1e0a14;
}

.tier-badge.platinum {
  background: rgba(255, 255, 255, 0.9);
  color: #7c3aed;
}

.points-cta {
  display: inline-block;
  background: white;
  color: #db2777;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 28px;
  border-radius: 999px;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.15s;
}

.points-cta:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Tier display (right side) */
.tier-display {
  display: flex;
  gap: 20px;
}

.tier-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  padding: 20px 24px;
  min-width: 80px;
}

.tier-icon {
  font-size: 36px;
  line-height: 1;
}

.tier-label {
  font-size: 13px;
  font-weight: 700;
}

.tier-req {
  font-size: 11px;
  opacity: 0.75;
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--jj-rose-dark, #db2777);
  color: white;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 28px;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(219, 39, 119, 0.35);
  z-index: 9999;
  white-space: nowrap;
  pointer-events: none;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .cat-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .hero {
    height: 280px;
  }

  .hero-title {
    font-size: 1.8rem;
  }

  .hero-emojis {
    font-size: 28px;
  }

  .cat-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .points-banner {
    grid-template-columns: 1fr;
    padding: 28px 24px;
    gap: 24px;
  }

  .tier-display {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .cat-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  :deep(.product-img) {
    height: 160px;
  }

  :deep(.product-emoji) {
    font-size: 60px;
  }
}
</style>

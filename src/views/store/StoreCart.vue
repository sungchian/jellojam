<template>
  <div class="cart-page">
    <!-- Page header -->
    <div class="page-header">
      <h1 class="page-title">🛒 購物車</h1>
      <span v-if="cart.itemCount > 0" class="item-badge">{{ cart.itemCount }} 件</span>
    </div>

    <!-- Empty state -->
    <div v-if="cart.itemCount === 0" class="empty-cart">
      <div class="empty-icon">🛒</div>
      <p class="empty-text">購物車是空的</p>
      <p class="empty-sub">快去挑選您喜歡的 Jellycat 吧！</p>
      <RouterLink to="/store/catalog" class="btn-continue">繼續購物</RouterLink>
    </div>

    <!-- Cart layout -->
    <div v-else class="cart-layout">
      <!-- Left: cart items -->
      <div class="cart-items-col">
        <div class="cart-items-list">
          <div
            v-for="item in cart.items"
            :key="item.id"
            class="cart-item"
          >
            <!-- Thumbnail -->
            <div class="item-thumb">
              <span class="item-emoji">🧸</span>
            </div>

            <!-- Name + category -->
            <div class="item-info">
              <div class="item-name">{{ item.product_name }}</div>
              <span v-if="item.category_zh" class="item-category">{{ item.category_zh }}</span>
            </div>

            <!-- Unit price -->
            <div class="item-price">
              <span class="price-label">單價</span>
              <span class="price-value">NT${{ item.price.toLocaleString() }}</span>
            </div>

            <!-- Qty controls -->
            <div class="item-qty">
              <button
                class="qty-btn"
                @click="updateQty(item.id, item.qty - 1)"
                :disabled="item.qty <= 1"
              >−</button>
              <input
                class="qty-input"
                type="number"
                :value="item.qty"
                :min="1"
                :max="item.stock"
                @change="e => updateQty(item.id, parseInt(e.target.value) || 1)"
              />
              <button
                class="qty-btn"
                @click="updateQty(item.id, item.qty + 1)"
                :disabled="item.qty >= item.stock"
              >＋</button>
            </div>

            <!-- Subtotal -->
            <div class="item-subtotal">
              NT${{ (item.price * item.qty).toLocaleString() }}
            </div>

            <!-- Remove -->
            <button class="item-remove" @click="removeItem(item.id)" title="移除">×</button>
          </div>
        </div>

        <div class="cart-divider"></div>
        <div class="cart-footer-link">
          <RouterLink to="/store/catalog" class="link-continue">← 繼續購物</RouterLink>
        </div>
      </div>

      <!-- Right: order summary -->
      <div class="cart-summary">
        <h2 class="summary-title">訂單摘要</h2>

        <div class="summary-rows">
          <div class="summary-row">
            <span>商品小計</span>
            <span>NT${{ cart.subtotal.toLocaleString() }}</span>
          </div>
          <div class="summary-row">
            <span>運費</span>
            <span :class="{ 'free-shipping': shipping === 0 }">
              {{ shipping === 0 ? '免運費' : 'NT$60' }}
            </span>
          </div>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-total">
          <span>總計</span>
          <span class="total-amount">NT${{ total.toLocaleString() }}</span>
        </div>

        <button class="btn-checkout" @click="goCheckout">前往結帳</button>

        <p class="promo-note">消費滿 NT$1,500 免運費 🎉</p>

        <p v-if="memberStore.isLoggedIn" class="points-note">
          本次可獲得 <strong>{{ earnPoints }}</strong> 點
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useStoreMemberStore } from '@/stores/storeMember'

const cart = useCartStore()
const memberStore = useStoreMemberStore()
const router = useRouter()

const shipping = computed(() => (cart.subtotal >= 1500 ? 0 : 60))
const total = computed(() => cart.subtotal + shipping.value)
const earnPoints = computed(() => cart.items.reduce((sum, item) => sum + item.qty, 0))

function updateQty(id, qty) {
  cart.setQty(id, qty)
}

function removeItem(id) {
  cart.removeItem(id)
}

function goCheckout() {
  router.push('/store/checkout')
}
</script>

<style scoped>
.cart-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--jj-text);
  margin: 0;
}

.item-badge {
  background: var(--jj-pink);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
}

/* ── Empty state ─────────────────────────────── */
.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 72px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 20px;
  font-weight: 600;
  color: var(--jj-text);
  margin: 0 0 6px;
}

.empty-sub {
  font-size: 14px;
  color: var(--jj-text-sub);
  margin: 0 0 28px;
}

.btn-continue {
  display: inline-block;
  padding: 12px 32px;
  background: var(--jj-pink);
  color: #fff;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s;
}

.btn-continue:hover {
  background: var(--jj-pink-dark);
}

/* ── Cart layout ─────────────────────────────── */
.cart-layout {
  display: flex;
  gap: 28px;
  align-items: flex-start;
}

.cart-items-col {
  flex: 1;
  min-width: 0;
}

/* ── Cart items ──────────────────────────────── */
.cart-items-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--jj-white);
  border-radius: var(--jj-radius);
  box-shadow: var(--jj-shadow);
  overflow: hidden;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--jj-border);
  transition: background 0.15s;
}

.cart-item:last-child {
  border-bottom: none;
}

.cart-item:hover {
  background: var(--jj-pink-pale);
}

.item-thumb {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--jj-pink-light) 0%, var(--jj-pink-pale) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-emoji {
  font-size: 28px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--jj-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-category {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  padding: 1px 8px;
  background: var(--jj-pink-pale);
  color: var(--jj-pink-dark);
  border-radius: 999px;
}

.item-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 80px;
}

.price-label {
  font-size: 11px;
  color: var(--jj-text-sub);
}

.price-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--jj-text);
}

/* Qty controls */
.item-qty {
  display: flex;
  align-items: center;
  gap: 4px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: 1.5px solid var(--jj-border);
  border-radius: 8px;
  background: var(--jj-bg);
  color: var(--jj-text);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.15s, border-color 0.15s;
}

.qty-btn:hover:not(:disabled) {
  background: var(--jj-pink-pale);
  border-color: var(--jj-pink);
}

.qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.qty-input {
  width: 44px;
  height: 28px;
  text-align: center;
  border: 1.5px solid var(--jj-border);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--jj-text);
  background: var(--jj-white);
  -moz-appearance: textfield;
}

.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}

/* Subtotal */
.item-subtotal {
  min-width: 88px;
  text-align: right;
  font-size: 15px;
  font-weight: 700;
  color: var(--jj-pink-dark);
}

/* Remove button */
.item-remove {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--jj-text-sub);
  font-size: 20px;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.item-remove:hover {
  color: #ef4444;
  background: #fee2e2;
}

.cart-divider {
  border: none;
  border-top: 1px solid var(--jj-border);
  margin: 20px 0 12px;
}

.cart-footer-link {
  padding: 0 4px;
}

.link-continue {
  font-size: 14px;
  color: var(--jj-pink-dark);
  text-decoration: none;
  font-weight: 500;
}

.link-continue:hover {
  text-decoration: underline;
}

/* ── Summary ─────────────────────────────────── */
.cart-summary {
  width: 280px;
  flex-shrink: 0;
  background: var(--jj-white);
  border-radius: var(--jj-radius);
  box-shadow: var(--jj-shadow);
  padding: 24px;
  position: sticky;
  top: 88px;
}

.summary-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--jj-text);
  margin: 0 0 20px;
}

.summary-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--jj-text-sub);
}

.free-shipping {
  color: #10b981;
  font-weight: 600;
}

.summary-divider {
  border: none;
  border-top: 1px solid var(--jj-border);
  margin-bottom: 16px;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 15px;
  font-weight: 600;
  color: var(--jj-text);
}

.total-amount {
  font-size: 22px;
  font-weight: 800;
  color: var(--jj-pink-dark);
}

.btn-checkout {
  width: 100%;
  height: 48px;
  background: var(--jj-pink);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 14px;
}

.btn-checkout:hover {
  background: var(--jj-pink-dark);
}

.promo-note {
  font-size: 12px;
  color: var(--jj-text-sub);
  text-align: center;
  margin: 0 0 10px;
}

.points-note {
  font-size: 13px;
  color: var(--jj-purple);
  text-align: center;
  background: #f5f3ff;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0;
}

/* ── Responsive ──────────────────────────────── */
@media (max-width: 680px) {
  .cart-layout {
    flex-direction: column;
  }

  .cart-summary {
    width: 100%;
    position: static;
  }

  .item-price {
    display: none;
  }
}
</style>

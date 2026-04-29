<template>
  <div class="member-page">

    <!-- ── Not logged in ── -->
    <div v-if="!memberStore.isLoggedIn" class="login-card">
      <div class="login-avatar">🐰</div>
      <h2 class="login-title">{{ t('member.login_title') }}</h2>
      <p class="login-sub">{{ t('member.login_sub') }}</p>

      <input
        v-model="loginInput"
        class="login-input"
        type="text"
        :placeholder="t('member.login_ph')"
        @keydown.enter="doLogin"
      />

      <p v-if="loginError" class="login-error">{{ loginError }}</p>

      <button
        class="login-btn"
        @click="doLogin"
        :disabled="loginLoading"
      >
        {{ loginLoading ? t('member.query_fail') : t('member.login_btn') }}
      </button>

      <p class="login-note">{{ t('member.login_note') }}</p>
    </div>

    <!-- ── Logged in ── -->
    <template v-else>

      <!-- Member hero -->
      <div class="member-hero">
        <div class="member-avatar">{{ avatarLetter }}</div>
        <h2 class="member-name">{{ memberStore.displayName }}</h2>
        <span
          class="tier-badge"
          :style="{ background: currentTier.color + '22', color: currentTier.color }"
        >
          {{ currentTier.name }}
        </span>
        <button class="logout-btn" @click="memberStore.logout()">{{ t('member.logout') }}</button>
      </div>

      <!-- Points card -->
      <div class="points-card">
        <div class="points-left">
          <div class="points-label">{{ t('member.points_avail') }}</div>
          <div class="points-value">{{ currentPoints }}</div>
          <div class="points-lifetime">{{ t('member.points_life') }}：{{ lifetimePoints }}</div>
        </div>
        <div class="points-right">
          <div v-if="nextTier" class="tier-progress-label">
            {{ t('member.next_tier', { n: Math.max(0, nextTier.minPoints - lifetimePoints), tier: nextTier.name }) }}
            <span v-if="nextTier.minPoints >= 15">{{ nextTier.minPoints >= 30 ? '💎' : '🥇' }}</span>
          </div>
          <div v-else class="tier-progress-label">
            {{ t('member.max_tier') }} 💎
          </div>
          <div class="progress-track">
            <div
              class="progress-bar"
              :style="{ width: tierProgress + '%' }"
            ></div>
          </div>
          <div class="progress-tiers">
            <span>{{ currentTier.name }}</span>
            <span v-if="nextTier">{{ nextTier.name }}</span>
          </div>
        </div>
      </div>

      <!-- Tier benefits -->
      <div class="section-heading">{{ t('member.tier_title') }}</div>
      <div class="tier-list">
        <div
          v-for="tier in MEMBER_TIERS"
          :key="tier.name"
          class="tier-card"
          :class="{ 'tier-current': tier.name === currentTier.name }"
          :style="tier.name === currentTier.name
            ? { borderColor: tier.color, background: tier.color + '11' }
            : {}"
        >
          <div class="tier-card-name" :style="{ color: tier.color }">
            {{ tier.name }}
            <span v-if="tier.minPoints >= 30">💎</span>
            <span v-else-if="tier.minPoints >= 15">🥇</span>
          </div>
          <div class="tier-card-min">{{ tier.minPoints }}+ 點</div>
          <div class="tier-card-benefit">
            <template v-if="tier.minPoints === 0">{{ t('member.benefit_normal') }}</template>
            <template v-else-if="tier.minPoints === 5">{{ t('member.benefit_silver') }}</template>
            <template v-else-if="tier.minPoints === 15">{{ t('member.benefit_gold') }}</template>
            <template v-else>{{ t('member.benefit_plat') }}</template>
          </div>
          <div v-if="tier.name === currentTier.name" class="tier-current-badge">{{ t('member.tier_benefits') }}</div>
        </div>
      </div>

      <!-- Order history -->
      <div class="orders-section">
        <div class="section-heading">{{ t('member.orders_title') }}</div>
        <div v-if="myOrders.length === 0" class="no-orders">
          {{ t('member.no_orders') }}
        </div>
        <div v-else class="orders-list">
          <div
            v-for="order in myOrders"
            :key="order.id"
            class="order-card"
          >
            <div class="order-header">
              <span class="order-no">{{ t('member.order_no') }}{{ order.order_no || order.order_id }}</span>
              <span
                class="order-status"
                :style="{
                  background: (ORDER_STATUSES[order.status] || {}).color + '22',
                  color: (ORDER_STATUSES[order.status] || {}).color || '#94a3b8'
                }"
              >
                {{ order.status }}
              </span>
            </div>
            <div class="order-meta">
              <span class="order-date">{{ t('member.order_date') }}{{ order.sales_date }}</span>
            </div>
            <div class="order-products">{{ order.product_name }}</div>
            <div class="order-total" v-if="order.selling_price">
              {{ t('member.order_amount') }} NT${{ Number(order.selling_price).toLocaleString() }}
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoreMemberStore } from '@/stores/storeMember'
import { useAppDataStore, MEMBER_TIERS, ORDER_STATUSES, getTierByPoints } from '@/stores/appData'

const { t } = useI18n()
const memberStore = useStoreMemberStore()
const appData = useAppDataStore()

// ── Login ─────────────────────────────────────────────────────────────────────
const loginInput = ref('')
const loginError = ref('')
const loginLoading = ref(false)

async function doLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    await memberStore.loginByName(loginInput.value)
    loginInput.value = ''
  } catch (err) {
    loginError.value = err.message || t('member.query_fail')
  } finally {
    loginLoading.value = false
  }
}

// ── Member derived data ───────────────────────────────────────────────────────
const avatarLetter = computed(() => {
  const name = memberStore.displayName
  return name ? name.charAt(0).toUpperCase() : '?'
})

// My orders: filter mockSales by customer_id, sorted newest first
const myOrders = computed(() => {
  if (!memberStore.customer) return []
  const customerId = memberStore.customer.id
  return appData.mockSales
    .filter(o => o.customer_id === customerId)
    .slice()
    .sort((a, b) => {
      if (!a.sales_date && !b.sales_date) return 0
      if (!a.sales_date) return 1
      if (!b.sales_date) return -1
      return b.sales_date.localeCompare(a.sales_date)
    })
})

// Points: count qty from active (non-cancelled) orders
const lifetimePoints = computed(() => {
  if (!memberStore.customer) return 0
  const customerId = memberStore.customer.id
  const activeOrders = appData.mockSales.filter(
    o => o.customer_id === customerId && o.status !== '顧客已取消'
  )
  return activeOrders.reduce((sum, order) => {
    const itemsQty = (order.items || []).reduce(
      (s, item) => s + (Number(item.qty) || 1),
      0
    )
    return sum + (itemsQty || 1)
  }, 0)
})

// Simplified: no redemption UI yet, current = lifetime
const currentPoints = computed(() => lifetimePoints.value)

const currentTier = computed(() => getTierByPoints(lifetimePoints.value))

const nextTier = computed(() => {
  const idx = MEMBER_TIERS.findIndex(t => t.name === currentTier.value.name)
  return idx < MEMBER_TIERS.length - 1 ? MEMBER_TIERS[idx + 1] : null
})

const tierProgress = computed(() => {
  if (!nextTier.value) return 100
  const current = currentTier.value
  const next = nextTier.value
  const range = next.minPoints - current.minPoints
  const earned = lifetimePoints.value - current.minPoints
  return Math.min(100, Math.max(0, Math.round((earned / range) * 100)))
})
</script>

<style scoped>
.member-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Login card ───────────────────────────────── */
.login-card {
  max-width: 440px;
  margin: 40px auto;
  background: var(--jj-white);
  padding: 40px;
  border-radius: 20px;
  box-shadow: var(--jj-shadow-lg);
  text-align: center;
}

.login-avatar {
  font-size: 56px;
  margin-bottom: 12px;
}

.login-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--jj-text);
  margin: 0 0 8px;
}

.login-sub {
  font-size: 14px;
  color: var(--jj-text-sub);
  margin: 0 0 24px;
  line-height: 1.6;
}

.login-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--jj-border);
  border-radius: 10px;
  font-size: 15px;
  color: var(--jj-text);
  background: var(--jj-cream);
  margin-bottom: 12px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}

.login-input:focus {
  border-color: var(--jj-rose);
  background: var(--jj-white);
}

.login-error {
  font-size: 13px;
  color: #dc2626;
  background: #fee2e2;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0 0 12px;
}

.login-btn {
  width: 100%;
  height: 48px;
  background: var(--jj-rose-dark);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, opacity 0.15s;
  margin-bottom: 16px;
}

.login-btn:hover:not(:disabled) {
  background: var(--jj-rose);
}

.login-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.login-note {
  font-size: 13px;
  color: var(--jj-text-sub);
  margin: 0;
}

/* ── Member hero ──────────────────────────────── */
.member-hero {
  text-align: center;
  padding: 32px;
  background: var(--jj-white);
  border-radius: 20px;
  box-shadow: var(--jj-shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.member-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--jj-rose) 0%, var(--jj-rose-dark) 100%);
  color: #fff;
  font-size: 32px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.member-name {
  font-size: 22px;
  font-weight: 800;
  color: var(--jj-text);
  margin: 0;
}

.tier-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.logout-btn {
  background: none;
  border: none;
  font-size: 13px;
  color: var(--jj-text-sub);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.logout-btn:hover {
  background: var(--jj-cream);
  color: var(--jj-text);
}

/* ── Points card ──────────────────────────────── */
.points-card {
  background: linear-gradient(135deg, var(--jj-rose) 0%, var(--jj-plum) 100%);
  color: #fff;
  border-radius: 20px;
  padding: 28px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  box-shadow: var(--jj-shadow-lg);
}

.points-label {
  font-size: 13px;
  opacity: 0.85;
  margin-bottom: 4px;
}

.points-value {
  font-size: 48px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 8px;
}

.points-lifetime {
  font-size: 13px;
  opacity: 0.75;
}

.points-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.tier-progress-label {
  font-size: 13px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.tier-progress-label strong {
  font-size: 18px;
  font-weight: 800;
}

.progress-track {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #fff;
  border-radius: 999px;
  transition: width 0.5s ease;
}

.progress-tiers {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  opacity: 0.75;
}

/* ── Tier list ────────────────────────────────── */
.section-heading {
  font-size: 16px;
  font-weight: 700;
  color: var(--jj-text);
  margin-bottom: -8px;
}

.tier-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.tier-card {
  background: var(--jj-white);
  border-radius: 14px;
  padding: 18px 14px;
  border: 2px solid var(--jj-border);
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
}

.tier-card-name {
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tier-card-min {
  font-size: 12px;
  color: var(--jj-text-sub);
  margin-bottom: 8px;
}

.tier-card-benefit {
  font-size: 12px;
  color: var(--jj-text);
  line-height: 1.4;
}

.tier-current-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--jj-rose);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

/* ── Orders section ───────────────────────────── */
.orders-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.no-orders {
  text-align: center;
  padding: 40px 20px;
  color: var(--jj-text-sub);
  font-size: 14px;
  background: var(--jj-white);
  border-radius: 14px;
  box-shadow: var(--jj-shadow);
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-card {
  background: var(--jj-white);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--jj-shadow);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.order-no {
  font-size: 14px;
  font-weight: 700;
  color: var(--jj-text);
  letter-spacing: 0.04em;
}

.order-status {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 12px;
  border-radius: 999px;
  flex-shrink: 0;
}

.order-meta {
  display: flex;
  gap: 10px;
}

.order-date {
  font-size: 12px;
  color: var(--jj-text-sub);
}

.order-products {
  font-size: 13px;
  color: var(--jj-text);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-total {
  font-size: 15px;
  font-weight: 700;
  color: var(--jj-rose-dark);
}

/* ── Responsive ───────────────────────────────── */
@media (max-width: 600px) {
  .tier-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .points-card {
    grid-template-columns: 1fr;
  }

  .points-value {
    font-size: 36px;
  }
}

@media (max-width: 380px) {
  .tier-list {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

<template>
  <div class="tracking-page">
    <div class="tracking-card">

      <!-- Header -->
      <div class="tracking-header">
        <div class="tracking-icon">📦</div>
        <h1 class="tracking-title">訂單查詢</h1>
        <p class="tracking-sub">輸入訂單編號查詢目前進度</p>
      </div>

      <!-- Search Form -->
      <div class="search-form" v-if="!order">
        <div class="search-row">
          <input
            v-model="searchNo"
            class="search-input"
            type="text"
            placeholder="例：JJ20240101-001"
            @keydown.enter="handleSearch"
            @input="errorMsg = ''"
            autocomplete="off"
            :disabled="searching"
          />
          <button class="search-btn" @click="handleSearch" :disabled="searching || !searchNo.trim()">
            <span v-if="searching" class="spin-sm"></span>
            {{ searching ? '查詢中…' : '查詢' }}
          </button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <p class="search-hint">訂單編號於結帳成功頁面或確認訊息中可找到</p>
      </div>

      <!-- Result: Order Found -->
      <template v-if="order">

        <!-- Order Summary -->
        <div class="order-summary">
          <div class="summary-row">
            <span class="summary-label">訂單編號</span>
            <span class="summary-val order-no-val">{{ order.order_no }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">下單日期</span>
            <span class="summary-val">{{ order.sales_date }}</span>
          </div>
          <div class="summary-row" v-if="order.payment_amount">
            <span class="summary-label">訂單金額</span>
            <span class="summary-val price-val">NT$ {{ Number(order.payment_amount).toLocaleString() }}</span>
          </div>
        </div>

        <!-- Status Timeline -->
        <div class="timeline-section">
          <div class="timeline-title">訂單進度</div>
          <div class="order-timeline">
            <div
              v-for="(step, i) in ORDER_STEPS"
              :key="step.key"
              class="tl-step"
              :class="{
                'tl-done':    isStepDone(order.status, step.key),
                'tl-active':  isStepActive(order.status, step.key),
                'tl-cancelled': order.status === '已取消',
              }"
            >
              <div class="tl-dot">
                <span class="tl-icon">
                  {{ order.status === '已取消' && i === 0 ? '✕' : (isStepDone(order.status, step.key) ? '✓' : step.icon) }}
                </span>
              </div>
              <div v-if="i < ORDER_STEPS.length - 1" class="tl-line"
                :class="{ 'tl-line-done': isStepDone(order.status, ORDER_STEPS[i + 1].key) }" />
              <div class="tl-label">{{ step.label }}</div>
            </div>
          </div>

          <!-- Cancelled notice -->
          <div v-if="order.status === '已取消'" class="cancelled-notice">
            此訂單已取消，如有疑問請透過 LINE 聯絡我們
          </div>

          <!-- Shipped: show tracking if available -->
          <div v-if="order.tracking_no" class="tracking-no-block">
            <span class="tn-label">🚚 物流單號</span>
            <span class="tn-val">{{ order.tracking_no }}</span>
          </div>

          <!-- Logistics store -->
          <div v-if="order.logistics_name" class="tracking-no-block">
            <span class="tn-label">🏪 取貨門市</span>
            <span class="tn-val">{{ order.logistics_name }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="result-actions">
          <button class="btn-secondary" @click="resetSearch">查詢其他訂單</button>
          <a :href="LINE_URL" target="_blank" rel="noopener" class="btn-line">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.208 2 11.423c0 4.661 3.671 8.557 8.637 9.285.337.073.795.224.912.514.105.263.069.675.034.94l-.148.89c-.045.268-.209 1.046.916.57 1.125-.476 6.067-3.573 8.277-6.117C22.057 15.174 22 13.327 22 11.423 22 6.208 17.523 2 12 2z"/>
            </svg>
            LINE 聯絡客服
          </a>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────
const LINE_URL = 'https://line.me/R/ti/p/@jellojam'

const ORDER_STEPS = [
  { key: '待確認',  label: '待確認',  icon: '📋' },
  { key: '處理中',  label: '備貨中',  icon: '📦' },
  { key: '已出貨',  label: '已出貨',  icon: '🚚' },
  { key: '已完成',  label: '已完成',  icon: '✅' },
]

const STATUS_ORDER = { '待確認': 0, '已填表單': 0, '處理中': 1, '已出貨': 2, '已完成': 3 }

// ── State ─────────────────────────────────────────────────────────────────────
const searchNo  = ref('')
const searching = ref(false)
const errorMsg  = ref('')
const order     = ref(null)

// ── Helpers ───────────────────────────────────────────────────────────────────
function isStepDone(status, stepKey) {
  if (status === '已取消') return false
  return (STATUS_ORDER[status] ?? -1) > (STATUS_ORDER[stepKey] ?? 0)
}

function isStepActive(status, stepKey) {
  if (status === '已取消') return stepKey === '待確認'
  return (STATUS_ORDER[status] ?? 0) === (STATUS_ORDER[stepKey] ?? 0)
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function handleSearch() {
  const no = searchNo.value.trim()
  if (!no) return

  searching.value = true
  errorMsg.value  = ''
  order.value     = null

  try {
    // Only expose safe public fields — no customer PII
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_no, sales_date, status, payment_amount, tracking_no, logistics_name')
      .eq('order_no', no)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      console.error('[order_tracking] query error, code:', error?.code)
      errorMsg.value = '查詢失敗，請稍後再試'
      return
    }

    if (!data) {
      errorMsg.value = '找不到此訂單編號，請確認後再試'
      return
    }

    order.value = data
  } catch (e) {
    console.error('[order_tracking] unexpected error, code:', e?.code)
    errorMsg.value = '查詢失敗，請稍後再試'
  } finally {
    searching.value = false
  }
}

function resetSearch() {
  order.value    = null
  searchNo.value = ''
  errorMsg.value = ''
}
</script>

<style scoped>
.tracking-page {
  min-height: 60vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px 80px;
}

.tracking-card {
  width: 100%;
  max-width: 540px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ── */
.tracking-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.tracking-icon  { font-size: 52px; }
.tracking-title { font-size: 26px; font-weight: 800; color: var(--jj-text); margin: 0; }
.tracking-sub   { font-size: 14px; color: var(--jj-text-sub); margin: 0; }

/* ── Search form ── */
.search-form { display: flex; flex-direction: column; gap: 8px; }
.search-row  { display: flex; gap: 8px; }
.search-input {
  flex: 1;
  height: 48px;
  border: 1.5px solid var(--jj-border);
  border-radius: 12px;
  padding: 0 16px;
  font-size: 15px;
  color: var(--jj-text);
  outline: none;
  transition: border-color .18s;
  background: var(--jj-white);
}
.search-input:focus { border-color: var(--jj-rose); }
.search-btn {
  height: 48px;
  padding: 0 24px;
  background: var(--jj-rose-dark);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background .15s;
}
.search-btn:hover:not(:disabled) { background: var(--jj-rose); }
.search-btn:disabled { opacity: .5; cursor: not-allowed; }
.error-msg   { font-size: 13px; color: #ef4444; font-weight: 600; margin: 0; }
.search-hint { font-size: 12px; color: var(--jj-text-sub); margin: 0; }

/* ── Order Summary ── */
.order-summary {
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.summary-row  { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.summary-label { color: var(--jj-text-sub); font-weight: 500; }
.summary-val   { font-weight: 600; color: var(--jj-text); }
.order-no-val  { font-family: monospace; font-size: 15px; font-weight: 800; color: var(--jj-rose-dark); }
.price-val     { color: var(--jj-rose-dark); font-size: 16px; font-weight: 800; }

/* ── Timeline ── */
.timeline-section {
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.timeline-title { font-size: 13px; font-weight: 700; color: var(--jj-text-sub); }

.order-timeline {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4px 0;
  gap: 0;
}
.tl-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  gap: 6px;
}
.tl-dot {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: #e9e8db;
  border: 2.5px solid #d5d4c8;
  display: flex; align-items: center; justify-content: center;
  position: relative; z-index: 1;
  transition: background .3s, border-color .3s;
}
.tl-icon { font-size: 16px; }
.tl-line {
  position: absolute;
  top: 19px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2.5px;
  background: #d5d4c8;
  transition: background .3s;
}
.tl-line-done { background: var(--jj-rose); }
.tl-label { font-size: 11px; color: var(--jj-text-sub); font-weight: 500; text-align: center; white-space: nowrap; }

.tl-step.tl-done .tl-dot  { background: var(--jj-rose-light); border-color: var(--jj-rose); }
.tl-step.tl-done .tl-label { color: var(--jj-rose-dark); font-weight: 600; }
.tl-step.tl-active .tl-dot {
  background: var(--jj-rose-dark); border-color: var(--jj-rose-dark);
  box-shadow: 0 0 0 4px var(--jj-rose-light);
}
.tl-step.tl-active .tl-icon  { filter: brightness(10); }
.tl-step.tl-active .tl-label { color: var(--jj-rose-dark); font-weight: 700; }
.tl-step.tl-cancelled .tl-dot { background: #fee2e2; border-color: #f87171; }
.tl-step.tl-cancelled .tl-label { color: #b91c1c; }

.cancelled-notice {
  font-size: 13px;
  color: #b91c1c;
  background: #fee2e2;
  border-radius: 8px;
  padding: 10px 14px;
  text-align: center;
}
.tracking-no-block {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  padding: 8px 12px;
  background: #f7f6f0;
  border-radius: 8px;
}
.tn-label { color: var(--jj-text-sub); font-weight: 600; flex-shrink: 0; }
.tn-val   { font-family: monospace; font-weight: 700; color: var(--jj-text); }

/* ── Actions ── */
.result-actions {
  display: flex;
  gap: 10px;
}
.btn-secondary {
  flex: 1;
  height: 46px;
  background: #e9e8db;
  border: 1px solid #d5d4c8;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: var(--jj-text);
  transition: background .15s;
}
.btn-secondary:hover { background: #d5d4c8; }
.btn-line {
  flex: 1;
  height: 46px;
  background: #06C755;
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background .15s;
}
.btn-line:hover { background: #05b04d; }

/* ── Spinner ── */
.spin-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.5); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

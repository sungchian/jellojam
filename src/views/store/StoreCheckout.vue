<template>
  <div class="checkout-page">

    <!-- Step bar -->
    <div class="step-bar">
      <span :class="['step', submitted ? 'step-done' : 'step-active']">① {{ t('checkout.step1') }}</span>
      <span class="step-arrow">→</span>
      <span :class="['step', submitted ? 'step-done' : '']">② {{ t('checkout.step2') }}</span>
      <span class="step-arrow">→</span>
      <span :class="['step', submitted ? 'step-active' : '']">③ {{ t('checkout.step3') }}</span>
    </div>

    <!-- ── Success screen ── -->
    <div v-if="submitted" class="success-screen">
      <div class="success-icon">🎉</div>
      <h2 class="success-title">{{ t('checkout.success_title') }}</h2>
      <p class="success-sub">{{ t('checkout.success_sub') }}</p>

      <!-- Order number -->
      <div class="success-order-no">
        <span class="order-label">{{ t('checkout.order_no') }}</span>
        <span class="order-no">{{ orderNo }}</span>
      </div>

      <!-- Bank transfer card (only when paid by transfer) -->
      <div v-if="paidByTransfer" class="transfer-card">
        <div class="transfer-header">
          <span class="transfer-icon">🏦</span>
          <span class="transfer-heading">請於 24 小時內完成匯款</span>
        </div>
        <div class="transfer-rows">
          <div class="transfer-row">
            <span class="tr-label">銀行</span>
            <span class="tr-val">{{ BANK_INFO.bank }}（{{ BANK_INFO.branch }}）</span>
          </div>
          <div class="transfer-row">
            <span class="tr-label">戶名</span>
            <span class="tr-val">{{ BANK_INFO.holder }}</span>
          </div>
          <div class="transfer-row highlight-row">
            <span class="tr-label">帳號</span>
            <span class="tr-val account-no">{{ BANK_INFO.account }}</span>
          </div>
          <div class="transfer-row highlight-row">
            <span class="tr-label">金額</span>
            <span class="tr-val amount-val">NT${{ finalTotal.toLocaleString() }}</span>
          </div>
        </div>
        <p class="transfer-note">✦ 匯款後請務必透過 LINE 傳送轉帳截圖，方便我們確認</p>
      </div>

      <!-- LINE contact block -->
      <div class="line-contact-block">
        <p class="line-contact-msg">
          {{ paidByTransfer ? '完成匯款後，請加入 LINE 官方帳號傳送截圖' : '有任何問題，歡迎透過 LINE 官方帳號聯絡我們' }}
        </p>
        <a :href="BANK_INFO.line_url" target="_blank" rel="noopener" class="btn-line">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.208 2 11.423c0 4.661 3.671 8.557 8.637 9.285.337.073.795.224.912.514.105.263.069.675.034.94l-.148.89c-.045.268-.209 1.046.916.57 1.125-.476 6.067-3.573 8.277-6.117C22.057 15.174 22 13.327 22 11.423 22 6.208 17.523 2 12 2z"/>
          </svg>
          私訊 LINE 官方帳號確認訂單
        </a>
      </div>

      <RouterLink to="/store/catalog" class="btn-continue-shop">{{ t('checkout.keep_shopping') }}</RouterLink>
    </div>

    <!-- ── Checkout layout ── -->
    <div v-else class="checkout-layout">

      <!-- Left: form -->
      <div class="checkout-form-col">

        <!-- Section 1: 收件資料 -->
        <section class="form-section">
          <h2 class="section-title">📋 {{ t('checkout.receiver') }}</h2>
          <div class="form-grid">
            <div class="form-field">
              <label class="field-label">{{ t('checkout.name') }} <span class="required">*</span></label>
              <input
                v-model="form.name"
                class="field-input"
                type="text"
                :placeholder="t('checkout.name_ph')"
              />
            </div>
            <div class="form-field">
              <label class="field-label">{{ t('checkout.phone') }} <span class="required">*</span></label>
              <input
                v-model="form.phone"
                class="field-input"
                type="tel"
                inputmode="numeric"
                pattern="[0-9]*"
                :placeholder="t('checkout.phone_ph')"
                @input="form.phone = form.phone.replace(/\D/g, '')"
              />
            </div>
            <div class="form-field">
              <label class="field-label">{{ t('checkout.line_id') }} <span class="optional">（選填）</span></label>
              <input
                v-model="form.lineId"
                class="field-input"
                type="text"
                :placeholder="t('checkout.line_ph')"
              />
            </div>
            <div class="form-field">
              <label class="field-label">{{ t('checkout.email') }} <span class="optional">（選填）</span></label>
              <input
                v-model="form.email"
                class="field-input"
                type="email"
                :placeholder="t('checkout.email_ph')"
              />
            </div>
          </div>
        </section>

        <!-- Section 2: 取貨方式 -->
        <section class="form-section">
          <h2 class="section-title">🚚 {{ t('checkout.shipping_title') }}</h2>
          <div class="radio-group">
            <label class="radio-card" :class="{ selected: form.shippingMethod === '711' }">
              <input type="radio" v-model="form.shippingMethod" value="711" />
              <div class="radio-content">
                <span class="radio-title">🏪 {{ t('checkout.ship_711') }}</span>
                <span class="radio-sub">{{ t('checkout.ship_711_fee') }}</span>
              </div>
            </label>
            <label class="radio-card" :class="{ selected: form.shippingMethod === 'home' }">
              <input type="radio" v-model="form.shippingMethod" value="home" />
              <div class="radio-content">
                <span class="radio-title">🚚 {{ t('checkout.ship_home') }}</span>
                <span class="radio-sub">{{ t('checkout.ship_home_fee') }}</span>
              </div>
            </label>
          </div>

          <div v-if="form.shippingMethod === '711'" class="conditional-field">
            <label class="field-label">{{ t('checkout.store_name') }} <span class="required">*</span></label>
            <input
              v-model="form.storeName"
              class="field-input"
              type="text"
              :placeholder="t('checkout.store_name_ph')"
            />
          </div>
        </section>

        <!-- Section 3: 加購商品 -->
        <section class="form-section">
          <div
            class="collapsible-header"
            @click="addonOpen = !addonOpen"
          >
            <h2 class="section-title" style="margin:0">🎁 {{ t('checkout.addon_title') }} <span class="optional">（選填）</span></h2>
            <span class="collapse-toggle">{{ addonOpen ? '▲' : '▼' }}</span>
          </div>

          <div v-show="addonOpen" class="addon-list">
            <div
              v-for="(opt, idx) in addonSelections"
              :key="opt.name"
              class="addon-row"
            >
              <label class="addon-check-label">
                <input type="checkbox" v-model="addonSelections[idx].checked" />
                <span class="addon-name">{{ opt.name }}</span>
              </label>
              <span class="addon-price">
                {{ opt.price === 0 ? t('checkout.addon_toggle') : `NT$${opt.price}` }}
              </span>
              <div v-if="opt.checked" class="addon-qty">
                <button class="qty-btn" @click="changeAddonQty(idx, -1)" :disabled="opt.qty <= 1">−</button>
                <span class="addon-qty-val">{{ opt.qty }}</span>
                <button class="qty-btn" @click="changeAddonQty(idx, 1)" :disabled="opt.qty >= (opt.maxQty ?? 99)">＋</button>
              </div>
              <span v-else class="addon-qty-placeholder"></span>
            </div>
          </div>
        </section>

        <!-- Section 3.5: 優惠碼 -->
        <section class="form-section coupon-section">
          <h2 class="section-title">🎟️ 優惠碼 <span class="optional">（選填）</span></h2>
          <div class="coupon-row">
            <input
              v-model="couponInput"
              class="field-input coupon-input"
              type="text"
              placeholder="請輸入優惠碼"
              :disabled="!!appliedCoupon || couponChecking"
              @keydown.enter="applyCoupon"
              @input="couponError = ''"
            />
            <button
              v-if="!appliedCoupon"
              class="coupon-btn"
              @click="applyCoupon"
              :disabled="!couponInput.trim() || couponChecking"
            >
              <span v-if="couponChecking" class="spin-sm"></span>
              {{ couponChecking ? '' : '套用' }}
            </button>
            <button v-else class="coupon-remove-btn" @click="removeCoupon" title="移除優惠碼">✕</button>
          </div>
          <div v-if="appliedCoupon" class="coupon-applied">
            <span class="coupon-tag">{{ appliedCoupon.code }}</span>
            <span class="coupon-desc">{{ appliedCoupon.description }} — 折抵 NT${{ discountAmount }}</span>
          </div>
          <p v-if="couponError" class="coupon-error">{{ couponError }}</p>
        </section>

        <!-- Section 4: 付款方式 -->
        <section class="form-section">
          <h2 class="section-title">💳 {{ t('checkout.payment_title') }}</h2>
          <div class="radio-group">
            <label class="radio-card" :class="{ selected: form.paymentMethod === 'transfer' }">
              <input type="radio" v-model="form.paymentMethod" value="transfer" />
              <div class="radio-content">
                <span class="radio-title">🏦 {{ t('checkout.pay_transfer') }}</span>
                <span class="radio-sub">{{ t('checkout.pay_transfer_sub') }}</span>
              </div>
            </label>
            <label class="radio-card" :class="{ selected: form.paymentMethod === 'cod' }">
              <input type="radio" v-model="form.paymentMethod" value="cod" />
              <div class="radio-content">
                <span class="radio-title">💵 {{ t('checkout.pay_cod') }}</span>
                <span class="radio-sub">{{ t('checkout.pay_cod_sub') }}</span>
              </div>
            </label>
          </div>
        </section>

        <!-- Section 5: 訂單備註 -->
        <section class="form-section">
          <h2 class="section-title">📝 {{ t('checkout.note_title') }}</h2>
          <textarea
            v-model="form.note"
            class="field-textarea"
            rows="3"
            :placeholder="t('checkout.note_ph')"
          ></textarea>
        </section>

        <!-- Error message -->
        <p v-if="formError" class="form-error">{{ formError }}</p>

      </div>

      <!-- Right: order summary -->
      <div class="checkout-summary">
        <h2 class="summary-title">{{ t('checkout.order_summary') }}</h2>

        <!-- Cart items -->
        <div class="summary-items">
          <div
            v-for="item in cart.items"
            :key="item.id"
            class="summary-item"
          >
            <span class="si-name">{{ item.product_name }}</span>
            <span class="si-qty">×{{ item.qty }}</span>
            <span class="si-price">NT${{ (item.price * item.qty).toLocaleString() }}</span>
          </div>
        </div>

        <!-- Addon items -->
        <div v-if="selectedAddons.length > 0" class="summary-addons">
          <div class="summary-section-label">{{ t('checkout.addon_title') }}</div>
          <div
            v-for="addon in selectedAddons"
            :key="addon.name"
            class="summary-item"
          >
            <span class="si-name">{{ addon.name }}</span>
            <span class="si-qty">×{{ addon.qty }}</span>
            <span class="si-price">
              {{ addon.price === 0 ? t('checkout.addon_toggle') : `NT$${(addon.price * addon.qty).toLocaleString()}` }}
            </span>
          </div>
        </div>

        <div class="summary-divider"></div>

        <!-- Price breakdown -->
        <div class="summary-rows">
          <div class="summary-row">
            <span>{{ t('checkout.order_summary') }}</span>
            <span>NT${{ cartSubtotal.toLocaleString() }}</span>
          </div>
          <div v-if="addonTotal > 0" class="summary-row">
            <span>{{ t('checkout.addon_total') }}</span>
            <span>NT${{ addonTotal.toLocaleString() }}</span>
          </div>
          <div class="summary-row">
            <span>{{ t('checkout.shipping_fee') }}</span>
            <span :class="{ 'free-ship': shipping === 0 }">
              {{ shipping === 0 ? t('checkout.addon_toggle') : `NT$${shipping}` }}
            </span>
          </div>
          <div v-if="codFee > 0" class="summary-row">
            <span>{{ t('checkout.cod_fee') }}</span>
            <span>NT${{ codFee }}</span>
          </div>
          <div v-if="discountAmount > 0" class="summary-row discount-row">
            <span>🎟️ 優惠折抵</span>
            <span class="discount-val">－NT${{ discountAmount }}</span>
          </div>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-total">
          <span>{{ t('checkout.grand_total') }}</span>
          <span class="total-amount">NT${{ grandTotal.toLocaleString() }}</span>
        </div>

        <!-- Points preview -->
        <div class="points-preview">
          🎁 {{ t('checkout.earn_preview', { n: earnPoints }) }}
        </div>

        <button
          class="btn-submit"
          @click="submitOrder"
          :disabled="submitting"
        >
          {{ submitting ? t('checkout.submitting') : t('checkout.submit') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCartStore } from '@/stores/cart'
import { useStoreAuthStore } from '@/stores/storeAuth'
import { useAppDataStore } from '@/stores/appData'
import { supabase } from '@/lib/supabase'

const { t } = useI18n()
const router = useRouter()
const cart = useCartStore()
const memberStore = useStoreAuthStore()
const appData = useAppDataStore()

// Redirect if cart is empty; pre-fill form from logged-in member
onMounted(() => {
  if (cart.itemCount === 0) {
    router.replace('/store/catalog')
    return
  }
  const c = memberStore.customer
  if (c) {
    if (c.name || c.display_name) form.name  = c.display_name || c.name
    if (c.email)                   form.email = c.email
    if (c.line_user_id)            form.lineId = c.line_user_id
  }
})

// ── Form state ────────────────────────────────────────────────────────────────
const form = reactive({
  name: '',
  phone: '',
  lineId: '',
  email: '',
  shippingMethod: '711',
  storeName: '',
  paymentMethod: 'transfer',
  note: '',
})

// ── Addon options ─────────────────────────────────────────────────────────────
const ADDON_OPTIONS = [
  { name: '防水破壞袋', price: 0, maxQty: 1 },
  { name: '紙箱', price: 20 },
  { name: 'Jellycat防塵袋-小', price: 80 },
  { name: 'Jellycat防塵袋-中', price: 150 },
  { name: 'Jellycat防塵袋（大）', price: 250 },
  { name: 'Jellycat紙袋（中）', price: 150 },
  { name: 'Jellycat紙袋（大）', price: 250 },
]

const addonSelections = reactive(
  ADDON_OPTIONS.map((opt, idx) => ({
    ...opt,
    checked: idx === 0, // 防水破壞袋 checked by default
    qty: 1,
  }))
)

const addonOpen = ref(true)

function changeAddonQty(idx, delta) {
  const opt  = addonSelections[idx]
  const maxQ = opt.maxQty ?? Infinity
  const next = opt.qty + delta
  if (next >= 1 && next <= maxQ) opt.qty = next
}

const selectedAddons = computed(() =>
  addonSelections.filter(a => a.checked)
)

const addonTotal = computed(() =>
  selectedAddons.value.reduce((sum, a) => sum + a.price * a.qty, 0)
)

// ── Pricing ───────────────────────────────────────────────────────────────────
const cartSubtotal = computed(() => cart.subtotal)

const shipping = computed(() => {
  if (form.shippingMethod === 'home') return 100
  return cartSubtotal.value >= 1500 ? 0 : 60
})

const codFee = computed(() => (form.paymentMethod === 'cod' ? 30 : 0))

// ── Coupon ────────────────────────────────────────────────────────────────────
const couponInput    = ref('')
const couponChecking = ref(false)
const couponError    = ref('')
const appliedCoupon  = ref(null)   // { code, description, discount_type, discount_value }

const discountAmount = computed(() => {
  if (!appliedCoupon.value) return 0
  const c = appliedCoupon.value
  const base = cartSubtotal.value + addonTotal.value + shipping.value + codFee.value
  if (c.discount_type === 'fixed')   return Math.min(c.discount_value, base)
  if (c.discount_type === 'percent') return Math.floor(base * c.discount_value / 100)
  return 0
})

async function applyCoupon() {
  const code = couponInput.value.trim().toUpperCase()
  if (!code) return

  couponChecking.value = true
  couponError.value    = ''

  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('code, description, discount_type, discount_value, min_order_amount, expires_at, usage_limit, used_count, is_active')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('[coupon] query error, code:', error?.code)
      couponError.value = '查詢優惠碼失敗，請稍後再試'
      return
    }
    if (!data) {
      couponError.value = '此優惠碼無效或已過期'
      return
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      couponError.value = '此優惠碼已過期'
      return
    }
    if (data.usage_limit && data.used_count >= data.usage_limit) {
      couponError.value = '此優惠碼已達使用上限'
      return
    }
    if (data.min_order_amount && cartSubtotal.value < data.min_order_amount) {
      couponError.value = `此優惠碼需訂單滿 NT$${data.min_order_amount} 才可使用`
      return
    }
    appliedCoupon.value  = data
    couponInput.value    = ''
  } catch (e) {
    console.error('[coupon] unexpected error, code:', e?.code)
    couponError.value = '查詢優惠碼失敗，請稍後再試'
  } finally {
    couponChecking.value = false
  }
}

function removeCoupon() {
  appliedCoupon.value = null
  couponInput.value   = ''
  couponError.value   = ''
}

const grandTotal = computed(
  () => Math.max(0, cartSubtotal.value + addonTotal.value + shipping.value + codFee.value - discountAmount.value)
)

const earnPoints = computed(() => cart.items.reduce((sum, item) => sum + item.qty, 0))

// ── Bank transfer info (update these before going live) ───────────────────────
const BANK_INFO = {
  bank:    '中國信託',        // 銀行名稱
  branch:  '822',        // 分行
  account: '761540221196',  // ← 換成真實帳號
  holder:  'JelloJam',        // 戶名
  line_url: 'https://line.me/ti/p/~@685evhie', // ← 換成真實 LINE 連結
}

// ── Submission ────────────────────────────────────────────────────────────────
const submitting   = ref(false)
const submitted    = ref(false)
const orderNo      = ref('')
const formError    = ref('')
const paidByTransfer = ref(false)
const finalTotal   = ref(0)

// Local calendar date (YYYY-MM-DD). toISOString() is UTC and would record
// tomorrow's date for evening North-America shoppers.
function todayLocal() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function genOrderNo(dateStr) {
  const datePart = dateStr.replace(/-/g, '')
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `ORD${datePart}${rand}`
}

function dateToWeek(dateStr) {
  const [y, m, day] = String(dateStr).split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, day || 1)
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((date - startOfYear) / 86400000)
  const weekNo = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
  return `${date.getFullYear()}${String(weekNo).padStart(2, '0')}`
}

// Idempotency key persisted for THIS cart, so a retry (reload, timeout re-click)
// reuses the same key and the orders.idempotency_key UNIQUE constraint actually
// dedupes. Reset whenever the cart contents change (see submitOrder success).
function getIdempotencyKey() {
  const KEY = 'jj_checkout_idem'
  let k = sessionStorage.getItem(KEY)
  if (!k) {
    k = crypto.randomUUID()
    try { sessionStorage.setItem(KEY, k) } catch {}
  }
  return k
}

async function submitOrder() {
  // Idempotency guard: prevent double-submit (e.g. network lag → user clicks again)
  if (submitting.value) return

  formError.value = ''

  // Validation
  if (!form.name.trim()) {
    formError.value = t('checkout.err_name')
    return
  }
  if (!form.phone.trim()) {
    formError.value = t('checkout.err_phone')
    return
  }
  if (form.shippingMethod === '711' && !form.storeName.trim()) {
    formError.value = t('checkout.err_store')
    return
  }

  submitting.value = true

  // 20 秒超時保護
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('請求逾時，請檢查網路後重試')), 20000)
  })

  try {
    const today = todayLocal()
    const salesWeek = dateToWeek(today)
    // Stable across retries for this cart so the server-side idempotency check
    // dedupes duplicate submissions (reload / timeout re-click).
    const idempotencyKey = getIdempotencyKey()

    // Server-side order creation. We send ONLY product ids + quantities and the
    // customer's own contact info — every price/fee/discount is recomputed by
    // create_storefront_order() (SECURITY DEFINER) from the catalog, so the
    // client cannot tamper with amounts and never touches the orders table
    // directly. This also enforces stock, coupons and idempotency atomically.
    const payload = {
      idempotency_key: idempotencyKey,
      customer_id:     memberStore.customer?.id ?? null,
      customer_name:   form.name,
      phone:           form.phone   || null,
      line_user_id:    form.lineId   || null,
      email:           form.email    || null,
      logistics_name:  form.storeName || null,
      note:            form.note      || null,
      sales_date:      today,
      sales_week:      salesWeek,
      shipping_method: form.shippingMethod,
      payment_method:  form.paymentMethod,
      coupon_code:     appliedCoupon.value?.code || null,
      items:  cart.items.map(item => ({ product_id: item.id, qty: item.qty })),
      addons: selectedAddons.value.map(a => ({ name: a.name, qty: a.qty })),
    }

    const { data: result, error: rpcErr } = await Promise.race([
      supabase.rpc('create_storefront_order', { p_payload: payload }),
      timeoutPromise,
    ])

    if (rpcErr) {
      // Out-of-stock → show a clear, user-facing message instead of the generic one.
      if (rpcErr.hint === 'INSUFFICIENT_STOCK' || /INSUFFICIENT_STOCK/.test(rpcErr.message || '')) {
        throw new Error('很抱歉，部分商品庫存不足，請調整數量後再試')
      }
      throw rpcErr
    }

    // Success (result also carries the authoritative server-computed total)
    clearTimeout(timeoutId)
    orderNo.value        = result?.order_no || ''
    paidByTransfer.value = form.paymentMethod === 'transfer'
    finalTotal.value     = Number(result?.total) || grandTotal.value
    submitted.value      = true
    // New key for the next order; this cart is done.
    sessionStorage.removeItem('jj_checkout_idem')
    cart.clear()
  } catch (err) {
    clearTimeout(timeoutId)
    // Log error code only — never log full error object (may contain schema/data details)
    console.error('[checkout] submitOrder failed, code:', err?.code ?? 'unknown')
    // Show user-friendly message; don't expose Supabase internals (hint/details)
    const passthrough = err?.message && (
      err.message === '請求逾時，請檢查網路後重試' ||
      err.message.startsWith('很抱歉')
    )
    const msg = passthrough ? err.message : '訂單送出失敗，請稍後再試或聯繫客服'
    formError.value = msg
    // 自動捲到錯誤訊息
    setTimeout(() => {
      document.querySelector('.form-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.checkout-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* ── Coupon ────────────────────────────────────── */
.coupon-section { background: #fffbf0; border: 1.5px dashed #fcd34d; border-radius: 14px; }
.coupon-row { display: flex; gap: 8px; }
.coupon-input { flex: 1; font-family: monospace; letter-spacing: 1px; text-transform: uppercase; }
.coupon-btn {
  height: 44px; padding: 0 20px; background: var(--jj-rose-dark); color: #fff;
  border: none; border-radius: 10px; font-size: 14px; font-weight: 700;
  cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 6px;
  transition: background .15s;
}
.coupon-btn:hover:not(:disabled) { background: var(--jj-rose); }
.coupon-btn:disabled { opacity: .45; cursor: not-allowed; }
.coupon-remove-btn {
  height: 44px; width: 44px; background: #fee2e2; color: #b91c1c;
  border: none; border-radius: 10px; font-size: 16px; font-weight: 700;
  cursor: pointer; flex-shrink: 0; transition: background .15s;
}
.coupon-remove-btn:hover { background: #fecaca; }
.coupon-applied {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: #065f46;
}
.coupon-tag {
  background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;
  border-radius: 6px; padding: 2px 10px; font-family: monospace; font-weight: 700; font-size: 13px;
}
.coupon-desc { color: #065f46; font-weight: 500; }
.coupon-error { font-size: 13px; color: #ef4444; font-weight: 600; margin: 0; }
.discount-row { color: #065f46; }
.discount-val { font-weight: 800; color: #065f46; }
.spin-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.5); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Step bar ─────────────────────────────────── */
.step-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
  font-size: 14px;
  font-weight: 600;
  flex-wrap: wrap;
}

.step {
  padding: 6px 16px;
  border-radius: 999px;
  background: var(--jj-cream);
  color: var(--jj-text-sub);
  border: 1.5px solid var(--jj-border);
}

.step-active {
  background: var(--jj-rose);
  color: #fff;
  border-color: var(--jj-rose);
}

.step-done {
  background: #d1fae5;
  color: #065f46;
  border-color: #a7f3d0;
}

.step-arrow {
  color: var(--jj-text-sub);
  font-size: 16px;
}

/* ── Success screen ───────────────────────────── */
.success-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
  text-align: center;
}

.success-icon {
  font-size: 80px;
  margin-bottom: 16px;
}

.success-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--jj-text);
  margin: 0 0 8px;
}

.success-sub {
  font-size: 15px;
  color: var(--jj-text-sub);
  margin: 0 0 24px;
}

.success-order-no {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--jj-rose-pale);
  border-radius: 14px;
  padding: 16px 32px;
  margin-bottom: 28px;
}

.order-label {
  font-size: 12px;
  color: var(--jj-text-sub);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.order-no {
  font-size: 22px;
  font-weight: 800;
  color: var(--jj-rose-dark);
  letter-spacing: 0.08em;
}

.btn-continue-shop {
  display: inline-block;
  padding: 14px 36px;
  background: var(--jj-rose);
  color: #fff;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.2s;
}

.btn-continue-shop:hover {
  background: var(--jj-rose-dark);
}

/* ── Transfer card ────────────────────────────── */
.transfer-card {
  width: 100%;
  max-width: 440px;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 20px;
  text-align: left;
}

.transfer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.transfer-icon { font-size: 22px; }

.transfer-heading {
  font-size: 15px;
  font-weight: 700;
  color: #166534;
}

.transfer-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.transfer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.tr-label {
  color: #4b5563;
  font-weight: 500;
  flex-shrink: 0;
  width: 48px;
}

.tr-val {
  color: #111827;
  font-weight: 500;
  text-align: right;
}

.highlight-row {
  background: rgba(255,255,255,0.7);
  border-radius: 8px;
  padding: 8px 10px;
}

.account-no {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #166534;
  font-variant-numeric: tabular-nums;
}

.amount-val {
  font-size: 20px;
  font-weight: 900;
  color: var(--jj-rose-dark);
}

.transfer-note {
  font-size: 12px;
  color: #4b7c5a;
  margin: 0;
  line-height: 1.5;
}

/* ── LINE contact block ───────────────────────── */
.line-contact-block {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.line-contact-msg {
  margin: 0;
  font-size: 14px;
  color: var(--jj-text-sub);
  text-align: center;
}

.btn-line {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #06c755;
  color: #fff;
  padding: 13px 28px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.1s;
}

.btn-line:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

/* ── Checkout layout ──────────────────────────── */
.checkout-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.checkout-form-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Form sections ────────────────────────────── */
.form-section {
  background: var(--jj-white);
  border-radius: var(--jj-radius);
  box-shadow: var(--jj-shadow);
  padding: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--jj-text);
  margin: 0 0 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--jj-text);
}

.required {
  color: #ef4444;
}

.optional {
  font-weight: 400;
  color: var(--jj-text-sub);
  font-size: 12px;
}

.field-input {
  height: 42px;
  padding: 0 14px;
  border: 1.5px solid var(--jj-border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--jj-text);
  background: var(--jj-cream);
  transition: border-color 0.15s;
  outline: none;
}

.field-input:focus {
  border-color: var(--jj-rose);
  background: var(--jj-white);
}

.conditional-field {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Radio cards */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 2px solid var(--jj-border);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.radio-card input[type='radio'] {
  accent-color: var(--jj-rose);
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.radio-card.selected {
  border-color: var(--jj-rose);
  background: var(--jj-rose-pale);
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.radio-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--jj-text);
}

.radio-sub {
  font-size: 12px;
  color: var(--jj-text-sub);
}

/* Collapsible header */
.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  margin-bottom: 16px;
  user-select: none;
}

.collapse-toggle {
  font-size: 12px;
  color: var(--jj-text-sub);
}

/* Addon list */
.addon-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.addon-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--jj-cream);
  border-radius: 10px;
}

.addon-check-label {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  cursor: pointer;
}

.addon-check-label input[type='checkbox'] {
  accent-color: var(--jj-rose);
  width: 16px;
  height: 16px;
}

.addon-name {
  font-size: 14px;
  color: var(--jj-text);
}

.addon-price {
  font-size: 13px;
  font-weight: 600;
  color: var(--jj-rose-dark);
  min-width: 60px;
  text-align: right;
}

.addon-qty {
  display: flex;
  align-items: center;
  gap: 6px;
}

.addon-qty-placeholder {
  width: 76px;
}

.addon-qty-val {
  min-width: 24px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--jj-text);
}

.qty-btn {
  width: 26px;
  height: 26px;
  border: 1.5px solid var(--jj-border);
  border-radius: 7px;
  background: var(--jj-white);
  color: var(--jj-text);
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.15s, border-color 0.15s;
}

.qty-btn:hover:not(:disabled) {
  background: var(--jj-rose-pale);
  border-color: var(--jj-rose);
}

.qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Textarea */
.field-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--jj-border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--jj-text);
  background: var(--jj-cream);
  resize: vertical;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.field-textarea:focus {
  border-color: var(--jj-rose);
  background: var(--jj-white);
}

.form-error {
  background: #fee2e2;
  color: #dc2626;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

/* ── Checkout summary ─────────────────────────── */
.checkout-summary {
  width: 320px;
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
  margin: 0 0 16px;
}

.summary-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.summary-addons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.summary-section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--jj-text-sub);
  margin-bottom: 2px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.si-name {
  flex: 1;
  color: var(--jj-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.si-qty {
  color: var(--jj-text-sub);
  flex-shrink: 0;
}

.si-price {
  font-weight: 600;
  color: var(--jj-text);
  flex-shrink: 0;
  min-width: 60px;
  text-align: right;
}

.summary-divider {
  border: none;
  border-top: 1px solid var(--jj-border);
  margin: 12px 0;
}

.summary-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--jj-text-sub);
}

.free-ship {
  color: #10b981;
  font-weight: 600;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--jj-text);
  margin-bottom: 16px;
}

.total-amount {
  font-size: 22px;
  font-weight: 800;
  color: var(--jj-rose-dark);
}

.points-preview {
  text-align: center;
  font-size: 13px;
  color: var(--jj-plum);
  background: #f5f3ff;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
}

.btn-submit {
  width: 100%;
  height: 52px;
  background: var(--jj-rose);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s, opacity 0.15s;
}

.btn-submit:hover:not(:disabled) {
  background: var(--jj-rose-dark);
}

.btn-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Responsive ───────────────────────────────── */
@media (max-width: 780px) {
  .checkout-layout {
    flex-direction: column;
  }

  .checkout-summary {
    width: 100%;
    position: static;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="checkout-page">

    <!-- Step bar -->
    <div class="step-bar">
      <span :class="['step', submitted ? 'step-done' : 'step-active']">① 填寫資料</span>
      <span class="step-arrow">→</span>
      <span :class="['step', submitted ? 'step-done' : '']">② 確認訂單</span>
      <span class="step-arrow">→</span>
      <span :class="['step', submitted ? 'step-active' : '']">③ 完成</span>
    </div>

    <!-- ── Success screen ── -->
    <div v-if="submitted" class="success-screen">
      <div class="success-icon">🎉</div>
      <h2 class="success-title">訂單已送出！</h2>
      <p class="success-sub">感謝您的購買，我們將盡快與您聯繫。</p>
      <div class="success-order-no">
        <span class="order-label">訂單編號</span>
        <span class="order-no">{{ orderNo }}</span>
      </div>
      <RouterLink to="/store/catalog" class="btn-continue-shop">繼續購物</RouterLink>
    </div>

    <!-- ── Checkout layout ── -->
    <div v-else class="checkout-layout">

      <!-- Left: form -->
      <div class="checkout-form-col">

        <!-- Section 1: 收件資料 -->
        <section class="form-section">
          <h2 class="section-title">📋 收件資料</h2>
          <div class="form-grid">
            <div class="form-field">
              <label class="field-label">姓名 <span class="required">*</span></label>
              <input
                v-model="form.name"
                class="field-input"
                type="text"
                placeholder="請輸入真實姓名"
              />
            </div>
            <div class="form-field">
              <label class="field-label">手機號碼 <span class="required">*</span></label>
              <input
                v-model="form.phone"
                class="field-input"
                type="tel"
                placeholder="09xx-xxx-xxx"
              />
            </div>
            <div class="form-field">
              <label class="field-label">LINE ID <span class="optional">（選填）</span></label>
              <input
                v-model="form.lineId"
                class="field-input"
                type="text"
                placeholder="您的 LINE ID"
              />
            </div>
            <div class="form-field">
              <label class="field-label">Email <span class="optional">（選填）</span></label>
              <input
                v-model="form.email"
                class="field-input"
                type="email"
                placeholder="email@example.com"
              />
            </div>
          </div>
        </section>

        <!-- Section 2: 取貨方式 -->
        <section class="form-section">
          <h2 class="section-title">🚚 取貨方式</h2>
          <div class="radio-group">
            <label class="radio-card" :class="{ selected: form.shippingMethod === '711' }">
              <input type="radio" v-model="form.shippingMethod" value="711" />
              <div class="radio-content">
                <span class="radio-title">🏪 超商取貨（7-ELEVEN）</span>
                <span class="radio-sub">運費 NT$60（滿 NT$1,500 免運）</span>
              </div>
            </label>
            <label class="radio-card" :class="{ selected: form.shippingMethod === 'home' }">
              <input type="radio" v-model="form.shippingMethod" value="home" />
              <div class="radio-content">
                <span class="radio-title">🚚 宅配到府</span>
                <span class="radio-sub">運費 NT$100</span>
              </div>
            </label>
          </div>

          <div v-if="form.shippingMethod === '711'" class="conditional-field">
            <label class="field-label">門市名稱 <span class="required">*</span></label>
            <input
              v-model="form.storeName"
              class="field-input"
              type="text"
              placeholder="例：台北信義門市"
            />
          </div>
        </section>

        <!-- Section 3: 加購商品 -->
        <section class="form-section">
          <div
            class="collapsible-header"
            @click="addonOpen = !addonOpen"
          >
            <h2 class="section-title" style="margin:0">🎁 加購商品 <span class="optional">（選填）</span></h2>
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
                {{ opt.price === 0 ? '免費' : `NT$${opt.price}` }}
              </span>
              <div v-if="opt.checked" class="addon-qty">
                <button class="qty-btn" @click="changeAddonQty(idx, -1)" :disabled="opt.qty <= 1">−</button>
                <span class="addon-qty-val">{{ opt.qty }}</span>
                <button class="qty-btn" @click="changeAddonQty(idx, 1)">＋</button>
              </div>
              <span v-else class="addon-qty-placeholder"></span>
            </div>
          </div>
        </section>

        <!-- Section 4: 付款方式 -->
        <section class="form-section">
          <h2 class="section-title">💳 付款方式</h2>
          <div class="radio-group">
            <label class="radio-card" :class="{ selected: form.paymentMethod === 'transfer' }">
              <input type="radio" v-model="form.paymentMethod" value="transfer" />
              <div class="radio-content">
                <span class="radio-title">🏦 銀行匯款</span>
                <span class="radio-sub">下單後提供匯款資訊</span>
              </div>
            </label>
            <label class="radio-card" :class="{ selected: form.paymentMethod === 'cod' }">
              <input type="radio" v-model="form.paymentMethod" value="cod" />
              <div class="radio-content">
                <span class="radio-title">💵 貨到付款</span>
                <span class="radio-sub">超商取貨付款，+NT$30 手續費</span>
              </div>
            </label>
          </div>
        </section>

        <!-- Section 5: 訂單備註 -->
        <section class="form-section">
          <h2 class="section-title">📝 訂單備註</h2>
          <textarea
            v-model="form.note"
            class="field-textarea"
            rows="3"
            placeholder="有任何特殊需求或備註請在此填寫..."
          ></textarea>
        </section>

        <!-- Error message -->
        <p v-if="formError" class="form-error">{{ formError }}</p>

      </div>

      <!-- Right: order summary -->
      <div class="checkout-summary">
        <h2 class="summary-title">訂單摘要</h2>

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
          <div class="summary-section-label">加購商品</div>
          <div
            v-for="addon in selectedAddons"
            :key="addon.name"
            class="summary-item"
          >
            <span class="si-name">{{ addon.name }}</span>
            <span class="si-qty">×{{ addon.qty }}</span>
            <span class="si-price">
              {{ addon.price === 0 ? '免費' : `NT$${(addon.price * addon.qty).toLocaleString()}` }}
            </span>
          </div>
        </div>

        <div class="summary-divider"></div>

        <!-- Price breakdown -->
        <div class="summary-rows">
          <div class="summary-row">
            <span>商品小計</span>
            <span>NT${{ cartSubtotal.toLocaleString() }}</span>
          </div>
          <div v-if="addonTotal > 0" class="summary-row">
            <span>加購合計</span>
            <span>NT${{ addonTotal.toLocaleString() }}</span>
          </div>
          <div class="summary-row">
            <span>運費</span>
            <span :class="{ 'free-ship': shipping === 0 }">
              {{ shipping === 0 ? '免運費' : `NT$${shipping}` }}
            </span>
          </div>
          <div v-if="codFee > 0" class="summary-row">
            <span>代收手續費</span>
            <span>NT${{ codFee }}</span>
          </div>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-total">
          <span>總計</span>
          <span class="total-amount">NT${{ grandTotal.toLocaleString() }}</span>
        </div>

        <!-- Points preview -->
        <div class="points-preview">
          🎁 本次獲得 <strong>{{ earnPoints }}</strong> 點
        </div>

        <button
          class="btn-submit"
          @click="submitOrder"
          :disabled="submitting"
        >
          {{ submitting ? '送出中…' : '確認送出訂單' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useStoreMemberStore } from '@/stores/storeMember'
import { useAppDataStore } from '@/stores/appData'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const cart = useCartStore()
const memberStore = useStoreMemberStore()
const appData = useAppDataStore()

// Redirect if cart is empty
onMounted(() => {
  if (cart.itemCount === 0) {
    router.replace('/store/catalog')
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
  { name: '防水破壞袋', price: 0 },
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
  const next = addonSelections[idx].qty + delta
  if (next >= 1) addonSelections[idx].qty = next
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

const grandTotal = computed(
  () => cartSubtotal.value + addonTotal.value + shipping.value + codFee.value
)

const earnPoints = computed(() => cart.items.reduce((sum, item) => sum + item.qty, 0))

// ── Submission ────────────────────────────────────────────────────────────────
const submitting = ref(false)
const submitted = ref(false)
const orderNo = ref('')
const formError = ref('')

function genOrderNo(dateStr) {
  const datePart = dateStr.replace(/-/g, '')
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `ORD${datePart}${rand}`
}

function dateToWeek(dateStr) {
  const date = new Date(dateStr)
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((date - startOfYear) / 86400000)
  const weekNo = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
  return `${date.getFullYear()}${String(weekNo).padStart(2, '0')}`
}

async function submitOrder() {
  formError.value = ''

  // Validation
  if (!form.name.trim()) {
    formError.value = '請填寫姓名'
    return
  }
  if (!form.phone.trim()) {
    formError.value = '請填寫手機號碼'
    return
  }
  if (form.shippingMethod === '711' && !form.storeName.trim()) {
    formError.value = '請填寫取貨門市名稱'
    return
  }

  submitting.value = true

  try {
    const today = new Date().toISOString().slice(0, 10)
    const newOrderNo = genOrderNo(today)
    const salesWeek = dateToWeek(today)

    const addonItemsPayload = selectedAddons.value.map(a => ({
      name: a.name,
      qty: a.qty,
      price: a.price,
    }))

    // Insert order
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_no: newOrderNo,
        customer_id: memberStore.customer?.id ?? null,
        customer_name: form.name,
        sales_date: today,
        sales_week: salesWeek,
        status: '已填表單',
        note: form.note || null,
        logistics_name: form.storeName || null,
        payment_amount: null,
        addon_amount: addonTotal.value || null,
        '711_fee': shipping.value,
        addon_items: addonItemsPayload.length ? addonItemsPayload : null,
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    // Insert order items
    const orderItemsPayload = cart.items.map(item => ({
      order_id: orderData.id,
      product_name: item.product_name,
      qty: item.qty,
      selling_price: item.price,
    }))

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItemsPayload)

    if (itemsErr) throw itemsErr

    // Success
    orderNo.value = newOrderNo
    submitted.value = true
    cart.clear()
  } catch (err) {
    console.error('[checkout] submitOrder error:', err)
    formError.value = `送出失敗：${err.message || '請稍後再試'}`
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
  background: var(--jj-bg);
  color: var(--jj-text-sub);
  border: 1.5px solid var(--jj-border);
}

.step-active {
  background: var(--jj-pink);
  color: #fff;
  border-color: var(--jj-pink);
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
  background: var(--jj-pink-pale);
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
  color: var(--jj-pink-dark);
  letter-spacing: 0.08em;
}

.btn-continue-shop {
  display: inline-block;
  padding: 14px 36px;
  background: var(--jj-pink);
  color: #fff;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.2s;
}

.btn-continue-shop:hover {
  background: var(--jj-pink-dark);
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
  background: var(--jj-bg);
  transition: border-color 0.15s;
  outline: none;
}

.field-input:focus {
  border-color: var(--jj-pink);
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
  accent-color: var(--jj-pink);
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.radio-card.selected {
  border-color: var(--jj-pink);
  background: var(--jj-pink-pale);
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
  background: var(--jj-bg);
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
  accent-color: var(--jj-pink);
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
  color: var(--jj-pink-dark);
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
  background: var(--jj-pink-pale);
  border-color: var(--jj-pink);
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
  background: var(--jj-bg);
  resize: vertical;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.field-textarea:focus {
  border-color: var(--jj-pink);
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
  color: var(--jj-pink-dark);
}

.points-preview {
  text-align: center;
  font-size: 13px;
  color: var(--jj-purple);
  background: #f5f3ff;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
}

.btn-submit {
  width: 100%;
  height: 52px;
  background: var(--jj-pink);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s, opacity 0.15s;
}

.btn-submit:hover:not(:disabled) {
  background: var(--jj-pink-dark);
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

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">訂單詳情</h1>
        <p class="page-subtitle">{{ orderData?.order_no }}</p>
      </div>
      <div style="display:flex;gap:8px">
        <RouterLink to="/orders"><el-button :icon="ArrowLeft">返回列表</el-button></RouterLink>
        <el-dropdown @command="handleStatusChange" :disabled="!orderData || updating">
          <el-button type="primary" :loading="updating">
            更新狀態 <ArrowDown :size="14" style="vertical-align:-2px;margin-left:4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="(cfg, key) in ORDER_STATUSES" :key="key" :command="key">
                <span :class="`badge badge-${cfg.badge}`" style="margin-right:6px">{{ cfg.label }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <div class="loading-spinner"></div>
      <span class="loading-text">載入訂單中…</span>
    </div>

    <!-- Error -->
    <el-empty v-else-if="fetchError" :description="fetchError">
      <el-button type="primary" @click="loadOrder">重新載入</el-button>
    </el-empty>

    <!-- Not found -->
    <el-empty v-else-if="!orderData" description="找不到此訂單" />

    <!-- Content -->
    <div v-else class="detail-grid">
      <div class="detail-left">
        <!-- Order info -->
        <el-card>
          <template #header>
            <div class="card-header-row">
              <span class="card-title">📄 訂單資訊</span>
              <span :class="`badge badge-${statusConfig?.badge || 'inactive'}`">{{ orderData.status }}</span>
            </div>
          </template>
          <div class="info-rows">
            <div class="info-row"><span class="info-label">訂單編號</span><span class="info-val mono">{{ orderData.order_no }}</span></div>
            <div class="info-row"><span class="info-label">下單日期</span><span class="info-val">{{ orderData.sales_date }}</span></div>
            <div class="info-row"><span class="info-label">出貨日期</span><span class="info-val">{{ orderData.shipping_date || '—' }}</span></div>
            <div class="info-row"><span class="info-label">週次</span><span class="info-val">{{ orderData.sales_week }}</span></div>
            <div class="info-row">
              <span class="info-label">群組</span>
              <el-tag v-if="orderData.group_name" size="small" type="info">{{ orderData.group_name }}</el-tag>
              <span v-else class="info-val muted">—</span>
            </div>
          </div>
        </el-card>

        <!-- Customer -->
        <el-card>
          <template #header><span class="card-title">👤 客戶資訊</span></template>
          <div class="info-rows">
            <div class="info-row">
              <span class="info-label">收件姓名</span>
              <span class="info-val">{{ orderData.customer_name || '—' }}</span>
            </div>
            <div class="info-row" v-if="orderData.phone">
              <span class="info-label">手機</span>
              <span class="info-val mono">{{ orderData.phone }}</span>
            </div>
            <div class="info-row" v-if="orderData.line_user_id">
              <span class="info-label">LINE ID</span>
              <span class="info-val mono">{{ orderData.line_user_id }}</span>
            </div>
            <div class="info-row" v-if="orderData.email">
              <span class="info-label">Email</span>
              <span class="info-val mono">{{ orderData.email }}</span>
            </div>
            <div class="info-row" v-if="orderData.logistics_name">
              <span class="info-label">取貨門市</span>
              <span class="info-val">{{ orderData.logistics_name }}</span>
            </div>
          </div>
        </el-card>

        <!-- Pricing -->
        <el-card>
          <template #header><span class="card-title">💰 費用明細</span></template>
          <div class="price-summary">
            <div class="price-row"><span>售價</span><span class="price-val">NT$ {{ totalSelling.toLocaleString() }}</span></div>
            <div class="price-row" v-if="Number(orderData.payment_amount)">
              <span>匯款金額</span><span class="price-val ok">NT$ {{ Number(orderData.payment_amount).toLocaleString() }}</span>
            </div>
            <div class="price-row" v-if="Number(orderData.addon_amount)">
              <span>加購金額</span><span class="price-val">NT$ {{ Number(orderData.addon_amount).toLocaleString() }}</span>
            </div>
            <div class="price-row" v-if="Number(orderData.logistics_price)">
              <span>賣貨便費用</span><span class="price-val">NT$ {{ Number(orderData.logistics_price).toLocaleString() }}</span>
            </div>
            <div class="price-row" v-if="Number(orderData.cost_twd)">
              <span>商品成本</span><span class="price-val cost">NT$ {{ Number(orderData.cost_twd).toLocaleString() }}</span>
            </div>
            <div class="price-row" v-if="Number(orderData.other_twd)">
              <span>其他費用</span><span class="price-val cost">NT$ {{ Number(orderData.other_twd).toFixed(2) }}</span>
            </div>
            <el-divider style="margin:8px 0" />
            <div v-if="profit !== null" class="price-row profit-row">
              <span>利潤</span>
              <span :style="{ color: profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }">
                NT$ {{ profit.toFixed(0) }}
              </span>
            </div>
          </div>
        </el-card>
      </div>

      <div class="detail-right">
        <!-- Products -->
        <el-card>
          <template #header><span class="card-title">📦 商品</span></template>
          <div v-if="orderItems.length">
            <div v-for="item in orderItems" :key="item.id" class="product-block">
              <div class="product-name">{{ item.product_name }}</div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:12px;color:var(--color-text-muted)">x{{ item.qty }}</span>
                <span class="product-price">NT$ {{ Number(item.selling_price || 0).toLocaleString() }}</span>
              </div>
            </div>
          </div>
          <div v-else class="product-block">
            <div class="product-name">{{ orderData.product_name || '—' }}</div>
          </div>
        </el-card>

        <!-- Notes -->
        <el-card v-if="orderData.note">
          <template #header><span class="card-title">📝 備註</span></template>
          <div class="note-block">{{ orderData.note }}</div>
        </el-card>

        <!-- Status change log -->
        <el-card v-if="statusLogs.length">
          <template #header><span class="card-title">🔄 狀態變更紀錄（{{ statusLogs.length }} 筆）</span></template>
          <div class="log-list">
            <div v-for="log in statusLogs" :key="log.id" class="log-row">
              <span class="log-time">{{ formatTime(log.changed_at) }}</span>
              <span :class="`badge badge-${ORDER_STATUSES[log.from_status]?.badge || 'inactive'}`" style="font-size:11px">{{ log.from_status || '—' }}</span>
              <span class="log-arrow">→</span>
              <span :class="`badge badge-${ORDER_STATUSES[log.to_status]?.badge || 'inactive'}`" style="font-size:11px">{{ log.to_status }}</span>
              <span class="log-by">{{ log.changed_by }}</span>
            </div>
          </div>
        </el-card>

        <!-- Same customer orders -->
        <el-card>
          <template #header>
            <span class="card-title">📋 同客戶其他訂單（{{ sameCustomerOrders.length }} 筆）</span>
          </template>
          <el-empty v-if="!sameCustomerOrders.length" description="無其他訂單" :image-size="60" />
          <el-table border v-else :data="sameCustomerOrders" size="small" :max-height="280">
            <el-table-column prop="order_id" label="訂單編號" width="148" show-overflow-tooltip>
              <template #default="{ row }">
                <RouterLink :to="`/orders/${row.id}`" class="order-link">{{ row.order_id }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column prop="product_name" label="商品" min-width="110" show-overflow-tooltip />
            <el-table-column label="狀態" width="108" align="center">
              <template #default="{ row }">
                <span :class="`badge badge-${row.statusConfig?.badge || 'inactive'}`">{{ row.order_status }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ChevronDown as ArrowDown } from 'lucide-vue-next'
import { useAppDataStore, ORDER_STATUSES } from '@/stores/appData'
import { useAuthStore } from '@/stores/auth'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import dayjs from 'dayjs'

const route = useRoute()
const store = useAppDataStore()
const auth  = useAuthStore()

// ── Local state ───────────────────────────────────────────────────
const loading    = ref(true)
const updating   = ref(false)
const fetchError = ref('')
const orderData  = ref(null)
const orderItems = ref([])
const statusLogs = ref([])

// Track mount state to prevent writing state to an unmounted component
let isMounted = true
onUnmounted(() => { isMounted = false })

// ── Derived ──────────────────────────────────────────────────────
const statusConfig = computed(() =>
  orderData.value ? ORDER_STATUSES[orderData.value.status] : null
)

const totalSelling = computed(() => {
  const fromItems = orderItems.value.reduce((a, i) => a + (Number(i.selling_price) || 0), 0)
  return fromItems || Number(orderData.value?.selling_price) || 0
})

const profit = computed(() => {
  if (!orderData.value) return null
  const revenue   = totalSelling.value + (Number(orderData.value.addon_amount) || 0)
  const cost      = Number(orderData.value.cost_twd)       || 0
  const other     = Number(orderData.value.other_twd)      || 0
  const logistics = Number(orderData.value.logistics_price) || 0
  if (!revenue && !cost) return null
  return revenue - cost - other - logistics
})

// ── Same-customer orders from store (no extra fetch) ─────────────
const sameCustomerOrders = computed(() => {
  if (!orderData.value?.customer_name) return []
  return store.mockSales
    .filter(o => o.customer === orderData.value.customer_name && String(o.id) !== String(route.params.id))
    .slice(0, 10)
})

// ── Fetch order from Supabase ─────────────────────────────────────
async function loadOrder() {
  const id = route.params.id
  if (!id) { loading.value = false; return }

  loading.value    = true
  orderData.value  = null
  orderItems.value = []
  statusLogs.value = []
  fetchError.value = ''

  // ── Step 1: fetch order + items (critical) ────────────────────
  try {
    const [ordRes, itemsRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*').eq('order_id', id),
    ])

    if (!isMounted) return

    if (ordRes.error) {
      console.error('[OrderDetail] order fetch error, code:', ordRes.error?.code)
      fetchError.value = `找不到訂單 (${ordRes.error.code || ordRes.error.message})`
      return
    }

    orderData.value  = ordRes.data
    orderItems.value = itemsRes.data || []
  } catch (err) {
    if (!isMounted) return
    console.error('[OrderDetail] fetch error, code:', err?.code)
    fetchError.value = err.message || '載入失敗，請重試'
    return
  } finally {
    // Always reset loading after the critical fetch — logs fetch happens separately below
    if (isMounted) loading.value = false
  }

  // ── Step 2: fetch logs (non-critical, doesn't block render) ────
  try {
    const { data: logs } = await supabase
      .from('order_status_logs').select('*')
      .eq('order_id', id).order('changed_at', { ascending: false })
    if (isMounted) statusLogs.value = logs || []
  } catch { /* order_status_logs table may not exist yet */ }

  // ── Step 3: warm up store for sameCustomerOrders panel ─────────
  if (isMounted && !store.initialized) store.fetchAll()
}

// ── Update status ─────────────────────────────────────────────────
async function handleStatusChange(newStatus) {
  if (!orderData.value || updating.value) return
  const fromStatus = orderData.value.status
  const orderId    = orderData.value.id
  const orderNo    = orderData.value.order_no
  if (fromStatus === newStatus) return

  // ── Step 1 (critical): DB write + local state update ──────────
  // updating is held true ONLY for this step so the button is freed ASAP
  updating.value = true
  try {
    const { error: updateErr } = await supabase
      .from('orders').update({ status: newStatus }).eq('id', orderId)
    if (updateErr) throw updateErr

    // Update local state
    orderData.value = { ...orderData.value, status: newStatus }

    // Keep store in sync
    const storeOrder = store.ordersRaw.find(o => o.id === orderId)
    if (storeOrder) storeOrder.status = newStatus

    ElMessage.success(`狀態已更新為「${ORDER_STATUSES[newStatus]?.label || newStatus}」`)
  } catch (err) {
    ElMessage.error(`更新失敗：${err.message}`)
    updating.value = false
    loadOrder()  // re-sync UI with DB on failure
    return
  }
  updating.value = false  // release button before running non-critical tasks

  // ── Step 2 (non-critical): log write — runs after button is freed ──
  try {
    const { data: logRow } = await supabase
      .from('order_status_logs')
      .insert({ order_id: orderId, order_no: orderNo, from_status: fromStatus, to_status: newStatus, changed_by: auth.user?.name || 'admin' })
      .select().single()
    if (logRow) statusLogs.value = [logRow, ...statusLogs.value]
  } catch { /* table may not exist yet */ }

  // ── Step 3 (non-critical): points — runs after button is freed ──
  try {
    if (newStatus === '已完成' && fromStatus !== '已完成') {
      await store.awardPointsForOrder(orderData.value)
    } else if (fromStatus === '已完成' && newStatus !== '已完成') {
      await store.deductPointsForOrder(orderData.value)
    }
  } catch { /* non-critical */ }
}

function formatTime(ts) {
  return dayjs(ts).format('MM/DD HH:mm')
}

// Use watch + immediate so it fires both on initial mount AND if params somehow
// change while the component is alive (belt-and-suspenders alongside :key)
watch(
  () => route.params.id,
  (id) => { if (id) loadOrder() },
  { immediate: true }
)
</script>

<style scoped>
/* Loading */
.loading-wrap {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 0; gap: 16px;
}
.loading-spinner {
  width: 40px; height: 40px;
  border: 3px solid var(--color-border, #e4e7ed);
  border-top-color: var(--color-primary, #6366f1);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.loading-text { font-size: 14px; color: var(--color-text-muted, #94a3b8); }
@keyframes spin { to { transform: rotate(360deg); } }

.detail-grid { display: grid; grid-template-columns: 320px 1fr; gap: 16px; }
.detail-left, .detail-right { display: flex; flex-direction: column; gap: 16px; }
.card-title { font-size: 14px; font-weight: 600; }
.card-header-row { display: flex; align-items: center; justify-content: space-between; }
.info-rows { display: flex; flex-direction: column; gap: 12px; }
.info-row { display: flex; align-items: center; gap: 8px; }
.info-label { font-size: 12px; color: var(--color-text-muted); width: 74px; flex-shrink: 0; }
.info-val { font-size: 13px; }
.info-val.muted { color: var(--color-text-muted); }
.mono { font-family: var(--font-mono); font-size: 12px; }
.price-summary { display: flex; flex-direction: column; gap: 10px; }
.price-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--color-text-secondary); }
.price-val { font-family: var(--font-mono); font-weight: 600; color: var(--color-text-primary); }
.price-val.ok { color: #10b981; }
.price-val.cost { color: #ef4444; }
.profit-row { font-size: 15px; }
.product-block { padding: 8px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border-light); }
.product-block:last-child { border-bottom: none; }
.product-name { font-size: 14px; font-weight: 600; }
.product-price { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--color-primary); }
.note-block { font-size: 13px; color: var(--color-text-secondary); line-height: 1.8; padding: 4px 0; }
.order-link { color: var(--color-primary); text-decoration: none; font-family: var(--font-mono); font-size: 11px; }
.order-link:hover { text-decoration: underline; }

/* Status log */
.log-list { display: flex; flex-direction: column; gap: 8px; }
.log-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 6px 0; border-bottom: 1px solid var(--color-border-light); }
.log-row:last-child { border-bottom: none; }
.log-time { color: var(--color-text-muted); font-family: var(--font-mono); font-size: 11px; min-width: 80px; }
.log-arrow { color: var(--color-text-muted); }
.log-by { margin-left: auto; color: var(--color-text-muted); font-size: 11px; }
</style>

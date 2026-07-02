<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">併單作業</h1>
        <p class="page-subtitle">選擇主單，其餘訂單的商品將合併進去</p>
      </div>
      <div style="display:flex;gap:8px">
        <el-button :icon="ArrowLeft" @click="$router.push('/orders')">返回訂單列表</el-button>
        <el-button
          type="warning"
          :loading="merging"
          :disabled="!primaryId || orders.length < 2"
          @click="confirmMerge"
        >
          {{ merging ? '合併中…' : `確認併單（${orders.length} 筆）` }}
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="merge-layout">

      <!-- ── 左：訂單卡片清單 ── -->
      <div class="merge-left">
        <div class="panel-title">選擇主單</div>
        <p class="panel-hint">主單的客戶資料、取貨資訊將保留；其他訂單的商品合併進來後標記為「已併單」</p>

        <div
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          :class="{
            'card-primary':   primaryId === order.id,
            'card-secondary': primaryId && primaryId !== order.id,
          }"
          @click="primaryId = order.id"
        >
          <!-- Card header -->
          <div class="card-head">
            <el-radio
              :model-value="primaryId"
              :label="order.id"
              @change="primaryId = order.id"
              @click.stop
            >
              <span class="card-order-no">{{ order.order_no }}</span>
            </el-radio>
            <el-tag v-if="primaryId === order.id" type="success" size="small" effect="dark">主單</el-tag>
            <el-tag v-else-if="primaryId" type="warning" size="small">併入</el-tag>
          </div>

          <!-- Customer info -->
          <div class="card-customer">
            <span class="customer-name">{{ order.customer_name || '—' }}</span>
            <span v-if="order.phone" class="customer-sub">{{ order.phone }}</span>
            <span v-if="order.logistics_name" class="customer-sub">{{ order.logistics_name }}</span>
          </div>

          <!-- Items -->
          <div class="card-items">
            <div v-if="!order._items?.length" class="item-empty">（無商品項目）</div>
            <div v-for="item in order._items" :key="item.id" class="item-row">
              <span class="item-name">{{ item.product_name }}</span>
              <span class="item-qty">×{{ item.qty }}</span>
              <span class="item-price">NT${{ ((item.selling_price || 0) * item.qty).toLocaleString() }}</span>
            </div>
          </div>

          <!-- Subtotal -->
          <div class="card-subtotal">
            <span class="subtotal-label">商品小計</span>
            <strong class="subtotal-val">NT${{ orderTotal(order).toLocaleString() }}</strong>
          </div>
        </div>
      </div>

      <!-- ── 右：合併預覽 ── -->
      <div class="merge-right">
        <div class="panel-title">合併預覽</div>

        <div v-if="!primaryId" class="preview-empty">
          <el-empty description="←  請點選左側選擇主單" :image-size="72" />
        </div>

        <template v-else>
          <!-- Primary order info -->
          <el-card class="preview-card">
            <template #header>
              <div class="preview-head">
                <div>
                  <div class="preview-order-no">{{ primaryOrder?.order_no }}</div>
                  <div class="preview-customer">{{ primaryOrder?.customer_name }}</div>
                </div>
                <el-tag type="success" effect="dark">主單</el-tag>
              </div>
            </template>

            <!-- Merged items list -->
            <div class="preview-items">
              <div class="preview-items-head">
                <span style="flex:1">商品</span>
                <span style="width:40px;text-align:center">數量</span>
                <span style="width:90px;text-align:right">小計</span>
              </div>

              <template v-for="(group, gIdx) in groupedPreviewItems" :key="gIdx">
                <!-- Group label -->
                <div class="preview-group-label">
                  <span v-if="group.isSecondary" class="group-badge secondary">
                    ↗ 來自 {{ group.orderNo }}
                  </span>
                  <span v-else class="group-badge primary">主單商品</span>
                </div>
                <!-- Items -->
                <div
                  v-for="(item, iIdx) in group.items"
                  :key="iIdx"
                  class="preview-item-row"
                  :class="{ 'row-secondary': group.isSecondary }"
                >
                  <span class="pi-name">{{ item.product_name }}</span>
                  <span class="pi-qty">×{{ item.qty }}</span>
                  <span class="pi-price">NT${{ ((item.selling_price || 0) * item.qty).toLocaleString() }}</span>
                </div>
              </template>
            </div>

            <!-- Total -->
            <div class="preview-total">
              <span class="pt-label">合併後商品合計</span>
              <strong class="pt-val">NT${{ mergedTotal.toLocaleString() }}</strong>
            </div>
          </el-card>

          <!-- Warning: secondary orders to be merged -->
          <el-card class="warn-card">
            <div class="warn-title">⚠ 以下訂單將標記為「已併單」</div>
            <div
              v-for="o in secondaryOrders"
              :key="o.id"
              class="warn-row"
            >
              <span class="warn-order-no">{{ o.order_no }}</span>
              <span class="warn-customer">{{ o.customer_name }}</span>
              <span class="warn-count">{{ o._items?.length || 0 }} 項商品</span>
            </div>
          </el-card>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from 'lucide-vue-next'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { useAppDataStore } from '@/stores/appData'

const route     = useRoute()
const router    = useRouter()
const appStore  = useAppDataStore()

const loading   = ref(true)
const merging   = ref(false)
const orders    = ref([])   // each order has ._items array attached
const primaryId = ref(null)

// ── Derived ──────────────────────────────────────────────────────────────
const primaryOrder    = computed(() => orders.value.find(o => o.id === primaryId.value))
const secondaryOrders = computed(() => orders.value.filter(o => o.id !== primaryId.value))

// Preview items grouped by source order
const groupedPreviewItems = computed(() => {
  if (!primaryId.value) return []
  const groups = []
  // Primary order items first
  const primary = primaryOrder.value
  if (primary?._items?.length) {
    groups.push({ isSecondary: false, orderNo: primary.order_no, items: primary._items })
  }
  // Secondary orders
  for (const o of secondaryOrders.value) {
    if (o._items?.length) {
      groups.push({ isSecondary: true, orderNo: o.order_no, items: o._items })
    }
  }
  return groups
})

const mergedTotal = computed(() =>
  groupedPreviewItems.value.flatMap(g => g.items)
    .reduce((sum, item) => sum + (item.selling_price || 0) * item.qty, 0)
)

function orderTotal(order) {
  return (order._items || []).reduce((sum, i) => sum + (i.selling_price || 0) * i.qty, 0)
}

// ── Load orders ──────────────────────────────────────────────────────────
onMounted(async () => {
  const ids = (route.query.ids || '').split(',').map(s => s.trim()).filter(Boolean)

  if (ids.length < 2) {
    ElMessage.warning('請至少選取兩筆訂單才能進行併單')
    router.replace('/orders')
    return
  }

  // Fetch orders
  const { data: ordersData, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .in('id', ids)

  if (ordersErr || !ordersData?.length) {
    ElMessage.error('載入訂單失敗：' + (ordersErr?.message || '查無資料'))
    router.replace('/orders')
    return
  }

  // Fetch order items
  const { data: itemsData } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', ids)

  // Attach items to their orders, preserve IDs order from query
  orders.value = ids
    .map(id => ordersData.find(o => o.id === id))
    .filter(Boolean)
    .map(o => ({
      ...o,
      _items: (itemsData || []).filter(i => i.order_id === o.id),
    }))

  // Default primary = first order
  primaryId.value = orders.value[0]?.id ?? null
  loading.value = false
})

// ── Merge ────────────────────────────────────────────────────────────────
async function confirmMerge() {
  if (!primaryId.value) return

  const primary    = primaryOrder.value
  const secondary  = secondaryOrders.value
  const itemsToMove = secondary.flatMap(o =>
    (o._items || []).map(item => ({
      order_id:      primaryId.value,
      product_name:  item.product_name,
      qty:           item.qty,
      selling_price: item.selling_price,
    }))
  )

  try {
    await ElMessageBox.confirm(
      `確定將 ${secondary.length} 筆訂單（共 ${itemsToMove.length} 項商品）併入「${primary?.order_no}」嗎？\n\n被併入的訂單將標記為「已併單」，此操作無法復原。`,
      '確認併單',
      {
        confirmButtonText: '確認併單',
        cancelButtonText:  '取消',
        type:              'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )
  } catch {
    return // 取消
  }

  merging.value = true
  try {
    const secondaryIds = secondary.map(o => o.id)

    // 單一 RPC 呼叫，PostgreSQL transaction 保證 all-or-nothing
    const { error: rpcErr } = await supabase.rpc('merge_orders_transaction', {
      p_primary_id:    primaryId.value,
      p_secondary_ids: secondaryIds,
      p_items:         itemsToMove,  // jsonb array
    })

    if (rpcErr) throw rpcErr

    ElMessage.success(`併單成功！${itemsToMove.length} 項商品已合併到 ${primary?.order_no}`)
    await appStore.refresh()
    router.push(`/orders/${primaryId.value}`)

  } catch (err) {
    ElMessage.error('併單失敗（資料庫已自動回復）：' + (err?.message || '未知錯誤'))
    console.error('[MergeOrders] code:', err?.code)
  } finally {
    merging.value = false
  }
}
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────── */
.merge-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  align-items: flex-start;
}

.merge-left,
.merge-right {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: -6px 0 4px;
  line-height: 1.5;
}

/* ── Order cards (left) ─────────────────────────────────────────── */
.order-card {
  background: var(--color-card, #fff);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
}
.order-card:hover {
  border-color: var(--color-primary);
}
.card-primary {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
}
.card-secondary {
  opacity: 0.75;
  border-color: #f59e0b;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.card-order-no {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.3px;
}

.card-customer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.customer-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.customer-sub  { font-size: 12px; color: var(--color-text-muted); }

.card-items {
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.item-empty { font-size: 12px; color: var(--color-text-muted); font-style: italic; }
.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.item-name  { flex: 1; color: var(--color-text-primary); }
.item-qty   { font-size: 12px; color: var(--color-text-muted); width: 32px; text-align: center; }
.item-price { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-secondary); width: 80px; text-align: right; }

.card-subtotal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed var(--color-border);
  padding-top: 10px;
  font-size: 13px;
}
.subtotal-label { color: var(--color-text-muted); }
.subtotal-val   { font-family: var(--font-mono); color: var(--color-primary); font-size: 14px; }

/* ── Preview (right) ────────────────────────────────────────────── */
.preview-empty {
  background: var(--color-card);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  border: 2px dashed var(--color-border);
}

.preview-card { border-radius: 12px; }

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.preview-order-no { font-family: var(--font-mono); font-weight: 700; font-size: 14px; color: var(--color-text-primary); }
.preview-customer { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }

.preview-items { margin-bottom: 12px; }

.preview-items-head {
  display: flex;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
}

.preview-group-label {
  padding: 8px 0 4px;
}
.group-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.2px;
}
.group-badge.primary   { background: #d1fae5; color: #065f46; }
.group-badge.secondary { background: #fef3c7; color: #92400e; }

.preview-item-row {
  display: flex;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;
  border-bottom: 1px dotted var(--color-border);
}
.preview-item-row:last-child { border-bottom: none; }
.row-secondary { background: #fffbeb; border-radius: 4px; padding: 4px 4px; }

.pi-name  { flex: 1; color: var(--color-text-primary); }
.pi-qty   { width: 40px; text-align: center; color: var(--color-text-muted); font-size: 12px; }
.pi-price { width: 90px; text-align: right; font-family: var(--font-mono); font-size: 12px; color: var(--color-text-secondary); }

.preview-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 4px;
  border-top: 2px solid var(--color-border);
  margin-top: 8px;
}
.pt-label { font-size: 13px; color: var(--color-text-secondary); }
.pt-val   { font-size: 18px; font-family: var(--font-mono); color: var(--color-primary); }

/* ── Warning card ───────────────────────────────────────────────── */
.warn-card {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
}
:deep(.warn-card .el-card__body) { padding: 16px; }

.warn-title { font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 10px; }
.warn-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dashed #fde68a;
  font-size: 13px;
}
.warn-row:last-child { border-bottom: none; }
.warn-order-no  { font-family: var(--font-mono); font-weight: 600; color: #78350f; font-size: 12px; min-width: 120px; }
.warn-customer  { flex: 1; color: #92400e; }
.warn-count     { font-size: 12px; color: #b45309; flex-shrink: 0; }

/* ── Global badge for merged status ────────────────────────────── */
:global(.badge-merged) {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
</style>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">訂單管理</h1>
        <p class="page-subtitle">
          共 <strong>{{ orders.length }}</strong> 筆訂單
          <span v-if="pendingCount"> · <span style="color:#8b5cf6">{{ pendingCount }} 筆待出貨</span></span>
        </p>
      </div>
      <div style="display:flex;gap:8px">
        <el-popover placement="bottom-end" :width="240" trigger="click" popper-class="col-settings-popover">
          <template #reference>
            <el-button :icon="Setting">欄位設定</el-button>
          </template>
          <div class="col-settings">
            <div class="col-settings-head">
              <span class="col-settings-title">顯示 / 隱藏欄位</span>
              <el-button link type="primary" size="small" @click="resetColSettings">重置預設</el-button>
            </div>
            <div class="col-settings-list">
              <label v-for="col in COLUMNS" :key="col.key" class="col-check-row">
                <el-checkbox v-model="colVisibility[col.key]" @change="saveSettings" />
                <span class="col-check-label">{{ col.label }}</span>
                <span class="col-check-width">{{ colWidths[col.key] }}px</span>
              </label>
            </div>
          </div>
        </el-popover>
        <el-button :icon="Download" @click="exportCSV">匯出訂單</el-button>
        <el-button type="primary" :icon="Refresh" @click="store.refresh()" :loading="store.loading">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openNewOrder">新增訂單</el-button>
      </div>
    </div>

    <!-- Tabs -->
    <el-tabs v-model="activeStatus" @tab-change="page = 1" class="status-tabs">
      <el-tab-pane v-for="tab in statusTabs" :key="tab.value" :name="tab.value">
        <template #label>
          <span>{{ tab.label }}</span>
          <el-badge v-if="tab.count" :value="tab.count" class="tab-badge" />
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <el-input v-model="search" placeholder="搜尋訂單號 / 客戶 / 商品…" :prefix-icon="Search" clearable style="width:280px" />
      <el-select v-model="filterGroup" placeholder="群組" clearable style="width:140px">
        <el-option v-for="g in store.salesGroups" :key="g" :label="g" :value="g" />
      </el-select>
      <el-select v-model="filterWeek" placeholder="週次" clearable style="width:120px">
        <el-option v-for="w in salesWeeks" :key="w" :label="w" :value="w" />
      </el-select>
      <el-button @click="resetFilter">重置</el-button>
      <span v-if="sortedFiltered.length !== orders.length" class="filter-hint">
        顯示 {{ sortedFiltered.length }} / {{ orders.length }} 筆
      </span>
    </div>

    <!-- Batch action bar -->
    <transition name="slide-down">
      <div v-if="selection.length" class="batch-bar">
        <el-icon><Select /></el-icon>
        <span>已選 <strong>{{ selection.length }}</strong> 筆</span>
        <el-button size="small" type="success" plain @click="batchUpdate('已出貨')">批量設為已出貨</el-button>
        <el-button size="small" type="primary" plain @click="batchUpdate('台灣待出貨')">台灣待出貨</el-button>
        <el-button size="small" @click="selection = []">取消選取</el-button>
      </div>
    </transition>

    <!-- Table -->
    <el-card v-loading="store.loading" element-loading-text="載入訂單中…">
      <el-table
        ref="orderTableRef"
        border
        :data="paginated"
        @selection-change="s => selection = s"
        @header-dragend="onHeaderDragend"
        @sort-change="onSortChange"
        @filter-change="onFilterChange"
        row-key="id"
        stripe
        highlight-current-row
      >
        <el-table-column type="selection" width="40" fixed="left" />

        <!-- 訂單編號: mono font, fixed narrow -->
        <el-table-column
          v-if="colVisibility['order_id']"
          label="訂單編號"
          :width="colWidths['order_id']"
          fixed="left"
          show-overflow-tooltip
          sortable="custom"
          prop="order_id"
        >
          <template #default="{ row }">
            <RouterLink :to="`/orders/${row.id}`" class="order-link">{{ row.order_id }}</RouterLink>
          </template>
        </el-table-column>

        <!-- 客戶: 中文名短 -->
        <el-table-column
          v-if="colVisibility['customer']"
          prop="customer"
          label="客戶"
          :width="colWidths['customer']"
          show-overflow-tooltip
          sortable="custom"
        />

        <!-- 群組: tag -->
        <el-table-column
          v-if="colVisibility['group_name']"
          label="群組"
          :width="colWidths['group_name']"
          column-key="group_col"
          :filters="groupFilterOptions"
          :filter-method="() => true"
        >
          <template #default="{ row }">
            <el-tag v-if="row.group_name" size="small" type="info">{{ row.group_name }}</el-tag>
          </template>
        </el-table-column>

        <!-- 商品: min-width 與備註共享剩餘空間 -->
        <el-table-column
          v-if="colVisibility['product_name']"
          prop="product_name"
          label="商品名稱"
          :min-width="colWidths['product_name']"
          show-overflow-tooltip
          sortable="custom"
        />

        <!-- 售價 -->
        <el-table-column
          v-if="colVisibility['selling_price']"
          label="售價"
          :width="colWidths['selling_price']"
          align="left"
          sortable="custom"
          prop="selling_price"
        >
          <template #default="{ row }">
            <span v-if="row.selling_price" class="price-twd">NT$ {{ row.selling_price.toLocaleString() }}</span>
          </template>
        </el-table-column>

        <!-- 匯款 -->
        <el-table-column
          v-if="colVisibility['payment_amount']"
          label="匯款"
          :width="colWidths['payment_amount']"
          align="left"
          sortable="custom"
          prop="payment_amount"
        >
          <template #default="{ row }">
            <span v-if="row.payment_amount" class="price-ok">NT$ {{ row.payment_amount.toLocaleString() }}</span>
          </template>
        </el-table-column>

        <!-- 狀態: badge, needs enough width for 台灣待出貨 -->
        <el-table-column
          v-if="colVisibility['order_status']"
          label="狀態"
          :width="colWidths['order_status']"
          align="center"
          column-key="status_col"
          :filters="statusFilterOptions"
          :filter-method="() => true"
        >
          <template #default="{ row }">
            <span :class="`badge badge-${row.statusConfig?.badge || 'inactive'}`">{{ row.order_status }}</span>
          </template>
        </el-table-column>

        <!-- 週次 -->
        <el-table-column
          v-if="colVisibility['sales_week']"
          label="週次"
          :width="colWidths['sales_week']"
          align="center"
          column-key="week_col"
          :filters="weekFilterOptions"
          :filter-method="() => true"
        >
          <template #default="{ row }">
            <span class="date-text">{{ row.sales_week }}</span>
          </template>
        </el-table-column>

        <!-- 下單日 -->
        <el-table-column
          v-if="colVisibility['sales_date']"
          label="下單日"
          :width="colWidths['sales_date']"
          align="center"
          sortable="custom"
          prop="sales_date"
        >
          <template #default="{ row }">
            <span class="date-text">{{ row.sales_date }}</span>
          </template>
        </el-table-column>

        <!-- 備註: min-width 與商品名稱共享剩餘空間 -->
        <el-table-column
          v-if="colVisibility['note']"
          label="備註"
          :min-width="colWidths['note']"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="row.note" class="note-text">{{ row.note }}</span>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" :min-width="colWidths['edit']" fixed="right" align="center">
          <template #default="{ row }">
            <RouterLink :to="`/orders/${row.id}`">
              <el-button text type="primary" size="small">查看</el-button>
            </RouterLink>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="sortedFiltered.length"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
      />
    </el-card>
  </div>

  <!-- ── 新增訂單 Modal ──────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showNewOrder" class="modal-backdrop" @click.self="cancelNewOrder">
        <div class="modal-panel modal-panel--wide">

          <div class="modal-head">
            <span class="modal-title">新增訂單</span>
            <el-button text :icon="Close" circle @click="cancelNewOrder" />
          </div>

          <div class="modal-body">
            <!-- ① 基本資料 -->
            <p class="section-label">基本資料</p>
            <el-form ref="newOrderFormRef" :model="newOrderForm" :rules="newOrderRules" label-width="130px">

              <div class="form-row-2">
                <el-form-item label="下單日期" prop="sales_date">
                  <el-date-picker v-model="newOrderForm.sales_date" type="date" value-format="YYYY-MM-DD" style="width:100%" placeholder="選擇日期" />
                </el-form-item>
                <el-form-item label="週次">
                  <el-input v-model="newOrderForm.sales_week" placeholder="自動帶入" style="width:100%" />
                </el-form-item>
              </div>

              <el-form-item label="客戶" prop="customer_id">
                <el-select v-model="newOrderForm.customer_id" filterable clearable style="width:100%" placeholder="搜尋客戶名稱" @change="onCustomerChange">
                  <el-option v-for="c in store.mockCustomers" :key="c.id" :label="c.name" :value="c.id" />
                </el-select>
              </el-form-item>

              <el-form-item label="賣貨便取貨名稱">
                <el-input v-model="newOrderForm.logistics_name" placeholder="從客戶資料自動帶入，可手動修改" clearable />
              </el-form-item>

              <div class="form-row-2">
                <el-form-item label="群組">
                  <el-select v-model="newOrderForm.group_name" filterable allow-create clearable style="width:100%" placeholder="選擇或輸入">
                    <el-option v-for="g in store.salesGroups" :key="g" :label="g" :value="g" />
                  </el-select>
                </el-form-item>
                <el-form-item label="訂單狀態" prop="status">
                  <el-select v-model="newOrderForm.status" style="width:100%">
                    <el-option v-for="(cfg, key) in store.ORDER_STATUSES" :key="key" :label="cfg.label" :value="key" />
                  </el-select>
                </el-form-item>
              </div>

              <el-form-item label="備註">
                <el-input v-model="newOrderForm.note" type="textarea" :rows="2" placeholder="選填" />
              </el-form-item>
            </el-form>

            <!-- ② 財務 -->
            <el-divider style="margin:14px 0 10px">
              <span class="section-label">財務</span>
            </el-divider>
            <el-form label-width="90px">
              <div class="form-row-finance">
                <el-form-item label="匯款金額">
                  <el-input-number v-model="newOrderForm.payment_amount" :min="0" :precision="0" style="width:100%" controls-position="right" />
                </el-form-item>
                <el-form-item label="加購金額">
                  <el-input-number v-model="newOrderForm.addon_amount" :min="0" :precision="0" style="width:100%" controls-position="right" />
                </el-form-item>
                <el-form-item label="賣貨便金額">
                  <el-input-number v-model="newOrderForm.logistics_fee" :min="0" :precision="0" style="width:100%" controls-position="right" />
                </el-form-item>
              </div>
            </el-form>

            <!-- ③ 商品項目 -->
            <el-divider style="margin:14px 0 10px">
              <span class="section-label">商品項目</span>
            </el-divider>

            <div class="items-head">
              <span class="items-col-name">商品名稱</span>
              <span class="items-col-qty">數量</span>
              <span class="items-col-price">每項售價 (TWD)</span>
              <span style="width:32px"></span>
            </div>

            <div v-for="(item, idx) in orderItems" :key="idx" class="items-row">
              <el-select
                v-model="item.product_name"
                filterable allow-create clearable
                class="items-col-name"
                placeholder="選擇或輸入商品名稱"
              >
                <el-option v-for="p in store.mockInventory" :key="p.id" :label="p.product_name" :value="p.product_name" />
              </el-select>
              <el-input-number v-model="item.qty" :min="1" :precision="0" class="items-col-qty" controls-position="right" />
              <el-input-number v-model="item.selling_price" :min="0" :precision="0" class="items-col-price" controls-position="right" />
              <el-button text type="danger" :icon="Delete" @click="removeItem(idx)" :disabled="orderItems.length === 1" style="flex-shrink:0" />
            </div>

            <el-button text type="primary" :icon="Plus" @click="addItem" style="margin-top:10px">新增商品行</el-button>

            <!-- 合計 -->
            <div class="order-total">
              <span class="order-total-label">商品合計</span>
              <span class="order-total-val">NT$ {{ totalOrderSelling.toLocaleString() }}</span>
            </div>

            <!-- ④ 加購項目 -->
            <el-divider style="margin:14px 0 10px">
              <span class="section-label">加購項目</span>
            </el-divider>

            <div class="items-head">
              <span class="items-col-name">加購品項</span>
              <span class="items-col-qty">數量</span>
              <span class="items-col-price">單價 (TWD)</span>
              <span style="width:32px"></span>
            </div>

            <div v-for="(addon, idx) in addonItems" :key="idx" class="items-row">
              <el-select
                v-model="addon.name"
                filterable allow-create clearable
                class="items-col-name"
                placeholder="選擇加購品項"
                @change="onAddonChange(addon)"
              >
                <el-option v-for="opt in ADDON_OPTIONS" :key="opt.name" :label="opt.name" :value="opt.name" />
              </el-select>
              <el-input-number v-model="addon.qty"   :min="1" :precision="0" class="items-col-qty"   controls-position="right" />
              <el-input-number v-model="addon.price" :min="0" :precision="0" class="items-col-price" controls-position="right" />
              <el-button text type="danger" :icon="Delete" @click="removeAddon(idx)" :disabled="addonItems.length === 1" style="flex-shrink:0" />
            </div>

            <el-button text type="primary" :icon="Plus" @click="addAddon" style="margin-top:10px">新增加購行</el-button>

            <div class="order-total">
              <span class="order-total-label">加購合計</span>
              <span class="order-total-val">NT$ {{ totalAddon.toLocaleString() }}</span>
            </div>
          </div>

          <div v-if="newOrderError" class="error-block">{{ newOrderError }}</div>
          <div class="modal-foot">
            <el-button @click="cancelNewOrder" :disabled="newOrderSaving">取消</el-button>
            <el-button type="primary" @click="submitNewOrder" :loading="newOrderSaving">
              {{ newOrderSaving ? '建立中…' : '建立訂單' }}
            </el-button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Download, Refresh, Select, Setting, Plus, Close, Delete } from '@element-plus/icons-vue'
import { useAppDataStore } from '@/stores/appData'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const store = useAppDataStore()
const auth  = useAuthStore()

// ── Column definitions ─────────────────────────────────────────
// widths tuned for 13px font, Chinese glyphs ~14px wide, padding 14px×2=28px
const COLUMNS = [
  { key: 'order_id',       label: '訂單編號', defaultWidth: 190 }, // "JJ-2024-001" 11mono chars
  { key: 'customer',       label: '客戶',     defaultWidth: 130  }, // 4 CJK chars
  { key: 'group_name',     label: '群組',     defaultWidth: 96  }, // el-tag
  { key: 'product_name',   label: '商品名稱', defaultWidth: 120 },
  { key: 'selling_price',  label: '售價',     defaultWidth: 130 }, // "NT$ 12,345" 
  { key: 'payment_amount', label: '匯款',     defaultWidth: 120 }, // same
  { key: 'order_status',   label: '狀態',     defaultWidth: 130 }, // badge "台灣待出貨"
  { key: 'sales_week',     label: '週次',     defaultWidth: 80 }, // "SW-2026-01" 10 chars + padding
  { key: 'sales_date',     label: '下單日',   defaultWidth: 120 }, // "2026-01-01" 10 chars + padding
  { key: 'note',           label: '備註',     defaultWidth: 160  }, // flexible (min-width)
  { key: 'edit',           label: '操作',     defaultWidth: 50 }, // "查看" button
]

// ── Per-user persistence ───────────────────────────────────────
function storageKey() {
  return `jj_cols_orders_v3_u${auth.user?.id ?? 0}`
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(storageKey()) || 'null') } catch { return null }
}

function buildState(saved) {
  return {
    visibility: Object.fromEntries(COLUMNS.map(c => [c.key, saved?.visibility?.[c.key] ?? true])),
    widths:     Object.fromEntries(COLUMNS.map(c => [c.key, saved?.widths?.[c.key]     ?? c.defaultWidth])),
  }
}

const initial         = buildState(loadSettings())
const colVisibility   = ref(initial.visibility)
const colWidths       = ref(initial.widths)

function saveSettings() {
  localStorage.setItem(storageKey(), JSON.stringify({
    visibility: colVisibility.value,
    widths: colWidths.value,
  }))
}

function resetColSettings() {
  const fresh = buildState(null)
  colVisibility.value = fresh.visibility
  colWidths.value     = fresh.widths
  saveSettings()
}

// Re-load when user switches
watch(() => auth.user?.id, () => {
  const s = buildState(loadSettings())
  colVisibility.value = s.visibility
  colWidths.value     = s.widths
})

// Save width after column drag-resize
function onHeaderDragend(newWidth, _oldWidth, column) {
  const col = COLUMNS.find(c => c.label === column.label)
  if (col) { colWidths.value[col.key] = Math.round(newWidth); saveSettings() }
}

// ── Filters & data ─────────────────────────────────────────────
const search       = ref('')
const filterGroup  = ref('')
const filterWeek   = ref('')
const activeStatus = ref('all')
const selection    = ref([])
const page         = ref(1)
const pageSize     = ref(20)
const sortState    = ref({ prop: null, order: null })
const activeColFilters = ref({})
const orderTableRef = ref(null)

const groupFilterOptions = computed(() =>
  store.salesGroups.map(g => ({ text: g, value: g }))
)
const statusFilterOptions = computed(() =>
  Object.keys(store.ORDER_STATUSES).map(k => ({ text: k, value: k }))
)
const weekFilterOptions = computed(() =>
  salesWeeks.value.map(w => ({ text: w, value: w }))
)

function onSortChange({ prop, order }) {
  sortState.value = { prop, order }
  page.value = 1
}
function onFilterChange(filters) {
  activeColFilters.value = { ...activeColFilters.value, ...filters }
  page.value = 1
}

const orders = ref([])
watch(() => store.mockSales, v => { orders.value = v.map(s => ({ ...s })) }, { immediate: true })

const salesWeeks = computed(() => [...new Set(orders.value.map(o => o.sales_week).filter(Boolean))].sort())

const statusTabs = computed(() => [
  { label: '全部', value: 'all', count: 0 },
  ...Object.entries(store.ORDER_STATUSES).map(([key, cfg]) => ({
    label: cfg.label, value: key,
    count: orders.value.filter(o => o.order_status === key).length,
  })),
])

const pendingCount = computed(() =>
  orders.value.filter(o => ['台灣待出貨','已填表單','在美現貨'].includes(o.order_status)).length
)

const filtered = computed(() => orders.value.filter(o => {
  if (activeStatus.value !== 'all' && o.order_status !== activeStatus.value) return false
  if (filterGroup.value && o.group_name !== filterGroup.value) return false
  if (filterWeek.value && o.sales_week !== filterWeek.value) return false
  if (search.value) {
    const q = search.value.toLowerCase()
    if (!o.order_id?.toLowerCase().includes(q) &&
        !o.customer?.toLowerCase().includes(q) &&
        !o.product_name?.toLowerCase().includes(q)) return false
  }
  const gf = activeColFilters.value['group_col']
  if (gf?.length && !gf.includes(o.group_name)) return false
  const sf = activeColFilters.value['status_col']
  if (sf?.length && !sf.includes(o.order_status)) return false
  const wf = activeColFilters.value['week_col']
  if (wf?.length && !wf.includes(o.sales_week)) return false
  return true
}))

const sortedFiltered = computed(() => {
  const { prop, order } = sortState.value
  if (!prop || !order) return filtered.value
  return [...filtered.value].sort((a, b) => {
    const av = a[prop] ?? ''
    const bv = b[prop] ?? ''
    if (typeof av === 'string') return order === 'ascending' ? av.localeCompare(bv) : bv.localeCompare(av)
    return order === 'ascending' ? av - bv : bv - av
  })
})

const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedFiltered.value.slice(start, start + pageSize.value)
})

function resetFilter() {
  search.value = ''
  filterGroup.value = ''
  filterWeek.value = ''
  activeColFilters.value = {}
  sortState.value = { prop: null, order: null }
  page.value = 1
  orderTableRef.value?.clearFilter()
  orderTableRef.value?.clearSort()
}

async function batchUpdate(status) {
  const targets = selection.value.map(o => o.order_id).filter(Boolean)
  for (const orderId of targets) {
    await store.updateOrderStatus(orderId, status)
    const local = orders.value.find(x => x.order_id === orderId)
    if (local) { local.order_status = status; local.statusConfig = store.ORDER_STATUSES[status] }
  }
  ElMessage.success(`已批量更新 ${selection.value.length} 筆訂單`)
  selection.value = []
}

function exportCSV() {
  const header = ['訂單編號','客戶','商品','售價','匯款','狀態','週次','下單日','備註']
  const rows = filtered.value.map(o => [
    o.order_id, o.customer, o.product_name, o.selling_price || '',
    o.payment_amount || '', o.order_status, o.sales_week || '', o.sales_date || '', o.note || '',
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

// ── 新增訂單 ────────────────────────────────────────────────────────

// 週次從日期自動計算（純數字 YYYYWW，如 202617）
function dateToWeek(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const weekNo = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `${year}${String(weekNo).padStart(2, '0')}`
}

// Order No 前端產生（格式與 Google Sheets 一致）
function genOrderNo(dateStr) {
  const d = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
  const r = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `ORD${d}${r}`
}

const showNewOrder    = ref(false)
const newOrderSaving  = ref(false)
const newOrderError   = ref('')
const newOrderFormRef = ref(null)

const newOrderForm = reactive({
  sales_date:      new Date().toISOString().slice(0, 10),
  sales_week:      '',
  customer_id:     '',
  customer_name:   '',
  logistics_name:  '',
  group_name:      '',
  status:          '已填表單',
  note:            '',
  payment_amount:  0,
  addon_amount:    0,
  logistics_fee:   0,
})

const orderItems = ref([{ product_name: '', qty: 1, selling_price: 0 }])

const totalOrderSelling = computed(() =>
  orderItems.value.reduce((a, i) => a + (Number(i.selling_price) || 0), 0)
)

// ── 加購項目 ────────────────────────────────────────────────────────
const ADDON_OPTIONS = [
  { name: '防水破壞袋',          price: 0   },
  { name: '紙箱',               price: 20  },
  { name: 'Jellycat防塵袋-小',  price: 80  },
  { name: 'Jellycat防塵袋-中',  price: 150 },
  { name: 'Jellycat防塵袋(大)', price: 250 },
  { name: 'Jellycat紙袋(中)',   price: 150 },
  { name: 'Jellycat紙袋(大)',   price: 250 },
]

const addonItems = ref([{ name: '防水破壞袋', price: 0, qty: 1 }])

const totalAddon = computed(() =>
  addonItems.value.reduce((a, i) => a + (Number(i.price) || 0) * (Number(i.qty) || 1), 0)
)

// 加購合計自動同步到 addon_amount
watch(totalAddon, val => { newOrderForm.addon_amount = val })

function onAddonChange(item) {
  const found = ADDON_OPTIONS.find(o => o.name === item.name)
  if (found) item.price = found.price
}
function addAddon()       { addonItems.value.push({ name: '', price: 0, qty: 1 }) }
function removeAddon(idx) { if (addonItems.value.length > 1) addonItems.value.splice(idx, 1) }

// 選日期 → 自動帶週次
watch(() => newOrderForm.sales_date, val => {
  newOrderForm.sales_week = dateToWeek(val)
})

// 選客戶 → 自動帶取貨名稱
function onCustomerChange(customerId) {
  const c = store.customersRaw.find(c => c.id === customerId)
  if (c) {
    newOrderForm.customer_name  = c.display_name || c.name || ''
    newOrderForm.logistics_name = c.logistics_name || c.display_name || c.name || ''
  }
}

const newOrderRules = {
  sales_date:  [{ required: true, message: '請選擇下單日期', trigger: 'change' }],
  customer_id: [{ required: true, message: '請選擇客戶',     trigger: 'change' }],
  status:      [{ required: true, message: '請選擇訂單狀態', trigger: 'change' }],
}

function addItem()        { orderItems.value.push({ product_name: '', qty: 1, selling_price: 0 }) }
function removeItem(idx)  { if (orderItems.value.length > 1) orderItems.value.splice(idx, 1) }

function openNewOrder() {
  Object.assign(newOrderForm, {
    sales_date: new Date().toISOString().slice(0, 10),
    sales_week: dateToWeek(new Date().toISOString().slice(0, 10)),
    customer_id: '', customer_name: '', logistics_name: '',
    group_name: '', status: '已填表單', note: '',
    payment_amount: 0, addon_amount: 0, logistics_fee: 0,
  })
  orderItems.value   = [{ product_name: '', qty: 1, selling_price: 0 }]
  addonItems.value   = [{ name: '防水破壞袋', price: 0, qty: 1 }]
  newOrderError.value = ''
  showNewOrder.value  = true
}

function cancelNewOrder() {
  if (newOrderSaving.value) return
  showNewOrder.value = false
}

async function submitNewOrder() {
  const valid = await newOrderFormRef.value?.validate().catch(() => false)
  if (!valid) return
  if (orderItems.value.some(i => !i.product_name?.trim())) {
    newOrderError.value = '請填寫所有商品名稱'
    return
  }

  newOrderSaving.value = true
  newOrderError.value  = ''

  try {
    // Step 1：INSERT orders，取得 id
    const orderNo = genOrderNo(newOrderForm.sales_date)
    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_no:        orderNo,
        customer_id:     newOrderForm.customer_id     || null,
        customer_name:   newOrderForm.customer_name,
        sales_date:      newOrderForm.sales_date,
        sales_week:      newOrderForm.sales_week      || null,
        group_name:      newOrderForm.group_name      || null,
        logistics_name:  newOrderForm.logistics_name  || null,
        status:          newOrderForm.status,
        note:            newOrderForm.note            || null,
        payment_amount:  newOrderForm.payment_amount  || null,
        addon_amount:    newOrderForm.addon_amount     || null,
        logistics_fee:   newOrderForm.logistics_fee   || null,
        addon_items:     addonItems.value.length ? addonItems.value : null,
      })
      .select()
      .single()

    if (orderErr) throw new Error(`訂單建立失敗：${orderErr.message}`)

    // Step 2：Batch INSERT order_items
    const itemsPayload = orderItems.value.map(i => ({
      order_id:      orderRow.id,
      product_name:  i.product_name.trim(),
      qty:           i.qty           ?? 1,
      selling_price: i.selling_price || null,
    }))

    const { data: insertedItems, error: itemsErr } = await supabase
      .from('order_items')
      .insert(itemsPayload)
      .select()

    if (itemsErr) throw new Error(`商品項目寫入失敗：${itemsErr.message}`)

    // Step 3：patch local store（立即顯示，不需 refresh）
    store.ordersRaw.push(orderRow)
    if (insertedItems) insertedItems.forEach(i => store.itemsRaw.push(i))

    ElMessage.success(`訂單 ${orderNo} 已建立`)
    showNewOrder.value = false

  } catch (err) {
    newOrderError.value = err.message
    console.error('[新增訂單]', err)
  } finally {
    newOrderSaving.value = false
  }
}

onMounted(() => store.fetchAll())
</script>

<style scoped>
.order-link {
  color: var(--color-primary);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.2px;
}
.order-link:hover { text-decoration: underline; }

.price-twd { font-weight: 700; font-family: var(--font-mono); color: var(--color-primary); font-size: 12px; }
.price-ok  { font-family: var(--font-mono); color: var(--color-success); font-weight: 600; font-size: 12px; }
.note-text { font-size: 11px; color: var(--color-text-muted); }
.filter-hint { font-size: 12px; color: var(--color-text-muted); margin-left: 4px; }

.batch-bar {
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(135deg, #eef2ff, #f0f4ff);
  border: 1px solid #c7d2fe;
  padding: 10px 16px; border-radius: var(--radius-md); margin-bottom: 12px;
  font-size: 13px; color: #4338ca; font-weight: 500;
}
.tab-badge { margin-left: 6px; }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }
:deep(.el-tabs__header) { margin-bottom: 12px; }

/* Column settings popover */
.col-settings { padding: 4px 0; }
.col-settings-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 4px 10px; border-bottom: 1px solid var(--color-border); margin-bottom: 8px;
}
.col-settings-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.col-settings-list { display: flex; flex-direction: column; gap: 2px; }
.col-check-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 4px; border-radius: 6px; cursor: pointer;
  transition: background 0.12s;
}
.col-check-row:hover { background: var(--color-bg); }
.col-check-label { flex: 1; font-size: 13px; color: var(--color-text-primary); }
.col-check-width { font-size: 11px; color: var(--color-text-muted); font-family: var(--font-mono); }

/* ── 新增訂單 Modal ─────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
}
.modal-panel {
  background: var(--color-card, #fff); border-radius: 12px;
  width: 560px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 48px);
  box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
  display: flex; flex-direction: column; overflow: hidden;
}
.modal-panel--wide { width: 860px; }
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px; border-bottom: 1px solid var(--color-border, #e4e7ed);
  flex-shrink: 0;
}
.modal-title { font-size: 16px; font-weight: 700; color: var(--color-text, #1a1a2e); }
.modal-body  { padding: 20px 20px 4px; overflow-y: auto; flex: 1; }
.modal-foot  {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px 18px; border-top: 1px solid var(--color-border, #e4e7ed);
  flex-shrink: 0;
}
.section-label { font-size: 12px; font-weight: 700; color: var(--color-text-secondary, #64748b); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; display: block; }
.form-row-2       { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.form-row-3       { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 12px; }
.form-row-finance { display: grid; grid-template-columns: repeat(3, minmax(200px, 1fr)); gap: 0 20px; }

/* items table */
.items-head {
  display: flex; gap: 8px; align-items: center;
  padding: 0 0 6px; border-bottom: 1px solid var(--color-border);
  font-size: 11px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px;
}
.items-row  { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.items-col-name  { flex: 1; min-width: 0; }
.items-col-qty   { width: 88px; flex-shrink: 0; }
.items-col-price { width: 130px; flex-shrink: 0; }

/* total */
.order-total { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding: 14px 4px 4px; border-top: 1px dashed var(--color-border); margin-top: 10px; }
.order-total-label { font-size: 12px; color: var(--color-text-muted); }
.order-total-val   { font-size: 16px; font-weight: 700; font-family: var(--font-mono); color: var(--color-primary); }

.error-block {
  margin: 0 20px 12px; padding: 10px 14px;
  background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;
  font-size: 12px; color: #dc2626; line-height: 1.5; word-break: break-all;
}
.modal-enter-active { animation: modalIn 0.32s cubic-bezier(0.34,1.56,0.64,1); }
.modal-leave-active { animation: modalOut 0.2s cubic-bezier(0.4,0,1,1); }
@keyframes modalIn  { from { opacity:0; transform:translateY(32px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes modalOut { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(16px) scale(0.97); } }

/* Checkbox 欄位：清除 padding，讓 40px 剛好置中 */
:deep(.el-table-column--selection .cell) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.date-text { font-size: 11px; color: var(--color-text-secondary); }
</style>

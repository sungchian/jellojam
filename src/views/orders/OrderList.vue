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
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Download, Refresh, Select, Setting } from '@element-plus/icons-vue'
import { useAppDataStore } from '@/stores/appData'
import { useAuthStore } from '@/stores/auth'

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
    const av = a[prop] ?? -1
    const bv = b[prop] ?? -1
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

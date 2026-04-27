<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">客戶管理</h1>
        <p class="page-subtitle">共 <strong>{{ store.mockCustomers.length }}</strong> 位 Line 用戶</p>
      </div>
      <div style="display:flex;gap:8px">
        <el-button :icon="Download" @click="exportCSV">匯出客戶</el-button>
        <el-button type="primary" :icon="Refresh" @click="store.refresh()" :loading="store.loading">刷新</el-button>
      </div>
    </div>

    <!-- Stats ribbon -->
    <div class="cust-stats" v-if="!store.loading && store.mockCustomers.length">
      <div class="cust-stat-item">
        <span class="cust-stat-val">{{ withLogistics }}</span>
        <span class="cust-stat-label">已填賣貨便</span>
      </div>
      <div class="cust-stat-divider"></div>
      <div class="cust-stat-item">
        <span class="cust-stat-val">{{ activeCustomers }}</span>
        <span class="cust-stat-label">有訂單客戶</span>
      </div>
      <div class="cust-stat-divider"></div>
      <div class="cust-stat-item">
        <span class="cust-stat-val">NT$ {{ Math.round(avgSpend).toLocaleString() }}</span>
        <span class="cust-stat-label">平均消費</span>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <el-input v-model="search" placeholder="搜尋姓名 / Line ID…" :prefix-icon="Search" clearable style="width:260px" />
      <el-select v-model="filterHasLogistics" placeholder="賣貨便名稱" clearable style="width:140px">
        <el-option label="已填寫" value="yes" />
        <el-option label="未填寫" value="no" />
      </el-select>
      <el-select v-model="sortBy" style="width:140px">
        <el-option label="依訂單數排序" value="orders" />
        <el-option label="依消費額排序" value="spent" />
        <el-option label="依名稱排序" value="name" />
      </el-select>
      <el-button @click="resetFilters">重置</el-button>
      <span v-if="sortedFiltered.length !== store.mockCustomers.length" class="filter-hint">
        顯示 {{ sortedFiltered.length }} / {{ store.mockCustomers.length }} 筆
      </span>
    </div>

    <!-- Table -->
    <el-card v-loading="store.loading" element-loading-text="載入客戶中…">
      <el-table
        ref="tableRef"
        border
        :data="paginated"
        size="small"
        highlight-current-row
        @sort-change="onSortChange"
        @filter-change="onFilterChange"
      >
        <!-- 客戶 avatar + name -->
        <el-table-column label="客戶" :width="COL.customer">
          <template #default="{ row }">
            <div class="cust-cell">
              <div class="cust-avatar" :style="{ background: avatarGradient(row.name) }">
                {{ (row.name || '?').charAt(0) }}
              </div>
              <div class="cust-info">
                <p class="cust-name">{{ row.name }}</p>
                <p v-if="row.previous_names" class="cust-prev">曾用名：{{ row.previous_names }}</p>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- Line UID: flexible fills remaining space, tooltip for full value -->
        <el-table-column label="Line UID" :min-width="COL.line_uid" show-overflow-tooltip>
          <template #default="{ row }"><span class="uid-text">{{ row.line_user_id }}</span></template>
        </el-table-column>

        <!-- 賣貨便名稱 -->
        <el-table-column
          label="賣貨便名稱"
          :width="COL.logistics_name"
          align="center"
          column-key="logistics_col"
          :filters="logisticsFilters"
          :filter-method="() => true"
        >
          <template #default="{ row }">
            <span v-if="row.logistics_name" class="logistics-name">{{ row.logistics_name }}</span>
            <span v-else class="not-filled">未填寫</span>
          </template>
        </el-table-column>

        <!-- 訂單數 -->
        <el-table-column label="訂單數" :width="COL.order_count" align="center" sortable="custom" prop="order_count">
          <template #default="{ row }">
            <span :class="row.order_count > 0 ? 'order-count-active' : 'order-count-zero'">
              {{ row.order_count }}
            </span>
          </template>
        </el-table-column>

        <!-- 累計消費 -->
        <el-table-column label="累計消費" :width="COL.total_spent" align="left" sortable="custom" prop="total_spent">
          <template #default="{ row }">
            <span v-if="row.total_spent > 0" class="total-spent">
              NT$ {{ Math.round(row.total_spent).toLocaleString() }}
            </span>
            <span v-else class="not-filled">—</span>
          </template>
        </el-table-column>

        <!-- 首次私訊 -->
        <el-table-column label="首次私訊" :width="COL.first_contact" align="center" sortable="custom" prop="first_contact_at">
          <template #default="{ row }">
            <span class="date-text">{{ formatDate(row.first_contact_at) }}</span>
          </template>
        </el-table-column>

        <!-- 最後私訊 -->
        <el-table-column label="最後私訊" :width="COL.last_contact" align="center" sortable="custom" prop="last_contact_at">
          <template #default="{ row }">
            <span class="date-text">{{ formatDate(row.last_contact_at) }}</span>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" :width="COL.actions" align="center">
          <template #default="{ row }">
            <RouterLink :to="`/customers/${row.id}`">
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
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Search, Download, Refresh } from '@element-plus/icons-vue'
import { useAppDataStore } from '@/stores/appData'

// ── Column widths (single source of truth) ──────────────────
const COL = {
  customer:        250,
  line_uid:        160,  // min-width
  logistics_name:  110,
  order_count:      72,
  total_spent:     132,
  first_contact:   160,
  last_contact:    160,
  actions:          80,
}

const store = useAppDataStore()

const tableRef            = ref(null)
const search             = ref('')
const filterHasLogistics = ref('')
const sortBy             = ref('orders')
const page               = ref(1)
const pageSize           = ref(20)
const sortState          = ref({ prop: null, order: null })
const activeColFilters   = ref({})

const logisticsFilters = [
  { text: '已填寫', value: 'yes' },
  { text: '未填寫', value: 'no' },
]

const withLogistics  = computed(() => store.mockCustomers.filter(c => c.logistics_name).length)
const activeCustomers = computed(() => store.mockCustomers.filter(c => c.order_count > 0).length)
const avgSpend = computed(() => {
  const active = store.mockCustomers.filter(c => c.total_spent > 0)
  return active.length ? active.reduce((a, c) => a + c.total_spent, 0) / active.length : 0
})

const filtered = computed(() => {
  return store.mockCustomers.filter(c => {
    if (search.value && !c.name?.includes(search.value) && !c.line_user_id?.includes(search.value)) return false
    if (filterHasLogistics.value === 'yes' && !c.logistics_name) return false
    if (filterHasLogistics.value === 'no' && c.logistics_name) return false
    // column header filter: logistics_col
    const lf = activeColFilters.value['logistics_col']
    if (lf?.length) {
      if (lf.includes('yes') && !lf.includes('no')) { if (!c.logistics_name) return false }
      if (lf.includes('no') && !lf.includes('yes')) { if (c.logistics_name) return false }
    }
    return true
  })
})

const sortedFiltered = computed(() => {
  let list = filtered.value
  // apply existing sortBy dropdown
  if (sortBy.value === 'orders') list = [...list].sort((a, b) => b.order_count - a.order_count)
  else if (sortBy.value === 'spent')  list = [...list].sort((a, b) => b.total_spent - a.total_spent)
  else if (sortBy.value === 'name')   list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  // apply column header sort (overrides dropdown if set)
  const { prop, order } = sortState.value
  if (prop && order) {
    list = [...list].sort((a, b) => {
      const av = a[prop] ?? ''
      const bv = b[prop] ?? ''
      if (typeof av === 'number') return order === 'ascending' ? av - bv : bv - av
      return order === 'ascending' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }
  return list
})

const paginated = computed(() => sortedFiltered.value.slice((page.value-1)*pageSize.value, page.value*pageSize.value))

function onSortChange({ prop, order }) {
  sortState.value = { prop, order }
  page.value = 1
}

function onFilterChange(filters) {
  activeColFilters.value = { ...activeColFilters.value, ...filters }
  page.value = 1
}

function resetFilters() {
  search.value = ''
  filterHasLogistics.value = ''
  sortBy.value = 'orders'
  activeColFilters.value = {}
  sortState.value = { prop: null, order: null }
  tableRef.value?.clearFilter()
  tableRef.value?.clearSort()
}

const GRADIENTS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
  'linear-gradient(135deg,#ec4899,#db2777)',
  'linear-gradient(135deg,#06b6d4,#0891b2)',
]
function avatarGradient(name) {
  const idx = (name || '').charCodeAt(0) % GRADIENTS.length
  return GRADIENTS[idx]
}

function formatDate(iso) {
  if (!iso) return '—'
  return iso.replace('T', ' ').substring(0, 16)
}

function exportCSV() {
  const header = ['名稱','Line UID','賣貨便名稱','訂單數','累計消費','首次私訊','最後私訊']
  const rows = store.mockCustomers.map(c => [
    c.name, c.line_user_id, c.logistics_name || '',
    c.order_count, Math.round(c.total_spent),
    formatDate(c.first_contact_at), formatDate(c.last_contact_at),
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `customers_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

onMounted(() => store.fetchAll())
</script>

<style scoped>
.cust-stats {
  display: flex; align-items: center; gap: 24px;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: 14px 20px; margin-bottom: 14px;
  box-shadow: var(--shadow-xs);
}
.cust-stat-item { display: flex; flex-direction: column; align-items: center; }
.cust-stat-val { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.cust-stat-label { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
.cust-stat-divider { width: 1px; height: 32px; background: var(--color-border); }

/* Avatar cell: flex but contained */
.cust-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
}
.cust-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  color: #fff; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cust-info {
  min-width: 0;
  overflow: hidden;
}
.cust-name {
  font-size: 13px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cust-prev { font-size: 10px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uid-text { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-muted); }
.logistics-name { font-size: 12px; font-weight: 600; }
.not-filled { color: var(--color-text-muted); font-size: 11px; }
.order-count-active { font-weight: 700; color: var(--color-primary); font-size: 14px; }
.order-count-zero { color: var(--color-text-muted); }
.total-spent { font-weight: 600; font-family: var(--font-mono); color: var(--color-success); font-size: 12px; }
.date-text { font-size: 11px; color: var(--color-text-secondary); }
.filter-hint { font-size: 12px; color: var(--color-text-muted); }
</style>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">訂單管理 <!-- orders --></h1>
        <p class="page-subtitle">共 {{ mockSales.length }} 筆訂單 · {{ pendingCount }} 筆待出貨</p>
      </div>
      <el-button :icon="Download">匯出訂單</el-button>
    </div>

    <el-tabs v-model="activeStatus" @tab-change="page = 1" class="status-tabs">
      <el-tab-pane v-for="tab in statusTabs" :key="tab.value" :name="tab.value">
        <template #label>
          <span>{{ tab.label }}</span>
          <el-badge v-if="tab.count" :value="tab.count" class="tab-badge" />
        </template>
      </el-tab-pane>
    </el-tabs>

    <div class="filter-bar">
      <el-input v-model="search" placeholder="搜尋訂單號 / 客戶名稱 / 商品…" :prefix-icon="Search" clearable style="width:280px" />
      <el-select v-model="filterGroup" placeholder="群組" clearable style="width:140px">
        <el-option v-for="g in salesGroups" :key="g" :label="g" :value="g" />
      </el-select>
      <el-select v-model="filterWeek" placeholder="週次" clearable style="width:120px">
        <el-option v-for="w in salesWeeks" :key="w" :label="w" :value="w" />
      </el-select>
      <el-button @click="resetFilter">重置</el-button>
    </div>

    <div v-if="selection.length" class="batch-bar">
      <span>已選 {{ selection.length }} 筆</span>
      <el-button size="small" type="success" plain @click="batchUpdate('已出貨')">批量設為已出貨</el-button>
      <el-button size="small" type="primary" plain @click="batchUpdate('台灣待出貨')">批量台灣待出貨</el-button>
    </div>

    <el-card>
      <el-table :data="paginated" @selection-change="s => selection = s" row-key="id">
        <el-table-column type="selection" width="44" />
        <el-table-column label="訂單編號" min-width="200">
          <template #default="{ row }">
            <RouterLink :to="`/orders/${row.id}`" class="order-link">{{ row.order_id }}</RouterLink>
          </template>
        </el-table-column>
        <el-table-column prop="customer" label="客戶" width="90" />
        <el-table-column prop="group_name" label="群組" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.group_name" size="small" type="info">{{ row.group_name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="product_name" label="商品" min-width="150" />
        <el-table-column label="售價" width="110" align="right">
          <template #default="{ row }">
            <span v-if="row.selling_price" class="price-twd">NT$ {{ row.selling_price.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="匯款" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.payment_amount" class="price-ok">NT$ {{ row.payment_amount.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="狀態" width="110" align="center">
          <template #default="{ row }">
            <span :class="`badge badge-${row.statusConfig?.badge || 'inactive'}`">{{ row.order_status }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sales_week" label="週次" width="80" align="center" />
        <el-table-column prop="sales_date" label="下單日" width="110" />
        <el-table-column label="備註" min-width="120">
          <template #default="{ row }">
            <span v-if="row.note" class="note-text">{{ row.note }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
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
        :total="filtered.length"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Download } from '@element-plus/icons-vue'
import { mockSales, salesGroups, ORDER_STATUSES } from '@/mock/data'

const search = ref('')
const filterGroup = ref('')
const filterWeek = ref('')
const activeStatus = ref('all')
const selection = ref([])
const page = ref(1)
const pageSize = ref(20)

const orders = ref(mockSales.map(s => ({ ...s })))

const salesWeeks = computed(() => [...new Set(orders.value.map(o => o.sales_week).filter(Boolean))].sort())

const statusTabs = computed(() => [
  { label: '全部', value: 'all', count: 0 },
  ...Object.entries(ORDER_STATUSES).map(([key, cfg]) => ({
    label: cfg.label, value: key,
    count: orders.value.filter(o => o.order_status === key).length
  }))
])

const pendingCount = computed(() =>
  orders.value.filter(o => ['台灣待出貨','已填表單','在美現貨'].includes(o.order_status)).length
)

const filtered = computed(() => orders.value.filter(o => {
  if (activeStatus.value !== 'all' && o.order_status !== activeStatus.value) return false
  if (filterGroup.value && o.group_name !== filterGroup.value) return false
  if (filterWeek.value && o.sales_week !== filterWeek.value) return false
  if (search.value) {
    const q = search.value
    if (!o.order_id?.includes(q) && !o.customer?.includes(q) && !o.product_name?.includes(q)) return false
  }
  return true
}))

const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function resetFilter() { search.value = ''; filterGroup.value = ''; filterWeek.value = '' }

function batchUpdate(status) {
  selection.value.forEach(o => {
    const target = orders.value.find(x => x.id === o.id)
    if (target) { target.order_status = status; target.statusConfig = ORDER_STATUSES[status] }
  })
  ElMessage.success(`已批量更新 ${selection.value.length} 筆訂單`)
}
</script>

<style scoped>
.order-link { color: var(--color-primary); text-decoration: none; font-family: var(--font-mono); font-size: 11px; }
.price-twd { font-weight: 700; font-family: var(--font-mono); color: var(--color-primary); }
.price-ok  { font-family: var(--font-mono); color: var(--color-success); }
.note-text { font-size: 11px; color: var(--color-text-muted); }
.batch-bar { display: flex; align-items: center; gap: 10px; background: #eef2ff; border: 1px solid #c7d2fe; padding: 10px 16px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; color: #4338ca; font-weight: 500; }
.tab-badge { margin-left: 6px; }
:deep(.el-tabs__header) { margin-bottom: 12px; }
</style>

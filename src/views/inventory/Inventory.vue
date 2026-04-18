<template>
  <div>
    <div class="page-header">
      <div><h1 class="page-title">庫存管理 <!-- inventory --></h1><p class="page-subtitle">{{ mockInventory.length }} 個 SKU · 31 個 Jellycat 官方分類</p></div>
      <el-button :icon="Download">匯出庫存</el-button>
    </div>

    <div class="stat-cards" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card" v-for="s in invStats" :key="s.label">
        <div class="stat-card-icon" :style="{background:s.bg}"><el-icon :style="{color:s.color}" size="20"><component :is="s.icon"/></el-icon></div>
        <div class="stat-card-value">{{ s.value }}</div>
        <div class="stat-card-label">{{ s.label }}</div>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="庫存總覽" name="overview">
        <div class="filter-bar">
          <el-input v-model="search" placeholder="搜尋商品名稱…" :prefix-icon="Search" clearable style="width:240px" />
          <el-select v-model="filterCat" placeholder="Jellycat 分類" clearable style="width:200px">
            <el-option v-for="c in jellycatCategories" :key="c" :label="c" :value="c" />
          </el-select>
          <el-select v-model="filterStock" placeholder="庫存狀態" clearable style="width:130px">
            <el-option label="正常" value="normal" />
            <el-option label="低庫存 (≤2)" value="low" />
            <el-option label="缺貨 (0)" value="out" />
          </el-select>
          <el-button @click="search='';filterCat='';filterStock=''">重置</el-button>
        </div>

        <el-card>
          <el-table :data="paginated" size="small">
            <el-table-column label="商品名稱" min-width="160">
              <template #default="{ row }"><span style="font-weight:500;font-size:13px">{{ row.product_name }}</span></template>
            </el-table-column>
            <el-table-column label="Jellycat 分類" min-width="180">
              <template #default="{ row }"><el-tag v-if="row.jellycat_category" size="small" type="info">{{ row.jellycat_category }}</el-tag></template>
            </el-table-column>
            <el-table-column label="在台庫存" width="90" align="center">
              <template #default="{ row }"><span class="stock-num">{{ row.taiwan_stock || 0 }}</span></template>
            </el-table-column>
            <el-table-column label="總採購量" width="90" align="center">
              <template #default="{ row }"><span>{{ row.total_purchased || 0 }}</span></template>
            </el-table-column>
            <el-table-column label="已售出" width="80" align="center">
              <template #default="{ row }"><span style="color:var(--color-primary);font-weight:600">{{ row.sold_qty || 0 }}</span></template>
            </el-table-column>
            <el-table-column label="當前庫存" width="90" align="center">
              <template #default="{ row }">
                <span :class="stockClass(row)">{{ row.current_stock ?? '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="平均成本" width="110" align="right">
              <template #default="{ row }">
                <span v-if="row.avg_cost" style="font-family:var(--font-mono);font-size:12px">NT$ {{ Math.round(row.avg_cost).toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="分類箱" width="90" align="center">
              <template #default="{ row }"><el-tag v-if="row.box" size="small">{{ row.box }}</el-tag></template>
            </el-table-column>
            <el-table-column label="庫存狀態" width="100" align="center">
              <template #default="{ row }">
                <span v-if="row.current_stock === 0" class="badge badge-danger">缺貨</span>
                <span v-else-if="row.current_stock <= 2" class="badge badge-warning">低庫存</span>
                <span v-else-if="row.current_stock > 0" class="badge badge-active">正常</span>
                <span v-else class="badge badge-inactive">未追蹤</span>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination v-model:current-page="page" :total="filtered.length" :page-size="pageSize" :page-sizes="[20,50,100]" layout="total, sizes, prev, pager, next" v-model:page-size="pageSize" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="在台現貨 (Taiwan)" name="taiwan">
        <el-card>
          <el-table :data="mockTaiwanStock" size="small">
            <el-table-column prop="product_name" label="商品名稱" min-width="160" />
            <el-table-column prop="qty" label="數量" width="80" align="center" />
            <el-table-column prop="location" label="保管人" width="100" align="center">
              <template #default="{ row }"><el-tag size="small">{{ row.location }}</el-tag></template>
            </el-table-column>
            <el-table-column label="單價（USD）" width="110" align="right">
              <template #default="{ row }"><span v-if="row.unit_cost" style="font-family:var(--font-mono)">${{ row.unit_cost?.toFixed(2) }}</span></template>
            </el-table-column>
            <el-table-column label="台幣成本" width="120" align="right">
              <template #default="{ row }"><span v-if="row.total_cost_twd" style="font-family:var(--font-mono);font-weight:600">NT$ {{ Math.round(row.total_cost_twd).toLocaleString() }}</span></template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="期初庫存" name="opening">
        <el-card>
          <el-table :data="mockOpeningStock" size="small">
            <el-table-column prop="product_name" label="商品名稱" min-width="160" />
            <el-table-column prop="qty" label="期初數量" width="90" align="center" />
            <el-table-column label="期初單價" width="110" align="right">
              <template #default="{ row }"><span style="font-family:var(--font-mono)">${{ row.unit_cost?.toFixed(2) }}</span></template>
            </el-table-column>
            <el-table-column label="台幣成本" width="120" align="right">
              <template #default="{ row }"><span v-if="row.total_cost_twd" style="font-family:var(--font-mono);font-weight:600">NT$ {{ Math.round(row.total_cost_twd).toLocaleString() }}</span></template>
            </el-table-column>
            <el-table-column prop="box" label="分類箱" width="80" align="center">
              <template #default="{ row }"><el-tag v-if="row.box" size="small">{{ row.box }}</el-tag></template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, Download } from '@element-plus/icons-vue'
import { mockInventory, mockTaiwanStock, mockOpeningStock, jellycatCategories, lowStockProducts } from '@/mock/data'

const activeTab = ref('overview')
const search = ref('')
const filterCat = ref('')
const filterStock = ref('')
const page = ref(1)
const pageSize = ref(20)

const invStats = computed(() => [
  { label: '商品總 SKU', value: mockInventory.length, icon: 'Box', bg: '#eef2ff', color: '#6366f1' },
  { label: '在台現貨品項', value: mockTaiwanStock.length, icon: 'Goods', bg: '#ecfdf5', color: '#10b981' },
  { label: '低庫存商品', value: lowStockProducts.filter(p => p.current_stock > 0).length, icon: 'Warning', bg: '#fffbeb', color: '#f59e0b' },
  { label: '缺貨商品', value: mockInventory.filter(p => p.current_stock === 0).length, icon: 'CircleClose', bg: '#fef2f2', color: '#ef4444' },
])

const filtered = computed(() => mockInventory.filter(p => {
  if (search.value && !p.product_name?.includes(search.value)) return false
  if (filterCat.value && p.jellycat_category !== filterCat.value) return false
  if (filterStock.value === 'out' && p.current_stock !== 0) return false
  if (filterStock.value === 'low' && (p.current_stock === 0 || p.current_stock > 2)) return false
  if (filterStock.value === 'normal' && p.current_stock <= 2) return false
  return true
}))

const paginated = computed(() => filtered.value.slice((page.value-1)*pageSize.value, page.value*pageSize.value))

function stockClass(row) {
  if (row.current_stock === 0) return 'stock-out'
  if (row.current_stock <= 2) return 'stock-low'
  if (row.current_stock > 0) return 'stock-ok'
  return ''
}
</script>

<style scoped>
.stock-num { font-size: 14px; font-weight: 700; color: var(--color-primary); }
.stock-ok  { font-weight: 600; color: var(--color-success); }
.stock-low { font-weight: 600; color: var(--color-warning); }
.stock-out { font-weight: 700; color: var(--color-danger); }
</style>

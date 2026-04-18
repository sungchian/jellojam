<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">商品管理</h1>
        <p class="page-subtitle">共 {{ mockInventory.length }} <!-- products --> 個 SKU · {{ jellycatCategories.length }} 個 Jellycat 官方分類</p>
      </div>
      <RouterLink to="/products/add">
        <el-button type="primary" :icon="Plus">新增商品</el-button>
      </RouterLink>
    </div>

    <div class="filter-bar">
      <el-input v-model="search" placeholder="搜尋商品名稱…" :prefix-icon="Search" clearable style="width:240px" />
      <el-select v-model="filterCat" placeholder="Jellycat 分類" clearable style="width:200px">
        <el-option v-for="c in jellycatCategories" :key="c" :label="c" :value="c" />
      </el-select>
      <el-select v-model="filterStock" placeholder="庫存狀態" clearable style="width:130px">
        <el-option label="有庫存" value="instock" />
        <el-option label="低庫存" value="low" />
        <el-option label="缺貨" value="out" />
      </el-select>
      <el-button @click="search='';filterCat='';filterStock=''">重置</el-button>
    </div>

    <el-card>
      <el-table :data="paginated" row-key="id">
        <el-table-column label="商品名稱" min-width="180">
          <template #default="{ row }">
            <div>
              <p style="font-size:13px;font-weight:500">{{ row.product_name }}</p>
              <el-tag v-if="row.jellycat_category" size="small" type="info" style="margin-top:2px">{{ row.jellycat_category }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="在台庫存" width="90" align="center">
          <template #default="{ row }">
            <span style="font-weight:600;color:var(--color-primary)">{{ row.taiwan_stock || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="總採購" width="80" align="center">
          <template #default="{ row }">{{ row.total_purchased || 0 }}</template>
        </el-table-column>
        <el-table-column label="已售出" width="80" align="center">
          <template #default="{ row }">
            <span style="font-weight:600;color:#6366f1">{{ row.sold_qty || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="當前庫存" width="90" align="center">
          <template #default="{ row }">
            <span :class="stockClass(row)">{{ row.current_stock ?? '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="平均成本" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.avg_cost" style="font-family:var(--font-mono);font-size:12px">
              NT$ {{ Math.round(row.avg_cost).toLocaleString() }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="庫存狀態" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.current_stock === 0" class="badge badge-danger">缺貨</span>
            <span v-else-if="row.current_stock <= 2" class="badge badge-warning">低庫存</span>
            <span v-else-if="row.current_stock > 0" class="badge badge-active">正常</span>
            <span v-else class="badge badge-inactive">未追蹤</span>
          </template>
        </el-table-column>
        <el-table-column label="分類箱" width="80" align="center">
          <template #default="{ row }"><el-tag v-if="row.box" size="small">{{ row.box }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <RouterLink :to="`/products/edit/${row.id}`">
              <el-button text type="primary" size="small" :icon="Edit">編輯</el-button>
            </RouterLink>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="filtered.length" :page-sizes="[20,50,100]" layout="total, sizes, prev, pager, next" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Plus, Search, Edit } from '@element-plus/icons-vue'
import { mockInventory, jellycatCategories } from '@/mock/data'

const search = ref(''); const filterCat = ref(''); const filterStock = ref('')
const page = ref(1); const pageSize = ref(20)

const filtered = computed(() => mockInventory.filter(p => {
  if (search.value && !p.product_name?.includes(search.value)) return false
  if (filterCat.value && p.jellycat_category !== filterCat.value) return false
  if (filterStock.value === 'out' && p.current_stock !== 0) return false
  if (filterStock.value === 'low' && (p.current_stock === 0 || p.current_stock > 2)) return false
  if (filterStock.value === 'instock' && p.current_stock <= 2) return false
  return true
}))
const paginated = computed(() => filtered.value.slice((page.value-1)*pageSize.value, page.value*pageSize.value))
function stockClass(r) {
  if (r.current_stock === 0) return 'stock-out'
  if (r.current_stock <= 2) return 'stock-low'
  if (r.current_stock > 0) return 'stock-ok'
  return ''
}
</script>

<style scoped>
.stock-ok  { font-weight: 600; color: var(--color-success); }
.stock-low { font-weight: 600; color: var(--color-warning); }
.stock-out { font-weight: 700; color: var(--color-danger); }
</style>

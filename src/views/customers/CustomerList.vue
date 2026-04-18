<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">客戶管理</h1>
        <p class="page-subtitle">共 {{ mockCustomers.length }} <!-- customers --> 位 Line 用戶</p>
      </div>
      <el-button :icon="Download">匯出客戶</el-button>
    </div>

    <div class="filter-bar">
      <el-input v-model="search" placeholder="搜尋姓名 / Line ID…" :prefix-icon="Search" clearable style="width:260px" />
      <el-select v-model="filterHasLogistics" placeholder="賣貨便名稱" clearable style="width:140px">
        <el-option label="已填寫" value="yes" />
        <el-option label="未填寫" value="no" />
      </el-select>
      <el-button @click="search='';filterHasLogistics=''">重置</el-button>
    </div>

    <el-card>
      <el-table :data="paginated" size="small">
        <el-table-column label="客戶" min-width="160">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="cust-avatar">{{ (row.name || '?').charAt(0) }}</div>
              <div>
                <p style="font-size:13px;font-weight:500">{{ row.name }}</p>
                <p v-if="row.previous_names" style="font-size:10px;color:var(--color-text-muted)">曾用名：{{ row.previous_names }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Line UID" min-width="200">
          <template #default="{ row }">
            <span class="uid-text">{{ row.line_user_id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="賣貨便名稱" width="130">
          <template #default="{ row }">
            <span v-if="row.logistics_name" class="logistics-name">{{ row.logistics_name }}</span>
            <span v-else style="color:var(--color-text-muted);font-size:11px">未填寫</span>
          </template>
        </el-table-column>
        <el-table-column label="訂單數" width="80" align="center">
          <template #default="{ row }">
            <span :style="row.order_count > 0 ? 'font-weight:700;color:var(--color-primary)' : 'color:var(--color-text-muted)'">
              {{ row.order_count }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="累計消費" width="130" align="right">
          <template #default="{ row }">
            <span v-if="row.total_spent > 0" style="font-weight:600;font-family:var(--font-mono)">
              NT$ {{ Math.round(row.total_spent).toLocaleString() }}
            </span>
            <span v-else style="color:var(--color-text-muted)">—</span>
          </template>
        </el-table-column>
        <el-table-column label="首次私訊" width="130">
          <template #default="{ row }">
            <span style="font-size:11px;color:var(--color-text-secondary)">{{ formatDate(row.first_contact_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最後私訊" width="130">
          <template #default="{ row }">
            <span style="font-size:11px;color:var(--color-text-secondary)">{{ formatDate(row.last_contact_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
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
import { Search, Download } from '@element-plus/icons-vue'
import { mockCustomers } from '@/mock/data'

const search = ref('')
const filterHasLogistics = ref('')
const page = ref(1)
const pageSize = ref(20)

const filtered = computed(() => mockCustomers.filter(c => {
  if (search.value && !c.name?.includes(search.value) && !c.line_user_id?.includes(search.value)) return false
  if (filterHasLogistics.value === 'yes' && !c.logistics_name) return false
  if (filterHasLogistics.value === 'no' && c.logistics_name) return false
  return true
}))

const paginated = computed(() => filtered.value.slice((page.value-1)*pageSize.value, page.value*pageSize.value))

function formatDate(iso) {
  if (!iso) return '—'
  return iso.replace('T', ' ').substring(0, 16)
}
</script>

<style scoped>
.cust-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.uid-text { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-muted); word-break: break-all; }
.logistics-name { font-size: 12px; font-weight: 600; color: var(--color-text-primary); }
</style>

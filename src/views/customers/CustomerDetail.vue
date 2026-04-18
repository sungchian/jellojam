<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">客戶詳情</h1>
        <p class="page-subtitle">Line UID：{{ customer.line_user_id }}</p>
      </div>
      <RouterLink to="/customers"><el-button :icon="ArrowLeft">返回列表</el-button></RouterLink>
    </div>

    <div class="detail-grid">
      <div class="detail-left">
        <el-card>
          <div class="profile-header">
            <div class="profile-avatar">{{ (customer.name || '?').charAt(0) }}</div>
            <div>
              <h2 class="profile-name">{{ customer.name }}</h2>
              <p v-if="customer.previous_names" class="prev-names">曾用名：{{ customer.previous_names }}</p>
            </div>
          </div>
          <el-divider />
          <div class="info-rows">
            <div class="info-row">
              <span class="info-label">Line UID</span>
              <span class="info-val uid">{{ customer.line_user_id }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">賣貨便名稱</span>
              <span class="info-val">{{ customer.logistics_name || '未填寫' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">首次私訊</span>
              <span class="info-val">{{ formatDate(customer.first_contact_at) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">最後私訊</span>
              <span class="info-val">{{ formatDate(customer.last_contact_at) }}</span>
            </div>
          </div>
        </el-card>

        <el-card>
          <template #header><span class="card-title">💰 消費統計</span></template>
          <div class="stats-grid">
            <div class="mini-stat">
              <div class="mini-val">{{ customerOrders.length }}</div>
              <div class="mini-label">訂單筆數</div>
            </div>
            <div class="mini-stat">
              <div class="mini-val">NT$ {{ Math.round(customer.total_spent).toLocaleString() }}</div>
              <div class="mini-label">累計消費</div>
            </div>
            <div class="mini-stat">
              <div class="mini-val">{{ uniqueProducts.length }}</div>
              <div class="mini-label">購買品項</div>
            </div>
            <div class="mini-stat">
              <div class="mini-val">{{ completedCount }}</div>
              <div class="mini-label">已出貨</div>
            </div>
          </div>
        </el-card>
      </div>

      <div class="detail-right">
        <el-card>
          <template #header><span class="card-title">📋 訂單記錄（{{ customerOrders.length }} 筆）</span></template>
          <el-table :data="customerOrders" size="small">
            <el-table-column prop="order_id" label="訂單編號" min-width="180">
              <template #default="{ row }">
                <RouterLink :to="`/orders/${row.id}`" class="order-link">{{ row.order_id }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column prop="product_name" label="商品" min-width="130" />
            <el-table-column label="售價" width="110" align="right">
              <template #default="{ row }">
                <span v-if="row.selling_price" style="font-family:var(--font-mono);font-weight:600">NT$ {{ row.selling_price.toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="狀態" width="110" align="center">
              <template #default="{ row }">
                <span :class="`badge badge-${row.statusConfig?.badge || 'inactive'}`">{{ row.order_status }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="sales_date" label="下單日" width="110" />
            <el-table-column prop="note" label="備註" min-width="100">
              <template #default="{ row }"><span style="font-size:11px;color:var(--color-text-muted)">{{ row.note }}</span></template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { mockCustomers, mockSales } from '@/mock/data'

const route = useRoute()
const customer = ref(mockCustomers.find(c => c.id == route.params.id) || mockCustomers[0])
const customerOrders = computed(() => mockSales.filter(s => s.customer === customer.value.name))
const uniqueProducts = computed(() => [...new Set(customerOrders.value.map(o => o.product_name).filter(Boolean))])
const completedCount = computed(() => customerOrders.value.filter(o => o.order_status === '已出貨').length)

function formatDate(iso) {
  if (!iso) return '—'
  return iso.replace('T', ' ').substring(0, 16)
}
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: 300px 1fr; gap: 16px; }
.detail-left, .detail-right { display: flex; flex-direction: column; gap: 16px; }
.profile-header { display: flex; align-items: center; gap: 14px; }
.profile-avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; font-size:20px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.profile-name { font-size: 18px; font-weight: 700; }
.prev-names { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; }
.info-rows { display: flex; flex-direction: column; gap: 10px; }
.info-row { display: flex; align-items: flex-start; gap: 8px; }
.info-label { font-size: 12px; color: var(--color-text-muted); width: 80px; flex-shrink: 0; padding-top: 1px; }
.info-val { font-size: 13px; }
.uid { font-family: var(--font-mono); font-size: 10px; word-break: break-all; color: var(--color-text-secondary); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mini-stat { background: var(--color-bg); border-radius: 8px; padding: 12px; text-align: center; }
.mini-val { font-size: 15px; font-weight: 700; }
.mini-label { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; }
.card-title { font-size: 14px; font-weight: 600; }
.order-link { color: var(--color-primary); text-decoration: none; font-family: var(--font-mono); font-size: 11px; }
</style>

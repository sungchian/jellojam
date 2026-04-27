<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">客戶詳情</h1>
        <p v-if="customer" class="page-subtitle">Line UID：{{ customer.line_user_id }}</p>
      </div>
      <RouterLink to="/customers"><el-button :icon="ArrowLeft">返回列表</el-button></RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="detail-grid">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="skeleton-card" style="height:220px"></div>
        <div class="skeleton-card" style="height:160px"></div>
      </div>
      <div class="skeleton-card" style="height:380px"></div>
    </div>

    <el-empty v-else-if="!customer" description="找不到此客戶" />

    <div v-else class="detail-grid">
      <div class="detail-left">
        <!-- Profile card -->
        <el-card>
          <div class="profile-header">
            <div class="profile-avatar" :style="{ background: avatarGradient(customer.name) }">
              {{ (customer.name || '?').charAt(0) }}
            </div>
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
              <span class="info-val" :class="{ muted: !customer.logistics_name }">
                {{ customer.logistics_name || '未填寫' }}
              </span>
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

        <!-- Stats -->
        <el-card>
          <template #header><span class="card-title">💰 消費統計</span></template>
          <div class="stats-grid">
            <div class="mini-stat">
              <div class="mini-val primary">{{ customerOrders.length }}</div>
              <div class="mini-label">訂單筆數</div>
            </div>
            <div class="mini-stat">
              <div class="mini-val success" style="font-size:13px">NT$ {{ Math.round(customer.total_spent).toLocaleString() }}</div>
              <div class="mini-label">累計消費</div>
            </div>
            <div class="mini-stat">
              <div class="mini-val info">{{ uniqueProducts.length }}</div>
              <div class="mini-label">購買品項</div>
            </div>
            <div class="mini-stat">
              <div class="mini-val">{{ completedCount }}</div>
              <div class="mini-label">已出貨</div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- Order history -->
      <div class="detail-right">
        <el-card>
          <template #header>
            <div class="card-header-row">
              <span class="card-title">📋 訂單記錄</span>
              <el-tag size="small" type="info">{{ customerOrders.length }} 筆</el-tag>
            </div>
          </template>
          <el-empty v-if="!customerOrders.length" description="此客戶暫無訂單" />
          <el-table border v-else :data="customerOrders" size="small" highlight-current-row>
            <el-table-column prop="order_id" label="訂單編號" width="148" show-overflow-tooltip>
              <template #default="{ row }">
                <RouterLink :to="`/orders/${row.id}`" class="order-link">{{ row.order_id }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column prop="product_name" label="商品" min-width="130" show-overflow-tooltip />
            <el-table-column label="售價" width="120" align="right">
              <template #default="{ row }">
                <span v-if="row.selling_price" class="price-mono">NT$ {{ row.selling_price.toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="狀態" width="108" align="center">
              <template #default="{ row }">
                <span :class="`badge badge-${row.statusConfig?.badge || 'inactive'}`">{{ row.order_status }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="sales_date" label="下單日" width="100" />
            <el-table-column label="備註" min-width="100">
              <template #default="{ row }">
                <span class="note-text">{{ row.note }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAppDataStore } from '@/stores/appData'

const route = useRoute()
const store = useAppDataStore()

const customer       = computed(() => store.mockCustomers.find(c => String(c.id) === String(route.params.id)) || null)
const customerOrders = computed(() => store.mockSales.filter(s => s.customer === customer.value?.name))
const uniqueProducts = computed(() => [...new Set(customerOrders.value.map(o => o.product_name).filter(Boolean))])
const completedCount = computed(() => customerOrders.value.filter(o => o.order_status === '已出貨').length)

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

onMounted(() => store.fetchAll())
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: 300px 1fr; gap: 16px; }
.detail-left, .detail-right { display: flex; flex-direction: column; gap: 16px; }
.profile-header { display: flex; align-items: center; gap: 14px; }
.profile-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  color: #fff; font-size: 20px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.profile-name { font-size: 18px; font-weight: 700; }
.prev-names { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; }
.info-rows { display: flex; flex-direction: column; gap: 12px; }
.info-row { display: flex; align-items: flex-start; gap: 8px; }
.info-label { font-size: 12px; color: var(--color-text-muted); width: 80px; flex-shrink: 0; padding-top: 1px; }
.info-val { font-size: 13px; }
.info-val.muted { color: var(--color-text-muted); font-style: italic; }
.uid { font-family: var(--font-mono); font-size: 10px; word-break: break-all; color: var(--color-text-secondary); }
.card-title { font-size: 14px; font-weight: 600; }
.card-header-row { display: flex; align-items: center; justify-content: space-between; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mini-stat { background: var(--color-bg); border-radius: 10px; padding: 14px; text-align: center; border: 1px solid var(--color-border); }
.mini-val { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.mini-val.primary { color: var(--color-primary); }
.mini-val.success { color: var(--color-success); }
.mini-val.info { color: var(--color-info); }
.mini-label { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; }
.order-link { color: var(--color-primary); text-decoration: none; font-family: var(--font-mono); font-size: 11px; }
.order-link:hover { text-decoration: underline; }
.price-mono { font-weight: 600; font-family: var(--font-mono); }
.note-text { font-size: 11px; color: var(--color-text-muted); }
</style>

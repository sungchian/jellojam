<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">訂單詳情</h1>
        <p class="page-subtitle">{{ order.order_id }}</p>
      </div>
      <div style="display:flex;gap:8px">
        <RouterLink to="/orders"><el-button :icon="ArrowLeft">返回列表</el-button></RouterLink>
        <el-dropdown @command="handleStatusChange">
          <el-button type="primary">
            更新狀態 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="(cfg, key) in ORDER_STATUSES" :key="key" :command="key">
                {{ cfg.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-left">
        <!-- Order summary -->
        <el-card>
          <template #header><span class="card-title">📄 訂單資訊</span></template>
          <div class="info-rows">
            <div class="info-row"><span class="info-label">訂單編號</span><span class="info-val mono">{{ order.order_id }}</span></div>
            <div class="info-row"><span class="info-label">訂單狀態</span><span :class="`badge badge-${order.statusConfig?.badge}`">{{ order.order_status }}</span></div>
            <div class="info-row"><span class="info-label">下單日期</span><span class="info-val">{{ order.sales_date }}</span></div>
            <div class="info-row"><span class="info-label">出貨日期</span><span class="info-val">{{ order.shipping_date || '—' }}</span></div>
            <div class="info-row"><span class="info-label">週次</span><span class="info-val">{{ order.sales_week }}</span></div>
            <div class="info-row"><span class="info-label">群組</span>
              <el-tag v-if="order.group_name" size="small" type="info">{{ order.group_name }}</el-tag>
              <span v-else class="info-val" style="color:var(--color-text-muted)">—</span>
            </div>
          </div>
        </el-card>

        <!-- Customer info -->
        <el-card>
          <template #header><span class="card-title">👤 客戶資訊</span></template>
          <div class="info-rows">
            <div class="info-row"><span class="info-label">客戶姓名</span><span class="info-val">{{ order.customer }}</span></div>
            <div class="info-row"><span class="info-label">賣貨便名稱</span><span class="info-val">{{ order.logistics_name || '—' }}</span></div>
          </div>
        </el-card>

        <!-- Pricing -->
        <el-card>
          <template #header><span class="card-title">💰 費用明細</span></template>
          <div class="price-summary">
            <div class="price-row"><span>售價</span><span class="price-val">NT$ {{ (order.selling_price||0).toLocaleString() }}</span></div>
            <div class="price-row" v-if="order.payment_amount"><span>匯款金額</span><span class="price-val ok">NT$ {{ order.payment_amount.toLocaleString() }}</span></div>
            <div class="price-row" v-if="order.addon_amount"><span>加購金額</span><span class="price-val">NT$ {{ order.addon_amount.toLocaleString() }}</span></div>
            <div class="price-row" v-if="order.logistics_price"><span>賣貨便費用</span><span class="price-val">NT$ {{ order.logistics_price.toLocaleString() }}</span></div>
            <div class="price-row" v-if="order.cost_twd"><span>商品成本</span><span class="price-val cost">NT$ {{ order.cost_twd.toLocaleString() }}</span></div>
            <div class="price-row" v-if="order.other_twd"><span>其他費用</span><span class="price-val cost">NT$ {{ order.other_twd.toFixed(2) }}</span></div>
            <el-divider style="margin:8px 0" />
            <div class="price-row profit-row" v-if="order.profit"><span>利潤</span><span :style="{color: order.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700}">NT$ {{ order.profit.toFixed(0) }}</span></div>
          </div>
        </el-card>
      </div>

      <div class="detail-right">
        <!-- Product -->
        <el-card>
          <template #header><span class="card-title">📦 商品</span></template>
          <div class="product-block">
            <div class="product-name">{{ order.product_name }}</div>
            <div class="product-price">NT$ {{ (order.selling_price||0).toLocaleString() }}</div>
          </div>
        </el-card>

        <!-- Notes -->
        <el-card v-if="order.note">
          <template #header><span class="card-title">📝 備註</span></template>
          <div class="note-block">{{ order.note }}</div>
        </el-card>

        <!-- Same customer orders -->
        <el-card>
          <template #header><span class="card-title">📋 同客戶其他訂單</span></template>
          <el-table :data="sameCustomerOrders" size="small" :max-height="280">
            <el-table-column prop="order_id" label="訂單編號" min-width="150">
              <template #default="{ row }">
                <RouterLink :to="`/orders/${row.id}`" class="order-link">{{ row.order_id }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column prop="product_name" label="商品" min-width="110" />
            <el-table-column label="狀態" width="100" align="center">
              <template #default="{ row }">
                <span :class="`badge badge-${row.statusConfig?.badge}`">{{ row.order_status }}</span>
              </template>
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
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowDown } from '@element-plus/icons-vue'
import { mockSales, ORDER_STATUSES } from '@/mock/data'

const route = useRoute()
const orders = ref(mockSales.map(s => ({ ...s })))
const order = ref(orders.value.find(o => o.id == route.params.id) || orders.value[0])

const sameCustomerOrders = computed(() =>
  orders.value.filter(o => o.customer === order.value.customer && o.id !== order.value.id).slice(0, 10)
)

function handleStatusChange(key) {
  order.value.order_status = key
  order.value.statusConfig = ORDER_STATUSES[key]
  ElMessage.success(`狀態已更新為「${ORDER_STATUSES[key].label}」`)
}
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: 320px 1fr; gap: 16px; }
.detail-left, .detail-right { display: flex; flex-direction: column; gap: 16px; }
.card-title { font-size: 14px; font-weight: 600; }
.info-rows { display: flex; flex-direction: column; gap: 10px; }
.info-row { display: flex; align-items: center; gap: 8px; }
.info-label { font-size: 12px; color: var(--color-text-muted); width: 74px; flex-shrink: 0; }
.info-val { font-size: 13px; }
.mono { font-family: var(--font-mono); font-size: 12px; }
.price-summary { display: flex; flex-direction: column; gap: 8px; }
.price-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--color-text-secondary); }
.price-val { font-family: var(--font-mono); font-weight: 600; color: var(--color-text-primary); }
.price-val.ok { color: #10b981; }
.price-val.cost { color: #ef4444; }
.profit-row { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.product-block { padding: 8px 0; display: flex; justify-content: space-between; align-items: center; }
.product-name { font-size: 15px; font-weight: 600; }
.product-price { font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--color-primary); }
.note-block { font-size: 13px; color: var(--color-text-secondary); padding: 4px 0; line-height: 1.8; }
.order-link { color: var(--color-primary); text-decoration: none; font-family: var(--font-mono); font-size: 11px; }
</style>

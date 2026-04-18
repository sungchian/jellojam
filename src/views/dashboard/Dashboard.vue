<template>
  <div class="dashboard">
    <div class="page-header">
      <div>
        <h1 class="page-title">JelloJam 營運總覽 <!-- dashboard --></h1>
        <p class="page-subtitle">{{ today }} · 歡迎回來，{{ auth.user?.name }}</p>
      </div>
      <el-button type="primary" :icon="Refresh" @click="refresh" :loading="refreshing">刷新數據</el-button>
    </div>

    <div class="stat-cards">
      <div class="stat-card" v-for="stat in kpiCards" :key="stat.label">
        <div class="stat-card-icon" :style="{ background: stat.bg }">
          <el-icon :style="{ color: stat.color }" size="20"><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-card-value">{{ stat.value }}</div>
        <div class="stat-card-label">{{ stat.label }}</div>
        <div v-if="stat.sub" class="stat-sub">{{ stat.sub }}</div>
      </div>
    </div>

    <div class="payer-row">
      <el-card v-for="p in stats.purchaseSummaryByPayer" :key="p.payer" class="payer-card">
        <div class="payer-inner">
          <div class="payer-avatar">{{ p.payer.charAt(0) }}</div>
          <div>
            <p class="payer-name">{{ p.payer }}</p>
            <p class="payer-sub">{{ p.count }} 筆採購</p>
          </div>
          <div class="payer-amounts">
            <p class="payer-usd">${{ p.total_usd.toFixed(0) }} USD</p>
            <p class="payer-twd">NT$ {{ Math.round(p.total_twd).toLocaleString() }}</p>
          </div>
        </div>
      </el-card>
      <el-card class="payer-card profit-card">
        <div class="payer-inner">
          <div class="payer-avatar profit-avatar">💰</div>
          <div>
            <p class="payer-name">毛利潤</p>
            <p class="payer-sub">收入 - 採購 - 費用</p>
          </div>
          <div class="payer-amounts">
            <p class="payer-twd" :style="{ color: totalProfit >= 0 ? '#10b981' : '#ef4444' }">
              NT$ {{ Math.round(totalProfit).toLocaleString() }}
            </p>
            <p class="payer-sub">{{ profitMargin }}% 毛利率</p>
          </div>
        </div>
      </el-card>
    </div>

    <div class="charts-row">
      <el-card style="flex:3">
        <template #header>
          <div class="card-header-row">
            <span class="card-title">每週銷售趨勢（{{ stats.revenueByWeek.length }} 週）</span>
            <el-radio-group v-model="weekChartType" size="small">
              <el-radio-button label="revenue">營業額</el-radio-button>
              <el-radio-button label="orders">訂單數</el-radio-button>
            </el-radio-group>
          </div>
        </template>
        <div ref="weekChart" class="chart-area"></div>
      </el-card>
      <el-card style="flex:1.2">
        <template #header><span class="card-title">訂單狀態分布</span></template>
        <div ref="statusChart" class="chart-area"></div>
      </el-card>
    </div>

    <div class="charts-row">
      <el-card style="flex:1">
        <template #header><span class="card-title">🏆 熱銷商品 Top 10</span></template>
        <div ref="topChart" class="chart-area"></div>
      </el-card>
      <el-card style="flex:1">
        <template #header><span class="card-title">📦 費用結構</span></template>
        <div ref="expChart" class="chart-area"></div>
      </el-card>
    </div>

    <div class="bottom-row">
      <el-card style="flex:1">
        <template #header>
          <div class="card-header-row">
            <span class="card-title">最新訂單</span>
            <RouterLink to="/orders" class="view-all">查看全部 →</RouterLink>
          </div>
        </template>
        <el-table :data="stats.recentOrders" size="small">
          <el-table-column prop="order_id" label="訂單編號" min-width="180">
            <template #default="{ row }"><span class="order-no">{{ row.order_id }}</span></template>
          </el-table-column>
          <el-table-column prop="customer" label="客戶" width="80" />
          <el-table-column prop="product_name" label="商品" min-width="120" />
          <el-table-column label="售價" width="110" align="right">
            <template #default="{ row }">
              <span v-if="row.selling_price" class="price-mono">NT$ {{ row.selling_price.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column label="狀態" width="110" align="center">
            <template #default="{ row }">
              <span :class="`badge badge-${row.statusConfig?.badge || 'inactive'}`">{{ row.order_status }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card style="width:300px;flex-shrink:0">
        <template #header>
          <div class="card-header-row">
            <span class="card-title">⚠️ 低庫存商品</span>
            <RouterLink to="/inventory" class="view-all">管理 →</RouterLink>
          </div>
        </template>
        <div v-if="!stats.lowStockProducts.length" class="empty-hint">目前無低庫存商品 ✓</div>
        <div class="low-stock-list">
          <div class="low-stock-item" v-for="p in stats.lowStockProducts" :key="p.product_name">
            <div class="stock-info">
              <p class="stock-name">{{ p.product_name }}</p>
              <p class="stock-cat">{{ p.jellycat_category }}</p>
            </div>
            <div class="stock-qty" :class="p.current_stock === 0 ? 'out' : 'low'">
              {{ p.current_stock === 0 ? '缺貨' : p.current_stock + ' 件' }}
            </div>
          </div>
        </div>
        <el-divider style="margin:12px 0" />
        <p class="card-title" style="margin-bottom:10px">💸 費用彙總</p>
        <div class="expense-summary">
          <div class="exp-row" v-for="e in stats.expenseSummaryByType" :key="e.type">
            <span class="exp-type">{{ e.type }}</span>
            <span class="exp-count">{{ e.count }}筆</span>
            <span class="exp-amt">NT$ {{ Math.round(e.total_twd).toLocaleString() }}</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { useAuthStore } from '@/stores/auth'
import { mockDashStats as stats, totalRevenue, totalCost, totalExpense, totalProfit } from '@/mock/data'

const auth = useAuthStore()
const today = dayjs().format('YYYY年MM月DD日')
const refreshing = ref(false)
const weekChartType = ref('revenue')
const weekChart = ref()
const statusChart = ref()
const topChart = ref()
const expChart = ref()
let weekInst, statusInst, topInst, expInst

const profitMargin = computed(() =>
  totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0'
)

const kpiCards = computed(() => [
  { label: '總訂單數', value: stats.totalOrders, icon: 'List', bg: '#eef2ff', color: '#6366f1', sub: `已出貨 ${stats.completedOrders} · 待出貨 ${stats.pendingOrders}` },
  { label: '總銷售額', value: `NT$ ${Math.round(totalRevenue).toLocaleString()}`, icon: 'Money', bg: '#ecfdf5', color: '#10b981', sub: `${stats.revenueByWeek.length} 週累計` },
  { label: '採購成本', value: `NT$ ${Math.round(totalCost).toLocaleString()}`, icon: 'ShoppingCart', bg: '#fef2f2', color: '#ef4444', sub: `${stats.purchaseSummaryByPayer.reduce((a, p) => a + p.count, 0)} 筆採購` },
  { label: '營運費用', value: `NT$ ${Math.round(totalExpense).toLocaleString()}`, icon: 'Van', bg: '#fffbeb', color: '#f59e0b', sub: `${stats.expenseSummaryByType.reduce((a, e) => a + e.count, 0)} 筆費用` },
  { label: '客戶總數', value: stats.totalCustomers, icon: 'UserFilled', bg: '#f0f9ff', color: '#3b82f6', sub: 'Line 用戶' },
  { label: '商品 SKU', value: stats.totalProducts, icon: 'Box', bg: '#fdf4ff', color: '#a855f7', sub: `低庫存 ${stats.lowStockCount} 項` },
])

function initWeekChart() {
  if (!weekInst) weekInst = echarts.init(weekChart.value)
  const data = stats.revenueByWeek
  weekInst.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 0, right: 10, top: 10, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: data.map(d => d.week), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 10, color: '#94a3b8', rotate: 30 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { fontSize: 10, color: '#94a3b8', formatter: weekChartType.value === 'revenue' ? v => `${(v / 1000).toFixed(0)}K` : undefined } },
    series: [{ data: data.map(d => weekChartType.value === 'revenue' ? Math.round(d.revenue) : d.orders), type: 'bar', barMaxWidth: 20, borderRadius: [4, 4, 0, 0], itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#818cf8' }] } } }]
  })
}

function initStatusChart() {
  if (!statusInst) statusInst = echarts.init(statusChart.value)
  statusInst.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '42%'], data: stats.orderStatusDist.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })), label: { show: false } }]
  })
}

function initTopChart() {
  if (!topInst) topInst = echarts.init(topChart.value)
  const data = [...stats.topProducts].reverse()
  topInst.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: {c} 筆' },
    grid: { left: 0, right: 20, top: 10, bottom: 0, containLabel: true },
    xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    yAxis: { type: 'category', data: data.map(d => d.name.length > 8 ? d.name.slice(0, 8) + '…' : d.name), axisLabel: { fontSize: 11, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: 'bar', data: data.map(d => d.count), barMaxWidth: 16, borderRadius: [0, 6, 6, 0], itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#818cf8' }, { offset: 1, color: '#6366f1' }] } } }]
  })
}

function initExpChart() {
  if (!expInst) expInst = echarts.init(expChart.value)
  expInst.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: NT$ {c}' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    series: [{ type: 'pie', radius: ['0%', '65%'], center: ['50%', '42%'], data: stats.expenseSummaryByType.map(e => ({ name: e.type, value: Math.round(e.total_twd) })), label: { fontSize: 11 }, color: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'] }]
  })
}

watch(weekChartType, () => initWeekChart())

async function refresh() {
  refreshing.value = true
  await new Promise(r => setTimeout(r, 600))
  refreshing.value = false
}

onMounted(async () => {
  await nextTick()
  initWeekChart()
  initStatusChart()
  initTopChart()
  initExpChart()
  window.addEventListener('resize', () => {
    weekInst?.resize(); statusInst?.resize(); topInst?.resize(); expInst?.resize()
  })
})
</script>

<style scoped>
.payer-row { display: flex; gap: 12px; margin-bottom: 16px; }
.payer-card { flex: 1; }
.profit-card { border: 1.5px solid #bbf7d0; }
.payer-inner { display: flex; align-items: center; gap: 12px; }
.payer-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.profit-avatar { background: linear-gradient(135deg, #10b981, #34d399); }
.payer-name { font-size: 14px; font-weight: 600; }
.payer-sub { font-size: 11px; color: var(--color-text-muted); }
.payer-amounts { margin-left: auto; text-align: right; }
.payer-usd { font-size: 12px; color: var(--color-text-secondary); font-family: var(--font-mono); }
.payer-twd { font-size: 14px; font-weight: 700; font-family: var(--font-mono); }
.charts-row { display: flex; gap: 16px; margin-bottom: 16px; }
.chart-area { height: 260px; }
.card-header-row { display: flex; align-items: center; justify-content: space-between; }
.card-title { font-size: 14px; font-weight: 600; }
.view-all { font-size: 12px; color: var(--color-primary); text-decoration: none; }
.bottom-row { display: flex; gap: 16px; }
.order-no { font-family: var(--font-mono); font-size: 11px; color: var(--color-primary); }
.price-mono { font-weight: 600; font-family: var(--font-mono); }
.stat-sub { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; }
.low-stock-list { display: flex; flex-direction: column; gap: 8px; }
.low-stock-item { display: flex; align-items: center; gap: 8px; }
.stock-info { flex: 1; }
.stock-name { font-size: 12px; font-weight: 500; }
.stock-cat { font-size: 10px; color: var(--color-text-muted); }
.stock-qty { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
.stock-qty.out { background: #fee2e2; color: #ef4444; }
.stock-qty.low { background: #fef3c7; color: #d97706; }
.empty-hint { font-size: 12px; color: var(--color-text-muted); padding: 8px 0; }
.expense-summary { display: flex; flex-direction: column; gap: 6px; }
.exp-row { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.exp-type { min-width: 60px; font-weight: 500; }
.exp-count { color: var(--color-text-muted); min-width: 28px; }
.exp-amt { margin-left: auto; font-family: var(--font-mono); font-weight: 600; }
:deep(.el-card__header) { padding: 12px 16px; border-bottom: 1px solid var(--color-border); }
</style>

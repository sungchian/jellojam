<template>
  <div class="dashboard">

    <!-- ═══ Hero Header ═══ -->
    <div class="dash-hero">
      <div class="dash-hero-left">
        <div class="hero-greeting">{{ greeting }}，{{ auth.user?.name || 'Kelsey' }}</div>
        <h1 class="hero-title">營運總覽</h1>
        <p class="hero-meta">{{ today }} · 資料即時同步自 Supabase</p>
      </div>
      <div class="dash-hero-right">
        <!-- ── Time Range Filter ── -->
        <div class="time-filter">
          <button
            v-for="t in TIME_RANGES"
            :key="t.value"
            :class="['time-btn', { active: timeRange === t.value }]"
            @click="timeRange = t.value"
          >{{ t.label }}</button>
        </div>
        <el-button class="refresh-btn" @click="handleRefresh" :loading="store.loading">
          <el-icon><Refresh /></el-icon>
          刷新數據
        </el-button>
      </div>
    </div>

    <!-- ═══ Loading Skeleton ═══ -->
    <template v-if="store.loading">
      <div class="stat-cards" style="grid-template-columns:repeat(6,1fr)">
        <div class="skeleton-card" v-for="i in 6" :key="i" style="height:120px">
          <div class="skeleton skeleton-icon"></div>
          <div class="skeleton skeleton-val"></div>
          <div class="skeleton skeleton-line w-1-2"></div>
        </div>
      </div>
      <div class="charts-row">
        <div class="skeleton-card" style="flex:2.5;height:300px"></div>
        <div class="skeleton-card" style="flex:1;height:300px"></div>
      </div>
    </template>

    <!-- ═══ Error ═══ -->
    <el-alert
      v-else-if="store.error"
      type="error"
      :title="`資料載入失敗：${store.error}`"
      description="請確認 Supabase 連線狀態，或點擊右上角重新整理"
      show-icon :closable="false"
      style="margin-bottom:24px;border-radius:14px"
    />

    <!-- ═══ Content ═══ -->
    <template v-else>

      <!-- Time Range Banner -->
      <div class="range-banner">
        <el-icon size="13" style="color:var(--color-primary)"><Calendar /></el-icon>
        <span>{{ rangeLabel }} 數據</span>
        <span class="range-count">{{ filteredOrders.length }} 筆訂單</span>
      </div>

      <!-- KPI Cards — 6 in a row -->
      <div class="kpi-grid">
        <div
          class="kpi-card"
          v-for="card in kpiCards"
          :key="card.label"
          :style="{ '--kpi-color': card.color, '--kpi-bg': card.bg }"
        >
          <div class="kpi-icon-wrap" :style="{ background: card.bg }">
            <el-icon size="18" :style="{ color: card.color }"><component :is="card.icon" /></el-icon>
          </div>
          <div class="kpi-body">
            <div class="kpi-value">{{ card.value }}</div>
            <div class="kpi-label">{{ card.label }}</div>
            <div v-if="card.sub" class="kpi-sub">{{ card.sub }}</div>
          </div>
        </div>
      </div>

      <!-- Profit Banner -->
      <div class="profit-banner">
        <div class="profit-item" v-for="item in profitItems" :key="item.label">
          <span class="profit-label">{{ item.label }}</span>
          <span class="profit-val" :style="{ color: item.color }">{{ item.value }}</span>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <el-card style="flex:2.4">
          <template #header>
            <div class="card-header-row">
              <span class="card-title">
                {{ timeRange === 'day' ? '近 30 天每日趨勢' : timeRange === 'week' ? '每週銷售趨勢' : timeRange === 'month' ? '每月銷售趨勢' : '整體週次趨勢' }}
              </span>
              <div class="chart-toggle">
                <button
                  v-for="t in ['revenue','orders']"
                  :key="t"
                  :class="['toggle-btn', { active: weekChartType === t }]"
                  @click="weekChartType = t; initWeekChart()"
                >{{ t === 'revenue' ? '營業額' : '訂單數' }}</button>
              </div>
            </div>
          </template>
          <div ref="weekChart" class="chart-area"></div>
        </el-card>
        <el-card style="flex:1">
          <template #header><span class="card-title">訂單狀態分布</span></template>
          <div ref="statusChart" class="chart-area"></div>
        </el-card>
      </div>

      <!-- Charts Row 2 -->
      <div class="charts-row">
        <el-card style="flex:1">
          <template #header><span class="card-title">🏆 熱銷商品 Top 10</span></template>
          <div ref="topChart" class="chart-area"></div>
        </el-card>
        <el-card style="flex:1">
          <template #header><span class="card-title">💸 費用結構</span></template>
          <div ref="expChart" class="chart-area"></div>
        </el-card>
      </div>

      <!-- Bottom Row -->
      <div class="bottom-row">
        <!-- Recent Orders Table -->
        <el-card style="flex:1;min-width:0">
          <template #header>
            <div class="card-header-row">
              <span class="card-title">最新訂單</span>
              <RouterLink to="/orders" class="view-all">查看全部 <el-icon style="vertical-align:-2px"><ArrowRight /></el-icon></RouterLink>
            </div>
          </template>
          <el-empty v-if="!recentFiltered.length" description="暫無訂單" :image-size="60" />
          <el-table
            border
            v-else
            :data="recentFiltered"
            size="small"
            :show-header="true"
          >
            <!-- 訂單編號: mono font -->
            <el-table-column prop="order_id" label="訂單號" width="138" show-overflow-tooltip>
              <template #default="{ row }">
                <RouterLink :to="`/orders/${row.id}`" class="order-link-cell">{{ row.order_id }}</RouterLink>
              </template>
            </el-table-column>

            <!-- 客戶 -->
            <el-table-column prop="customer" label="客戶" width="82" show-overflow-tooltip />

            <!-- 商品: 彈性 -->
            <el-table-column prop="product_name" label="商品" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="product-name-cell">{{ row.product_name }}</span>
              </template>
            </el-table-column>

            <!-- 售價 -->
            <el-table-column label="售價" width="112" align="right">
              <template #default="{ row }">
                <span v-if="row.selling_price" class="price-cell">NT$ {{ row.selling_price.toLocaleString() }}</span>
              </template>
            </el-table-column>

            <!-- 狀態 -->
            <el-table-column label="狀態" width="110" align="center">
              <template #default="{ row }">
                <span :class="`badge badge-${row.statusConfig?.badge || 'inactive'}`">{{ row.order_status }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- Right Panel: Low Stock + Expenses -->
        <div class="right-panel">
          <!-- Low Stock -->
          <el-card>
            <template #header>
              <div class="card-header-row">
                <span class="card-title">⚠ 低庫存預警</span>
                <RouterLink to="/inventory" class="view-all">管理</RouterLink>
              </div>
            </template>
            <div v-if="!stats.lowStockProducts.length" class="all-good">
              <el-icon size="18" style="color:#10b981"><CircleCheck /></el-icon>
              庫存正常
            </div>
            <div class="low-stock-list" v-else>
              <div class="ls-item" v-for="p in stats.lowStockProducts" :key="p.id">
                <div class="ls-dot" :class="p.current_stock === 0 ? 'out' : 'low'"></div>
                <div class="ls-name">{{ p.product_name }}</div>
                <div class="ls-qty" :class="p.current_stock === 0 ? 'badge badge-danger' : 'badge badge-warning'">
                  {{ p.current_stock === 0 ? '缺貨' : p.current_stock + ' 件' }}
                </div>
              </div>
            </div>
          </el-card>

          <!-- Expense Breakdown -->
          <el-card>
            <template #header><span class="card-title">費用彙總</span></template>
            <div v-if="!stats.expenseSummaryByType.length" class="all-good">暫無費用記錄</div>
            <div class="exp-list" v-else>
              <div class="exp-item" v-for="e in stats.expenseSummaryByType" :key="e.type">
                <span class="exp-type-label">{{ e.type }}</span>
                <span class="exp-count-label">{{ e.count }} 筆</span>
                <span class="exp-amount">NT$ {{ Math.round(e.total_twd).toLocaleString() }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { Refresh, ArrowRight, CircleCheck, Calendar } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { useAuthStore } from '@/stores/auth'
import { useAppDataStore } from '@/stores/appData'

const auth  = useAuthStore()
const store = useAppDataStore()

const today = dayjs().format('YYYY 年 M 月 D 日')
const greeting = computed(() => {
  const h = dayjs().hour()
  if (h < 12) return '早安'
  if (h < 18) return '午安'
  return '晚安'
})

// ── Time Range Filter ─────────────────────────────────────────────
const TIME_RANGES = [
  { value: 'day',   label: '每日' },
  { value: 'week',  label: '每週' },
  { value: 'month', label: '每月' },
  { value: 'all',   label: '全部' },
]
const timeRange = ref('all')

const rangeLabel = computed(() => {
  const found = TIME_RANGES.find(t => t.value === timeRange.value)
  return found?.label || '全部'
})

// Filter orders by time range
const filteredOrders = computed(() => {
  const orders = store.mockSales
  if (timeRange.value === 'all') return orders

  const now = dayjs()
  return orders.filter(o => {
    if (!o.sales_date) return false
    const d = dayjs(o.sales_date)
    if (timeRange.value === 'day')   return d.isAfter(now.subtract(30, 'day'))
    if (timeRange.value === 'week')  return d.isAfter(now.subtract(7,  'day'))
    if (timeRange.value === 'month') return d.isAfter(now.subtract(30, 'day').startOf('month'))
    return true
  })
})

// Recent orders (filtered by time range)
const recentFiltered = computed(() => {
  const orders = timeRange.value === 'all'
    ? store.mockSales.slice(-8).reverse()
    : filteredOrders.value.slice(-8).reverse()
  return orders
})

// Filtered aggregates
const filteredRevenue = computed(() =>
  filteredOrders.value.reduce((a, o) => a + (o.selling_price || 0), 0)
)
const filteredPending = computed(() =>
  filteredOrders.value.filter(o => ['台灣待出貨','已填表單','在美現貨'].includes(o.order_status)).length
)

// Revenue by time group for chart
const revenueByTimeGroup = computed(() => {
  const data = filteredOrders.value
  if (!data.length) return []

  if (timeRange.value === 'week' || timeRange.value === 'all') {
    // group by sales_week
    const m = {}
    data.forEach(o => {
      if (!o.sales_week || !o.selling_price) return
      if (!m[o.sales_week]) m[o.sales_week] = { label: o.sales_week, revenue: 0, count: 0 }
      m[o.sales_week].revenue += o.selling_price
      m[o.sales_week].count++
    })
    return Object.values(m).sort((a, b) => a.label.localeCompare(b.label))
  }

  if (timeRange.value === 'month') {
    // group by YYYY-MM
    const m = {}
    data.forEach(o => {
      if (!o.sales_date || !o.selling_price) return
      const key = String(o.sales_date).substring(0, 7)
      if (!m[key]) m[key] = { label: key, revenue: 0, count: 0 }
      m[key].revenue += o.selling_price
      m[key].count++
    })
    return Object.values(m).sort((a, b) => a.label.localeCompare(b.label))
  }

  if (timeRange.value === 'day') {
    // group by YYYY-MM-DD (last 30 days)
    const m = {}
    data.forEach(o => {
      if (!o.sales_date || !o.selling_price) return
      const key = String(o.sales_date).substring(0, 10)
      if (!m[key]) m[key] = { label: key, revenue: 0, count: 0 }
      m[key].revenue += o.selling_price
      m[key].count++
    })
    return Object.values(m).sort((a, b) => a.label.localeCompare(b.label))
  }

  return []
})

const weekChartType = ref('revenue')
const weekChart   = ref()
const statusChart = ref()
const topChart    = ref()
const expChart    = ref()
let weekInst, statusInst, topInst, expInst

const stats = computed(() => store.mockDashStats)

const kpiCards = computed(() => [
  {
    label: '篩選訂單',
    value: filteredOrders.value.length,
    icon: 'List', bg: '#eef2ff', color: '#6366f1',
    sub: `待出貨 ${filteredPending.value}`,
  },
  {
    label: '篩選銷售額',
    value: `NT$ ${Math.round(filteredRevenue.value).toLocaleString()}`,
    icon: 'TrendCharts', bg: '#ecfdf5', color: '#10b981',
    sub: rangeLabel.value,
  },
  {
    label: '採購成本',
    value: `NT$ ${Math.round(store.totalCost).toLocaleString()}`,
    icon: 'ShoppingCart', bg: '#fef2f2', color: '#ef4444',
    sub: null,
  },
  {
    label: '毛利潤',
    value: `NT$ ${Math.abs(Math.round(store.totalProfit)).toLocaleString()}`,
    icon: 'Money', bg: store.totalProfit >= 0 ? '#ecfdf5' : '#fef2f2',
    color: store.totalProfit >= 0 ? '#10b981' : '#ef4444',
    sub: `${profitMargin.value}% 毛利率`,
  },
  {
    label: '客戶數',
    value: stats.value.totalCustomers,
    icon: 'UserFilled', bg: '#f0f9ff', color: '#3b82f6',
    sub: 'Line 用戶',
  },
  {
    label: '低庫存',
    value: stats.value.lowStockCount,
    icon: 'Warning', bg: '#fffbeb', color: '#f59e0b',
    sub: `共 ${stats.value.totalProducts} SKU`,
  },
])

const profitMargin = computed(() =>
  store.totalRevenue > 0 ? ((store.totalProfit / store.totalRevenue) * 100).toFixed(1) : '0.0'
)

const profitItems = computed(() => [
  { label: '總銷售額', value: `NT$ ${Math.round(store.totalRevenue).toLocaleString()}`, color: '#10b981' },
  { label: '採購成本', value: `NT$ ${Math.round(store.totalCost).toLocaleString()}`, color: '#ef4444' },
  { label: '營運費用', value: `NT$ ${Math.round(store.totalExpense).toLocaleString()}`, color: '#f59e0b' },
  { label: '淨利潤', value: `NT$ ${Math.round(store.totalProfit).toLocaleString()}`, color: store.totalProfit >= 0 ? '#10b981' : '#ef4444' },
  { label: '毛利率', value: `${profitMargin.value}%`, color: '#6366f1' },
])

// ── ECharts ──────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  borderColor: '#334155',
  borderWidth: 1,
  textStyle: { color: '#f1f5f9', fontSize: 12 },
  extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.3)',
}

const INDIGO_GRAD = { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#818cf8' }, { offset: 1, color: '#4f46e5' }] }
const INDIGO_H    = { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#c7d2fe' }, { offset: 1, color: '#6366f1' }] }

function initWeekChart() {
  if (!weekChart.value) return
  if (!weekInst) weekInst = echarts.init(weekChart.value)
  const data = revenueByTimeGroup.value
  weekInst.setOption({
    tooltip: { trigger: 'axis', ...TOOLTIP_STYLE },
    grid: { left: 0, right: 8, top: 10, bottom: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.label),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontSize: 10, color: '#9ca3af', rotate: data.length > 12 ? 30 : 0, interval: 0 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f3f9', type: 'dashed' } },
      axisLabel: {
        fontSize: 10, color: '#9ca3af',
        formatter: weekChartType.value === 'revenue' ? v => `${(v / 1000).toFixed(0)}K` : undefined,
      },
    },
    series: [{
      data: data.map(d => weekChartType.value === 'revenue' ? Math.round(d.revenue) : d.count),
      type: 'bar',
      barMaxWidth: 28,
      borderRadius: [6, 6, 0, 0],
      itemStyle: { color: INDIGO_GRAD },
      emphasis: { itemStyle: { color: '#4f46e5' } },
    }],
  })
}

function initStatusChart() {
  if (!statusChart.value) return
  if (!statusInst) statusInst = echarts.init(statusChart.value)

  // Use filtered orders for status dist
  const statusMap = {}
  filteredOrders.value.forEach(o => {
    if (!o.order_status) return
    statusMap[o.order_status] = (statusMap[o.order_status] || 0) + 1
  })
  const statusData = Object.entries(statusMap).map(([name, value]) => {
    const cfg = store.ORDER_STATUSES[name]
    return { name, value, itemStyle: { color: cfg?.color || '#94a3b8' } }
  }).filter(d => d.value > 0)

  statusInst.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', ...TOOLTIP_STYLE },
    legend: { bottom: 0, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: '#6b7280' } },
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '44%'],
      data: statusData,
      label: { show: false },
      itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
    }],
  })
}

function initTopChart() {
  if (!topChart.value) return
  if (!topInst) topInst = echarts.init(topChart.value)
  const data = [...stats.value.topProducts].reverse()
  topInst.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: {c} 件', ...TOOLTIP_STYLE },
    grid: { left: 0, right: 16, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#f1f3f9', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name),
      axisLabel: { fontSize: 11, color: '#6b7280' },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.count),
      barMaxWidth: 14,
      borderRadius: [0, 6, 6, 0],
      itemStyle: { color: INDIGO_H },
    }],
  })
}

function initExpChart() {
  if (!expChart.value) return
  if (!expInst) expInst = echarts.init(expChart.value)
  expInst.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: NT$ {c}', ...TOOLTIP_STYLE },
    legend: { bottom: 0, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: '#6b7280' } },
    series: [{
      type: 'pie',
      radius: ['0%', '60%'],
      center: ['50%', '44%'],
      data: stats.value.expenseSummaryByType.map(e => ({ name: e.type, value: Math.round(e.total_twd) })),
      label: { fontSize: 10, formatter: '{b}\n{d}%' },
      itemStyle: { borderRadius: 4 },
      color: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'],
    }],
  })
}

function initAllCharts() {
  nextTick(() => {
    initWeekChart()
    initStatusChart()
    initTopChart()
    initExpChart()
  })
}

// Re-init charts when timeRange changes
watch(timeRange, () => {
  nextTick(() => {
    initWeekChart()
    initStatusChart()
  })
})

watch(() => store.initialized, v => { if (v) initAllCharts() })

async function handleRefresh() {
  await store.refresh()
  initAllCharts()
}

onMounted(async () => {
  await store.fetchAll()
  initAllCharts()
  window.addEventListener('resize', () => {
    weekInst?.resize(); statusInst?.resize(); topInst?.resize(); expInst?.resize()
  })
})
</script>

<style scoped>
/* ── Hero ── */
.dash-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
  padding: 26px 32px;
  background: linear-gradient(135deg, #0e0f1a 0%, #1a1040 50%, #0e0f1a 100%);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  gap: 16px;
}
.dash-hero::before {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.3), transparent 70%);
  pointer-events: none;
}
.dash-hero::after {
  content: '';
  position: absolute;
  bottom: -40px; left: 30%;
  width: 140px; height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%);
  pointer-events: none;
}
.dash-hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  z-index: 1;
}
.hero-greeting {
  font-size: 12px;
  font-weight: 600;
  color: rgba(165,180,252,0.8);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.hero-title {
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.8px;
  line-height: 1.1;
}
.hero-meta {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  margin-top: 8px;
}

/* ── Time Filter Pills ── */
.time-filter {
  display: flex;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.time-btn {
  padding: 5px 14px;
  border: none;
  background: none;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
  white-space: nowrap;
}
.time-btn:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.06); }
.time-btn.active {
  background: rgba(99,102,241,0.55);
  color: #fff;
  box-shadow: 0 2px 8px rgba(99,102,241,0.4);
}

.refresh-btn {
  background: rgba(99,102,241,0.20) !important;
  border: 1px solid rgba(99,102,241,0.40) !important;
  color: #a5b4fc !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  backdrop-filter: blur(8px);
  transition: all 0.2s !important;
  z-index: 1;
}
.refresh-btn:hover {
  background: rgba(99,102,241,0.35) !important;
  color: #fff !important;
  border-color: rgba(99,102,241,0.6) !important;
  transform: none !important;
  box-shadow: none !important;
}

/* ── Range Banner ── */
.range-banner {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 7px 14px;
  width: fit-content;
}
.range-count {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  padding: 1px 8px;
  border-radius: 20px;
  margin-left: 4px;
}

/* ── KPI Cards ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}
.kpi-card {
  background: var(--color-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
  box-shadow: var(--shadow-card);
  transition: transform var(--transition), box-shadow var(--transition);
  cursor: default;
  position: relative;
  overflow: hidden;
}
.kpi-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--kpi-color, #6366f1);
  border-radius: 3px 0 0 3px;
  opacity: 0;
  transition: opacity var(--transition);
}
.kpi-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
.kpi-card:hover::before { opacity: 1; }
.kpi-icon-wrap {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
}
.kpi-value {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.8px;
  color: var(--color-text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.kpi-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-top: 6px;
  letter-spacing: 0.1px;
}
.kpi-sub {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

/* ── Profit Banner ── */
.profit-banner {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--color-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 0;
  margin-bottom: 20px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.profit-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  gap: 4px;
  border-right: 1px solid var(--color-border);
  transition: background var(--transition);
}
.profit-item:last-child { border-right: none; }
.profit-item:hover { background: #fafbff; }
.profit-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.profit-val {
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
  font-family: var(--font-mono);
}

/* ── Charts ── */
.charts-row { display: flex; gap: 16px; margin-bottom: 16px; }
.chart-area { height: 260px; }

.chart-toggle {
  display: flex;
  background: #f5f6fb;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.toggle-btn {
  padding: 4px 12px;
  border: none;
  background: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
}
.toggle-btn.active {
  background: #fff;
  color: var(--color-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
}

/* ── Bottom Row ── */
.bottom-row { display: flex; gap: 16px; align-items: flex-start; }

.right-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Order table cells */
.order-link-cell {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  letter-spacing: 0.2px;
}
.order-link-cell:hover { text-decoration: underline; }
.product-name-cell { font-size: 12px; }
.price-cell { font-family: var(--font-mono); font-weight: 700; font-size: 12px; }

/* Low stock */
.low-stock-list { display: flex; flex-direction: column; gap: 8px; }
.ls-item { display: flex; align-items: center; gap: 8px; }
.ls-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.ls-dot.out { background: #ef4444; }
.ls-dot.low { background: #f59e0b; }
.ls-name { flex: 1; font-size: 12px; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Expense list */
.exp-list { display: flex; flex-direction: column; gap: 7px; }
.exp-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.exp-type-label { flex: 1; font-weight: 500; }
.exp-count-label { color: var(--color-text-muted); font-size: 11px; min-width: 24px; }
.exp-amount { font-family: var(--font-mono); font-weight: 700; font-size: 12px; color: var(--color-text-primary); }

.all-good {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 4px 0;
}
</style>

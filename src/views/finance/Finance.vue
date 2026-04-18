<template>
  <div>
    <div class="page-header">
      <div><h1 class="page-title">財務管理</h1><p class="page-subtitle">採購成本、營運費用與損益分析 <!-- finance --></p></div>
      <el-button :icon="Download">匯出報表</el-button>
    </div>

    <!-- Summary cards -->
    <div class="stat-cards" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="stat-card" v-for="s in summaryCards" :key="s.label">
        <div class="stat-card-icon" :style="{background:s.bg}">
          <el-icon :style="{color:s.color}" size="22"><component :is="s.icon"/></el-icon>
        </div>
        <div class="stat-card-value" :style="s.valueColor ? {color:s.valueColor} : {}">{{ s.value }}</div>
        <div class="stat-card-label">{{ s.label }}</div>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <!-- Purchases tab -->
      <el-tab-pane label="📦 採購記錄" name="purchases">
        <div class="filter-bar">
          <el-input v-model="purSearch" placeholder="搜尋商品名稱 / 訂單號…" :prefix-icon="Search" clearable style="width:260px" />
          <el-select v-model="purPayer" placeholder="付款人" clearable style="width:120px">
            <el-option label="Kelsey" value="Kelsey" />
            <el-option label="Karina" value="Karina" />
          </el-select>
          <el-select v-model="purCurrency" placeholder="幣別" clearable style="width:100px">
            <el-option label="US" value="US" />
            <el-option label="TWD" value="TWD" />
            <el-option label="RMB" value="RMB" />
          </el-select>
          <el-select v-model="purBank" placeholder="付款方式" clearable style="width:120px">
            <el-option v-for="b in BANKS" :key="b" :label="b" :value="b" />
          </el-select>
          <el-button @click="purSearch='';purPayer='';purCurrency='';purBank=''">重置</el-button>
        </div>

        <!-- Payer summary -->
        <div class="payer-summary">
          <div class="payer-box" v-for="p in purchaseSummaryByPayer" :key="p.payer">
            <span class="payer-name">{{ p.payer }}</span>
            <span class="payer-count">{{ p.count }} 筆</span>
            <span class="payer-usd">${{ p.total_usd.toFixed(0) }} USD</span>
            <span class="payer-twd">NT$ {{ Math.round(p.total_twd).toLocaleString() }}</span>
          </div>
        </div>

        <el-card>
          <el-table :data="purPaginated" size="small">
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="product_name" label="商品名稱" min-width="150" />
            <el-table-column prop="qty" label="數量" width="70" align="center" />
            <el-table-column label="單價" width="90" align="right">
              <template #default="{ row }">
                <span style="font-family:var(--font-mono)">{{ row.unit_cost }} {{ row.currency }}</span>
              </template>
            </el-table-column>
            <el-table-column label="總成本" width="100" align="right">
              <template #default="{ row }">
                <span style="font-family:var(--font-mono);font-weight:600">{{ row.total_cost }} {{ row.currency }}</span>
              </template>
            </el-table-column>
            <el-table-column label="台幣" width="110" align="right">
              <template #default="{ row }">
                <span style="font-family:var(--font-mono);color:#ef4444">NT$ {{ Math.round(row.total_cost_twd).toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="付款人" width="90" align="center">
              <template #default="{ row }"><el-tag size="small" :type="row.paid_by==='Kelsey'?'primary':'success'">{{ row.paid_by }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="vendor_order_no" label="訂單號" width="130">
              <template #default="{ row }"><span class="vendor-no">{{ row.vendor_order_no }}</span></template>
            </el-table-column>
            <el-table-column prop="bank" label="銀行" width="80" align="center" />
          </el-table>
          <el-pagination v-model:current-page="purPage" :total="purFiltered.length" :page-size="20" layout="total, prev, pager, next" />
        </el-card>
      </el-tab-pane>

      <!-- Expenses tab -->
      <el-tab-pane label="💸 營運費用" name="expenses">
        <div class="filter-bar">
          <el-select v-model="expType" placeholder="費用類型" clearable style="width:140px">
            <el-option v-for="t in EXPENSE_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select v-model="expPayer" placeholder="付款人" clearable style="width:120px">
            <el-option label="Kelsey" value="Kelsey" />
            <el-option label="Karina" value="Karina" />
          </el-select>
          <el-button @click="expType='';expPayer=''">重置</el-button>
        </div>

        <!-- Expense type summary -->
        <div class="exp-summary-grid">
          <div class="exp-box" v-for="e in expenseSummaryByType" :key="e.type">
            <span class="exp-type">{{ e.type }}</span>
            <span class="exp-count">{{ e.count }} 筆</span>
            <span class="exp-twd">NT$ {{ Math.round(e.total_twd).toLocaleString() }}</span>
          </div>
        </div>

        <el-card>
          <el-table :data="expFiltered" size="small">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column label="費用類型" width="110" align="center">
              <template #default="{ row }"><el-tag size="small">{{ row.type }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="qty" label="數量" width="80" align="center" />
            <el-table-column label="單價" width="100" align="right">
              <template #default="{ row }"><span style="font-family:var(--font-mono)">{{ row.unit_cost }} {{ row.currency }}</span></template>
            </el-table-column>
            <el-table-column label="總費用" width="110" align="right">
              <template #default="{ row }"><span style="font-family:var(--font-mono);font-weight:600">{{ row.total_cost }} {{ row.currency }}</span></template>
            </el-table-column>
            <el-table-column label="台幣" width="110" align="right">
              <template #default="{ row }"><span style="font-family:var(--font-mono);color:#ef4444;font-weight:600">NT$ {{ Math.round(row.amount_twd).toLocaleString() }}</span></template>
            </el-table-column>
            <el-table-column label="付款人" width="90" align="center">
              <template #default="{ row }"><el-tag size="small" :type="row.paid_by==='Kelsey'?'primary':'success'">{{ row.paid_by }}</el-tag></template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- P&L tab -->
      <el-tab-pane label="📊 損益分析" name="pnl">
        <div class="charts-row">
          <el-card style="flex:2">
            <template #header><span class="card-title">每週營業額趨勢</span></template>
            <div ref="weekChart" style="height:280px"></div>
          </el-card>
          <el-card style="flex:1">
            <template #header><span class="card-title">費用結構佔比</span></template>
            <div ref="expPieChart" style="height:280px"></div>
          </el-card>
        </div>
        <el-card style="margin-top:16px">
          <template #header><span class="card-title">損益摘要</span></template>
          <div class="pnl-table">
            <div class="pnl-row header"><span>項目</span><span>金額（TWD）</span><span>佔比</span></div>
            <div class="pnl-row revenue"><span>💰 總銷售額</span><span>NT$ {{ Math.round(totalRevenue).toLocaleString() }}</span><span>100%</span></div>
            <div class="pnl-row cost"><span>📦 採購成本</span><span>-NT$ {{ Math.round(totalCost).toLocaleString() }}</span><span>{{ totalRevenue ? (totalCost/totalRevenue*100).toFixed(1) : 0 }}%</span></div>
            <div class="pnl-row expense"><span>🚗 營運費用</span><span>-NT$ {{ Math.round(totalExpense).toLocaleString() }}</span><span>{{ totalRevenue ? (totalExpense/totalRevenue*100).toFixed(1) : 0 }}%</span></div>
            <div class="pnl-row divider"></div>
            <div class="pnl-row profit"><span>📈 毛利潤</span><span :style="{color:totalProfit>=0?'#10b981':'#ef4444'}">NT$ {{ Math.round(totalProfit).toLocaleString() }}</span><span :style="{color:totalProfit>=0?'#10b981':'#ef4444',fontWeight:700}">{{ totalRevenue ? (totalProfit/totalRevenue*100).toFixed(1) : 0 }}%</span></div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Search, Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  mockPurchases, mockExpenses, purchaseSummaryByPayer, expenseSummaryByType,
  totalRevenue, totalCost, totalExpense, totalProfit,
  revenueByWeek, EXPENSE_TYPES, BANKS
} from '@/mock/data'

const activeTab = ref('purchases')
const purSearch = ref(''); const purPayer = ref(''); const purCurrency = ref(''); const purBank = ref('')
const expType = ref(''); const expPayer = ref('')
const purPage = ref(1)
const weekChart = ref(); const expPieChart = ref()
let weekInst, pieInst

const summaryCards = computed(() => [
  { label: '總銷售額',  value: `NT$ ${Math.round(totalRevenue).toLocaleString()}`, icon: 'TrendCharts', bg: '#ecfdf5', color: '#10b981' },
  { label: '採購成本',  value: `NT$ ${Math.round(totalCost).toLocaleString()}`,    icon: 'ShoppingCart', bg: '#fef2f2', color: '#ef4444' },
  { label: '營運費用',  value: `NT$ ${Math.round(totalExpense).toLocaleString()}`,  icon: 'Van',         bg: '#fffbeb', color: '#f59e0b' },
  { label: '毛利潤',   value: `NT$ ${Math.round(totalProfit).toLocaleString()}`,   icon: 'Money',        bg: '#eef2ff', color: '#6366f1', valueColor: totalProfit >= 0 ? '#10b981' : '#ef4444' },
])

const purFiltered = computed(() => mockPurchases.filter(p => {
  if (purSearch.value && !p.product_name?.includes(purSearch.value) && !p.vendor_order_no?.includes(purSearch.value)) return false
  if (purPayer.value && p.paid_by !== purPayer.value) return false
  if (purCurrency.value && p.currency !== purCurrency.value) return false
  if (purBank.value && p.bank !== purBank.value) return false
  return true
}))

const purPaginated = computed(() => purFiltered.value.slice((purPage.value-1)*20, purPage.value*20))

const expFiltered = computed(() => mockExpenses.filter(e => {
  if (expType.value && e.type !== expType.value) return false
  if (expPayer.value && e.paid_by !== expPayer.value) return false
  return true
}))

function initCharts() {
  if (weekChart.value) {
    weekInst = echarts.init(weekChart.value)
    const data = revenueByWeek
    weekInst.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 0, right: 10, top: 10, bottom: 40, containLabel: true },
      xAxis: { type: 'category', data: data.map(d => d.week), axisLabel: { fontSize: 10, rotate: 30, color: '#94a3b8' }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `${(v/1000).toFixed(0)}K` }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
      series: [{ type: 'bar', data: data.map(d => Math.round(d.revenue)), barMaxWidth: 22, borderRadius: [4,4,0,0], itemStyle: { color: { type:'linear',x:0,y:0,x2:0,y2:1, colorStops:[{offset:0,color:'#6366f1'},{offset:1,color:'#818cf8'}] } } }]
    })
  }
  if (expPieChart.value) {
    pieInst = echarts.init(expPieChart.value)
    pieInst.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: NT$ {c}' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{ type: 'pie', radius: ['0%','65%'], center: ['50%','42%'], data: expenseSummaryByType.map(e => ({ name: e.type, value: Math.round(e.total_twd) })), label: { fontSize: 11 }, color: ['#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#06b6d4'] }]
    })
  }
}

onMounted(async () => { await nextTick(); initCharts() })
</script>

<style scoped>
.charts-row { display: flex; gap: 16px; }
.card-title { font-size: 14px; font-weight: 600; }
.payer-summary { display: flex; gap: 12px; margin-bottom: 12px; }
.payer-box { flex: 1; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
.payer-name { font-weight: 700; color: #4338ca; min-width: 60px; }
.payer-count { font-size: 12px; color: #6366f1; }
.payer-usd { font-family: var(--font-mono); font-size: 12px; color: #475569; margin-left: auto; }
.payer-twd { font-family: var(--font-mono); font-weight: 700; color: #0f172a; }
.exp-summary-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.exp-box { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; gap: 8px; }
.exp-type { font-weight: 600; font-size: 12px; }
.exp-count { font-size: 11px; color: var(--color-text-muted); }
.exp-twd { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: #ef4444; }
.vendor-no { font-family: var(--font-mono); font-size: 11px; color: var(--color-text-secondary); }
.pnl-table { display: flex; flex-direction: column; gap: 0; }
.pnl-row { display: grid; grid-template-columns: 1fr 200px 100px; padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--color-border); }
.pnl-row.header { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); background: var(--color-bg); }
.pnl-row.revenue span:first-child { font-weight: 600; }
.pnl-row.cost span, .pnl-row.expense span { color: #ef4444; }
.pnl-row.profit { font-weight: 700; font-size: 15px; background: #f8faff; }
.pnl-row.divider { padding: 2px; border-bottom: 2px solid var(--color-border); }
</style>

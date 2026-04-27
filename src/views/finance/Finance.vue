<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">財務管理</h1>
        <p class="page-subtitle">採購成本、營運費用與損益分析</p>
      </div>
      <div style="display:flex;gap:8px">
        <el-button :icon="Download" @click="exportCSV">匯出報表</el-button>
        <el-button type="primary" :icon="Refresh" @click="store.refresh()" :loading="store.loading">刷新</el-button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="stat-cards" style="grid-template-columns:repeat(4,1fr)">
      <template v-if="store.loading">
        <div class="skeleton-card" v-for="i in 4" :key="i" style="height:110px"></div>
      </template>
      <template v-else>
        <div
          class="stat-card"
          v-for="s in summaryCards"
          :key="s.label"
          :style="{ '--card-accent': s.accent, '--card-glow': s.glow }"
        >
          <div class="stat-card-icon" :style="{ background: s.bg }">
            <el-icon :style="{ color: s.color }" size="22"><component :is="s.icon"/></el-icon>
          </div>
          <div class="stat-card-value" :style="s.valueColor ? { color: s.valueColor } : {}">{{ s.value }}</div>
          <div class="stat-card-label">{{ s.label }}</div>
        </div>
      </template>
    </div>

    <el-tabs v-model="activeTab">
      <!-- Purchases -->
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
            <el-option v-for="b in store.BANKS" :key="b" :label="b" :value="b" />
          </el-select>
          <el-button @click="purSearch='';purPayer='';purCurrency='';purBank=''">重置</el-button>
          <el-button type="primary" :icon="Plus" @click="openPurModal" style="margin-left:auto">新增採購</el-button>
        </div>

        <!-- Payer summary -->
        <div class="payer-summary">
          <div class="payer-box" v-for="p in store.purchaseSummaryByPayer" :key="p.payer">
            <div class="payer-box-avatar">{{ p.payer.charAt(0) }}</div>
            <div class="payer-box-info">
              <span class="payer-box-name">{{ p.payer }}</span>
              <span class="payer-box-count">{{ p.count }} 筆採購</span>
            </div>
            <div class="payer-box-amounts">
              <span class="payer-usd">${{ p.total_usd.toFixed(0) }} USD</span>
              <span class="payer-twd">NT$ {{ Math.round(p.total_twd).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <el-card v-loading="store.loading" element-loading-text="載入採購記錄…">
          <el-table
            ref="purTableRef"
            border
            :data="purPaginated"
            size="small"
            highlight-current-row
            stripe
            @sort-change="onPurSortChange"
            @filter-change="onPurFilterChange"
          >
            <el-table-column prop="date" label="日期" :width="COL.pur_date" sortable="custom" />
            <el-table-column prop="product_name" label="商品名稱" :width="COL.pur_name" show-overflow-tooltip sortable="custom" />
            <el-table-column prop="qty" label="數量" :width="COL.pur_qty" align="center" sortable="custom" />
            <el-table-column label="單價" :width="COL.pur_unit" align="right" prop="unit_cost" sortable="custom">
              <template #default="{ row }">
                <span class="mono-cell">{{ row.unit_cost }} {{ row.currency }}</span>
              </template>
            </el-table-column>
            <el-table-column label="總成本" :width="COL.pur_total" align="right" prop="total_cost" sortable="custom">
              <template #default="{ row }">
                <span class="mono-cell bold">{{ row.total_cost }} {{ row.currency }}</span>
              </template>
            </el-table-column>
            <el-table-column label="台幣" :width="COL.pur_twd" align="right" prop="total_cost_twd" sortable="custom">
              <template #default="{ row }">
                <span class="mono-cell cost">NT$ {{ Math.round(row.total_cost_twd).toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="付款人" :width="COL.pur_payer" align="center"
              column-key="pur_payer"
              :filters="purPayerFilterOptions"
              :filter-method="() => true"
            >
              <template #default="{ row }">
                <el-tag size="small" :type="row.paid_by==='Kelsey'?'primary':'success'">{{ row.paid_by }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="vendor_order_no" label="訂單號" :width="COL.pur_order_no" show-overflow-tooltip>
              <template #default="{ row }"><span class="vendor-no">{{ row.vendor_order_no }}</span></template>
            </el-table-column>
            <el-table-column
              prop="bank" label="銀行" :width="COL.pur_bank" align="center"
              column-key="pur_bank"
              :filters="purBankFilterOptions"
              :filter-method="() => true"
            />
            <el-table-column label="操作" :width="COL.pur_actions" align="center" fixed="right">
              <template #default="{ row }">
                <el-button plain type="primary" size="small" :icon="Edit" @click="openPurEdit(row)">編輯</el-button>
                <el-button plain type="danger" size="small" :icon="Delete" @click="deletePurchase(row)" />
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="purPage"
            :total="purSortedFiltered.length"
            :page-size="20"
            layout="total, prev, pager, next"
          />
        </el-card>
      </el-tab-pane>

      <!-- Expenses -->
      <el-tab-pane label="💸 營運費用" name="expenses">
        <div class="filter-bar">
          <el-select v-model="expType" placeholder="費用類型" clearable style="width:140px">
            <el-option v-for="t in store.EXPENSE_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select v-model="expPayer" placeholder="付款人" clearable style="width:120px">
            <el-option label="Kelsey" value="Kelsey" />
            <el-option label="Karina" value="Karina" />
          </el-select>
          <el-button @click="expType='';expPayer=''">重置</el-button>
          <el-button type="primary" :icon="Plus" @click="openExpModal" style="margin-left:auto">新增費用</el-button>
        </div>

        <!-- Expense type summary pills -->
        <div class="exp-summary-grid">
          <div class="exp-box" v-for="e in store.expenseSummaryByType" :key="e.type">
            <span class="exp-type">{{ e.type }}</span>
            <span class="exp-count">{{ e.count }} 筆</span>
            <span class="exp-twd">NT$ {{ Math.round(e.total_twd).toLocaleString() }}</span>
          </div>
        </div>

        <el-card v-loading="store.loading" element-loading-text="載入費用記錄…">
          <el-table
            ref="expTableRef"
            border
            :data="expSortedFiltered"
            size="small"
            highlight-current-row
            stripe
            @sort-change="onExpSortChange"
            @filter-change="onExpFilterChange"
          >
            <el-table-column prop="date" label="日期" :width="COL.exp_date" sortable="custom" />
            <el-table-column
              label="費用類型" :width="COL.exp_type" align="center"
              column-key="exp_type"
              :filters="expTypeFilterOptions"
              :filter-method="() => true"
            >
              <template #default="{ row }"><el-tag size="small">{{ row.type }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="qty" label="數量" :width="COL.exp_qty" align="center" sortable="custom" />
            <el-table-column label="單價" :width="COL.exp_unit" align="right" prop="unit_cost" sortable="custom">
              <template #default="{ row }"><span class="mono-cell">{{ row.unit_cost }} {{ row.currency }}</span></template>
            </el-table-column>
            <el-table-column label="總費用" :width="COL.exp_total" align="right" prop="total_cost" sortable="custom">
              <template #default="{ row }"><span class="mono-cell bold">{{ row.total_cost }} {{ row.currency }}</span></template>
            </el-table-column>
            <el-table-column label="台幣" :width="COL.exp_twd" align="right" prop="amount_twd" sortable="custom">
              <template #default="{ row }"><span class="mono-cell cost bold">NT$ {{ Math.round(row.amount_twd).toLocaleString() }}</span></template>
            </el-table-column>
            <el-table-column
              label="付款人" :width="COL.exp_payer" align="center"
              column-key="exp_payer"
              :filters="expPayerFilterOptions"
              :filter-method="() => true"
            >
              <template #default="{ row }">
                <el-tag size="small" :type="row.paid_by==='Kelsey'?'primary':'success'">{{ row.paid_by }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" :width="COL.exp_actions" align="center" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" :icon="Edit" @click="openExpEdit(row)">編輯</el-button>
                <el-button text type="danger" size="small" :icon="Delete" @click="deleteExpense(row)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- P&L -->
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
            <div class="pnl-row header">
              <span>項目</span><span>金額（TWD）</span><span>佔比</span>
            </div>
            <div class="pnl-row revenue">
              <span>💰 總銷售額</span>
              <span>NT$ {{ Math.round(store.totalRevenue).toLocaleString() }}</span>
              <span>100%</span>
            </div>
            <div class="pnl-row cost">
              <span>📦 採購成本</span>
              <span>−NT$ {{ Math.round(store.totalCost).toLocaleString() }}</span>
              <span>{{ store.totalRevenue ? (store.totalCost/store.totalRevenue*100).toFixed(1) : 0 }}%</span>
            </div>
            <div class="pnl-row expense">
              <span>🚗 營運費用</span>
              <span>−NT$ {{ Math.round(store.totalExpense).toLocaleString() }}</span>
              <span>{{ store.totalRevenue ? (store.totalExpense/store.totalRevenue*100).toFixed(1) : 0 }}%</span>
            </div>
            <div class="pnl-row divider"></div>
            <div class="pnl-row profit">
              <span>📈 毛利潤</span>
              <span :style="{ color: store.totalProfit >= 0 ? '#10b981' : '#ef4444' }">
                NT$ {{ Math.round(store.totalProfit).toLocaleString() }}
              </span>
              <span :style="{ color: store.totalProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }">
                {{ store.totalRevenue ? (store.totalProfit/store.totalRevenue*100).toFixed(1) : 0 }}%
              </span>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- ── 採購 Modal（新增 / 編輯）──────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showPurModal" class="modal-backdrop" @click.self="cancelPur">
          <div class="modal-panel">
            <div class="modal-head">
              <span class="modal-title">{{ purMode === 'edit' ? '編輯採購記錄' : '新增採購記錄' }}</span>
              <el-button text :icon="Close" circle @click="cancelPur" />
            </div>
            <el-form ref="purFormRef" :model="purForm" :rules="purRules" label-width="110px" class="modal-form" @submit.prevent="submitPur">

              <el-form-item label="採購日期" prop="purchase_date">
                <el-date-picker v-model="purForm.purchase_date" type="date" value-format="YYYY-MM-DD" placeholder="選擇日期" style="width:160px" />
              </el-form-item>

              <el-form-item label="商品名稱" prop="product_name">
                <el-input v-model="purForm.product_name" placeholder="例：Bashful Bunny Medium" clearable />
              </el-form-item>

              <div style="display:flex;gap:12px">
                <el-form-item label="數量" prop="qty" style="flex:1">
                  <el-input-number v-model="purForm.qty" :min="1" :precision="0" style="width:100%" />
                </el-form-item>
                <el-form-item label="幣別" style="flex:1">
                  <el-select v-model="purForm.currency" style="width:100%">
                    <el-option v-for="c in store.CURRENCIES" :key="c" :label="c" :value="c" />
                  </el-select>
                </el-form-item>
              </div>

              <div style="display:flex;gap:12px">
                <el-form-item label="單價" prop="unit_cost" style="flex:1">
                  <el-input-number v-model="purForm.unit_cost" :min="0" :precision="2" style="width:100%" />
                </el-form-item>
                <el-form-item label="總成本" style="flex:1">
                  <el-input-number v-model="purForm.total_cost" :min="0" :precision="2" style="width:100%" />
                </el-form-item>
              </div>

              <el-form-item label="台幣成本" prop="total_cost_twd">
                <el-input-number v-model="purForm.total_cost_twd" :min="0" :precision="0" style="width:180px" />
                <span class="modal-hint" v-if="purForm.currency !== 'TWD'">
                  自動換算 × {{ RATE[purForm.currency] || '?' }}，可手動修改
                </span>
              </el-form-item>

              <el-divider style="margin:10px 0" />

              <div style="display:flex;gap:12px">
                <el-form-item label="付款人" prop="paid_by" style="flex:1">
                  <el-select v-model="purForm.paid_by" style="width:100%">
                    <el-option v-for="p in store.PAYERS" :key="p" :label="p" :value="p" />
                  </el-select>
                </el-form-item>
                <el-form-item label="付款方式" style="flex:1">
                  <el-select v-model="purForm.bank" placeholder="選擇" clearable style="width:100%">
                    <el-option v-for="b in store.BANKS" :key="b" :label="b" :value="b" />
                  </el-select>
                </el-form-item>
              </div>

              <el-form-item label="廠商訂單號">
                <el-input v-model="purForm.vendor_order_no" placeholder="選填" clearable />
              </el-form-item>

            </el-form>
            <div v-if="purError" class="error-block"><strong>寫入失敗：</strong>{{ purError }}</div>
            <div class="modal-foot">
              <el-button @click="cancelPur" :disabled="purSaving">取消</el-button>
              <el-button type="primary" @click="submitPur" :loading="purSaving">
                {{ purSaving ? '儲存中…' : purMode === 'edit' ? '儲存變更' : '新增採購' }}
              </el-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── 費用 Modal（新增 / 編輯）──────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showExpModal" class="modal-backdrop" @click.self="cancelExp">
          <div class="modal-panel">
            <div class="modal-head">
              <span class="modal-title">{{ expMode === 'edit' ? '編輯營運費用' : '新增營運費用' }}</span>
              <el-button text :icon="Close" circle @click="cancelExp" />
            </div>
            <el-form ref="expFormRef" :model="expForm" :rules="expRules" label-width="110px" class="modal-form" @submit.prevent="submitExp">

              <el-form-item label="費用日期" prop="expense_date">
                <el-date-picker v-model="expForm.expense_date" type="date" value-format="YYYY-MM-DD" placeholder="選擇日期" style="width:160px" />
              </el-form-item>

              <el-form-item label="費用類型" prop="type">
                <el-select v-model="expForm.type" placeholder="選擇類型" style="width:100%">
                  <el-option v-for="t in store.EXPENSE_TYPES" :key="t" :label="t" :value="t" />
                </el-select>
              </el-form-item>

              <div style="display:flex;gap:12px">
                <el-form-item label="數量" style="flex:1">
                  <el-input-number v-model="expForm.qty" :min="0" :precision="0" style="width:100%" placeholder="選填" />
                </el-form-item>
                <el-form-item label="幣別" style="flex:1">
                  <el-select v-model="expForm.currency" style="width:100%">
                    <el-option v-for="c in store.CURRENCIES" :key="c" :label="c" :value="c" />
                  </el-select>
                </el-form-item>
              </div>

              <div style="display:flex;gap:12px">
                <el-form-item label="單價" style="flex:1">
                  <el-input-number v-model="expForm.unit_cost" :min="0" :precision="2" style="width:100%" placeholder="選填" />
                </el-form-item>
                <el-form-item label="總費用" style="flex:1">
                  <el-input-number v-model="expForm.total_cost" :min="0" :precision="2" style="width:100%" placeholder="選填" />
                </el-form-item>
              </div>

              <el-form-item label="台幣金額" prop="amount_twd">
                <el-input-number v-model="expForm.amount_twd" :min="0" :precision="0" style="width:180px" />
                <span class="modal-hint" v-if="expForm.currency !== 'TWD'">
                  自動換算 × {{ RATE[expForm.currency] || '?' }}，可手動修改
                </span>
              </el-form-item>

              <el-divider style="margin:10px 0" />

              <el-form-item label="付款人" prop="paid_by">
                <el-select v-model="expForm.paid_by" style="width:160px">
                  <el-option v-for="p in store.PAYERS" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>

            </el-form>
            <div v-if="expError" class="error-block"><strong>寫入失敗：</strong>{{ expError }}</div>
            <div class="modal-foot">
              <el-button @click="cancelExp" :disabled="expSaving">取消</el-button>
              <el-button type="primary" @click="submitExp" :loading="expSaving">
                {{ expSaving ? '儲存中…' : expMode === 'edit' ? '儲存變更' : '新增費用' }}
              </el-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, reactive } from 'vue'
import { Search, Download, Refresh, Plus, Close, Delete, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { useAppDataStore } from '@/stores/appData'
import { supabase } from '@/lib/supabase'

// ── Column widths (single source of truth) ──────────────────
const COL = {
  // Purchases table
  pur_date:     130,
  pur_name:     170,
  pur_qty:       72,
  pur_unit:     108,
  pur_total:    118,
  pur_twd:      125,
  pur_payer:    120,
  pur_order_no: 135,
  pur_bank:      88,
  pur_actions:  130,
  // Expenses table
  exp_date:     120,
  exp_type:     110,
  exp_qty:       80,
  exp_unit:     100,
  exp_total:    110,
  exp_twd:      120,
  exp_payer:    120,
  exp_actions:  130,
}

const store = useAppDataStore()

const activeTab  = ref('purchases')
const purSearch  = ref(''); const purPayer = ref(''); const purCurrency = ref(''); const purBank = ref('')
const expType    = ref(''); const expPayer = ref('')
const purPage    = ref(1)
const weekChart  = ref(); const expPieChart = ref()
let weekInst, pieInst

const purTableRef = ref(null)
const expTableRef = ref(null)
const purSortState = ref({ prop: null, order: null })
const expSortState = ref({ prop: null, order: null })
const purColFilters = ref({})
const expColFilters = ref({})

const purPayerFilterOptions = [{ text: 'Kelsey', value: 'Kelsey' }, { text: 'Karina', value: 'Karina' }]
const purCurrencyFilterOptions = computed(() =>
  [...new Set(store.mockPurchases.map(p => p.currency).filter(Boolean))].map(v => ({ text: v, value: v }))
)
const purBankFilterOptions = computed(() =>
  store.BANKS.map(b => ({ text: b, value: b }))
)
const expTypeFilterOptions = computed(() =>
  store.EXPENSE_TYPES.map(t => ({ text: t, value: t }))
)
const expPayerFilterOptions = [{ text: 'Kelsey', value: 'Kelsey' }, { text: 'Karina', value: 'Karina' }]

function onPurSortChange({ prop, order }) { purSortState.value = { prop, order }; purPage.value = 1 }
function onExpSortChange({ prop, order }) { expSortState.value = { prop, order } }
function onPurFilterChange(filters) { purColFilters.value = { ...purColFilters.value, ...filters }; purPage.value = 1 }
function onExpFilterChange(filters) { expColFilters.value = { ...expColFilters.value, ...filters } }

const summaryCards = computed(() => [
  { label: '總銷售額', value: `NT$ ${Math.round(store.totalRevenue).toLocaleString()}`, icon: 'TrendCharts', bg: '#ecfdf5', color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', glow: 'rgba(16,185,129,0.08)' },
  { label: '採購成本', value: `NT$ ${Math.round(store.totalCost).toLocaleString()}`,    icon: 'ShoppingCart', bg: '#fef2f2', color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)', glow: 'rgba(239,68,68,0.08)' },
  { label: '營運費用', value: `NT$ ${Math.round(store.totalExpense).toLocaleString()}`,  icon: 'Van',         bg: '#fffbeb', color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', glow: 'rgba(245,158,11,0.08)' },
  { label: '毛利潤',  value: `NT$ ${Math.round(store.totalProfit).toLocaleString()}`,   icon: 'Money',       bg: '#eef2ff', color: '#6366f1', accent: 'linear-gradient(90deg,#6366f1,#818cf8)', glow: 'rgba(99,102,241,0.08)', valueColor: store.totalProfit >= 0 ? '#10b981' : '#ef4444' },
])

const purFiltered = computed(() => store.mockPurchases.filter(p => {
  if (purSearch.value && !p.product_name?.includes(purSearch.value) && !p.vendor_order_no?.includes(purSearch.value)) return false
  if (purPayer.value && p.paid_by !== purPayer.value) return false
  if (purCurrency.value && p.currency !== purCurrency.value) return false
  if (purBank.value && p.bank !== purBank.value) return false
  const pf = purColFilters.value['pur_payer']
  if (pf?.length && !pf.includes(p.paid_by)) return false
  const cf = purColFilters.value['pur_currency']
  if (cf?.length && !cf.includes(p.currency)) return false
  const bf = purColFilters.value['pur_bank']
  if (bf?.length && !bf.includes(p.bank)) return false
  return true
}))

const purSortedFiltered = computed(() => {
  const { prop, order } = purSortState.value
  if (!prop || !order) return purFiltered.value
  return [...purFiltered.value].sort((a, b) => {
    const av = a[prop] ?? ''
    const bv = b[prop] ?? ''
    if (typeof av === 'string') return order === 'ascending' ? av.localeCompare(bv) : bv.localeCompare(av)
    return order === 'ascending' ? av - bv : bv - av
  })
})

const purPaginated = computed(() => purSortedFiltered.value.slice((purPage.value-1)*20, purPage.value*20))

const expFiltered = computed(() => store.mockExpenses.filter(e => {
  if (expType.value && e.type !== expType.value) return false
  if (expPayer.value && e.paid_by !== expPayer.value) return false
  const tf = expColFilters.value['exp_type']
  if (tf?.length && !tf.includes(e.type)) return false
  const pf = expColFilters.value['exp_payer']
  if (pf?.length && !pf.includes(e.paid_by)) return false
  return true
}))

const expSortedFiltered = computed(() => {
  const { prop, order } = expSortState.value
  if (!prop || !order) return expFiltered.value
  return [...expFiltered.value].sort((a, b) => {
    const av = a[prop] ?? ''
    const bv = b[prop] ?? ''
    if (typeof av === 'string') return order === 'ascending' ? av.localeCompare(bv) : bv.localeCompare(av)
    return order === 'ascending' ? av - bv : bv - av
  })
})

// ── 匯率換算 ────────────────────────────────────────────────────────
const RATE = { USD: store.USD_TO_TWD, RMB: store.RMB_TO_TWD, GBP: 43, TWD: 1 }

// ── 採購 Modal（新增 / 編輯）───────────────────────────────────────
const showPurModal  = ref(false)
const purMode       = ref('add')   // 'add' | 'edit'
const editingPurId  = ref(null)
const purSaving     = ref(false)
const purError      = ref('')
const purFormRef    = ref(null)
const today = () => new Date().toISOString().slice(0, 10)

const purForm = reactive({
  purchase_date:   today(),
  product_name:    '',
  qty:             1,
  currency:        'USD',
  unit_cost:       0,
  total_cost:      0,
  total_cost_twd:  0,
  paid_by:         'Kelsey',
  bank:            '',
  vendor_order_no: '',
})

const purRules = {
  purchase_date: [{ required: true, message: '請選擇日期', trigger: 'change' }],
  product_name:  [{ required: true, message: '請填入商品名稱', trigger: 'blur' }],
  qty:           [{ required: true, message: '請填入數量', trigger: 'blur' }],
  unit_cost:     [{ required: true, message: '請填入單價', trigger: 'blur' }],
  paid_by:       [{ required: true, message: '請選擇付款人', trigger: 'change' }],
}

// 自動計算 total_cost 和 total_cost_twd
watch([() => purForm.qty, () => purForm.unit_cost, () => purForm.currency], () => {
  purForm.total_cost     = +(purForm.qty * purForm.unit_cost).toFixed(2)
  purForm.total_cost_twd = Math.round(purForm.total_cost * (RATE[purForm.currency] ?? 1))
})

function openPurModal() {
  purMode.value = 'add'
  editingPurId.value = null
  Object.assign(purForm, {
    purchase_date: today(), product_name: '', qty: 1,
    currency: 'USD', unit_cost: 0, total_cost: 0, total_cost_twd: 0,
    paid_by: 'Kelsey', bank: '', vendor_order_no: '',
  })
  purError.value = ''
  showPurModal.value = true
}

function openPurEdit(row) {
  purMode.value = 'edit'
  editingPurId.value = row.id
  Object.assign(purForm, {
    purchase_date:   row.purchase_date || row.date || today(),
    product_name:    row.product_name   || '',
    qty:             row.qty            ?? 1,
    currency:        row.currency       || 'USD',
    unit_cost:       row.unit_cost      ?? 0,
    total_cost:      row.total_cost     ?? 0,
    total_cost_twd:  row.total_cost_twd ?? 0,
    paid_by:         row.paid_by        || 'Kelsey',
    bank:            row.bank           || '',
    vendor_order_no: row.vendor_order_no || '',
  })
  purError.value = ''
  showPurModal.value = true
}

function cancelPur() { if (!purSaving.value) showPurModal.value = false }

async function submitPur() {
  const valid = await purFormRef.value?.validate().catch(() => false)
  if (!valid) return
  purSaving.value = true
  purError.value  = ''
  const payload = {
    purchase_date:   purForm.purchase_date,
    product_name:    purForm.product_name.trim(),
    qty:             purForm.qty,
    currency:        purForm.currency,
    unit_cost:       purForm.unit_cost,
    total_cost:      purForm.total_cost,
    total_cost_twd:  purForm.total_cost_twd,
    paid_by:         purForm.paid_by,
    bank:            purForm.bank || null,
    vendor_order_no: purForm.vendor_order_no.trim() || null,
  }
  try {
    if (purMode.value === 'edit') {
      const { error: err } = await supabase.from('purchases').update(payload).eq('id', editingPurId.value)
      if (err) throw new Error(err.message)
      const row = store.purchasesRaw.find(p => p.id === editingPurId.value)
      if (row) Object.assign(row, payload)
      ElMessage.success(`已更新採購：${purForm.product_name}`)
    } else {
      const { data, error: err } = await supabase.from('purchases').insert(payload).select().single()
      if (err) throw new Error(err.message)
      store.purchasesRaw.push(data)
      ElMessage.success(`已新增採購：${purForm.product_name}`)
    }
    showPurModal.value = false
  } catch (err) {
    purError.value = err.message
  } finally {
    purSaving.value = false
  }
}

// ── 費用 Modal（新增 / 編輯）───────────────────────────────────────
const showExpModal  = ref(false)
const expMode       = ref('add')   // 'add' | 'edit'
const editingExpId  = ref(null)
const expSaving     = ref(false)
const expError      = ref('')
const expFormRef    = ref(null)

const expForm = reactive({
  expense_date: today(),
  type:         '',
  qty:          null,
  currency:     'TWD',
  unit_cost:    null,
  total_cost:   null,
  amount_twd:   0,
  paid_by:      'Kelsey',
})

const expRules = {
  expense_date: [{ required: true, message: '請選擇日期', trigger: 'change' }],
  type:         [{ required: true, message: '請選擇費用類型', trigger: 'change' }],
  amount_twd:   [{ required: true, message: '請填入台幣金額', trigger: 'blur' }],
  paid_by:      [{ required: true, message: '請選擇付款人', trigger: 'change' }],
}

// 自動計算 total_cost 和 amount_twd
watch([() => expForm.qty, () => expForm.unit_cost, () => expForm.currency], () => {
  if (expForm.qty != null && expForm.unit_cost != null) {
    expForm.total_cost = +(expForm.qty * expForm.unit_cost).toFixed(2)
    expForm.amount_twd = Math.round(expForm.total_cost * (RATE[expForm.currency] ?? 1))
  }
})

function openExpModal() {
  expMode.value = 'add'
  editingExpId.value = null
  Object.assign(expForm, {
    expense_date: today(), type: '', qty: null,
    currency: 'TWD', unit_cost: null, total_cost: null,
    amount_twd: 0, paid_by: 'Kelsey',
  })
  expError.value = ''
  showExpModal.value = true
}

function openExpEdit(row) {
  expMode.value = 'edit'
  editingExpId.value = row.id
  Object.assign(expForm, {
    expense_date: row.expense_date || row.date || today(),
    type:         row.type         || '',
    qty:          row.qty          ?? null,
    currency:     row.currency     || 'TWD',
    unit_cost:    row.unit_cost    ?? null,
    total_cost:   row.total_cost   ?? null,
    amount_twd:   row.amount_twd   ?? 0,
    paid_by:      row.paid_by      || 'Kelsey',
  })
  expError.value = ''
  showExpModal.value = true
}

function cancelExp() { if (!expSaving.value) showExpModal.value = false }

async function submitExp() {
  const valid = await expFormRef.value?.validate().catch(() => false)
  if (!valid) return
  expSaving.value = true
  expError.value  = ''
  const payload = {
    expense_date: expForm.expense_date,
    type:         expForm.type,
    qty:          expForm.qty        ?? null,
    unit_cost:    expForm.unit_cost  ?? null,
    currency:     expForm.currency   || null,
    total_cost:   expForm.total_cost ?? null,
    amount_twd:   expForm.amount_twd,
    paid_by:      expForm.paid_by,
  }
  try {
    if (expMode.value === 'edit') {
      const { error: err } = await supabase.from('expenses').update(payload).eq('id', editingExpId.value)
      if (err) throw new Error(err.message)
      const row = store.expensesRaw.find(e => e.id === editingExpId.value)
      if (row) Object.assign(row, payload)
      ElMessage.success(`已更新費用：${expForm.type}`)
    } else {
      const { data, error: err } = await supabase.from('expenses').insert(payload).select().single()
      if (err) throw new Error(err.message)
      store.expensesRaw.push(data)
      ElMessage.success(`已新增費用：${expForm.type}`)
    }
    showExpModal.value = false
  } catch (err) {
    expError.value = err.message
  } finally {
    expSaving.value = false
  }
}

// ── 刪除採購 ────────────────────────────────────────────────────────
async function deletePurchase(row) {
  try {
    await ElMessageBox.confirm(
      `確定要刪除「${row.product_name}」的採購記錄？此操作無法復原。`,
      '刪除確認', { confirmButtonText: '刪除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }
  const { error: err } = await supabase.from('purchases').delete().eq('id', row.id)
  if (err) { ElMessage.error(`刪除失敗：${err.message}`); return }
  const idx = store.purchasesRaw.findIndex(p => p.id === row.id)
  if (idx !== -1) store.purchasesRaw.splice(idx, 1)
  ElMessage.success('已刪除採購記錄')
}

// ── 刪除費用 ────────────────────────────────────────────────────────
async function deleteExpense(row) {
  try {
    await ElMessageBox.confirm(
      `確定要刪除「${row.type}」費用記錄（NT$ ${Math.round(row.amount_twd).toLocaleString()}）？此操作無法復原。`,
      '刪除確認', { confirmButtonText: '刪除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }
  const { error: err } = await supabase.from('expenses').delete().eq('id', row.id)
  if (err) { ElMessage.error(`刪除失敗：${err.message}`); return }
  const idx = store.expensesRaw.findIndex(e => e.id === row.id)
  if (idx !== -1) store.expensesRaw.splice(idx, 1)
  ElMessage.success('已刪除費用記錄')
}

function initCharts() {
  if (weekChart.value) {
    if (!weekInst) weekInst = echarts.init(weekChart.value)
    const data = store.revenueByWeek
    weekInst.setOption({
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9', fontSize: 12 } },
      grid: { left: 0, right: 10, top: 16, bottom: 40, containLabel: true },
      xAxis: { type: 'category', data: data.map(d => d.week), axisLabel: { fontSize: 10, rotate: 30, color: '#94a3b8' }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `${(v/1000).toFixed(0)}K` }, splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } } },
      series: [{ type: 'bar', data: data.map(d => Math.round(d.revenue)), barMaxWidth: 22, borderRadius: [5,5,0,0], itemStyle: { color: { type:'linear',x:0,y:0,x2:0,y2:1, colorStops:[{offset:0,color:'#6366f1'},{offset:1,color:'#818cf8'}] } } }],
    })
  }
  if (expPieChart.value) {
    if (!pieInst) pieInst = echarts.init(expPieChart.value)
    pieInst.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: NT$ {c}', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9', fontSize: 12 } },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      series: [{ type: 'pie', radius: ['0%','65%'], center: ['50%','42%'], data: store.expenseSummaryByType.map(e => ({ name: e.type, value: Math.round(e.total_twd) })), label: { fontSize: 11 }, itemStyle: { borderRadius: 4 }, color: ['#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#06b6d4'] }],
    })
  }
}

watch(activeTab, (tab) => { if (tab === 'pnl') nextTick(() => initCharts()) })
watch(() => store.initialized, (v) => { if (v && activeTab.value === 'pnl') nextTick(initCharts) })

function exportCSV() {
  const tab = activeTab.value
  if (tab === 'purchases') {
    const header = ['日期','商品名稱','數量','單價','幣別','台幣成本','付款人','訂單號','銀行']
    const rows = store.mockPurchases.map(p => [p.date,p.product_name,p.qty,p.unit_cost,p.currency,Math.round(p.total_cost_twd||0),p.paid_by,p.vendor_order_no||'',p.bank||''])
    downloadCSV([header,...rows], 'purchases')
  } else {
    const header = ['日期','費用類型','數量','單價','幣別','台幣費用','付款人']
    const rows = store.mockExpenses.map(e => [e.date,e.type,e.qty||'',e.unit_cost||'',e.currency||'',Math.round(e.amount_twd||0),e.paid_by||''])
    downloadCSV([header,...rows], 'expenses')
  }
}
function downloadCSV(rows, name) {
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

onMounted(async () => {
  await store.fetchAll()
  if (activeTab.value === 'pnl') nextTick(initCharts)
})
</script>

<style scoped>
.charts-row { display: flex; gap: 16px; }
.card-title { font-size: 14px; font-weight: 600; }
.payer-summary { display: flex; gap: 12px; margin-bottom: 14px; }
.payer-box {
  flex: 1; display: flex; align-items: center; gap: 12px;
  background: linear-gradient(135deg, #eef2ff, #f0f4ff);
  border: 1px solid #c7d2fe; border-radius: var(--radius-md); padding: 12px 16px;
}
.payer-box-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.payer-box-info { display: flex; flex-direction: column; }
.payer-box-name { font-weight: 700; color: #4338ca; font-size: 13px; }
.payer-box-count { font-size: 11px; color: #6366f1; }
.payer-box-amounts { margin-left: auto; text-align: right; display: flex; flex-direction: column; gap: 2px; }
.payer-usd { font-family: var(--font-mono); font-size: 11px; color: #475569; }
.payer-twd { font-family: var(--font-mono); font-weight: 700; color: #0f172a; font-size: 13px; }
.exp-summary-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.exp-box {
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: 8px 14px;
  display: flex; align-items: center; gap: 8px;
  box-shadow: var(--shadow-xs);
}
.exp-type { font-weight: 600; font-size: 12px; }
.exp-count { font-size: 11px; color: var(--color-text-muted); }
.exp-twd { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: #ef4444; margin-left: auto; }
.mono-cell { font-family: var(--font-mono); font-size: 12px; }
.mono-cell.bold { font-weight: 600; }
.mono-cell.cost { color: #ef4444; }
.vendor-no { font-family: var(--font-mono); font-size: 11px; color: var(--color-text-secondary); }
.pnl-table { display: flex; flex-direction: column; }
.pnl-row { display: grid; grid-template-columns: 1fr 200px 100px; padding: 14px 18px; font-size: 13px; border-bottom: 1px solid var(--color-border); transition: background 0.15s; }
.pnl-row:hover { background: #f8faff; }
.pnl-row.header { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); background: var(--color-bg); }
.pnl-row.revenue span:first-child { font-weight: 600; color: var(--color-success); }
.pnl-row.cost span, .pnl-row.expense span { color: #ef4444; }
.pnl-row.profit { font-weight: 700; font-size: 15px; background: #f8faff; }
.pnl-row.divider { padding: 2px; border-bottom: 2px solid var(--color-border); }

/* ── Modals ──────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
}
.modal-panel {
  background: var(--color-card, #fff); border-radius: 12px;
  width: 540px; max-width: calc(100vw - 32px);
  box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
  overflow: hidden; display: flex; flex-direction: column;
  max-height: calc(100vh - 48px); overflow-y: auto;
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px; border-bottom: 1px solid var(--color-border, #e4e7ed);
  position: sticky; top: 0; background: var(--color-card, #fff); z-index: 1;
}
.modal-title { font-size: 16px; font-weight: 700; color: var(--color-text, #1a1a2e); }
.modal-form  { padding: 20px 20px 4px; }
.modal-hint  { margin-left: 10px; font-size: 11px; color: var(--color-text-muted, #94a3b8); }
.modal-foot  {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px 18px; border-top: 1px solid var(--color-border, #e4e7ed);
  position: sticky; bottom: 0; background: var(--color-card, #fff);
}
.error-block {
  margin: 0 20px 12px; padding: 10px 14px;
  background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;
  font-size: 12px; color: #dc2626; line-height: 1.5; word-break: break-all;
}
.modal-enter-active { animation: modalIn 0.32s cubic-bezier(0.34,1.56,0.64,1); }
.modal-leave-active { animation: modalOut 0.2s cubic-bezier(0.4,0,1,1); }
@keyframes modalIn  { from { opacity:0; transform:translateY(32px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes modalOut { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(16px) scale(0.97); } }
</style>

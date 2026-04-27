<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">庫存管理</h1>
        <p class="page-subtitle">{{ store.mockInventory.length }} 個 SKU · {{ store.jellycatCategories.length }} 個 Jellycat 官方分類</p>
      </div>
      <div style="display:flex;gap:8px">
        <el-button :icon="Download" @click="exportCSV">匯出庫存</el-button>
        <el-button type="primary" :icon="Refresh" @click="store.refresh()" :loading="store.loading">刷新</el-button>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stat-cards" style="grid-template-columns:repeat(4,1fr)">
      <template v-if="store.loading">
        <div class="skeleton-card" v-for="i in 4" :key="i" style="height:110px"></div>
      </template>
      <template v-else>
        <div
          class="stat-card"
          v-for="s in invStats"
          :key="s.label"
          :style="{ '--card-accent': s.accent, '--card-glow': s.glow }"
        >
          <div class="stat-card-icon" :style="{ background: s.bg }">
            <el-icon :style="{ color: s.color }" size="20"><component :is="s.icon"/></el-icon>
          </div>
          <div class="stat-card-value">{{ s.value }}</div>
          <div class="stat-card-label">{{ s.label }}</div>
        </div>
      </template>
    </div>

    <el-tabs v-model="activeTab">
      <!-- Overview tab -->
      <el-tab-pane label="庫存總覽" name="overview">
        <div class="filter-bar">
          <el-input v-model="search" placeholder="搜尋商品名稱…" :prefix-icon="Search" clearable style="width:240px" />
          <el-select v-model="filterCat" placeholder="Jellycat 分類" clearable style="width:200px">
            <el-option v-for="c in categoryOptions" :key="c" :label="CATEGORY_ZH_MAP[c] || c" :value="c" />
          </el-select>
          <el-select v-model="filterStock" placeholder="庫存狀態" clearable style="width:130px">
            <el-option label="正常" value="normal" />
            <el-option label="低庫存 (≤2)" value="low" />
            <el-option label="缺貨 (0)" value="out" />
          </el-select>
          <el-button @click="resetFilters">重置</el-button>
          <span v-if="sortedFiltered.length !== store.mockInventory.length" class="filter-hint">
            顯示 {{ sortedFiltered.length }} / {{ store.mockInventory.length }} 筆
          </span>
        </div>

        <el-card v-loading="store.loading" element-loading-text="載入庫存中…">
          <el-table
            ref="tableRef"
            border
            :data="paginated"
            size="small"
            highlight-current-row
            stripe
            @sort-change="onSortChange"
            @filter-change="onFilterChange"
          >
            <el-table-column label="商品名稱" :min-width="COL.product_name" show-overflow-tooltip sortable="custom" prop="product_name">
              <template #default="{ row }"><span class="product-name-cell">{{ row.product_name }}</span></template>
            </el-table-column>

            <el-table-column
              label="Jellycat 分類"
              :min-width="COL.jellycat_category"
              show-overflow-tooltip
              column-key="jellycat_category"
              :filters="jellycatFilterOptions"
              :filter-method="() => true"
            >
              <template #default="{ row }">
                <el-tooltip v-if="row.jellycat_category" :content="row.jellycat_category" placement="top">
                  <el-tag size="small" type="info" style="max-width:100%;overflow:hidden;text-overflow:ellipsis">
                    {{ row.jellycat_category_zh || CATEGORY_ZH_MAP[row.jellycat_category] || row.jellycat_category }}
                  </el-tag>
                </el-tooltip>
              </template>
            </el-table-column>

            <el-table-column label="在台庫存" :width="COL.taiwan_stock" align="center" sortable="custom" prop="taiwan_stock">
              <template #default="{ row }"><span class="stock-num">{{ row.taiwan_stock || 0 }}</span></template>
            </el-table-column>

            <el-table-column label="總採購" :width="COL.total_purchased" align="center" sortable="custom" prop="total_purchased">
              <template #default="{ row }"><span>{{ row.total_purchased || 0 }}</span></template>
            </el-table-column>

            <el-table-column label="已售出" :width="COL.sold_qty" align="center" sortable="custom" prop="sold_qty">
              <template #default="{ row }">
                <span style="color:var(--color-primary);font-weight:700">{{ row.sold_qty || 0 }}</span>
              </template>
            </el-table-column>

            <el-table-column label="當前庫存" :width="COL.current_stock" align="center" sortable="custom" prop="current_stock">
              <template #default="{ row }">
                <span :class="stockClass(row)">{{ row.current_stock ?? '—' }}</span>
              </template>
            </el-table-column>

            <el-table-column label="平均成本" :width="COL.avg_cost" align="right" sortable="custom" prop="avg_cost">
              <template #default="{ row }">
                <span v-if="row.avg_cost" class="cost-mono">NT$ {{ Math.round(row.avg_cost).toLocaleString() }}</span>
              </template>
            </el-table-column>

            <el-table-column
              label="分類箱"
              :width="COL.box"
              align="center"
              column-key="box_col"
              :filters="boxFilterOptions"
              :filter-method="() => true"
            >
              <template #default="{ row }"><el-tag v-if="row.box" size="small">{{ row.box }}</el-tag></template>
            </el-table-column>

            <el-table-column
              label="狀態"
              :width="COL.status"
              align="center"
              column-key="status_col"
              :filters="statusFilterOptions"
              :filter-method="() => true"
            >
              <template #default="{ row }">
                <span v-if="row.current_stock === 0"   class="badge badge-danger">缺貨</span>
                <span v-else-if="row.current_stock <= 2" class="badge badge-warning">低庫存</span>
                <span v-else-if="row.current_stock > 0"  class="badge badge-active">正常</span>
                <span v-else class="badge badge-inactive">未追蹤</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" :width="COL.actions" fixed="right" align="center">
              <template #default="{ row }">
                <el-button text type="primary" size="small" :icon="Edit" @click="openEdit(row)">編輯</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="sortedFiltered.length"
            :page-sizes="[20,50,100]"
            layout="total, sizes, prev, pager, next"
          />
        </el-card>
      </el-tab-pane>

      <!-- Taiwan stock -->
      <el-tab-pane label="在台現貨 (Taiwan)" name="taiwan">
        <el-card v-loading="store.loading">
          <el-table border :data="taiwanStockList" size="small" highlight-current-row stripe>
            <el-table-column prop="product_name" label="商品名稱" :min-width="COL.product_name" show-overflow-tooltip />
            <el-table-column label="在台數量" :width="COL.tw_qty" align="center">
              <template #default="{ row }"><span class="stock-num">{{ row.taiwan_stock }}</span></template>
            </el-table-column>
            <el-table-column label="平均成本（TWD）" :width="COL.tw_cost" align="right">
              <template #default="{ row }">
                <span v-if="row.avg_cost_twd" class="cost-mono bold">NT$ {{ Math.round(row.avg_cost_twd).toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="分類箱" :width="COL.tw_box" align="center">
              <template #default="{ row }"><el-tag v-if="row.box" size="small">{{ row.box }}</el-tag></template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- Opening stock -->
      <el-tab-pane label="期初庫存" name="opening">
        <el-card v-loading="store.loading">
          <el-table border :data="openingStockList" size="small" highlight-current-row stripe>
            <el-table-column prop="product_name" label="商品名稱" :min-width="COL.product_name" show-overflow-tooltip />
            <el-table-column label="期初數量" :width="COL.op_qty" align="center">
              <template #default="{ row }"><span class="stock-num">{{ row.opening_qty }}</span></template>
            </el-table-column>
            <el-table-column label="期初成本（TWD）" :width="COL.op_cost" align="right">
              <template #default="{ row }">
                <span v-if="row.opening_cost_twd" class="cost-mono bold">NT$ {{ Math.round(row.opening_cost_twd).toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="分類箱" :width="COL.op_box" align="center">
              <template #default="{ row }"><el-tag v-if="row.box" size="small">{{ row.box }}</el-tag></template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- ── 編輯庫存 Modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEditModal" class="modal-backdrop" @click.self="cancelEdit">
          <div class="modal-panel">
            <div class="modal-head">
              <span class="modal-title">編輯庫存</span>
              <el-button text :icon="Close" circle @click="cancelEdit" />
            </div>

            <el-form
              ref="editFormRef"
              :model="editForm"
              :rules="editRules"
              label-width="110px"
              class="modal-form"
            >
              <!-- 可編輯欄位 —— 對應表格顯示欄位 -->
              <el-form-item label="商品名稱" prop="product_name">
                <el-input v-model="editForm.product_name" clearable />
              </el-form-item>

              <el-form-item label="Jellycat 分類">
                <el-select
                  v-model="editForm.jellycat_category"
                  placeholder="選擇或輸入分類"
                  filterable allow-create style="width:100%"
                >
                  <el-option
                    v-for="c in categoryOptions" :key="c"
                    :label="`${CATEGORY_ZH_MAP[c] || c}　${c}`"
                    :value="c"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="在台庫存">
                <el-input-number v-model="editForm.taiwan_stock" :min="0" :precision="0" style="width:160px" />
              </el-form-item>

              <el-form-item label="平均成本(TWD)">
                <el-input-number v-model="editForm.avg_cost_twd" :min="0" :precision="0" style="width:160px" />
              </el-form-item>

              <el-form-item label="分類箱">
                <el-input v-model="editForm.box_label" placeholder="例：A1" style="width:140px" />
              </el-form-item>

              <el-divider style="margin:8px 0">
                <span style="font-size:11px;color:var(--color-text-muted)">期初資料</span>
              </el-divider>

              <el-form-item label="期初庫存">
                <el-input-number v-model="editForm.opening_qty" :min="0" :precision="0" style="width:160px" />
              </el-form-item>

              <el-form-item label="期初成本(TWD)">
                <el-input-number v-model="editForm.opening_cost_twd" :min="0" :precision="0" style="width:160px" />
              </el-form-item>

              <el-divider style="margin:8px 0">
                <span style="font-size:11px;color:var(--color-text-muted)">唯讀（自動計算）</span>
              </el-divider>

              <!-- 唯讀欄位 —— 對應表格計算欄位 -->
              <div class="readonly-row">
                <span class="readonly-label">總採購</span>
                <span class="readonly-val">{{ editForm.total_purchased }}</span>
                <span class="readonly-label" style="margin-left:24px">已售出</span>
                <span class="readonly-val" style="color:#6366f1">{{ editForm.sold_qty }}</span>
                <span class="readonly-label" style="margin-left:24px">當前庫存</span>
                <span class="readonly-val" :class="editForm.current_stock === 0 ? 'stock-out' : editForm.current_stock <= 2 ? 'stock-low' : 'stock-ok'">
                  {{ editForm.current_stock }}
                </span>
              </div>
            </el-form>

            <div v-if="saveError" class="error-block">
              <strong>更新失敗：</strong>{{ saveError }}
            </div>

            <div class="modal-foot">
              <el-button @click="cancelEdit" :disabled="saving">取消</el-button>
              <el-button type="primary" @click="submitEdit" :loading="saving">
                {{ saving ? '儲存中…' : '儲存變更' }}
              </el-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Search, Download, Refresh, Edit, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAppDataStore } from '@/stores/appData'
import { supabase } from '@/lib/supabase'

// ── 英文 → 繁中 分類對照（與 ProductList 保持一致）───────────
const CATEGORY_ZH_MAP = {
  'Animals':                  '動物',
  'Amuseables Food & Drink':  '趣味食品飲品',
  'Amuseables Nature':        '趣味自然',
  'Amuseables Objects':       '趣味物品',
  'Bag Charms':               '包包吊飾',
  'Bags':                     '包款',
  'Bashful Bunnies':          '害羞兔',
  'Blossom Bunnies':          '碎花兔',
  'Exclusive':                '限定款',
  'Festive':                  '節慶系列',
  'Gifts':                    '禮物系列',
  'Accessories':              '配件',
}

// 官方分類優先，DB 其他值補後面（trim 防止空白造成重複）
const categoryOptions = computed(() => {
  const official = Object.keys(CATEGORY_ZH_MAP)
  const extras   = store.jellycatCategories
    .map(c => c.trim())
    .filter(c => c && !official.includes(c))
  return [...official, ...extras]
})

// ── Column widths (single source of truth) ──────────────────
const COL = {
  product_name:      200,  // min-width
  jellycat_category: 200,  // min-width
  taiwan_stock:      130,
  total_purchased:   130,
  sold_qty:          130,
  current_stock:     130,
  avg_cost:          130,
  box:               100,
  status:            130,
  actions:           100,
  // Taiwan tab
  tw_qty:            100,
  tw_cost:           170,
  tw_box:             90,
  // Opening tab
  op_qty:            100,
  op_cost:           170,
  op_box:             90,
}

const store = useAppDataStore()
const tableRef = ref(null)

const activeTab  = ref('overview')
const search     = ref('')
const filterCat  = ref('')
const filterStock = ref('')
const page       = ref(1)
const pageSize   = ref(20)
const sortState  = ref({ prop: null, order: null })
const activeColFilters = ref({})

const jellycatFilterOptions = computed(() =>
  [...new Set(store.mockInventory.map(p => p.jellycat_category).filter(Boolean))]
    .sort().map(v => ({ text: CATEGORY_ZH_MAP[v] || v, value: v }))
)
const boxFilterOptions = computed(() =>
  [...new Set(store.mockInventory.map(p => p.box).filter(Boolean))]
    .sort().map(v => ({ text: v, value: v }))
)
const statusFilterOptions = [
  { text: '正常', value: 'normal' },
  { text: '低庫存', value: 'low' },
  { text: '缺貨', value: 'out' },
  { text: '未追蹤', value: 'untracked' },
]

function onSortChange({ prop, order }) {
  sortState.value = { prop, order }
  page.value = 1
}

function onFilterChange(filters) {
  activeColFilters.value = { ...activeColFilters.value, ...filters }
  page.value = 1
}

function stockStatusKey(p) {
  if (p.current_stock === 0) return 'out'
  if (p.current_stock <= 2) return 'low'
  if (p.current_stock > 0) return 'normal'
  return 'untracked'
}

function resetFilters() {
  search.value = ''
  filterCat.value = ''
  filterStock.value = ''
  activeColFilters.value = {}
  sortState.value = { prop: null, order: null }
  page.value = 1
  tableRef.value?.clearFilter()
  tableRef.value?.clearSort()
}

const invStats = computed(() => [
  {
    label: '商品總 SKU', value: store.mockInventory.length, icon: 'Box',
    bg: '#eef2ff', color: '#6366f1', accent: 'linear-gradient(90deg,#6366f1,#818cf8)', glow: 'rgba(99,102,241,0.08)',
  },
  {
    label: '在台現貨品項', value: store.mockInventory.filter(p => (p.taiwan_stock || 0) > 0).length, icon: 'Goods',
    bg: '#ecfdf5', color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', glow: 'rgba(16,185,129,0.08)',
  },
  {
    label: '低庫存商品', value: store.lowStockProducts.filter(p => p.current_stock > 0).length, icon: 'Warning',
    bg: '#fffbeb', color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', glow: 'rgba(245,158,11,0.08)',
  },
  {
    label: '缺貨商品', value: store.mockInventory.filter(p => p.current_stock === 0).length, icon: 'CircleClose',
    bg: '#fef2f2', color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)', glow: 'rgba(239,68,68,0.08)',
  },
])

const filtered = computed(() => store.mockInventory.filter(p => {
  if (search.value && !p.product_name?.includes(search.value)) return false
  if (filterCat.value && p.jellycat_category !== filterCat.value) return false
  if (filterStock.value === 'out' && p.current_stock !== 0) return false
  if (filterStock.value === 'low' && (p.current_stock === 0 || p.current_stock > 2)) return false
  if (filterStock.value === 'normal' && p.current_stock <= 2) return false
  const jf = activeColFilters.value['jellycat_category']
  if (jf?.length && !jf.includes(p.jellycat_category)) return false
  const bf = activeColFilters.value['box_col']
  if (bf?.length && !bf.includes(p.box)) return false
  const sf = activeColFilters.value['status_col']
  if (sf?.length && !sf.includes(stockStatusKey(p))) return false
  return true
}))

const sortedFiltered = computed(() => {
  const { prop, order } = sortState.value
  if (!prop || !order) return filtered.value
  return [...filtered.value].sort((a, b) => {
    const av = a[prop] ?? -1
    const bv = b[prop] ?? -1
    if (typeof av === 'string') return order === 'ascending' ? av.localeCompare(bv) : bv.localeCompare(av)
    return order === 'ascending' ? av - bv : bv - av
  })
})

const paginated = computed(() => sortedFiltered.value.slice((page.value-1)*pageSize.value, page.value*pageSize.value))

const taiwanStockList = computed(() =>
  store.mockInventory.filter(p => (p.taiwan_stock || 0) > 0)
)

const openingStockList = computed(() =>
  store.mockInventory.filter(p => (p.opening_qty || 0) > 0)
)

function stockClass(row) {
  if (row.current_stock === 0)  return 'stock-out'
  if (row.current_stock <= 2)   return 'stock-low'
  if (row.current_stock > 0)    return 'stock-ok'
  return ''
}

function exportCSV() {
  const header = ['商品名稱','Jellycat分類','在台庫存','總採購量','已售出','當前庫存','平均成本','分類箱']
  const rows = store.mockInventory.map(p => [
    p.product_name, p.jellycat_category || '', p.taiwan_stock || 0,
    p.total_purchased || 0, p.sold_qty || 0, p.current_stock ?? '',
    p.avg_cost ? Math.round(p.avg_cost) : '', p.box || '',
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

onMounted(() => store.fetchAll())

// ── 編輯 Modal ──────────────────────────────────────────────────
const showEditModal = ref(false)
const saving = ref(false)
const saveError = ref('')
const editFormRef = ref(null)
const editingRow = ref(null)

const editForm = reactive({
  product_name: '',
  jellycat_category: '',
  box_label: '',
  taiwan_stock: 0,
  avg_cost_twd: 0,
  opening_qty: 0,
  opening_cost_twd: 0,
  // read-only display
  total_purchased: 0,
  sold_qty: 0,
  current_stock: 0,
})

const editRules = {
  product_name: [{ required: true, message: '商品名稱不能為空', trigger: 'blur' }],
}

function openEdit(row) {
  editingRow.value = row
  editForm.product_name     = row.product_name || ''
  editForm.jellycat_category = row.jellycat_category || ''
  editForm.box_label        = row.box_label || row.box || ''
  editForm.taiwan_stock     = row.taiwan_stock || 0
  editForm.avg_cost_twd     = row.avg_cost_twd || 0
  editForm.opening_qty      = row.opening_qty || 0
  editForm.opening_cost_twd = row.opening_cost_twd || 0
  // read-only
  editForm.total_purchased  = row.total_purchased || 0
  editForm.sold_qty         = row.sold_qty || 0
  editForm.current_stock    = row.current_stock ?? '—'
  saveError.value = ''
  showEditModal.value = true
}

function cancelEdit() {
  if (saving.value) return
  showEditModal.value = false
}

async function submitEdit() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  saveError.value = ''

  const productId = editingRow.value?.id  // id = product_id in mockInventory

  try {
    // Step 1: update products table
    const { error: prodErr } = await supabase
      .from('products')
      .update({
        name:              editForm.product_name.trim(),
        jellycat_category: editForm.jellycat_category || null,
        box_label:         editForm.box_label.trim() || null,
      })
      .eq('id', productId)

    if (prodErr) throw new Error(`products 更新失敗：${prodErr.message} (${prodErr.code})`)

    // Step 2: update inventory table
    const { error: invErr } = await supabase
      .from('inventory')
      .update({
        taiwan_stock:      editForm.taiwan_stock,
        avg_cost_twd:      editForm.avg_cost_twd,
        opening_qty:       editForm.opening_qty,
        opening_cost_twd:  editForm.opening_cost_twd,
        box_label:         editForm.box_label.trim() || null,
      })
      .eq('product_id', productId)

    if (invErr) throw new Error(`inventory 更新失敗：${invErr.message} (${invErr.code})`)

    // Step 3: update local store reactively
    const prod = store.productsRaw.find(p => p.id === productId)
    if (prod) {
      prod.name              = editForm.product_name.trim()
      prod.jellycat_category = editForm.jellycat_category || null
      prod.box_label         = editForm.box_label.trim() || null
    }
    const inv = store.inventoryRaw.find(i => i.product_id === productId)
    if (inv) {
      inv.taiwan_stock      = editForm.taiwan_stock
      inv.avg_cost_twd      = editForm.avg_cost_twd
      inv.opening_qty       = editForm.opening_qty
      inv.opening_cost_twd  = editForm.opening_cost_twd
      inv.box_label         = editForm.box_label.trim() || null
    }

    ElMessage.success(`已更新「${editForm.product_name}」`)
    showEditModal.value = false

  } catch (err) {
    saveError.value = err.message
    console.error('[編輯庫存]', err)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.product-name-cell { font-weight: 500; font-size: 13px; }
.stock-num  { font-size: 14px; font-weight: 700; color: var(--color-primary); }
.cost-mono  { font-family: var(--font-mono); font-size: 12px; }
.cost-mono.bold { font-weight: 600; }
.stock-ok   { font-weight: 700; color: var(--color-success); }
.stock-low  { font-weight: 700; color: var(--color-warning); }
.stock-out  { font-weight: 700; color: var(--color-danger); }
.filter-hint { font-size: 12px; color: var(--color-text-muted); }

/* ── Modal ──────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
}
.modal-panel {
  background: var(--color-card, #fff);
  border-radius: 12px;
  width: 540px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
  display: flex; flex-direction: column;
  max-height: 90vh; overflow-y: auto;
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--color-border, #e4e7ed);
  position: sticky; top: 0; background: var(--color-card, #fff); z-index: 1;
}
.modal-title { font-size: 16px; font-weight: 700; color: var(--color-text, #1a1a2e); }
.modal-form  { padding: 16px 20px 4px; }
.modal-foot  {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--color-border, #e4e7ed);
  position: sticky; bottom: 0; background: var(--color-card, #fff);
}
.readonly-row {
  display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
  padding: 10px 14px; margin: 0 0 12px;
  background: var(--color-bg, #f8fafc);
  border-radius: 8px; font-size: 13px;
}
.readonly-label { color: var(--color-text-muted); font-size: 12px; }
.readonly-val   { font-weight: 700; font-family: var(--font-mono); margin-left: 4px; }
.error-block {
  margin: 0 20px 12px; padding: 10px 14px;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; font-size: 12px; color: #dc2626;
  line-height: 1.5; word-break: break-all;
}

/* ── Transition ─────────────────────────────────────────────── */
.modal-enter-active { animation: modalIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-leave-active { animation: modalOut 0.2s cubic-bezier(0.4, 0, 1, 1); }
@keyframes modalIn  { from { opacity:0; transform:translateY(32px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes modalOut { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(16px) scale(0.97); } }
</style>

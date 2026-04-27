<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">商品管理</h1>
        <p class="page-subtitle">共 {{ store.mockInventory.length }} 個 SKU · {{ store.jellycatCategories.length }} 個 Jellycat 官方分類</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openAddModal">新增商品</el-button>
    </div>

    <div class="filter-bar">
      <el-input v-model="search" placeholder="搜尋商品名稱…" :prefix-icon="Search" clearable style="width:240px" />
      <el-select v-model="filterCat" placeholder="Jellycat 分類" clearable style="width:160px">
        <el-option v-for="c in jellycatCategories" :key="c" :label="CATEGORY_ZH_MAP[c] || c" :value="c" />
      </el-select>
      <el-select v-model="filterStock" placeholder="庫存狀態" clearable style="width:130px">
        <el-option label="有庫存" value="instock" />
        <el-option label="低庫存" value="low" />
        <el-option label="缺貨" value="out" />
      </el-select>
      <el-button @click="resetFilters">重置</el-button>
      <span v-if="sortedFiltered.length !== store.mockInventory.length" class="filter-hint">
        顯示 {{ sortedFiltered.length }} / {{ store.mockInventory.length }} 筆
      </span>
    </div>

    <el-card>
      <el-table
        ref="tableRef"
        border
        :data="paginated"
        row-key="id"
        @sort-change="onSortChange"
        @filter-change="onFilterChange"
      >
        <el-table-column label="商品名稱" :min-width="COL.product_name" show-overflow-tooltip sortable="custom" prop="product_name">
          <template #default="{ row }">
            <span class="product-name-text">{{ row.product_name }}</span>
          </template>
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
                {{ row.jellycat_category_zh || row.jellycat_category }}
              </el-tag>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column label="在台庫存" :width="COL.taiwan_stock" align="center" sortable="custom" prop="taiwan_stock">
          <template #default="{ row }">
            <span style="font-weight:700;color:var(--color-primary)">{{ row.taiwan_stock || 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column label="總採購" :width="COL.total_purchased" align="center" sortable="custom" prop="total_purchased">
          <template #default="{ row }">{{ row.total_purchased || 0 }}</template>
        </el-table-column>

        <el-table-column label="已售出" :width="COL.sold_qty" align="center" sortable="custom" prop="sold_qty">
          <template #default="{ row }">
            <span style="font-weight:700;color:#6366f1">{{ row.sold_qty || 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column label="當前庫存" :width="COL.current_stock" align="center" sortable="custom" prop="current_stock">
          <template #default="{ row }">
            <span :class="stockClass(row)">{{ row.current_stock ?? '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="平均成本" :width="COL.avg_cost" align="right" sortable="custom" prop="avg_cost">
          <template #default="{ row }">
            <span v-if="row.avg_cost" class="cost-mono">
              NT$ {{ Math.round(row.avg_cost).toLocaleString() }}
            </span>
          </template>
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
            <span v-if="row.current_stock === 0" class="badge badge-danger">缺貨</span>
            <span v-else-if="row.current_stock <= 2" class="badge badge-warning">低庫存</span>
            <span v-else-if="row.current_stock > 0" class="badge badge-active">正常</span>
            <span v-else class="badge badge-inactive">未追蹤</span>
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

    <!-- ── 編輯商品 Modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEditModal" class="modal-backdrop" @click.self="cancelEdit">
          <div class="modal-panel">
            <div class="modal-head">
              <span class="modal-title">編輯商品</span>
              <el-button text :icon="Close" circle @click="cancelEdit" />
            </div>

            <el-form
              ref="editFormRef"
              :model="editForm"
              :rules="editRules"
              label-width="110px"
              class="modal-form"
              @submit.prevent="submitEdit"
            >
              <el-form-item label="商品名稱" prop="name">
                <el-input v-model="editForm.name" placeholder="例：Bashful Bunny Medium" clearable />
              </el-form-item>

              <el-form-item label="Jellycat 分類">
                <el-select
                  v-model="editForm.jellycat_category"
                  placeholder="選擇或輸入分類"
                  filterable
                  allow-create
                  style="width:100%"
                >
                  <el-option
                    v-for="c in categoryOptions"
                    :key="c"
                    :label="`${CATEGORY_ZH_MAP[c] || c}　${c}`"
                    :value="c"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="中文分類">
                <el-input
                  v-model="editForm.jellycat_category_zh"
                  placeholder="選擇分類後自動帶入，可手動修改"
                />
              </el-form-item>

              <el-form-item label="分類箱">
                <el-input v-model="editForm.box_label" placeholder="例：A1" style="width:140px" />
              </el-form-item>

              <el-divider style="margin:12px 0" />

              <el-form-item label="在台庫存">
                <el-input-number v-model="editForm.taiwan_stock" :min="0" :precision="0" style="width:160px" />
              </el-form-item>

              <el-form-item label="平均成本(TWD)">
                <el-input-number v-model="editForm.avg_cost_twd" :min="0" :precision="2" style="width:160px" />
              </el-form-item>

              <el-divider style="margin:12px 0" />

              <el-form-item label="期初數量">
                <el-input-number v-model="editForm.opening_qty" :min="0" :precision="0" style="width:160px" />
                <span class="form-hint">調整此值可修正當前庫存</span>
              </el-form-item>

              <!-- 庫存資訊（唯讀參考） -->
              <el-form-item label="總採購">
                <span class="readonly-val">{{ editingRow?.total_purchased ?? 0 }} 件</span>
              </el-form-item>
              <el-form-item label="已售出">
                <span class="readonly-val">{{ editingRow?.sold_qty ?? 0 }} 件</span>
              </el-form-item>
              <el-form-item label="當前庫存">
                <span
                  class="readonly-val"
                  :class="{
                    'stock-ok':  (editForm.opening_qty + (editingRow?.total_purchased ?? 0) - (editingRow?.sold_qty ?? 0)) > 2,
                    'stock-low': (editForm.opening_qty + (editingRow?.total_purchased ?? 0) - (editingRow?.sold_qty ?? 0)) > 0 && (editForm.opening_qty + (editingRow?.total_purchased ?? 0) - (editingRow?.sold_qty ?? 0)) <= 2,
                    'stock-out': (editForm.opening_qty + (editingRow?.total_purchased ?? 0) - (editingRow?.sold_qty ?? 0)) <= 0,
                  }"
                >
                  {{ editForm.opening_qty + (editingRow?.total_purchased ?? 0) - (editingRow?.sold_qty ?? 0) }} 件
                  <span class="form-hint">= 期初 {{ editForm.opening_qty }} + 採購 {{ editingRow?.total_purchased ?? 0 }} − 售出 {{ editingRow?.sold_qty ?? 0 }}</span>
                </span>
              </el-form-item>
            </el-form>

            <div v-if="editError" class="error-block">
              <strong>寫入失敗：</strong>{{ editError }}
            </div>

            <div class="modal-foot">
              <el-button @click="cancelEdit" :disabled="editSaving">取消</el-button>
              <el-button type="primary" @click="submitEdit" :loading="editSaving">
                {{ editSaving ? '儲存中…' : '儲存變更' }}
              </el-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── 新增商品 Modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddModal" class="modal-backdrop" @click.self="cancelAdd">
          <div class="modal-panel">
            <div class="modal-head">
              <span class="modal-title">新增商品</span>
              <el-button text :icon="Close" circle @click="cancelAdd" />
            </div>

            <el-form
              ref="addFormRef"
              :model="addForm"
              :rules="addRules"
              label-width="110px"
              class="modal-form"
              @submit.prevent="submitAdd"
            >
              <el-form-item label="商品名稱" prop="name">
                <el-input v-model="addForm.name" placeholder="例：Bashful Bunny Medium" clearable />
              </el-form-item>

              <el-form-item label="Jellycat 分類" prop="jellycat_category">
                <el-select
                  v-model="addForm.jellycat_category"
                  placeholder="選擇或輸入分類"
                  filterable
                  allow-create
                  style="width:100%"
                >
                  <el-option
                    v-for="c in categoryOptions"
                    :key="c"
                    :label="`${CATEGORY_ZH_MAP[c] || c}　${c}`"
                    :value="c"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="中文分類">
                <el-input
                  v-model="addForm.jellycat_category_zh"
                  placeholder="選擇分類後自動帶入，可手動修改"
                />
              </el-form-item>

              <el-form-item label="分類箱">
                <el-input v-model="addForm.box_label" placeholder="例：A1" style="width:140px" />
              </el-form-item>

              <el-divider style="margin:12px 0" />

              <el-form-item label="在台庫存">
                <el-input-number v-model="addForm.taiwan_stock" :min="0" :precision="0" style="width:160px" />
              </el-form-item>

              <el-form-item label="期初庫存">
                <el-input-number v-model="addForm.opening_qty" :min="0" :precision="0" style="width:160px" />
              </el-form-item>

              <el-form-item label="期初成本(TWD)">
                <el-input-number v-model="addForm.opening_cost_twd" :min="0" :precision="0" style="width:160px" />
                <span class="form-hint" v-if="addForm.opening_qty > 0">
                  均攤 NT${{ Math.round(addForm.opening_cost_twd / addForm.opening_qty).toLocaleString() }} /件
                </span>
              </el-form-item>
            </el-form>

            <!-- 錯誤診斷 -->
            <div v-if="saveError" class="error-block">
              <strong>寫入失敗：</strong>{{ saveError }}
            </div>

            <div class="modal-foot">
              <el-button @click="cancelAdd" :disabled="saving">取消</el-button>
              <el-button type="primary" @click="submitAdd" :loading="saving">
                {{ saving ? '寫入中…' : '新增商品' }}
              </el-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Plus, Search, Edit, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAppDataStore } from '@/stores/appData'
import { supabase } from '@/lib/supabase'

// ── 英文 → 繁中 分類對照 ────────────────────────────────────
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

// ── Column widths (single source of truth) ──────────────────
const COL = {
  product_name:      200,  // min-width
  jellycat_category: 200,  // min-width
  taiwan_stock:      120,
  total_purchased:   120,
  sold_qty:          120,
  current_stock:     120,
  avg_cost:          120,
  status:            120,
  box:               120,
  actions:           120,
}

const store = useAppDataStore()
const mockInventory = computed(() => store.mockInventory)
const jellycatCategories = computed(() => store.jellycatCategories)
const tableRef = ref(null)

const search = ref('')
const filterCat = ref('')
const filterStock = ref('')
const page = ref(1)
const pageSize = ref(20)
const sortState = ref({ prop: null, order: null })
const activeColFilters = ref({})

onMounted(() => store.fetchAll())

// ── 分類選項：官方 CATEGORY_ZH_MAP key 優先，DB 其他值補在後面 ──────
const categoryOptions = computed(() => {
  const official = Object.keys(CATEGORY_ZH_MAP)
  const extras   = store.jellycatCategories.filter(c => !official.includes(c))
  return [...official, ...extras]
})

// ── Filter options ──────────────────────────────────────────────────
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

// ── Sort / filter handlers ──────────────────────────────────────────
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

const filtered = computed(() => mockInventory.value.filter(p => {
  if (search.value && !p.product_name?.includes(search.value)) return false
  if (filterCat.value && p.jellycat_category !== filterCat.value) return false
  if (filterStock.value === 'out' && p.current_stock !== 0) return false
  if (filterStock.value === 'low' && (p.current_stock === 0 || p.current_stock > 2)) return false
  if (filterStock.value === 'instock' && p.current_stock <= 2) return false
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

const paginated = computed(() =>
  sortedFiltered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
)

function stockClass(r) {
  if (r.current_stock === 0) return 'stock-out'
  if (r.current_stock <= 2) return 'stock-low'
  if (r.current_stock > 0) return 'stock-ok'
  return ''
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

// ── 編輯商品 Modal ──────────────────────────────────────────────────
const showEditModal = ref(false)
const editSaving    = ref(false)
const editError     = ref('')
const editFormRef   = ref(null)
const editingRow    = ref(null)   // keep reference for readonly stats display

const editForm = reactive({
  name:                 '',
  jellycat_category:    '',
  jellycat_category_zh: '',
  box_label:            '',
  taiwan_stock:         0,
  avg_cost_twd:         0,
  opening_qty:          0,
})

// 選英文分類時自動帶入中文（可手動覆蓋）
watch(() => editForm.jellycat_category, val => {
  if (CATEGORY_ZH_MAP[val]) editForm.jellycat_category_zh = CATEGORY_ZH_MAP[val]
})

const editRules = {
  name: [{ required: true, message: '請填入商品名稱', trigger: 'blur' }],
}

function openEdit(row) {
  editingRow.value              = row
  editForm.name                 = row.product_name        || ''
  editForm.jellycat_category    = row.jellycat_category   || ''
  editForm.jellycat_category_zh = row.jellycat_category_zh || ''
  editForm.box_label            = row.box_label           || ''
  editForm.taiwan_stock         = row.taiwan_stock        ?? 0
  editForm.avg_cost_twd         = row.avg_cost_twd        ?? 0
  editForm.opening_qty          = row.opening_qty         ?? 0
  editError.value               = ''
  showEditModal.value           = true
}

function cancelEdit() {
  if (editSaving.value) return
  showEditModal.value = false
}

async function submitEdit() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  const productId = editingRow.value?.id   // id = product_id in mockInventory
  if (!productId) return

  editSaving.value = true
  editError.value  = ''

  try {
    // Update products table
    const { error: prodErr } = await supabase
      .from('products')
      .update({
        name:                 editForm.name.trim(),
        jellycat_category:    editForm.jellycat_category    || null,
        jellycat_category_zh: editForm.jellycat_category_zh || null,
        box_label:            editForm.box_label.trim()     || null,
      })
      .eq('id', productId)

    if (prodErr) throw new Error(`products 更新失敗：${prodErr.message}`)

    // Update inventory table（只更新 inventory 自己有的欄位）
    const { error: invErr } = await supabase
      .from('inventory')
      .update({
        taiwan_stock: editForm.taiwan_stock,
        avg_cost_twd: editForm.avg_cost_twd,
        opening_qty:  editForm.opening_qty,
      })
      .eq('product_id', productId)

    if (invErr) throw new Error(`inventory 更新失敗：${invErr.message}`)

    // Reactively patch local store so table updates immediately
    const prodRow = store.productsRaw.find(p => p.id === productId)
    if (prodRow) {
      prodRow.name                 = editForm.name.trim()
      prodRow.jellycat_category    = editForm.jellycat_category    || null
      prodRow.jellycat_category_zh = editForm.jellycat_category_zh || null
      prodRow.box_label            = editForm.box_label.trim()     || null
    }
    const invRow = store.inventoryRaw.find(i => i.product_id === productId)
    if (invRow) {
      invRow.taiwan_stock = editForm.taiwan_stock
      invRow.avg_cost_twd = editForm.avg_cost_twd
      invRow.opening_qty  = editForm.opening_qty
    }

    ElMessage.success(`已更新「${editForm.name.trim()}」`)
    showEditModal.value = false
  } catch (err) {
    editError.value = err.message
    console.error('[編輯商品]', err)
  } finally {
    editSaving.value = false
  }
}

// ── 新增商品 Modal ──────────────────────────────────────────────────
const showAddModal = ref(false)
const saving = ref(false)
const saveError = ref('')
const addFormRef = ref(null)

const addForm = reactive({
  name: '',
  jellycat_category: '',
  jellycat_category_zh: '',
  box_label: '',
  taiwan_stock: 0,
  opening_qty: 0,
  opening_cost_twd: 0,
})

// 選英文分類時自動帶入中文（可手動覆蓋）
watch(() => addForm.jellycat_category, val => {
  if (CATEGORY_ZH_MAP[val]) addForm.jellycat_category_zh = CATEGORY_ZH_MAP[val]
})

const addRules = {
  name: [{ required: true, message: '請填入商品名稱', trigger: 'blur' }],
}

function openAddModal() {
  addForm.name = ''
  addForm.jellycat_category = ''
  addForm.jellycat_category_zh = ''
  addForm.box_label = ''
  addForm.taiwan_stock = 0
  addForm.opening_qty = 0
  addForm.opening_cost_twd = 0
  saveError.value = ''
  showAddModal.value = true
}

function cancelAdd() {
  if (saving.value) return
  showAddModal.value = false
}

async function submitAdd() {
  const valid = await addFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  saveError.value = ''

  try {
    // Step 1: insert product
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .insert({
        name:                 addForm.name.trim(),
        jellycat_category:    addForm.jellycat_category    || null,
        jellycat_category_zh: addForm.jellycat_category_zh || null,
        box_label:            addForm.box_label.trim()     || null,
      })
      .select()
      .single()

    if (prodErr) {
      console.error('[新增商品] products insert error:', prodErr)
      throw new Error(`products 表寫入失敗：${prodErr.message} (code: ${prodErr.code})`)
    }

    // Step 2: insert inventory row
    const avgCost = addForm.opening_qty > 0
      ? Math.round(addForm.opening_cost_twd / addForm.opening_qty)
      : 0

    const { data: inv, error: invErr } = await supabase
      .from('inventory')
      .insert({
        product_id:       product.id,
        opening_qty:      addForm.opening_qty,
        opening_cost_twd: addForm.opening_cost_twd,
        taiwan_stock:     addForm.taiwan_stock,
        avg_cost_twd:     avgCost,
        jellycat_category: addForm.jellycat_category || null,
        box_label:        addForm.box_label.trim() || null,
      })
      .select()
      .single()

    if (invErr) {
      console.error('[新增商品] inventory insert error:', invErr)
      // product was created but inventory failed — still update local state
      store.productsRaw.push(product)
      throw new Error(`inventory 表寫入失敗：${invErr.message} (code: ${invErr.code})`)
    }

    // Step 3: update local store (reactive, no full reload needed)
    store.productsRaw.push(product)
    store.inventoryRaw.push(inv)

    ElMessage.success(`已新增「${product.name}」`)
    showAddModal.value = false

  } catch (err) {
    saveError.value = err.message
    console.error('[新增商品]', err)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.product-name-text { font-size: 13px; font-weight: 500; }
.cost-mono { font-family: var(--font-mono); font-size: 12px; font-weight: 600; }
.stock-ok  { font-weight: 700; color: var(--color-success); }
.stock-low { font-weight: 700; color: var(--color-warning); }
.stock-out { font-weight: 700; color: var(--color-danger); }
.filter-hint  { font-size: 12px; color: var(--color-text-muted); }
.readonly-val { font-size: 13px; color: var(--color-text-secondary, #64748b); font-weight: 500; }

/* ── Modal backdrop ─────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-panel {
  background: var(--color-card, #fff);
  border-radius: 12px;
  width: 520px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--color-border, #e4e7ed);
}
.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #1a1a2e);
}

.modal-form {
  padding: 20px 20px 4px;
}

.form-hint {
  margin-left: 10px;
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
  font-family: var(--font-mono);
}

.error-block {
  margin: 0 20px 12px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 12px;
  color: #dc2626;
  line-height: 1.5;
  word-break: break-all;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--color-border, #e4e7ed);
}

/* ── Transition ─────────────────────────────────────────────── */
.modal-enter-active {
  animation: modalIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-leave-active {
  animation: modalOut 0.2s cubic-bezier(0.4, 0, 1, 1);
}

/* backdrop fade separately */
.modal-enter-active .modal-backdrop,
.modal-leave-active .modal-backdrop {
  transition: background 0.2s;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes modalOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
}
</style>

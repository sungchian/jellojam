<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ isEdit ? '編輯商品' : '新增商品' }}</h1>
        <p class="page-subtitle">{{ isEdit ? `編輯 SKU: ${form.sku}` : '填寫商品資訊並上架' }}</p>
      </div>
      <div style="display:flex;gap:8px">
        <RouterLink to="/products"><el-button>取消</el-button></RouterLink>
        <el-button type="primary" @click="save" :loading="saving">{{ isEdit ? '儲存變更' : '建立商品' }}</el-button>
      </div>
    </div>

    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" size="default">
      <el-tabs v-model="activeTab">
        <!-- Tab 1: 基本資訊 -->
        <el-tab-pane label="基本資訊" name="basic">
          <el-card style="margin-bottom:16px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="商品名稱（中）" prop="name">
                  <el-input v-model="form.name" placeholder="例：Jellycat Bashful Bunny 兔兔玩偶" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="商品名稱（英）" prop="nameEn">
                  <el-input v-model="form.nameEn" placeholder="e.g. Bashful Bunny Medium" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="SKU" prop="sku">
                  <el-input v-model="form.sku" placeholder="自動生成或手動輸入">
                    <template #append><el-button @click="genSKU">生成</el-button></template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="品牌" prop="brand">
                  <el-select v-model="form.brand" placeholder="選擇品牌" style="width:100%">
                    <el-option label="Jellycat" value="Jellycat" />
                    <el-option label="Squishmallows" value="Squishmallows" />
                    <el-option label="Melissa & Doug" value="Melissa & Doug" />
                    <el-option label="其他" value="其他" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="類別" prop="category">
                  <el-select v-model="form.category" placeholder="選擇類別" style="width:100%">
                    <el-option label="玩偶" value="玩偶" />
                    <el-option label="抱枕" value="抱枕" />
                    <el-option label="禮盒" value="禮盒" />
                    <el-option label="配件" value="配件" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="商品簡述">
                  <el-input v-model="form.shortDesc" type="textarea" :rows="2" placeholder="用於商品列表展示的簡短描述" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="詳細描述">
                  <el-input v-model="form.desc" type="textarea" :rows="5" placeholder="詳細的商品描述、特色、材質等" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>
        </el-tab-pane>

        <!-- Tab 2: 價格庫存 -->
        <el-tab-pane label="價格與庫存" name="price">
          <el-card style="margin-bottom:16px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="北美售價（USD）" prop="usdPrice">
                  <el-input-number v-model="form.usdPrice" :min="0" :precision="2" :step="1" controls-position="right" style="width:100%" @change="calcTwd" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="代購服務費率（%）">
                  <el-input-number v-model="form.feeRate" :min="0" :max="100" :precision="1" :step="1" controls-position="right" style="width:100%" @change="calcTwd" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="台灣售價（TWD）">
                  <el-input :value="`NT$ ${form.twdPrice.toLocaleString()}`" readonly>
                    <template #prefix><el-icon><Money /></el-icon></template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="成本價（USD）">
                  <el-input-number v-model="form.cost" :min="0" :precision="2" controls-position="right" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="庫存數量" prop="stock">
                  <el-input-number v-model="form.stock" :min="0" controls-position="right" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="安全庫存（預警值）">
                  <el-input-number v-model="form.safeStock" :min="0" controls-position="right" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="允許預購">
                  <el-switch v-model="form.allowPreorder" />
                </el-form-item>
              </el-col>
              <el-col :span="8" v-if="form.allowPreorder">
                <el-form-item label="預購到貨時間">
                  <el-input v-model="form.preorderDays" placeholder="例：15-30天" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>
        </el-tab-pane>

        <!-- Tab 3: 商品圖片 -->
        <el-tab-pane label="商品圖片" name="images">
          <el-card style="margin-bottom:16px">
            <el-alert title="支援 JPG、PNG、WebP 格式，建議尺寸 800×800px，主圖為必填" type="info" show-icon :closable="false" style="margin-bottom:16px" />
            <div class="image-upload-area">
              <div class="main-upload">
                <p class="upload-label">主圖（必填）</p>
                <el-upload action="#" :auto-upload="false" :show-file-list="false" accept="image/*" list-type="picture-card" class="main-uploader">
                  <img v-if="form.image" :src="form.image" class="preview-img" />
                  <el-icon v-else size="28"><Plus /></el-icon>
                </el-upload>
              </div>
              <div class="sub-upload">
                <p class="upload-label">附圖（最多8張）</p>
                <el-upload action="#" :auto-upload="false" multiple :limit="8" accept="image/*" list-type="picture-card">
                  <el-icon><Plus /></el-icon>
                </el-upload>
              </div>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- Tab 4: 規格 -->
        <el-tab-pane label="規格設定" name="spec">
          <el-card style="margin-bottom:16px">
            <div class="spec-section">
              <div class="spec-header">
                <span>尺寸規格</span>
                <el-switch v-model="form.hasSizes" />
              </div>
              <div v-if="form.hasSizes" class="spec-tags">
                <el-tag v-for="s in form.sizes" :key="s" closable @close="removeSize(s)" style="margin:4px">{{ s }}</el-tag>
                <el-input v-model="newSize" placeholder="新增尺寸" size="small" style="width:100px;margin:4px" @keyup.enter="addSize" />
              </div>
            </div>
            <el-divider />
            <div class="spec-section">
              <div class="spec-header">
                <span>顏色規格</span>
                <el-switch v-model="form.hasColors" />
              </div>
              <div v-if="form.hasColors" class="spec-tags">
                <el-tag v-for="c in form.colors" :key="c" closable @close="removeColor(c)" style="margin:4px">{{ c }}</el-tag>
                <el-input v-model="newColor" placeholder="新增顏色" size="small" style="width:100px;margin:4px" @keyup.enter="addColor" />
              </div>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- Tab 5: 物流 -->
        <el-tab-pane label="物流資訊" name="logistics">
          <el-card style="margin-bottom:16px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="商品重量（g）">
                  <el-input-number v-model="form.weight" :min="0" controls-position="right" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="包裝方式">
                  <el-select v-model="form.packaging" style="width:100%">
                    <el-option label="標準包裝" value="standard" />
                    <el-option label="禮盒包裝" value="gift" />
                    <el-option label="特殊防護" value="special" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="易碎品">
                  <el-switch v-model="form.fragile" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>
        </el-tab-pane>

        <!-- Tab 6: 上架設定 -->
        <el-tab-pane label="上架設定" name="publish">
          <el-card style="margin-bottom:16px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="上架狀態">
                  <el-radio-group v-model="form.status">
                    <el-radio-button value="active">上架</el-radio-button>
                    <el-radio-button value="inactive">下架</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="顯示順序">
                  <el-input-number v-model="form.sortOrder" :min="0" controls-position="right" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="24" style="display:flex;gap:24px;align-items:center;margin-top:8px">
                <el-checkbox v-model="form.isFeatured">精選商品</el-checkbox>
                <el-checkbox v-model="form.isNew">新品標籤</el-checkbox>
                <el-checkbox v-model="form.isHot">熱銷標籤</el-checkbox>
              </el-col>
            </el-row>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </el-form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Money } from '@element-plus/icons-vue'
import { useAppDataStore } from '@/stores/appData'
const store = useAppDataStore()

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const formRef = ref()
const activeTab = ref('basic')
const saving = ref(false)
const newSize = ref('')
const newColor = ref('')

const USD_RATE = 32.5

const form = ref({
  id: null, name: '', nameEn: '', sku: '', brand: 'Jellycat', category: '玩偶',
  shortDesc: '', desc: '', usdPrice: 0, feeRate: 10, twdPrice: 0, cost: 0,
  stock: 0, safeStock: 5, allowPreorder: false, preorderDays: '',
  image: '', status: 'active', isFeatured: false, isNew: false, isHot: false,
  weight: 0, packaging: 'standard', fragile: false, sortOrder: 0,
  hasSizes: false, sizes: [], hasColors: false, colors: [],
})

const rules = {
  name: [{ required: true, message: '請輸入商品名稱', trigger: 'blur' }],
  sku: [{ required: true, message: '請輸入SKU', trigger: 'blur' }],
  brand: [{ required: true, message: '請選擇品牌', trigger: 'change' }],
  usdPrice: [{ required: true, message: '請輸入售價', trigger: 'blur' }],
}

function calcTwd() {
  form.value.twdPrice = Math.round(form.value.usdPrice * (1 + form.value.feeRate / 100) * USD_RATE / 10) * 10
}

function genSKU() {
  const brand = form.value.brand.substring(0, 2).toUpperCase()
  form.value.sku = `${brand}-${Date.now().toString(36).toUpperCase()}`
}

function addSize() { if (newSize.value) { form.value.sizes.push(newSize.value); newSize.value = '' } }
function removeSize(s) { form.value.sizes = form.value.sizes.filter(x => x !== s) }
function addColor() { if (newColor.value) { form.value.colors.push(newColor.value); newColor.value = '' } }
function removeColor(c) { form.value.colors = form.value.colors.filter(x => x !== c) }

async function save() {
  await formRef.value.validate(async (valid) => {
    if (!valid) { activeTab.value = 'basic'; return }
    saving.value = true
    await new Promise(r => setTimeout(r, 600))
    saving.value = false
    ElMessage.success(isEdit.value ? '商品已更新' : '商品已建立')
    router.push('/products')
  })
}

onMounted(async () => {
  await store.fetchAll()
  if (isEdit.value) {
    const found = store.mockInventory.find(p => String(p.id) === String(route.params.id))
    if (found) Object.assign(form.value, found)
  }
})
</script>

<style scoped>
.image-upload-area { display: flex; gap: 24px; align-items: flex-start; }
.main-upload { }
.sub-upload { flex: 1; }
.upload-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 8px; }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
:deep(.main-uploader .el-upload--picture-card) { width: 120px; height: 120px; }
.spec-section { margin-bottom: 8px; }
.spec-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 14px; font-weight: 600; }
.spec-tags { padding: 8px; background: var(--color-bg); border-radius: 8px; }
</style>

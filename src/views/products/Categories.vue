<template>
  <div>
    <div class="page-header">
      <div><h1 class="page-title">分類管理</h1><p class="page-subtitle">管理商品的多層級分類結構</p></div>
      <el-button type="primary" :icon="Plus" @click="openAdd(null)">新增一級分類</el-button>
    </div>
    <div class="cat-layout">
      <el-card class="cat-tree-card">
        <el-tree :data="categories" :props="{ label: 'name', children: 'children' }" node-key="id"
          default-expand-all draggable @node-drop="handleDrop">
          <template #default="{ node, data }">
            <div class="tree-node">
              <span class="node-icon">{{ data.icon }}</span>
              <span class="node-name">{{ data.name }}</span>
              <span class="node-count">{{ data.count }} 個商品</span>
              <div class="node-actions">
                <el-button v-if="node.level < 3" text size="small" type="primary" @click.stop="openAdd(data)">+子分類</el-button>
                <el-button text size="small" :icon="Edit" @click.stop="openEdit(data)" />
                <el-button text size="small" type="danger" :icon="Delete" @click.stop="deleteCat(data)" />
              </div>
            </div>
          </template>
        </el-tree>
      </el-card>
      <el-card class="cat-form-card" v-if="editingCat">
        <template #header><span class="card-title">{{ editingCat.id ? '編輯分類' : '新增分類' }}</span></template>
        <el-form :model="editingCat" label-width="100px">
          <el-form-item label="分類名稱">
            <el-input v-model="editingCat.name" placeholder="輸入分類名稱" />
          </el-form-item>
          <el-form-item label="分類圖標">
            <el-input v-model="editingCat.icon" placeholder="輸入 Emoji 圖標" />
          </el-form-item>
          <el-form-item label="顯示順序">
            <el-input-number v-model="editingCat.order" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="SEO 標題">
            <el-input v-model="editingCat.seoTitle" placeholder="SEO 標題" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveCategory">儲存</el-button>
            <el-button @click="editingCat = null">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
      <el-card v-else class="cat-hint-card">
        <div class="hint-content">
          <el-icon size="48" style="color:#c7d2fe"><Grid /></el-icon>
          <p>點選左側分類以編輯<br>或新增分類結構</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Grid } from '@element-plus/icons-vue'

const categories = ref([
  { id: 1, name: 'Jellycat', icon: '🐰', count: 42, order: 1, seoTitle: '', children: [
    { id: 11, name: '玩偶', icon: '🧸', count: 30, order: 1, children: [
      { id: 111, name: '兔兔系列', icon: '🐰', count: 12, order: 1, children: [] },
      { id: 112, name: '貓咪系列', icon: '🐱', count: 8, order: 2, children: [] },
    ]},
    { id: 12, name: '禮盒', icon: '🎁', count: 8, order: 2, children: [] },
    { id: 13, name: '配件', icon: '✨', count: 4, order: 3, children: [] },
  ]},
  { id: 2, name: 'Squishmallows', icon: '🌈', count: 15, order: 2, children: [
    { id: 21, name: '抱枕', icon: '💤', count: 10, order: 1, children: [] },
  ]},
  { id: 3, name: '其他品牌', icon: '🌟', count: 8, order: 3, children: [] },
])

const editingCat = ref(null)

function openAdd(parent) {
  editingCat.value = { id: null, name: '', icon: '📦', count: 0, order: 0, seoTitle: '', parent, children: [] }
}
function openEdit(cat) {
  editingCat.value = { ...cat }
}
function saveCategory() {
  ElMessage.success('分類已儲存')
  editingCat.value = null
}
async function deleteCat(cat) {
  await ElMessageBox.confirm(`確定刪除分類「${cat.name}」？刪除後無法復原。`, '刪除確認', { type: 'warning' })
  ElMessage.success('分類已刪除')
}
function handleDrop() { ElMessage.success('分類順序已更新') }
</script>

<style scoped>
.cat-layout { display: flex; gap: 16px; }
.cat-tree-card { flex: 1; min-width: 0; }
.cat-form-card, .cat-hint-card { width: 340px; flex-shrink: 0; }
.tree-node {
  display: flex; align-items: center; gap: 8px; flex: 1;
  padding: 2px 0;
}
.node-icon { font-size: 16px; }
.node-name { font-size: 13px; font-weight: 500; flex: 1; }
.node-count { font-size: 11px; color: var(--color-text-muted); }
.node-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
.tree-node:hover .node-actions { opacity: 1; }
.hint-content { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 200px; color: var(--color-text-muted); text-align: center; line-height: 1.8; }
.card-title { font-size: 14px; font-weight: 600; }
</style>

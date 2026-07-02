<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">文章管理</h1>
        <p class="page-subtitle">共 {{ posts.length }} 篇文章</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="$router.push('/journal/new')">
        新增文章
      </el-button>
    </div>

    <el-card>
      <el-table
        :data="posts"
        v-loading="loading"
        border
        stripe
        row-key="id"
      >
        <!-- Cover -->
        <el-table-column label="封面" :width="COL.cover" align="center">
          <template #default="{ row }">
            <div class="cover-thumb" :style="{ background: row.cover_color }">
              <span>{{ row.cover_emoji }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- Title -->
        <el-table-column label="標題" :min-width="COL.title" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="post-title-cell">{{ row.title }}</span>
            <div class="slug-cell">{{ row.slug }}</div>
          </template>
        </el-table-column>

        <!-- Tags -->
        <el-table-column label="標籤" :width="COL.tags">
          <template #default="{ row }">
            <el-tag
              v-for="tag in (row.tags || [])"
              :key="tag"
              size="small"
              type="info"
              style="margin:2px"
            >{{ tag }}</el-tag>
          </template>
        </el-table-column>

        <!-- Published -->
        <el-table-column label="狀態" :width="COL.published" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.published"
              @change="togglePublished(row)"
              :loading="togglingId === row.id"
            />
          </template>
        </el-table-column>

        <!-- Date -->
        <el-table-column label="建立日期" :width="COL.date" align="center">
          <template #default="{ row }">
            <span style="font-size:12px">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>

        <!-- Actions -->
        <el-table-column label="操作" :width="COL.actions" align="center" fixed="right" class-name="col-action">
          <template #default="{ row }">
            <el-button
              size="small"
              :icon="Edit"
              @click="$router.push(`/journal/${row.id}`)"
            >編輯</el-button>
            <el-button
              size="small"
              type="danger"
              :icon="Delete"
              @click="confirmDelete(row)"
              style="margin-left:6px"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, SquarePen as Edit, Trash2 as Delete } from 'lucide-vue-next'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import dayjs from 'dayjs'

// ── 欄位寬度設定 ──────────────────────────────────────────────────
const COL = {
  cover:     64,
  title:    220,   // min-width
  tags:     320,
  published: 90,
  date:     130,
  actions:  180,
}

const posts      = ref([])
const loading    = ref(true)
const togglingId = ref(null)

onMounted(fetchPosts)

async function fetchPosts() {
  loading.value = true
  const { data } = await supabase
    .from('journal_posts')
    .select('id, slug, title, tags, cover_emoji, cover_color, published, created_at')
    .order('created_at', { ascending: false })
  posts.value   = data || []
  loading.value = false
}

async function togglePublished(row) {
  togglingId.value = row.id
  const newVal = !row.published
  const { error } = await supabase
    .from('journal_posts')
    .update({ published: newVal })
    .eq('id', row.id)
  if (error) {
    ElMessage.error('更新失敗')
  } else {
    row.published = newVal
    ElMessage.success(newVal ? '已發佈' : '已下架')
  }
  togglingId.value = null
}

async function confirmDelete(row) {
  try {
    await ElMessageBox.confirm(
      `確定要刪除「${row.title}」嗎？此操作無法復原。`,
      '刪除確認',
      { confirmButtonText: '刪除', cancelButtonText: '取消', type: 'warning' }
    )
    const { error } = await supabase.from('journal_posts').delete().eq('id', row.id)
    if (error) throw error
    posts.value = posts.value.filter(p => p.id !== row.id)
    ElMessage.success('文章已刪除')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('刪除失敗')
  }
}

const formatDate = (ts) => dayjs(ts).format('YYYY/MM/DD')
</script>

<style scoped>
.cover-thumb {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin: auto;
}
.post-title-cell {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.slug-cell {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  margin-top: 2px;
}
</style>

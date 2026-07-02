<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ isNew ? '新增文章' : '編輯文章' }}</h1>
        <p class="page-subtitle" v-if="!isNew">{{ form.slug }}</p>
      </div>
      <div style="display:flex;gap:8px">
        <RouterLink to="/journal">
          <el-button :icon="ArrowLeft">返回列表</el-button>
        </RouterLink>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >{{ saving ? '儲存中…' : '儲存文章' }}</el-button>
      </div>
    </div>

    <div v-loading="loading" class="form-layout">
      <!-- Left: main content -->
      <div class="form-main">
        <!-- Title -->
        <el-card>
          <el-form label-position="top">
            <el-form-item label="文章標題" required>
              <el-input
                v-model="form.title"
                placeholder="請輸入文章標題"
                size="large"
                @input="onTitleInput"
              />
            </el-form-item>
            <el-form-item label="Slug（網址）">
              <el-input v-model="form.slug" placeholder="post-slug-here">
                <template #append>
                  <el-button @click="autoSlug">自動產生</el-button>
                </template>
              </el-input>
              <div class="field-hint">預覽：/store/journal/{{ form.slug || '…' }}</div>
            </el-form-item>
            <el-form-item label="摘要（列表頁顯示）">
              <el-input
                v-model="form.excerpt"
                type="textarea"
                :rows="3"
                placeholder="一段吸引人的文章摘要，約 50–100 字"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- Quill Editor -->
        <el-card>
          <template #header>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-weight:600">文章內容</span>
              <span v-if="uploading" style="font-size:12px;color:var(--color-text-muted)">
                ⏳ 上傳圖片中…
              </span>
            </div>
          </template>
          <QuillEditor
            v-model:content="form.content"
            content-type="html"
            theme="snow"
            :toolbar="toolbar"
            style="min-height:420px;font-size:15px"
            @ready="onEditorReady"
          />
        </el-card>
      </div>

      <!-- Right: settings -->
      <div class="form-side">

        <!-- Publish -->
        <el-card>
          <template #header><span style="font-weight:600">發佈設定</span></template>
          <div class="side-row">
            <span>發佈狀態</span>
            <el-switch v-model="form.published" active-text="已發佈" inactive-text="草稿" />
          </div>
          <div class="side-row" style="margin-top:12px">
            <span style="font-size:12px;color:var(--color-text-muted)">
              {{ form.published ? '✅ 前台可見' : '📝 草稿，前台隱藏' }}
            </span>
          </div>
        </el-card>

        <!-- Cover -->
        <el-card>
          <template #header><span style="font-weight:600">封面設定</span></template>

          <!-- Emoji -->
          <el-form label-position="top">
            <el-form-item label="封面 Emoji">
              <el-input v-model="form.cover_emoji" placeholder="🧸" style="width:80px" />
            </el-form-item>
          </el-form>

          <!-- Cover Color -->
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:8px">封面顏色</div>
          <div class="color-presets">
            <div
              v-for="preset in colorPresets"
              :key="preset.value"
              class="color-swatch"
              :style="{ background: preset.value }"
              :class="{ selected: form.cover_color === preset.value }"
              :title="preset.label"
              @click="form.cover_color = preset.value"
            ></div>
          </div>

          <!-- Preview -->
          <div class="cover-preview" :style="{ background: form.cover_color }">
            <span style="font-size:40px">{{ form.cover_emoji }}</span>
          </div>
        </el-card>

        <!-- Tags -->
        <el-card>
          <template #header><span style="font-weight:600">標籤</span></template>
          <el-input
            v-model="tagsInput"
            placeholder="保養教學, 清洗, 新手必看"
          />
          <div class="field-hint">用逗號分隔多個標籤</div>
          <div class="tag-preview" v-if="parsedTags.length">
            <el-tag
              v-for="tag in parsedTags"
              :key="tag"
              size="small"
              type="info"
              style="margin:3px"
            >{{ tag }}</el-tag>
          </div>
        </el-card>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from 'lucide-vue-next'
import { QuillEditor } from '@vueup/vue-quill'
import { supabaseAdmin as supabase } from '@/lib/supabase'

const route  = useRoute()
const router = useRouter()

const isNew   = computed(() => !route.params.id || route.params.id === 'new')
const loading = ref(false)
const saving  = ref(false)

const form = ref({
  title:       '',
  slug:        '',
  excerpt:     '',
  content:     '',
  cover_emoji: '🧸',
  cover_color: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
  published:   false,
  tags:        [],
})

const tagsInput = ref('')
const parsedTags = computed(() =>
  tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
)

// Quill toolbar config
const toolbar = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image', 'video'],
  ['blockquote', 'code-block'],
  ['clean'],
]

// ── Image upload handler ──────────────────────────────────────────────────
const uploading = ref(false)

function onEditorReady(quill) {
  quill.getModule('toolbar').addHandler('image', () => imageHandler(quill))
}

function imageHandler(quill) {
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/*')
  input.click()

  input.onchange = async () => {
    const file = input.files[0]
    if (!file) return

    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      ElMessage.warning('圖片大小不能超過 5 MB')
      return
    }

    uploading.value = true
    try {
      const ext      = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('journal-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (upErr) throw upErr

      const { data } = supabase.storage
        .from('journal-images')
        .getPublicUrl(fileName)

      const range = quill.getSelection(true)
      quill.insertEmbed(range.index, 'image', data.publicUrl)
      quill.setSelection(range.index + 1)
    } catch (e) {
      ElMessage.error(`圖片上傳失敗：${e.message}`)
    } finally {
      uploading.value = false
    }
  }
}

const colorPresets = [
  { label: '粉玫瑰', value: 'linear-gradient(135deg,#fce7f3,#fbcfe8)' },
  { label: '奶油黃', value: 'linear-gradient(135deg,#fef3c7,#fde68a)' },
  { label: '天空藍', value: 'linear-gradient(135deg,#dbeafe,#bfdbfe)' },
  { label: '薰衣草', value: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' },
  { label: '薄荷綠', value: 'linear-gradient(135deg,#f0fdf4,#bbf7d0)' },
  { label: '珊瑚橘', value: 'linear-gradient(135deg,#ffedd5,#fed7aa)' },
  { label: '銀灰', value: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)' },
]

// Load post for editing
onMounted(async () => {
  if (!isNew.value) {
    loading.value = true
    const { data } = await supabase
      .from('journal_posts')
      .select('*')
      .eq('id', route.params.id)
      .single()
    if (data) {
      form.value    = { ...data }
      tagsInput.value = (data.tags || []).join(', ')
    }
    loading.value = false
  } else {
    form.value.slug = `post-${Date.now()}`
  }
})

// Auto-fill slug on title change (first time only)
let slugTouched = false
function onTitleInput() {
  if (!slugTouched || isNew.value) autoSlug()
}
function autoSlug() {
  const base = form.value.title.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  form.value.slug = base || `post-${Date.now()}`
  slugTouched = true
}
watch(() => form.value.slug, () => { slugTouched = true })

// Save
async function save() {
  if (!form.value.title.trim()) {
    ElMessage.warning('請填寫文章標題')
    return
  }
  if (!form.value.slug.trim()) {
    ElMessage.warning('請填寫 Slug')
    return
  }

  saving.value = true

  const payload = {
    title:       form.value.title.trim(),
    slug:        form.value.slug.trim(),
    excerpt:     form.value.excerpt.trim() || null,
    content:     form.value.content,
    cover_emoji: form.value.cover_emoji || '🧸',
    cover_color: form.value.cover_color,
    published:   form.value.published,
    tags:        parsedTags.value,
    updated_at:  new Date().toISOString(),
  }

  let error
  if (isNew.value) {
    ;({ error } = await supabase.from('journal_posts').insert(payload))
  } else {
    ;({ error } = await supabase.from('journal_posts').update(payload).eq('id', route.params.id))
  }

  saving.value = false

  if (error) {
    ElMessage.error(`儲存失敗：${error.message}`)
  } else {
    ElMessage.success('文章已儲存 ✅')
    router.push('/journal')
  }
}
</script>

<style scoped>
.form-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  align-items: flex-start;
}
.form-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 80px;
}

.field-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.side-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

/* Color swatches */
.color-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s, border-color 0.15s;
}
.color-swatch:hover   { transform: scale(1.12); }
.color-swatch.selected {
  border-color: var(--color-primary);
  transform: scale(1.1);
  box-shadow: 0 0 0 2px rgba(99,102,241,0.25);
}

.cover-preview {
  height: 80px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
}

.tag-preview {
  margin-top: 8px;
}

/* Quill overrides inside scoped — must use :deep */
:deep(.ql-container) {
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 15px;
}
:deep(.ql-toolbar) {
  border-radius: 8px 8px 0 0;
  border-color: var(--color-border);
}
:deep(.ql-container) {
  border-radius: 0 0 8px 8px;
  border-color: var(--color-border);
}
:deep(.ql-editor) {
  min-height: 400px;
  line-height: 1.8;
}
:deep(.ql-editor h2) { font-size: 20px; font-weight: 800; margin: 24px 0 12px; }
:deep(.ql-editor h3) { font-size: 16px; font-weight: 700; margin: 18px 0 8px; }
:deep(.ql-editor p)  { margin-bottom: 12px; }
:deep(.ql-editor img) { max-width: 100%; border-radius: 8px; margin: 8px 0; }
:deep(.ql-editor .ql-video) { width: 100%; aspect-ratio: 16/9; border-radius: 8px; margin: 8px 0; }
</style>

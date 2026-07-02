<template>
  <div class="journal-page">
    <div class="journal-hero">
      <h1 class="hero-title">JelloJam 日記 📖</h1>
      <p class="hero-sub">關於 Jellycat 的選購指南、保養知識與品牌故事</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <div class="loading-spinner"></div>
    </div>

    <!-- Posts grid -->
    <div v-else-if="posts.length" class="posts-grid">
      <article
        v-for="post in posts"
        :key="post.id"
        class="post-card"
        @click="$router.push(`/store/journal/${post.slug}`)"
      >
        <div class="post-cover" :style="{ background: post.cover_color }">
          <span class="post-emoji">{{ post.cover_emoji }}</span>
        </div>
        <div class="post-body">
          <div class="post-tags">
            <span v-for="tag in (post.tags || [])" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <h2 class="post-title">{{ post.title }}</h2>
          <p class="post-excerpt">{{ post.excerpt }}</p>
          <div class="post-footer">
            <span class="post-date">{{ formatDate(post.created_at) }}</span>
            <span class="read-more">閱讀全文 →</span>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <div class="empty-emoji">📭</div>
      <p>目前尚無文章，敬請期待</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import dayjs from 'dayjs'

const posts   = ref([])
const loading = ref(true)

onMounted(async () => {
  const { data } = await supabase
    .from('journal_posts')
    .select('id, slug, title, excerpt, cover_emoji, cover_color, tags, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
  posts.value   = data || []
  loading.value = false
})

const formatDate = (ts) => dayjs(ts).format('YYYY 年 M 月 D 日')
</script>

<style scoped>
.journal-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 16px 80px;
}

/* ── Hero ── */
.journal-hero {
  text-align: center;
  padding: 56px 20px 44px;
}
.hero-title {
  font-size: 32px;
  font-weight: 900;
  color: var(--jj-text);
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}
.hero-sub {
  font-size: 15px;
  color: var(--jj-text-sub);
  margin: 0;
}

/* ── Loading ── */
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}
.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--jj-border);
  border-top-color: var(--jj-rose);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Grid ── */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* ── Card ── */
.post-card {
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}
.post-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--jj-shadow-lg);
}

.post-cover {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.post-emoji {
  font-size: 72px;
  line-height: 1;
  user-select: none;
}

.post-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  background: var(--jj-rose-light);
  color: var(--jj-rose-dark);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}

.post-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--jj-text);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-excerpt {
  font-size: 13px;
  color: var(--jj-text-sub);
  line-height: 1.7;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--jj-border);
}
.post-date   { font-size: 12px; color: var(--jj-text-sub); }
.read-more   { font-size: 12px; font-weight: 700; color: var(--jj-rose-dark); }

/* ── Empty ── */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--jj-text-sub);
  font-size: 15px;
}
.empty-emoji { font-size: 56px; margin-bottom: 16px; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .posts-grid { grid-template-columns: 1fr; }
  .hero-title { font-size: 24px; }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .posts-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>

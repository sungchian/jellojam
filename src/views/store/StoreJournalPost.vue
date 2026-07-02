<template>
  <div class="post-page">

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <div class="loading-spinner"></div>
    </div>

    <!-- Not found -->
    <div v-else-if="!post" class="not-found">
      <div class="not-found-emoji">😢</div>
      <p>找不到這篇文章</p>
      <button class="back-btn" @click="$router.push('/store/journal')">← 返回日記列表</button>
    </div>

    <!-- Article -->
    <template v-else>
      <!-- Hero -->
      <div class="post-hero" :style="{ background: post.cover_color }">
        <div class="hero-inner">
          <button class="back-link" @click="$router.push('/store/journal')">← JelloJam 日記</button>
          <div class="hero-emoji">{{ post.cover_emoji }}</div>
          <div class="post-tags">
            <span v-for="tag in (post.tags || [])" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <h1 class="post-title">{{ post.title }}</h1>
          <p class="post-meta">{{ formatDate(post.created_at) }} · JelloJam 編輯部</p>
        </div>
      </div>

      <!-- Content -->
      <div class="post-content-wrap">
        <div class="post-excerpt-block">{{ post.excerpt }}</div>
        <div class="post-content" v-html="sanitizedContent"></div>

        <!-- Footer CTA -->
        <div class="post-cta">
          <p class="cta-text">✨ 看完文章，去逛逛 JelloJam 的商品吧！</p>
          <button class="cta-btn" @click="$router.push('/store/catalog')">前往商品目錄</button>
        </div>

        <!-- Other posts -->
        <div v-if="otherPosts.length" class="other-posts">
          <h3 class="other-title">更多文章</h3>
          <div class="other-grid">
            <div
              v-for="p in otherPosts"
              :key="p.id"
              class="other-card"
              @click="$router.push(`/store/journal/${p.slug}`)"
            >
              <div class="other-cover" :style="{ background: p.cover_color }">
                <span>{{ p.cover_emoji }}</span>
              </div>
              <div class="other-info">
                <p class="other-post-title">{{ p.title }}</p>
                <span class="other-date">{{ formatDate(p.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import DOMPurify from 'dompurify'
import dayjs from 'dayjs'

const route     = useRoute()
const post      = ref(null)
const otherPosts = ref([])
const loading   = ref(true)
let isMounted   = true
onUnmounted(() => { isMounted = false })

async function loadPost(slug) {
  loading.value = true
  post.value    = null

  const [postRes, othersRes] = await Promise.all([
    supabase.from('journal_posts').select('*').eq('slug', slug).eq('published', true).single(),
    supabase.from('journal_posts')
      .select('id, slug, title, cover_emoji, cover_color, created_at')
      .eq('published', true)
      .neq('slug', slug)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  if (!isMounted) return
  post.value       = postRes.data || null
  otherPosts.value = othersRes.data || []
  loading.value    = false
}

watch(() => route.params.slug, (slug) => { if (slug) loadPost(slug) }, { immediate: true })

const sanitizedContent = computed(() =>
  DOMPurify.sanitize(post.value?.content || '', {
    ALLOWED_TAGS: ['h2','h3','p','ul','ol','li','strong','em','a','br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    FORCE_BODY: true,
  })
)

const formatDate = (ts) => dayjs(ts).format('YYYY 年 M 月 D 日')
</script>

<style scoped>
.post-page {
  min-height: 60vh;
}

/* ── Loading ── */
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 100px 0;
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

/* ── Not Found ── */
.not-found {
  text-align: center;
  padding: 100px 20px;
  color: var(--jj-text-sub);
}
.not-found-emoji { font-size: 56px; margin-bottom: 16px; }
.back-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: var(--jj-rose-dark);
  color: white;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* ── Hero ── */
.post-hero {
  padding: 60px 20px 56px;
  text-align: center;
}
.hero-inner {
  max-width: 700px;
  margin: 0 auto;
}
.back-link {
  display: inline-block;
  font-size: 13px;
  color: rgba(0,0,0,0.5);
  background: rgba(255,255,255,0.6);
  border: none;
  border-radius: 999px;
  padding: 5px 14px;
  cursor: pointer;
  margin-bottom: 24px;
  transition: background 0.15s;
}
.back-link:hover { background: rgba(255,255,255,0.85); }

.hero-emoji {
  font-size: 72px;
  line-height: 1;
  margin-bottom: 20px;
}
.post-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
}
.tag {
  background: rgba(255,255,255,0.75);
  color: var(--jj-rose-dark);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}
.post-title {
  font-size: 28px;
  font-weight: 900;
  color: var(--jj-text);
  line-height: 1.35;
  margin: 0 0 12px;
  letter-spacing: -0.3px;
}
.post-meta {
  font-size: 13px;
  color: rgba(0,0,0,0.45);
  margin: 0;
}

/* ── Content ── */
.post-content-wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 20px 80px;
}

.post-excerpt-block {
  font-size: 16px;
  line-height: 1.8;
  color: var(--jj-text-sub);
  border-left: 3px solid var(--jj-rose);
  padding: 4px 0 4px 20px;
  margin-bottom: 40px;
  font-style: italic;
}

/* Article typography */
.post-content :deep(h2) {
  font-size: 20px;
  font-weight: 800;
  color: var(--jj-text);
  margin: 40px 0 14px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--jj-rose-light);
}
.post-content :deep(h3) {
  font-size: 16px;
  font-weight: 700;
  color: var(--jj-text);
  margin: 28px 0 10px;
}
.post-content :deep(p) {
  font-size: 15px;
  line-height: 1.85;
  color: var(--jj-text);
  margin: 0 0 18px;
}
.post-content :deep(ul),
.post-content :deep(ol) {
  padding-left: 24px;
  margin: 0 0 18px;
}
.post-content :deep(li) {
  font-size: 15px;
  line-height: 1.85;
  color: var(--jj-text);
  margin-bottom: 6px;
}
.post-content :deep(strong) {
  font-weight: 700;
  color: var(--jj-rose-dark);
}
.post-content :deep(a) {
  color: var(--jj-rose-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ── CTA ── */
.post-cta {
  margin: 48px 0;
  background: var(--jj-rose-pale);
  border: 1px solid var(--jj-rose-light);
  border-radius: 16px;
  padding: 28px 24px;
  text-align: center;
}
.cta-text {
  font-size: 15px;
  color: var(--jj-text);
  margin: 0 0 16px;
  font-weight: 600;
}
.cta-btn {
  background: var(--jj-rose-dark);
  color: white;
  border: none;
  border-radius: 999px;
  padding: 10px 28px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.cta-btn:hover { background: var(--jj-rose); }

/* ── Other Posts ── */
.other-posts { margin-top: 48px; }
.other-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--jj-text);
  margin: 0 0 16px;
}
.other-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.other-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--jj-border);
  border-radius: 12px;
  cursor: pointer;
  background: var(--jj-white);
  transition: box-shadow 0.15s, transform 0.15s;
}
.other-card:hover {
  box-shadow: var(--jj-shadow);
  transform: translateX(4px);
}
.other-cover {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}
.other-post-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--jj-text);
  margin: 0 0 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.other-date { font-size: 11px; color: var(--jj-text-sub); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .post-title { font-size: 22px; }
  .post-hero  { padding: 40px 16px 36px; }
}
</style>

<template>
  <div class="news-page">

    <!-- ── Hero ── -->
    <section class="news-hero">
      <div class="news-hero-inner">
        <div class="hero-badge">📢 最新消息</div>
        <h1 class="news-hero-title">JelloJam 動態</h1>
        <p class="news-hero-sub">新品到貨、活動公告、店鋪資訊，第一手掌握 🐾</p>
      </div>
    </section>

    <!-- ── Pinned / Featured ── -->
    <section class="featured-section">
      <div class="news-inner">
        <div class="featured-card">
          <div class="featured-left">
            <div class="feat-label">📌 置頂公告</div>
            <h2 class="feat-title">{{ PINNED.title }}</h2>
            <p class="feat-body">{{ PINNED.body }}</p>
            <div class="feat-meta">
              <span class="feat-date">{{ PINNED.date }}</span>
              <span class="feat-tag" :style="{ background: PINNED.tagColor }">{{ PINNED.tag }}</span>
            </div>
          </div>
          <div class="featured-right">
            <div class="feat-emoji-box" :style="{ background: PINNED.bg }">
              {{ PINNED.emoji }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Filter tags ── -->
    <section class="filter-section">
      <div class="news-inner">
        <div class="filter-tags">
          <button
            v-for="tag in TAGS"
            :key="tag"
            class="filter-tag"
            :class="{ active: activeTag === tag }"
            @click="activeTag = tag"
          >{{ tag }}</button>
        </div>
      </div>
    </section>

    <!-- ── News Grid ── -->
    <section class="grid-section">
      <div class="news-inner">
        <div class="news-grid">
          <article
            v-for="item in filteredNews"
            :key="item.id"
            class="news-card"
            :class="`card-${item.type}`"
          >
            <div class="card-emoji-wrap" :style="{ background: item.bg }">
              <span class="card-emoji">{{ item.emoji }}</span>
            </div>
            <div class="card-body">
              <div class="card-meta">
                <span class="card-tag" :style="{ background: item.tagColor, color: item.tagText || '#fff' }">{{ item.tag }}</span>
                <span class="card-date">{{ item.date }}</span>
              </div>
              <h3 class="card-title">{{ item.title }}</h3>
              <p class="card-desc">{{ item.desc }}</p>
            </div>
          </article>
        </div>

        <div v-if="filteredNews.length === 0" class="empty-state">
          <div style="font-size:48px;margin-bottom:12px">🔍</div>
          <p>目前沒有「{{ activeTag }}」類別的消息</p>
        </div>
      </div>
    </section>

    <!-- ── LINE CTA ── -->
    <section class="line-cta">
      <div class="line-cta-inner">
        <div class="line-cta-text">
          <div style="font-size:36px;margin-bottom:8px">💬</div>
          <h3>想第一時間收到消息？</h3>
          <p>加入 JelloJam LINE 官方帳號，新品到貨、限定優惠即時通知你！</p>
        </div>
        <a href="https://line.me/ti/p/~@685evhie" target="_blank" rel="noopener" class="btn-line">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.208 2 11.423c0 4.661 3.671 8.557 8.637 9.285.337.073.795.224.912.514.105.263.069.675.034.94l-.148.89c-.045.268-.209 1.046.916.57 1.125-.476 6.067-3.573 8.277-6.117C22.057 15.174 22 13.327 22 11.423 22 6.208 17.523 2 12 2z"/>
          </svg>
          加入 LINE 官方帳號
        </a>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const activeTag = ref('全部')

const TAGS = ['全部', '新品到貨', '活動', '公告', '店鋪資訊']

const PINNED = {
  title:    '🛍️ 母親節限定活動：購物滿額送驚喜',
  body:     '2026 母親節期間（5/1–5/11），凡購買任何商品滿 NT$1,500 即贈送限定紙袋一只，數量有限送完為止。快來挑選一隻毛茸茸的禮物給媽媽吧！',
  date:     '2026/05/01',
  tag:      '🎉 活動',
  tagColor: '#fbbf24',
  bg:       'linear-gradient(135deg, #fef3c7, #fde68a)',
  emoji:    '🎀',
}

const NEWS = [
  {
    id: 1, type: 'new',
    tag: '✨ 新品', tagColor: '#c97b84', tagText: '#fff',
    date: '2026/05/10',
    title: '新款 Jellycat Bashful 奶油兔到貨！',
    desc: '超人氣 Bashful 系列全新奶油色配色正式上架，尺寸齊全（S/M/L），數量有限，手刀下單！',
    emoji: '🐰', bg: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
  },
  {
    id: 2, type: 'news',
    tag: '📢 公告', tagColor: '#6366f1', tagText: '#fff',
    date: '2026/05/08',
    title: '出貨時間調整通知',
    desc: '因應母親節出貨量增加，5/11–5/13 訂單處理時間預計延長 1–2 個工作天，感謝您的耐心等候。',
    emoji: '📦', bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
  },
  {
    id: 3, type: 'new',
    tag: '✨ 新品', tagColor: '#c97b84', tagText: '#fff',
    date: '2026/05/05',
    title: 'Trader Joe\'s 夏日新品系列上線',
    desc: "來自 Trader Joe's 的夏日限定商品正式登場，包含清爽保養品與可愛零食組合，歡迎選購！",
    emoji: '🛍️', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)',
  },
  {
    id: 4, type: 'event',
    tag: '🎉 活動', tagColor: '#f59e0b', tagText: '#fff',
    date: '2026/05/01',
    title: '母親節活動開跑！購物享好禮',
    desc: '整個五月都是母親節！購買任何娃娃商品滿額即享折扣與限定禮品，詳情請見活動公告。',
    emoji: '🌸', bg: 'linear-gradient(135deg,#f0fdf4,#bbf7d0)',
  },
  {
    id: 5, type: 'store',
    tag: '🏪 店鋪', tagColor: '#10b981', tagText: '#fff',
    date: '2026/04/20',
    title: '全新會員制度正式上線！',
    desc: '期待已久的集點制度正式啟動！每購買一隻娃娃累積 1 點，累積點數解鎖銀牌、金牌、白金會員專屬福利。',
    emoji: '💎', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
  },
  {
    id: 6, type: 'new',
    tag: '✨ 新品', tagColor: '#c97b84', tagText: '#fff',
    date: '2026/04/15',
    title: 'Jellycat Amuseables 趣味系列補貨',
    desc: '超搶手的趣味系列（草莓、酪梨、可頌）全面補貨，這次數量較多，把握機會入手！',
    emoji: '🍓', bg: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
  },
  {
    id: 7, type: 'news',
    tag: '📢 公告', tagColor: '#6366f1', tagText: '#fff',
    date: '2026/04/10',
    title: '包裝升級公告',
    desc: '為了讓每隻娃娃都能安全到達，我們升級了防撞包裝材料，確保娃娃在運送過程中毛茸茸不受傷。',
    emoji: '📬', bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
  },
  {
    id: 8, type: 'store',
    tag: '🏪 店鋪', tagColor: '#10b981', tagText: '#fff',
    date: '2026/03/28',
    title: '春季新款 Jellycat 全面上架',
    desc: '2026 春季新款系列正式登陸 JelloJam！多款全新配色與造型，快來商品頁面看看有沒有你心儀的那隻！',
    emoji: '🌷', bg: 'linear-gradient(135deg,#f0fdf4,#bbf7d0)',
  },
]

const TAG_MAP = {
  '全部': null,
  '新品到貨': 'new',
  '活動': 'event',
  '公告': 'news',
  '店鋪資訊': 'store',
}

const filteredNews = computed(() => {
  const type = TAG_MAP[activeTag.value]
  if (!type) return NEWS
  return NEWS.filter(n => n.type === type)
})
</script>

<style scoped>
.news-page {
  --jj-cream:      #FBF5EE;
  --jj-rose:       #C97B84;
  --jj-rose-dark:  #A0495A;
  --jj-rose-pale:  #FDF3F4;
  --jj-gold:       #C8A26B;
  --jj-text:       #2C1A14;
  --jj-text-sub:   #8C6E62;
  --jj-border:     #E8D5C4;
  --jj-white:      #FFFFFF;
  background: var(--jj-cream);
  font-family: 'Noto Sans TC', 'PingFang TC', system-ui, sans-serif;
}

/* ── Hero ── */
.news-hero {
  background: linear-gradient(135deg, #fce7f3 0%, #fef3c7 100%);
  padding: 64px 24px 56px;
  text-align: center;
  border-bottom: 1px solid var(--jj-border);
}
.news-hero-inner { max-width: 600px; margin: 0 auto; }
.hero-badge {
  display: inline-block;
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(201,123,132,0.3);
  border-radius: 999px;
  padding: 5px 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--jj-rose-dark);
  margin-bottom: 16px;
}
.news-hero-title {
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 900;
  color: var(--jj-text);
  margin: 0 0 12px;
}
.news-hero-sub {
  font-size: 15px;
  color: var(--jj-text-sub);
  line-height: 1.7;
  margin: 0;
}

/* ── Inner wrapper ── */
.news-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ── Featured ── */
.featured-section { padding: 40px 0 0; }
.featured-card {
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 20px;
  padding: 36px 40px;
  display: flex;
  gap: 40px;
  align-items: center;
  box-shadow: 0 4px 24px rgba(160,73,90,0.08);
}
.featured-left { flex: 1; min-width: 0; }
.feat-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--jj-rose-dark);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}
.feat-title {
  font-size: clamp(18px, 2.5vw, 26px);
  font-weight: 800;
  color: var(--jj-text);
  line-height: 1.3;
  margin: 0 0 14px;
}
.feat-body {
  font-size: 14px;
  color: var(--jj-text-sub);
  line-height: 1.8;
  margin: 0 0 20px;
}
.feat-meta { display: flex; align-items: center; gap: 12px; }
.feat-date { font-size: 12px; color: var(--jj-text-sub); }
.feat-tag {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  padding: 4px 12px;
  border-radius: 999px;
}
.featured-right { flex-shrink: 0; }
.feat-emoji-box {
  width: 120px;
  height: 120px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
}

/* ── Filter tags ── */
.filter-section { padding: 32px 0 8px; }
.filter-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-tag {
  padding: 7px 18px;
  border-radius: 999px;
  border: 1.5px solid var(--jj-border);
  background: var(--jj-white);
  font-size: 13px;
  font-weight: 500;
  color: var(--jj-text-sub);
  cursor: pointer;
  transition: all 0.15s;
}
.filter-tag:hover { border-color: var(--jj-rose); color: var(--jj-rose-dark); }
.filter-tag.active {
  background: var(--jj-rose);
  border-color: var(--jj-rose);
  color: #fff;
  font-weight: 700;
}

/* ── News Grid ── */
.grid-section { padding: 24px 0 64px; }
.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.news-card {
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 18px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}
.news-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(160,73,90,0.12);
}
.card-emoji-wrap {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-emoji { font-size: 52px; }
.card-body  { padding: 20px; flex: 1; }
.card-meta  { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.card-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}
.card-date  { font-size: 11px; color: var(--jj-text-sub); }
.card-title { font-size: 15px; font-weight: 700; color: var(--jj-text); line-height: 1.4; margin: 0 0 8px; }
.card-desc  { font-size: 13px; color: var(--jj-text-sub); line-height: 1.7; margin: 0; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--jj-text-sub);
  font-size: 15px;
}

/* ── LINE CTA ── */
.line-cta {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  padding: 64px 24px;
  border-top: 1px solid #bbf7d0;
}
.line-cta-inner {
  max-width: 540px;
  margin: 0 auto;
  text-align: center;
}
.line-cta-text h3 {
  font-size: 24px;
  font-weight: 800;
  color: #166534;
  margin: 0 0 10px;
}
.line-cta-text p {
  font-size: 14px;
  color: #4b7c5a;
  line-height: 1.7;
  margin: 0 0 24px;
}
.btn-line {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #06c755;
  color: #fff;
  padding: 14px 32px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.1s;
  box-shadow: 0 4px 20px rgba(6,199,85,0.3);
}
.btn-line:hover { opacity: 0.88; transform: translateY(-2px); }

@media (max-width: 640px) {
  .featured-card { flex-direction: column; padding: 24px; gap: 20px; }
  .featured-right { align-self: center; }
  .news-grid { grid-template-columns: 1fr; }
}
</style>

<template>
  <div class="membership-page">

    <!-- ── Hero ── -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-inner">
        <div class="hero-badge">🎀 JelloJam 會員制度</div>
        <h1 class="hero-title">集點換好禮<br><span class="hero-accent">每一隻娃娃都算數</span></h1>
        <p class="hero-sub">加入 JelloJam 會員，每購買一隻娃娃即可累積 1 點，<br>累積點數解鎖專屬優惠與神秘好禮 🎁</p>
        <div class="hero-btns">
          <RouterLink
            :to="member.isLoggedIn ? `/store/member/${member.customer?.id}` : '/store/auth'"
            class="btn-join"
          >
            {{ member.isLoggedIn ? '查看我的點數 →' : '立即加入會員 →' }}
          </RouterLink>
          <a href="#tiers" class="btn-learn">了解等級制度</a>
        </div>
      </div>
      <div class="hero-deco">
        <span class="deco-emoji" style="top:10%;left:8%;font-size:52px;animation-delay:0s">🐰</span>
        <span class="deco-emoji" style="top:60%;left:4%;font-size:36px;animation-delay:0.5s">🌸</span>
        <span class="deco-emoji" style="top:20%;right:6%;font-size:44px;animation-delay:0.3s">🧸</span>
        <span class="deco-emoji" style="top:65%;right:8%;font-size:40px;animation-delay:0.8s">✨</span>
        <span class="deco-emoji" style="top:40%;right:2%;font-size:28px;animation-delay:1.1s">🎀</span>
      </div>
    </section>

    <!-- ── How it works ── -->
    <section class="how-section">
      <div class="section-inner">
        <h2 class="section-title">如何累積點數？</h2>
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-icon">🛍️</div>
            <div class="step-num">Step 1</div>
            <div class="step-title">加入會員</div>
            <p class="step-desc">用 Google 帳號或 Email 快速註冊，完全免費</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-card">
            <div class="step-icon">🐾</div>
            <div class="step-num">Step 2</div>
            <div class="step-title">購買娃娃</div>
            <p class="step-desc">每購買一隻 Jellycat 或 Trader Joe's 娃娃累積 <strong>1 點</strong></p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-card">
            <div class="step-icon">🎁</div>
            <div class="step-num">Step 3</div>
            <div class="step-title">解鎖好禮</div>
            <p class="step-desc">累積足夠點數升級等級，享有專屬折扣與優先購買權</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Tiers ── -->
    <section class="tiers-section" id="tiers">
      <div class="section-inner">
        <h2 class="section-title">會員等級</h2>
        <p class="section-sub">點數越多，等級越高，福利越豐富 ✨</p>

        <div class="tiers-grid">
          <div v-for="tier in TIERS" :key="tier.name" class="tier-card" :style="{ '--tier-color': tier.color, '--tier-bg': tier.bg }">
            <div class="tier-header">
              <span class="tier-emoji">{{ tier.emoji }}</span>
              <div>
                <div class="tier-name">{{ tier.name }}</div>
                <div class="tier-points">{{ tier.pointsLabel }}</div>
              </div>
            </div>
            <ul class="tier-benefits">
              <li v-for="b in tier.benefits" :key="b">
                <span class="benefit-check">✓</span> {{ b }}
              </li>
            </ul>
            <div v-if="tier.highlight" class="tier-highlight">{{ tier.highlight }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Points table ── -->
    <section class="points-section">
      <div class="section-inner">
        <h2 class="section-title">點數計算方式</h2>
        <div class="points-table">
          <div class="pt-head">
            <span>購買品項</span>
            <span>獲得點數</span>
            <span>備註</span>
          </div>
          <div class="pt-row" v-for="item in POINTS_TABLE" :key="item.name">
            <span><span class="pt-emoji">{{ item.emoji }}</span> {{ item.name }}</span>
            <span class="pt-pts">＋ {{ item.pts }} 點</span>
            <span class="pt-note">{{ item.note }}</span>
          </div>
        </div>
        <p class="points-note">＊ 點數於訂單確認後手動更新，如有疑問請透過 LINE 聯絡我們</p>
      </div>
    </section>

    <!-- ── FAQ ── -->
    <section class="faq-section">
      <div class="section-inner">
        <h2 class="section-title">常見問題</h2>
        <div class="faq-list">
          <div v-for="(faq, i) in FAQS" :key="i" class="faq-item" :class="{ open: openFaq === i }" @click="openFaq = openFaq === i ? null : i">
            <div class="faq-q">
              <span>{{ faq.q }}</span>
              <span class="faq-arrow">{{ openFaq === i ? '▲' : '▼' }}</span>
            </div>
            <div class="faq-a" v-show="openFaq === i">{{ faq.a }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA ── -->
    <section class="cta-section">
      <div class="cta-inner">
        <div class="cta-emoji">🐰✨</div>
        <h2 class="cta-title">還不是會員嗎？</h2>
        <p class="cta-sub">現在加入，立刻開始累積點數，讓每一隻娃娃都更有價值</p>
        <RouterLink
          :to="member.isLoggedIn ? `/store/member/${member.customer?.id}` : '/store/auth'"
          class="btn-join cta-btn"
        >
          {{ member.isLoggedIn ? '查看我的會員頁面 →' : '免費加入會員 →' }}
        </RouterLink>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStoreAuthStore } from '@/stores/storeAuth'

const member = useStoreAuthStore()
const openFaq = ref(null)

const TIERS = [
  {
    name: '一般會員',
    emoji: '🤍',
    color: '#94a3b8',
    bg: '#f8fafc',
    pointsLabel: '0 點以上',
    benefits: ['會員專屬早鳥通知', '生日小禮物', '訂單追蹤功能'],
    highlight: null,
  },
  {
    name: '銀牌會員',
    emoji: '🥈',
    color: '#64748b',
    bg: '#f1f5f9',
    pointsLabel: '5 點以上',
    benefits: ['一般會員全部福利', '不定期專屬折扣碼', '新品預購優先通知', '免費防水袋（訂單滿額）'],
    highlight: null,
  },
  {
    name: '金牌會員',
    emoji: '🥇',
    color: '#c8a26b',
    bg: '#fefce8',
    pointsLabel: '15 點以上',
    benefits: ['銀牌會員全部福利', '每筆訂單 95 折優惠', '限定商品優先購買權', '生日驚喜禮包'],
    highlight: '⭐ 最受歡迎等級',
  },
  {
    name: '白金會員',
    emoji: '💎',
    color: '#6366f1',
    bg: '#f5f3ff',
    pointsLabel: '30 點以上',
    benefits: ['金牌會員全部福利', '每筆訂單 9 折優惠', '客製化娃娃優先預約', '每季神秘禮盒（免費）', '專屬客服優先回覆'],
    highlight: '👑 頂級會員福利',
  },
]

const POINTS_TABLE = [
  { emoji: '🐰', name: 'Jellycat 娃娃（任何尺寸）', pts: 1, note: '每隻計算，不論尺寸' },
  { emoji: '🛍️', name: 'Trader Joe\'s 娃娃', pts: 1, note: '每隻計算' },
  { emoji: '🎁', name: '加購禮品包裝', pts: 0, note: '不計入點數' },
  { emoji: '📦', name: '運費', pts: 0, note: '不計入點數' },
]

const FAQS = [
  { q: '點數有效期限是多久？', a: '點數無期限，只要帳號持續活躍（一年內有任何購買記錄）即可保留。' },
  { q: '如何查看目前的點數？', a: '登入後前往「會員中心」即可查看累積點數與目前等級。' },
  { q: '點數可以直接折抵金額嗎？', a: '目前點數為等級制度用途，達到等級門檻後自動解鎖對應折扣，未來將開放更多點數兌換選項。' },
  { q: '和朋友團購可以合併計點嗎？', a: '點數依照個人帳號計算，若為代購其他人的商品，點數仍歸屬於下單帳號。' },
  { q: '等級降低的情況？', a: '目前等級採累積制度不會降級，讓你安心購物、慢慢累積！' },
]
</script>

<style scoped>
.membership-page {
  --jj-cream:      #FBF5EE;
  --jj-rose:       #C97B84;
  --jj-rose-dark:  #A0495A;
  --jj-rose-pale:  #FDF3F4;
  --jj-gold:       #C8A26B;
  --jj-gold-dark:  #9E7840;
  --jj-plum:       #7B5B8E;
  --jj-text:       #2C1A14;
  --jj-text-sub:   #8C6E62;
  --jj-border:     #E8D5C4;
  --jj-white:      #FFFFFF;
  background: var(--jj-cream);
  font-family: 'Noto Sans TC', 'PingFang TC', system-ui, sans-serif;
}

/* ── Hero ── */
.hero {
  position: relative;
  min-height: 480px;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 40%, #fef3c7 100%);
  z-index: 0;
}
.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 680px;
  margin: 0 auto;
  padding: 80px 24px;
  text-align: center;
}
.hero-badge {
  display: inline-block;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(201,123,132,0.3);
  border-radius: 999px;
  padding: 6px 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--jj-rose-dark);
  margin-bottom: 20px;
  letter-spacing: 0.03em;
}
.hero-title {
  font-size: clamp(32px, 5vw, 52px);
  font-weight: 900;
  color: var(--jj-text);
  line-height: 1.2;
  margin: 0 0 16px;
}
.hero-accent {
  background: linear-gradient(135deg, var(--jj-rose-dark), var(--jj-gold-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub {
  font-size: 16px;
  color: var(--jj-text-sub);
  line-height: 1.7;
  margin: 0 0 32px;
}
.hero-btns {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-join {
  display: inline-block;
  padding: 14px 32px;
  background: linear-gradient(135deg, var(--jj-rose) 0%, var(--jj-rose-dark) 100%);
  color: #fff;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.1s;
  box-shadow: 0 4px 20px rgba(160,73,90,0.3);
}
.btn-join:hover { opacity: 0.88; transform: translateY(-2px); }
.btn-learn {
  display: inline-block;
  padding: 14px 28px;
  background: rgba(255,255,255,0.7);
  color: var(--jj-rose-dark);
  border: 1.5px solid var(--jj-rose);
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
}
.btn-learn:hover { background: rgba(255,255,255,0.9); }

/* Floating emojis */
.hero-deco { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.deco-emoji {
  position: absolute;
  animation: float 4s ease-in-out infinite;
  opacity: 0.85;
}
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-12px) rotate(3deg); }
}

/* ── Sections ── */
.section-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px 24px;
}
.section-title {
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 800;
  color: var(--jj-text);
  text-align: center;
  margin: 0 0 12px;
}
.section-sub {
  text-align: center;
  color: var(--jj-text-sub);
  font-size: 15px;
  margin: 0 0 48px;
}

/* ── How it works ── */
.how-section { background: var(--jj-white); }
.steps-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 48px;
}
.step-card {
  background: var(--jj-cream);
  border-radius: 20px;
  padding: 32px 28px;
  text-align: center;
  width: 220px;
  border: 1px solid var(--jj-border);
}
.step-icon { font-size: 40px; margin-bottom: 12px; }
.step-num  { font-size: 11px; font-weight: 700; color: var(--jj-rose); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
.step-title { font-size: 17px; font-weight: 700; color: var(--jj-text); margin-bottom: 8px; }
.step-desc  { font-size: 13px; color: var(--jj-text-sub); line-height: 1.6; }
.step-arrow { font-size: 24px; color: var(--jj-rose); opacity: 0.5; flex-shrink: 0; }

/* ── Tiers ── */
.tiers-section { background: var(--jj-cream); }
.tiers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
.tier-card {
  background: var(--tier-bg);
  border: 2px solid color-mix(in srgb, var(--tier-color) 25%, transparent);
  border-radius: 20px;
  padding: 28px 24px;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}
.tier-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.1);
}
.tier-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.tier-emoji  { font-size: 36px; }
.tier-name   { font-size: 18px; font-weight: 800; color: var(--jj-text); }
.tier-points { font-size: 12px; color: var(--tier-color); font-weight: 600; margin-top: 2px; }
.tier-benefits {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tier-benefits li { font-size: 13.5px; color: var(--jj-text); display: flex; gap: 8px; align-items: flex-start; }
.benefit-check { color: var(--tier-color); font-weight: 700; flex-shrink: 0; }
.tier-highlight {
  background: var(--tier-color);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 999px;
  text-align: center;
}

/* ── Points table ── */
.points-section { background: var(--jj-white); }
.points-table {
  border: 1px solid var(--jj-border);
  border-radius: 16px;
  overflow: hidden;
  max-width: 700px;
  margin: 40px auto 16px;
}
.pt-head {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr;
  background: linear-gradient(135deg, var(--jj-rose-pale), #fef3c7);
  padding: 14px 20px;
  font-size: 12px;
  font-weight: 700;
  color: var(--jj-text-sub);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.pt-row {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr;
  padding: 16px 20px;
  font-size: 14px;
  color: var(--jj-text);
  border-top: 1px solid var(--jj-border);
  align-items: center;
}
.pt-emoji  { margin-right: 8px; }
.pt-pts    { font-weight: 700; color: var(--jj-rose-dark); }
.pt-note   { font-size: 12px; color: var(--jj-text-sub); }
.points-note { text-align: center; font-size: 12px; color: var(--jj-text-sub); margin-top: 12px; }

/* ── FAQ ── */
.faq-section { background: var(--jj-cream); }
.faq-list {
  max-width: 680px;
  margin: 40px auto 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.faq-item {
  background: var(--jj-white);
  border: 1px solid var(--jj-border);
  border-radius: 14px;
  padding: 18px 22px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.faq-item:hover  { box-shadow: 0 4px 16px rgba(160,73,90,0.1); }
.faq-item.open   { border-color: var(--jj-rose); }
.faq-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--jj-text);
  gap: 12px;
}
.faq-arrow { font-size: 11px; color: var(--jj-rose); flex-shrink: 0; }
.faq-a {
  margin-top: 12px;
  font-size: 14px;
  color: var(--jj-text-sub);
  line-height: 1.7;
  border-top: 1px solid var(--jj-border);
  padding-top: 12px;
}

/* ── CTA ── */
.cta-section {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #fef3c7 100%);
  padding: 80px 24px;
  text-align: center;
}
.cta-inner  { max-width: 540px; margin: 0 auto; }
.cta-emoji  { font-size: 52px; margin-bottom: 16px; }
.cta-title  { font-size: 32px; font-weight: 900; color: var(--jj-text); margin: 0 0 12px; }
.cta-sub    { font-size: 15px; color: var(--jj-text-sub); line-height: 1.7; margin: 0 0 28px; }
.cta-btn    { font-size: 16px; padding: 16px 40px; }

@media (max-width: 640px) {
  .steps-grid { flex-direction: column; align-items: center; }
  .step-arrow { transform: rotate(90deg); }
  .tiers-grid { grid-template-columns: 1fr; }
  .pt-head, .pt-row { grid-template-columns: 1.5fr 1fr 1.2fr; font-size: 12px; padding: 12px 14px; }
}
</style>

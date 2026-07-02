<template>
  <div class="member-page">

    <!-- ── Auth loading ──────────────────────────────────────────────────── -->
    <div v-if="auth.loading" class="auth-loading">
      <div class="spin"></div>
      <p>載入會員資料中…</p>
    </div>

    <!-- ── Not logged in ──────────────────────────────────────────────────── -->
    <div v-else-if="!auth.isLoggedIn" class="not-logged-in">
      <div class="nl-icon">🔐</div>
      <h2 class="nl-title">請先登入</h2>
      <p class="nl-sub">登入後即可查看會員資料、集點與訂單記錄</p>
      <RouterLink to="/store/auth" class="nl-btn">前往登入 →</RouterLink>
    </div>

    <template v-else-if="auth.isLoggedIn">

      <!-- ── Hero ───────────────────────────────────────────────────────── -->
      <div class="hero-card">
        <div class="hero-left">
          <div class="avatar-wrap">
            <img v-if="auth.avatarUrl" :src="auth.avatarUrl" class="avatar-img"
              referrerpolicy="no-referrer" alt="avatar" />
            <div v-else class="avatar-letter">{{ auth.displayName.charAt(0).toUpperCase() }}</div>
            <span v-if="auth.isGoogleAuth" class="google-badge">
              <svg viewBox="0 0 24 24" width="13" height="13">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
          </div>
          <div class="hero-info">
            <h2 class="hero-name">{{ auth.displayName }}</h2>
            <p class="hero-email">{{ auth.customer?.email || auth.user?.email || '' }}</p>
            <span class="tier-badge" :style="{ background: auth.tier.color + '22', color: auth.tier.color }">
              {{ auth.tier.label }}
            </span>
          </div>
        </div>
        <div class="hero-stats">
          <div class="stat-card">
            <div class="stat-num highlight">{{ auth.currentPoints }}</div>
            <div class="stat-lbl">可用點數</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ auth.lifetimePoints }}</div>
            <div class="stat-lbl">累積點數</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ orderCount }}</div>
            <div class="stat-lbl">訂單數</div>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout">登出</button>
      </div>

      <!-- ── Email verification banner ──────────────────────────────────── -->
      <div v-if="auth.user && !auth.user.email_confirmed_at" class="verify-banner">
        <span class="vb-icon">✉️</span>
        <div class="vb-body">
          <span class="vb-title">請驗證您的電子郵件</span>
          <span class="vb-sub">驗證後可解鎖完整會員功能</span>
        </div>
        <button class="vb-btn" @click="resendVerification" :disabled="verifyBtnCooldown > 0">
          {{ verifyBtnCooldown > 0 ? `${verifyBtnCooldown}s` : '重新寄送' }}
        </button>
      </div>

      <!-- Tier progress -->
      <div class="progress-card">
        <div class="progress-top">
          <span class="progress-tier" :style="{ color: auth.tier.color }">{{ auth.tier.label }}</span>
          <span v-if="nextTierInfo" class="progress-hint">
            再 <b>{{ nextTierInfo.need }}</b> 點升級 {{ nextTierInfo.label }} {{ nextTierInfo.emoji }}
          </span>
          <span v-else class="progress-max">🏆 已達最高等級</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: tierPct + '%', background: auth.tier.color }"></div>
        </div>
        <div class="progress-milestones">
          <span v-for="t in TIERS" :key="t.key" class="milestone"
            :class="{ reached: auth.lifetimePoints >= t.minPts }"
            :style="auth.lifetimePoints >= t.minPts ? { color: t.color } : {}">
            {{ t.minPts }}pt
          </span>
        </div>
      </div>

      <!-- ── Tabs ───────────────────────────────────────────────────────── -->
      <div class="tabs">
        <button v-for="tab in TABS" :key="tab.key" class="tab"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)">
          <span class="tab-icon">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      <!-- ════════════════ TAB: 訂單 ═════════════════════════════════════ -->
      <div v-if="activeTab === 'orders'" class="tab-body">
        <div v-if="ordersLoading" class="loading">
          <div class="spin"></div> 載入中…
        </div>
        <div v-else-if="orders.length === 0" class="empty-state">
          <div class="empty-icon">📦</div>
          <p>目前沒有訂單記錄</p>
          <RouterLink to="/store/catalog" class="go-shop-btn">去逛逛 →</RouterLink>
        </div>
        <div v-else class="orders-list">
          <div v-for="order in orders" :key="order.id" class="order-card"
            :class="{ expanded: expandedOrder === order.id }">
            <div class="order-head" @click="toggleOrder(order.id)">
              <div class="order-head-left">
                <span class="order-no"># {{ order.order_no }}</span>
                <span class="order-status" :class="statusCls(order.status)">{{ order.status }}</span>
              </div>
              <div class="order-head-right">
                <span class="order-date">{{ order.sales_date }}</span>
                <span class="order-total" v-if="order.payment_amount">
                  NT$ {{ Number(order.payment_amount).toLocaleString() }}
                </span>
                <span class="expand-icon">{{ expandedOrder === order.id ? '▲' : '▼' }}</span>
              </div>
            </div>
            <div v-if="expandedOrder === order.id" class="order-body">

              <!-- ── Status Timeline ── -->
              <div class="order-timeline">
                <div
                  v-for="(step, i) in ORDER_STEPS"
                  :key="step.key"
                  class="tl-step"
                  :class="{
                    'tl-done':    isStepDone(order.status, step.key),
                    'tl-active':  isStepActive(order.status, step.key),
                    'tl-cancelled': order.status === '已取消',
                  }"
                >
                  <div class="tl-dot">
                    <span class="tl-icon">
                      {{ order.status === '已取消' && i === 0 ? '✕' : (isStepDone(order.status, step.key) ? '✓' : step.icon) }}
                    </span>
                  </div>
                  <div v-if="i < ORDER_STEPS.length - 1" class="tl-line"
                    :class="{ 'tl-line-done': isStepDone(order.status, ORDER_STEPS[i + 1].key) }" />
                  <div class="tl-label">{{ step.label }}</div>
                </div>
              </div>

              <!-- ── Items ── -->
              <div v-if="order.order_items?.length" class="order-items-list">
                <div v-for="item in order.order_items" :key="item.id" class="order-item-row">
                  <span class="oi-emoji">🧸</span>
                  <span class="oi-name">{{ item.product_name }}</span>
                  <span class="oi-qty">× {{ item.qty }}</span>
                  <span class="oi-price">NT$ {{ Number(item.selling_price).toLocaleString() }}</span>
                </div>
              </div>

              <!-- ── Details ── -->
              <div class="order-detail-row" v-if="order.logistics_name">
                <span class="od-label">取貨門市</span>
                <span>{{ order.logistics_name }}</span>
              </div>
              <div class="order-detail-row" v-if="order.tracking_no">
                <span class="od-label">物流單號</span>
                <span class="tracking-no">{{ order.tracking_no }}</span>
              </div>
              <div class="order-detail-row" v-if="order.note">
                <span class="od-label">備註</span>
                <span>{{ order.note }}</span>
              </div>
              <div class="order-detail-row" v-if="order.addon_amount">
                <span class="od-label">加購合計</span>
                <span>NT$ {{ Number(order.addon_amount).toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════ TAB: 集點 & 兌換 ══════════════════════════════ -->
      <div v-if="activeTab === 'points'" class="tab-body">

        <!-- Points summary -->
        <div class="points-summary">
          <div class="ps-item">
            <div class="ps-num" style="color: var(--jj-rose-dark)">{{ auth.currentPoints }}</div>
            <div class="ps-lbl">可用點數</div>
          </div>
          <div class="ps-divider"></div>
          <div class="ps-item">
            <div class="ps-num">{{ auth.lifetimePoints }}</div>
            <div class="ps-lbl">累積點數（等級依此計算）</div>
          </div>
        </div>

        <!-- Tier cards -->
        <div class="section-title">會員等級說明</div>
        <div class="tier-cards">
          <div v-for="t in TIERS" :key="t.key" class="tier-card"
            :class="{ current: auth.tier.key === t.key }"
            :style="auth.tier.key === t.key ? { borderColor: t.color, background: t.color + '10' } : {}">
            <div class="tc-emoji" :style="{ background: t.color + '30' }">{{ t.emoji }}</div>
            <div class="tc-name" :style="{ color: t.color }">{{ t.label }}</div>
            <div class="tc-pts">累積 {{ t.minPts }}+ 點</div>
            <div class="tc-benefit">{{ t.benefit }}</div>
            <div v-if="auth.tier.key === t.key" class="tc-current">目前等級 ✓</div>
          </div>
        </div>

        <!-- Redemption zone -->
        <div class="section-title" style="margin-top: 28px">
          🎁 點數兌換區
          <span class="pts-balance">可用：{{ auth.currentPoints }} 點</span>
        </div>
        <div class="rewards-grid">
          <div v-for="reward in REWARDS" :key="reward.id" class="reward-card"
            :class="{
              'can-redeem': auth.currentPoints >= reward.points && (!reward.minTier || tierOrder[auth.tier.key] >= tierOrder[reward.minTier]),
              'no-pts': auth.currentPoints < reward.points,
              'locked': reward.minTier && tierOrder[auth.tier.key] < tierOrder[reward.minTier],
            }">
            <div class="reward-emoji">{{ reward.emoji }}</div>
            <div class="reward-info">
              <div class="reward-name">{{ reward.name }}</div>
              <div class="reward-desc">{{ reward.desc }}</div>
              <div v-if="reward.minTier && tierOrder[auth.tier.key] < tierOrder[reward.minTier]"
                class="reward-lock">🔒 需達{{ TIERS.find(t=>t.key===reward.minTier)?.label }}</div>
            </div>
            <div class="reward-right">
              <div class="reward-cost">
                <span class="cost-num">{{ reward.points }}</span>
                <span class="cost-lbl">點</span>
              </div>
              <button class="redeem-btn"
                :disabled="auth.currentPoints < reward.points ||
                  (reward.minTier && tierOrder[auth.tier.key] < tierOrder[reward.minTier]) ||
                  redeemingId === reward.id"
                @click="redeemReward(reward)">
                {{ redeemingId === reward.id ? '處理中…' : '兌換' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Redemption history -->
        <div class="section-title" style="margin-top: 28px">兌換記錄</div>
        <div v-if="redemptions.length === 0" class="empty-inline">尚無兌換記錄</div>
        <div v-else class="redemption-list">
          <div v-for="r in redemptions" :key="r.id" class="redemption-row">
            <span class="r-emoji">🎁</span>
            <div class="r-info">
              <span class="r-name">{{ r.metadata?.reward_name || '兌換品項' }}</span>
              <span class="r-date">{{ formatDate(r.created_at) }}</span>
            </div>
            <span class="r-cost">-{{ r.metadata?.points_cost }} 點</span>
          </div>
        </div>
      </div>

      <!-- ════════════════ TAB: 個人資料 ══════════════════════════════════ -->
      <div v-if="activeTab === 'profile'" class="tab-body">
        <div class="profile-card">
          <div class="profile-section-title">基本資料</div>

          <div class="field-group">
            <label class="field-label">顯示名稱</label>
            <input v-model="profileForm.display_name" class="field-input"
              placeholder="您的顯示名稱" :disabled="profileSaving" />
          </div>

          <div class="field-group">
            <label class="field-label">手機號碼</label>
            <input v-model="profileForm.phone" class="field-input"
              placeholder="09xxxxxxxx" type="tel" inputmode="numeric"
              :disabled="profileSaving"
              @input="profileForm.phone = profileForm.phone.replace(/\D/g, '')" />
            <span v-if="profileForm.phone && !/^09\d{8}$/.test(profileForm.phone)"
              class="field-hint" style="color:#ef4444">
              請輸入 09 開頭的 10 碼手機號碼
            </span>
          </div>

          <div class="field-group">
            <label class="field-label">LINE ID</label>
            <input v-model="profileForm.line_user_id" class="field-input"
              placeholder="您的 LINE ID" :disabled="profileSaving" />
          </div>

          <div class="field-group">
            <label class="field-label">Email</label>
            <input
              v-model="profileForm.email"
              class="field-input"
              :class="{ locked: auth.isOAuth }"
              placeholder="your@email.com"
              type="email"
              :disabled="auth.isOAuth || profileSaving"
            />
            <span v-if="auth.isOAuth" class="field-hint">Email 由 Google 帳號管理，無法修改</span>
            <span v-else-if="profileForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(profileForm.email)"
              class="field-hint" style="color:#ef4444">
              請輸入正確的 Email 格式
            </span>
          </div>

          <Transition name="msg">
            <div v-if="profileMsg" class="profile-msg" :class="profileMsgType">
              {{ profileMsg }}
            </div>
          </Transition>

          <button class="save-btn" @click="saveProfile" :disabled="profileSaving">
            <span v-if="profileSaving" class="spin-sm"></span>
            {{ profileSaving ? '儲存中…' : '儲存變更' }}
          </button>
        </div>

        <!-- Danger: account deactivation note -->
        <div class="danger-note">
          如需刪除帳號，請透過 LINE 官方帳號聯繫我們。
        </div>
      </div>

      <!-- ════════════════ TAB: 安全設定 ══════════════════════════════════ -->
      <div v-if="activeTab === 'security'" class="tab-body">

        <!-- Auth method -->
        <div class="security-block">
          <div class="sb-title">登入方式</div>
          <div class="sb-row">
            <div class="sb-icon">
              <svg v-if="auth.isOAuth" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span v-else>🔑</span>
            </div>
            <div>
              <div class="sb-name">{{ auth.isOAuth ? 'Google 帳號' : '姓名 / LINE ID 登入' }}</div>
              <div class="sb-sub">{{ auth.customer?.email || '傳統登入模式' }}</div>
            </div>
            <span class="sb-tag linked">{{ auth.isOAuth ? '✓ 已連結' : '傳統模式' }}</span>
          </div>
        </div>

        <!-- Sessions -->
        <div class="security-block">
          <div class="sb-title">
            已登入裝置
            <button class="mini-btn" @click="loadSessions">重新整理</button>
          </div>
          <div v-if="sessionsLoading" class="loading-sm">載入中…</div>
          <div v-else-if="sessions.length === 0" class="empty-inline">無裝置記錄</div>
          <div v-else class="sessions-list">
            <div v-for="s in sessions" :key="s.id" class="session-row">
              <span class="s-icon">{{ deviceIcon(s.device_info?.ua) }}</span>
              <div class="s-info">
                <div class="s-ua">{{ formatUA(s.device_info?.ua) }}</div>
                <div class="s-time">{{ formatDate(s.created_at) }}</div>
              </div>
              <div class="s-tz">{{ s.device_info?.tz }}</div>
            </div>
          </div>
        </div>

        <!-- Audit log -->
        <div class="security-block">
          <div class="sb-title">
            帳號操作記錄
            <button class="mini-btn" @click="loadAuditLog">重新整理</button>
          </div>
          <div v-if="auditLoading" class="loading-sm">載入中…</div>
          <div v-else-if="auditLog.length === 0" class="empty-inline">無記錄</div>
          <div v-else class="audit-list">
            <div v-for="e in auditLog" :key="e.id" class="audit-row">
              <span class="audit-icon">{{ auditIcon(e.action) }}</span>
              <div class="audit-info">
                <span>{{ auditLabel(e.action) }}</span>
                <span class="audit-time">{{ formatDate(e.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Danger zone -->
        <div class="danger-zone">
          <div class="dz-title">⚠️ 安全操作</div>
          <div class="dz-row">
            <div>
              <div class="dz-name">登出所有裝置</div>
              <div class="dz-desc">撤銷全部 session，所有裝置需重新登入</div>
            </div>
            <button class="danger-btn" @click="handleLogoutAll" :disabled="logoutAllLoading">
              {{ logoutAllLoading ? '處理中…' : '登出全部' }}
            </button>
          </div>
        </div>

      </div>
    </template>

    <!-- Redeem confirm modal — must be inside the root div to avoid fragment -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="confirmReward" class="modal-backdrop" @click.self="confirmReward = null">
          <div class="modal-card">
            <div class="modal-emoji">{{ confirmReward.emoji }}</div>
            <h3 class="modal-title">確認兌換</h3>
            <p class="modal-desc">
              兌換「<b>{{ confirmReward.name }}</b>」<br>
              將扣除 <b style="color:var(--jj-rose-dark)">{{ confirmReward.points }} 點</b><br>
              兌換後剩餘 <b>{{ auth.currentPoints - confirmReward.points }}</b> 點
            </p>
            <div class="modal-actions">
              <button class="modal-cancel" @click="confirmReward = null">取消</button>
              <button class="modal-confirm" @click="doRedeem">確認兌換</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStoreAuthStore } from '@/stores/storeAuth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/composables/useToast'

const auth   = useStoreAuthStore()
const router = useRouter()
const { show: toast } = useToast()

// ── Constants ─────────────────────────────────────────────────────────────────

const TIERS = [
  { key: 'normal',   label: '一般會員', emoji: '🎀', color: '#9CA3AF', minPts: 0,  benefit: '基本購物集點' },
  { key: 'silver',   label: '銀牌會員', emoji: '🥈', color: '#8B9EB7', minPts: 5,  benefit: '優先到貨通知' },
  { key: 'gold',     label: '金牌會員', emoji: '🥇', color: '#C8A26B', minPts: 15, benefit: '贈品兌換資格' },
  { key: 'platinum', label: '白金會員', emoji: '💎', color: '#7B5B8E', minPts: 30, benefit: '不定期驚喜禮' },
]

const tierOrder = { normal: 0, silver: 1, gold: 2, platinum: 3 }

const REWARDS = [
  { id: 'waterproof_bag',  emoji: '🛍️', name: '防水破壞袋',        desc: '環保材質，可重複使用',         points: 3  },
  { id: 'discount_100',    emoji: '🎟️', name: 'NT$100 折抵券',    desc: '下次購物結帳折抵使用',         points: 8  },
  { id: 'dustbag_m',       emoji: '🧸', name: 'Jellycat 防塵袋（中）', desc: '保護你的毛茸茸好朋友',    points: 12 },
  { id: 'gift_box',        emoji: '🎁', name: '精美禮盒包裝',       desc: '節慶限定精美包裝盒',          points: 15 },
  { id: 'vip_surprise',    emoji: '💎', name: '白金驚喜禮',         desc: '限白金會員，神秘驚喜禮品',    points: 25, minTier: 'platinum' },
]

const TABS = [
  { key: 'orders',   label: '我的訂單',   icon: '📦' },
  { key: 'points',   label: '集點 & 兌換', icon: '⭐' },
  { key: 'profile',  label: '個人資料',   icon: '✏️' },
  { key: 'security', label: '安全設定',   icon: '🔒' },
]

// Order status timeline — keys must match statuses used in orders table
const ORDER_STEPS = [
  { key: '待確認',  label: '待確認',  icon: '📋' },
  { key: '處理中',  label: '備貨中',  icon: '📦' },
  { key: '已出貨',  label: '已出貨',  icon: '🚚' },
  { key: '已完成',  label: '已完成',  icon: '✅' },
]

const STATUS_ORDER = { '待確認': 0, '已填表單': 0, '處理中': 1, '已出貨': 2, '已完成': 3 }

function isStepDone(orderStatus, stepKey) {
  if (orderStatus === '已取消') return false
  const orderIdx = STATUS_ORDER[orderStatus] ?? -1
  const stepIdx  = STATUS_ORDER[stepKey]  ?? 0
  return orderIdx > stepIdx
}

function isStepActive(orderStatus, stepKey) {
  if (orderStatus === '已取消') return stepKey === '待確認'
  const orderIdx = STATUS_ORDER[orderStatus] ?? 0
  const stepIdx  = STATUS_ORDER[stepKey]  ?? 0
  return orderIdx === stepIdx
}

// ── State ─────────────────────────────────────────────────────────────────────

const activeTab    = ref('orders')
const expandedOrder = ref(null)

// Orders
const orders        = ref([])
const ordersLoading = ref(false)
const orderCount    = computed(() => orders.value.length)

// Points / Redemption
const redeemingId   = ref(null)
const confirmReward = ref(null)
const redemptions   = ref([])

// Profile
const profileForm = reactive({ display_name: '', phone: '', line_user_id: '', email: '' })
const profileSaving = ref(false)
const profileMsg    = ref('')
const profileMsgType = ref('success')

// Security
const sessions        = ref([])
const sessionsLoading = ref(false)
const auditLog        = ref([])
const auditLoading    = ref(false)
const logoutAllLoading = ref(false)

// ── Tier progress ─────────────────────────────────────────────────────────────

const nextTierInfo = computed(() => {
  const pts  = Math.max(0, Number(auth.lifetimePoints) || 0)
  const next = TIERS.find(t => t.minPts > pts)
  if (!next) return null
  return { ...next, need: next.minPts - pts }
})

const tierPct = computed(() => {
  const pts  = Math.max(0, Number(auth.lifetimePoints) || 0)
  const cur  = [...TIERS].reverse().find(t => t.minPts <= pts) || TIERS[0]
  const next = TIERS.find(t => t.minPts > pts)
  if (!next) return 100
  return Math.min(100, Math.round(((pts - cur.minPts) / (next.minPts - cur.minPts)) * 100))
})

// ── Data loaders ──────────────────────────────────────────────────────────────

async function loadOrders() {
  if (!auth.customer?.id) return
  ordersLoading.value = true
  try {
    // Step 1: fetch orders for this customer
    const { data: orderRows, error: ordErr } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', auth.customer.id)
      .order('sales_date', { ascending: false })
      .limit(30)

    if (ordErr) {
      console.error('[orders] fetch error, code:', ordErr?.code ?? 'unknown')
      orders.value = []
      return
    }

    const rows = orderRows || []

    if (!rows.length) {
      orders.value = []
      return
    }

    // Step 2: fetch order_items for those orders (avoids PostgREST FK dependency)
    const ids = rows.map(o => o.id)
    const { data: itemRows, error: itemErr } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', ids)

    if (itemErr) console.warn('[order_items] fetch error, code:', itemErr?.code ?? 'unknown')

    const itemsByOrder = {}
    for (const item of itemRows || []) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
      itemsByOrder[item.order_id].push(item)
    }

    orders.value = rows.map(o => ({
      ...o,
      order_items: itemsByOrder[o.id] || [],
    }))
  } catch (e) {
    console.error('[orders] unexpected error, code:', e?.code ?? 'unknown')
    orders.value = []
  } finally {
    ordersLoading.value = false
  }
}

async function loadRedemptions() {
  if (!auth.customer?.id) return
  const { data } = await supabase
    .from('auth_audit_log')
    .select('*')
    .eq('customer_id', auth.customer.id)
    .eq('action', 'redemption')
    .order('created_at', { ascending: false })
    .limit(20)
  redemptions.value = data || []
}

async function loadSessions() {
  sessionsLoading.value = true
  sessions.value = await auth.fetchSessions()
  sessionsLoading.value = false
}

async function loadAuditLog() {
  auditLoading.value = true
  auditLog.value = await auth.fetchAuditLog()
  auditLoading.value = false
}

function fillProfileForm() {
  const c = auth.customer
  if (!c) return
  profileForm.display_name  = c.display_name || ''
  profileForm.phone         = c.phone         || ''
  profileForm.line_user_id  = c.line_user_id  || ''
  profileForm.email         = c.email         || auth.user?.email || ''
}

// ── Actions ───────────────────────────────────────────────────────────────────

function switchTab(key) {
  activeTab.value = key
  if (key === 'security' && sessions.value.length === 0) {
    loadSessions()
    loadAuditLog()
  }
  if (key === 'points') loadRedemptions()
}

function toggleOrder(id) {
  expandedOrder.value = expandedOrder.value === id ? null : id
}

function redeemReward(reward) {
  if (auth.currentPoints < reward.points) return
  if (reward.minTier && tierOrder[auth.tier.key] < tierOrder[reward.minTier]) return
  confirmReward.value = reward
}

async function doRedeem() {
  const reward = confirmReward.value
  if (!reward) return
  confirmReward.value = null
  redeemingId.value   = reward.id

  try {
    if (auth.currentPoints < reward.points) throw new Error('點數不足')

    // Server-authoritative redemption. The customer can no longer write
    // current_points directly (a DB trigger blocks it) — redeem_points()
    // (SECURITY DEFINER) re-checks the balance, deducts, and records the
    // points_transactions row atomically so points can't be self-granted.
    const { error } = await supabase.rpc('redeem_points', {
      p_reward_name: reward.name,
      p_cost:        reward.points,
    })
    if (error) {
      if (/INSUFFICIENT_POINTS/.test(error.message || '')) throw new Error('點數不足')
      throw error
    }

    // Reward-detail audit trail (non-critical)
    try {
      await supabase.from('auth_audit_log').insert({
        customer_id: auth.customer.id,
        user_id:     auth.user?.id ?? null,
        action:      'redemption',
        metadata: {
          reward_id:   reward.id,
          reward_name: reward.name,
          points_cost: reward.points,
        },
      })
    } catch (e) { console.warn('[redeem] audit log failed, code:', e?.code) }

    await auth.refreshCustomer()
    await loadRedemptions()
    toast(`✅ 已成功兌換「${reward.name}」！我們會盡快安排寄送`, 'success')
  } catch (e) {
    toast(e.message || '兌換失敗，請稍後再試', 'error')
  } finally {
    redeemingId.value = null
  }
}

async function saveProfile() {
  profileSaving.value = true
  profileMsg.value    = ''
  try {
    // display_name is required (NOT NULL in DB)
    if (!profileForm.display_name.trim()) {
      profileMsg.value     = '顯示名稱不能為空'
      profileMsgType.value = 'error'
      return
    }

    // Validate phone if provided
    if (profileForm.phone.trim() && !/^09\d{8}$/.test(profileForm.phone.trim())) {
      profileMsg.value     = '手機號碼格式不正確，請輸入 09 開頭的 10 碼'
      profileMsgType.value = 'error'
      return
    }

    // Validate email if provided
    if (!auth.isOAuth && profileForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(profileForm.email.trim())) {
      profileMsg.value     = 'Email 格式不正確'
      profileMsgType.value = 'error'
      return
    }

    // Only include fields that have a value — empty = don't update that field
    const update = {
      display_name: profileForm.display_name.trim(),
    }
    if (profileForm.phone.trim())        update.phone        = profileForm.phone.trim()
    if (profileForm.line_user_id.trim()) update.line_user_id = profileForm.line_user_id.trim()
    if (!auth.isOAuth && profileForm.email.trim()) update.email = profileForm.email.trim()

    const { error } = await supabase
      .from('customers')
      .update(update)
      .eq('id', auth.customer.id)
    if (error) throw error

    await auth.refreshCustomer()
    profileMsg.value    = '✓ 資料已儲存'
    profileMsgType.value = 'success'
    toast('個人資料已更新', 'success')
  } catch (e) {
    console.error('[profile] save failed, code:', e?.code ?? 'unknown')
    profileMsg.value    = '儲存失敗，請稍後再試'
    profileMsgType.value = 'error'
  } finally {
    profileSaving.value = false
    setTimeout(() => { profileMsg.value = '' }, 3000)
  }
}

const verifyBtnCooldown = ref(0)
let verifyCdId = null

async function resendVerification() {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: auth.user?.email,
    })
    if (error) throw error
    toast('驗證信已寄出，請至信箱查看', 'success')
    verifyBtnCooldown.value = 60
    verifyCdId = setInterval(() => {
      verifyBtnCooldown.value--
      if (verifyBtnCooldown.value <= 0) clearInterval(verifyCdId)
    }, 1000)
  } catch (e) {
    toast(e.message || '寄送失敗，請稍後再試', 'error')
  }
}

async function handleLogout() {
  try { await auth.logout('local') } catch {}
  router.replace('/store/auth')
}

async function handleLogoutAll() {
  if (!confirm('確認要登出所有裝置嗎？')) return
  logoutAllLoading.value = true
  try { await auth.logout('global') } catch {}
  router.replace('/store/auth')
}

// ── Formatters ────────────────────────────────────────────────────────────────

function statusCls(s) {
  return {
    'st-pending':    s === '待確認' || s === '已填表單',
    'st-processing': s === '處理中',
    'st-shipped':    s === '已出貨',
    'st-done':       s === '已完成',
    'st-cancelled':  s === '已取消',
  }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('zh-TW', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatUA(ua) {
  if (!ua) return '未知裝置'
  if (/iPhone|iPad/.test(ua))  return 'iOS 裝置'
  if (/Android/.test(ua))      return 'Android 裝置'
  if (/Mac/.test(ua))          return 'macOS'
  if (/Windows/.test(ua))      return 'Windows'
  return '瀏覽器'
}

function deviceIcon(ua) {
  if (!ua) return '🌐'
  if (/iPhone|iPad|Android/.test(ua)) return '📱'
  return '💻'
}

const AUDIT_MAP = {
  login:         { label: '登入成功',     icon: '✅' },
  login_by_name: { label: '姓名登入',     icon: '🔑' },
  login_failed:  { label: '登入失敗',     icon: '❌' },
  logout:        { label: '登出',         icon: '👋' },
  logout_all:    { label: '登出所有裝置', icon: '🔒' },
  redemption:    { label: '點數兌換',     icon: '🎁' },
  banned:        { label: '帳號停用攔截', icon: '⛔' },
}
const auditIcon  = a => (AUDIT_MAP[a] || { icon: '📝' }).icon
const auditLabel = a => (AUDIT_MAP[a] || { label: a }).label

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  if (auth.isLoggedIn) {
    loadOrders()
    fillProfileForm()
  }
})

watch(() => auth.isLoggedIn, val => {
  if (val) { loadOrders(); fillProfileForm() }
})

onUnmounted(() => {
  clearInterval(verifyCdId)
})

watch(() => auth.customer, () => fillProfileForm(), { deep: true })
</script>

<style scoped>
.member-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 16px 80px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Verify banner ─────────────────────────────────────────────────────── */
.verify-banner {
  display: flex; align-items: center; gap: 12px;
  background: #fffbeb; border: 1px solid #fcd34d;
  border-radius: var(--jj-radius); padding: 14px 18px;
}
.vb-icon { font-size: 22px; flex-shrink: 0; }
.vb-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.vb-title { font-size: 13px; font-weight: 700; color: #92400e; }
.vb-sub   { font-size: 11px; color: #b45309; }
.vb-btn {
  flex-shrink: 0; height: 34px; padding: 0 14px;
  background: #f59e0b; color: #fff; border: none;
  border-radius: 999px; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: background .15s; white-space: nowrap;
}
.vb-btn:hover:not(:disabled) { background: #d97706; }
.vb-btn:disabled { opacity: .55; cursor: not-allowed; }

/* ── Auth loading ──────────────────────────────────────────────────────── */
.auth-loading {
  display: flex; flex-direction: column; align-items: center;
  padding: 100px 20px; gap: 16px; color: var(--jj-text-sub); font-size: 14px;
}

/* ── Not logged in ─────────────────────────────────────────────────────── */
.not-logged-in {
  display: flex;flex-direction: column;align-items: center;
  padding: 80px 20px;gap: 14px;text-align: center;
}
.nl-icon { font-size: 64px; opacity:.5; }
.nl-title { font-size: 22px; font-weight: 700; color: var(--jj-text); margin: 0; }
.nl-sub { font-size: 14px; color: var(--jj-text-sub); margin: 0; }
.nl-btn {
  display: inline-block; padding: 12px 32px;
  background: var(--jj-rose-dark); color: #fff;
  border-radius: 999px; font-size: 15px; font-weight: 600;
  text-decoration: none; transition: background .2s;
}
.nl-btn:hover { background: var(--jj-rose); }

/* ── Hero ──────────────────────────────────────────────────────────────── */
.hero-card {
  background: linear-gradient(135deg, var(--jj-rose-dark), #6B2437);
  border-radius: 22px; padding: 28px 32px;
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
}
.hero-left { display: flex; align-items: center; gap: 16px; flex: 1; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar-img { width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,.4); }
.avatar-letter { width: 68px; height: 68px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #fff; border: 3px solid rgba(255,255,255,.3); }
.google-badge { position: absolute; bottom: -2px; right: -2px; background: #fff; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,.15); }
.hero-name { font-size: 20px; font-weight: 800; color: #fff; margin: 0 0 4px; }
.hero-email { font-size: 12px; color: rgba(255,255,255,.65); margin: 0 0 8px; }
.tier-badge { display: inline-block; border-radius: 999px; font-size: 12px; font-weight: 700; padding: 3px 12px; }
.hero-stats { display: flex; gap: 12px; }
.stat-card {
  text-align: center;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 14px;
  padding: 12px 20px;
  min-width: 76px;
  backdrop-filter: blur(4px);
}
.stat-num { font-size: 24px; font-weight: 900; color: #fff; }
.stat-num.highlight { color: #FFE082; }
.stat-lbl { font-size: 11px; color: rgba(255,255,255,.85); margin-top: 3px; }
.logout-btn { background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.35); color: #fff; border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; white-space: nowrap; }
.logout-btn:hover { background: rgba(255,255,255,.3); }

/* ── Progress ──────────────────────────────────────────────────────────── */
.progress-card { background: var(--jj-white); border-radius: var(--jj-radius); box-shadow: var(--jj-shadow); padding: 18px 22px; }
.progress-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; }
.progress-tier { font-weight: 700; }
.progress-hint { color: var(--jj-text-sub); }
.progress-hint b { color: var(--jj-rose-dark); }
.progress-max { color: var(--jj-gold); font-weight: 600; font-size: 13px; }
.progress-bar-track { height: 8px; background: #e9e8db; border-radius: 999px; overflow: hidden; margin-bottom: 8px; }
.progress-bar-fill { height: 100%; border-radius: 999px; transition: width .7s ease; }
.progress-milestones { display: flex; justify-content: space-between; }
.milestone { font-size: 10px; color: var(--jj-text-sub); font-weight: 500; }
.milestone.reached { font-weight: 700; }

/* ── Tabs ──────────────────────────────────────────────────────────────── */
.tabs { display: flex; gap: 2px; border-bottom: 2px solid var(--jj-border); }
.tab { display: flex; align-items: center; gap: 6px; padding: 11px 20px; background: none; border: none; border-bottom: 3px solid transparent; font-size: 14px; font-weight: 600; color: var(--jj-text-sub); cursor: pointer; margin-bottom: -2px; transition: color .15s, border-color .15s; }
.tab-icon { font-size: 15px; }
.tab:hover { color: var(--jj-rose-dark); background: #e9e8db40; border-radius: 8px 8px 0 0; }
.tab.active { color: var(--jj-rose-dark); border-bottom-color: var(--jj-rose-dark); }

.tab-body { display: flex; flex-direction: column; gap: 14px; animation: fadein .2s ease; }
@keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* ── Order Timeline ───────────────────────────────────────────────────── */
.order-timeline {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 18px 8px 14px;
  position: relative;
  gap: 0;
}
.tl-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  gap: 6px;
}
.tl-dot {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: #e9e8db;
  border: 2.5px solid #d5d4c8;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  z-index: 1;
  transition: background .3s, border-color .3s;
}
.tl-icon { font-size: 15px; }
.tl-line {
  position: absolute;
  top: 17px;
  left: calc(50% + 18px);
  right: calc(-50% + 18px);
  height: 2.5px;
  background: #d5d4c8;
  transition: background .3s;
}
.tl-line-done { background: var(--jj-rose); }
.tl-label {
  font-size: 11px;
  color: var(--jj-text-sub);
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
}
/* Done step */
.tl-step.tl-done .tl-dot {
  background: var(--jj-rose-light);
  border-color: var(--jj-rose);
}
.tl-step.tl-done .tl-label { color: var(--jj-rose-dark); font-weight: 600; }
/* Active step */
.tl-step.tl-active .tl-dot {
  background: var(--jj-rose-dark);
  border-color: var(--jj-rose-dark);
  box-shadow: 0 0 0 4px var(--jj-rose-light);
}
.tl-step.tl-active .tl-icon { filter: brightness(10); }
.tl-step.tl-active .tl-label { color: var(--jj-rose-dark); font-weight: 700; }
/* Cancelled */
.tl-step.tl-cancelled .tl-dot {
  background: #fee2e2;
  border-color: #f87171;
}
.tl-step.tl-cancelled .tl-label { color: #b91c1c; }
/* Tracking number */
.tracking-no {
  font-family: monospace;
  font-weight: 700;
  color: var(--jj-rose-dark);
  letter-spacing: .5px;
}

/* ── Orders ────────────────────────────────────────────────────────────── */
.orders-list { display: flex; flex-direction: column; gap: 10px; }
.order-card { background: var(--jj-white); border: 1px solid var(--jj-border); border-radius: 14px; overflow: hidden; }
.order-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; cursor: pointer; transition: background .15s; }
.order-head:hover { background: #e9e8db; }
.order-head-left { display: flex; align-items: center; gap: 10px; }
.order-head-right { display: flex; align-items: center; gap: 12px; }
.order-no { font-size: 13px; font-weight: 700; color: var(--jj-text); font-family: monospace; }
.order-status { font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 999px; }
.st-pending    { background: #fef9c3; color: #854d0e; }
.st-processing { background: #dbeafe; color: #1d4ed8; }
.st-shipped    { background: #d1fae5; color: #065f46; }
.st-done       { background: #f3f4f6; color: #374151; }
.st-cancelled  { background: #fee2e2; color: #b91c1c; }
.order-date { font-size: 12px; color: var(--jj-text-sub); }
.order-total { font-size: 14px; font-weight: 700; color: var(--jj-rose-dark); }
.expand-icon { font-size: 11px; color: var(--jj-text-sub); }
.order-body { padding: 0 18px 16px; border-top: 1px solid var(--jj-border); }
.order-items-list { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; margin-bottom: 10px; }
.order-item-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.oi-emoji { font-size: 18px; flex-shrink: 0; }
.oi-name { flex: 1; color: var(--jj-text); font-weight: 500; }
.oi-qty { color: var(--jj-text-sub); }
.oi-price { font-weight: 600; color: var(--jj-rose-dark); }
.order-detail-row { display: flex; gap: 10px; font-size: 12px; color: var(--jj-text-sub); padding: 4px 0; border-top: 1px dashed var(--jj-border); }
.od-label { font-weight: 600; flex-shrink: 0; width: 70px; }

/* ── Points & Redeem ───────────────────────────────────────────────────── */
.points-summary { background: var(--jj-white); border-radius: var(--jj-radius); box-shadow: var(--jj-shadow); padding: 20px 24px; display: flex; align-items: center; gap: 24px; }
.ps-item { flex: 1; text-align: center; }
.ps-num { font-size: 36px; font-weight: 900; color: var(--jj-text); }
.ps-lbl { font-size: 12px; color: var(--jj-text-sub); margin-top: 4px; }
.ps-divider { width: 1px; height: 60px; background: #e9e8db; }

.section-title { font-size: 14px; font-weight: 700; color: var(--jj-text); display: flex; align-items: center; justify-content: space-between; }
.pts-balance { font-size: 13px; font-weight: 600; color: var(--jj-text-sub); background: #e9e8db; padding: 3px 12px; border-radius: 999px; }

.tier-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.tier-card { background: var(--jj-white); border: 2px solid var(--jj-border); border-radius: 16px; padding: 16px 12px; text-align: center; display: flex; flex-direction: column; gap: 6px; align-items: center; transition: box-shadow .2s; }
.tier-card.current { box-shadow: var(--jj-shadow-lg); }
.tc-emoji { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.tc-name { font-size: 13px; font-weight: 700; }
.tc-pts { font-size: 11px; color: var(--jj-text-sub); }
.tc-benefit { font-size: 11px; color: var(--jj-text); line-height: 1.4; }
.tc-current { font-size: 10px; font-weight: 700; color: #fff; background: var(--jj-sage); border-radius: 999px; padding: 2px 8px; }

.rewards-grid { display: flex; flex-direction: column; gap: 10px; }
.reward-card { background: var(--jj-white); border: 1.5px solid var(--jj-border); border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; transition: border-color .15s, box-shadow .15s; }
.reward-card.can-redeem { border-color: var(--jj-rose-light); }
.reward-card.can-redeem:hover { border-color: var(--jj-rose); box-shadow: var(--jj-shadow); }
.reward-card.no-pts { opacity: .6; }
.reward-card.locked { opacity: .5; }
.reward-emoji { font-size: 32px; flex-shrink: 0; }
.reward-info { flex: 1; }
.reward-name { font-size: 14px; font-weight: 700; color: var(--jj-text); }
.reward-desc { font-size: 12px; color: var(--jj-text-sub); margin-top: 2px; }
.reward-lock { font-size: 11px; color: #f97316; margin-top: 4px; }
.reward-right { display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; }
.reward-cost { text-align: center; }
.cost-num { font-size: 24px; font-weight: 900; color: var(--jj-rose-dark); }
.cost-lbl { font-size: 11px; color: var(--jj-text-sub); margin-left: 2px; }
.redeem-btn { background: var(--jj-rose-dark); color: #fff; border: none; border-radius: 999px; padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; white-space: nowrap; }
.redeem-btn:hover:not(:disabled) { background: var(--jj-rose); }
.redeem-btn:disabled { opacity: .4; cursor: not-allowed; }

.redemption-list { display: flex; flex-direction: column; gap: 8px; }
.redemption-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--jj-white); border-radius: 10px; border: 1px solid var(--jj-border); }
.r-emoji { font-size: 20px; }
.r-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.r-name { font-size: 13px; font-weight: 600; color: var(--jj-text); }
.r-date { font-size: 11px; color: var(--jj-text-sub); }
.r-cost { font-size: 13px; font-weight: 700; color: #ef4444; }

/* ── Profile ───────────────────────────────────────────────────────────── */
.profile-card { background: var(--jj-white); border-radius: var(--jj-radius); box-shadow: var(--jj-shadow); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.profile-section-title { font-size: 14px; font-weight: 700; color: var(--jj-text); padding-bottom: 12px; border-bottom: 1px solid var(--jj-border); }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--jj-text-sub); }
.field-input { height: 44px; border: 1.5px solid var(--jj-border); border-radius: 10px; padding: 0 14px; font-size: 14px; color: var(--jj-text); outline: none; transition: border-color .18s; background: var(--jj-white); }
.field-input:focus { border-color: var(--jj-rose); }
.field-input.locked { background: #e9e8db; color: var(--jj-text-sub); cursor: not-allowed; }
.field-hint { font-size: 11px; color: var(--jj-text-sub); }
.profile-msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; }
.profile-msg.success { background: #d1fae5; color: #065f46; }
.profile-msg.error   { background: #fee2e2; color: #b91c1c; }
.save-btn { height: 46px; background: var(--jj-rose-dark); color: #fff; border: none; border-radius: 999px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background .15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.save-btn:hover:not(:disabled) { background: var(--jj-rose); }
.save-btn:disabled { opacity: .5; cursor: not-allowed; }
.danger-note { font-size: 12px; color: var(--jj-text-sub); text-align: center; padding: 12px; }

/* ── Security ──────────────────────────────────────────────────────────── */
.security-block { background: var(--jj-white); border: 1px solid var(--jj-border); border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.sb-title { font-size: 13px; font-weight: 700; color: var(--jj-text); display: flex; align-items: center; gap: 8px; }
.mini-btn { font-size: 11px; color: var(--jj-text-sub); background: #e9e8db; border: none; border-radius: 6px; padding: 2px 8px; cursor: pointer; margin-left: auto; }
.sb-row { display: flex; align-items: center; gap: 12px; }
.sb-icon { width: 38px; height: 38px; background: #e9e8db; border: 1px solid #d5d4c8; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sb-name { font-size: 14px; font-weight: 600; color: var(--jj-text); }
.sb-sub { font-size: 12px; color: var(--jj-text-sub); }
.sb-tag { margin-left: auto; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px; }
.sb-tag.linked { background: #d1fae5; color: #065f46; }
.sessions-list, .audit-list { display: flex; flex-direction: column; gap: 6px; }
.session-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--jj-border); }
.session-row:last-child { border-bottom: none; }
.s-icon { font-size: 20px; flex-shrink: 0; }
.s-info { flex: 1; }
.s-ua { font-size: 13px; font-weight: 600; color: var(--jj-text); }
.s-time { font-size: 11px; color: var(--jj-text-sub); }
.s-tz { font-size: 11px; color: var(--jj-text-sub); }
.audit-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--jj-border); }
.audit-row:last-child { border-bottom: none; }
.audit-icon { font-size: 16px; }
.audit-info { flex: 1; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--jj-text); }
.audit-time { font-size: 11px; color: var(--jj-text-sub); }
.danger-zone { background: #fff5f5; border: 1px solid #fecaca; border-radius: 14px; padding: 18px 20px; }
.dz-title { font-size: 13px; font-weight: 700; color: #b91c1c; margin-bottom: 14px; }
.dz-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.dz-name { font-size: 14px; font-weight: 600; color: var(--jj-text); }
.dz-desc { font-size: 12px; color: var(--jj-text-sub); margin-top: 2px; }
.danger-btn { background: #fee2e2; color: #b91c1c; border: none; border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.danger-btn:hover:not(:disabled) { background: #fecaca; }
.danger-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── Modal ─────────────────────────────────────────────────────────────── */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card { background: #fff; border-radius: 24px; padding: 32px 28px; max-width: 360px; width: 100%; text-align: center; box-shadow: 0 24px 80px rgba(0,0,0,.2); display: flex; flex-direction: column; gap: 12px; }
.modal-emoji { font-size: 52px; }
.modal-title { font-size: 20px; font-weight: 800; color: var(--jj-text); margin: 0; }
.modal-desc { font-size: 14px; color: var(--jj-text-sub); line-height: 1.8; margin: 0; }
.modal-actions { display: flex; gap: 10px; margin-top: 8px; }
.modal-cancel { flex: 1; height: 44px; background: #e9e8db; border: 1px solid #d5d4c8; border-radius: 999px; font-size: 14px; font-weight: 600; cursor: pointer; }
.modal-confirm { flex: 2; height: 44px; background: var(--jj-rose-dark); color: #fff; border: none; border-radius: 999px; font-size: 14px; font-weight: 700; cursor: pointer; transition: background .15s; }
.modal-confirm:hover { background: var(--jj-rose); }
.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-card, .modal-leave-active .modal-card { transition: transform .2s cubic-bezier(.34,1.56,.64,1); }
.modal-enter-from .modal-card, .modal-leave-to .modal-card { transform: scale(.88); }

/* ── Misc ──────────────────────────────────────────────────────────────── */
.loading { display: flex; align-items: center; gap: 10px; padding: 40px; justify-content: center; color: var(--jj-text-sub); font-size: 14px; }
.loading-sm { font-size: 13px; color: var(--jj-text-sub); }
.empty-state { text-align: center; padding: 60px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-icon { font-size: 48px; opacity: .4; }
.empty-state p { font-size: 14px; color: var(--jj-text-sub); margin: 0; }
.empty-inline { font-size: 13px; color: var(--jj-text-sub); padding: 12px 0; }
.go-shop-btn { color: var(--jj-rose-dark); text-decoration: none; font-weight: 600; font-size: 14px; }
.spin { width: 20px; height: 20px; border: 2.5px solid var(--jj-rose-light); border-top-color: var(--jj-rose); border-radius: 50%; animation: spin .8s linear infinite; }
.spin-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.5); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.msg-enter-active, .msg-leave-active { transition: all .2s; }
.msg-enter-from, .msg-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Responsive ────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .hero-card { flex-direction: column; align-items: flex-start; }
  .hero-stats { width: 100%; justify-content: space-around; }
  .logout-btn { width: 100%; justify-content: center; }
  .tier-cards { grid-template-columns: repeat(2, 1fr); }
  .tab { padding: 10px 10px; font-size: 12px; gap: 4px; }
  .tab-icon { display: none; }
  .ps-num { font-size: 28px; }
  .reward-card { flex-wrap: wrap; }
}
</style>

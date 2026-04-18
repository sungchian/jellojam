<template>
  <div class="main-layout">
    <!-- ═══ Sidebar navigation ═══ -->
    <aside class="sidebar" :class="{ collapsed }">
      <div class="sidebar-brand">
        <span class="brand-icon">🛍️</span>
        <span class="brand-text" v-show="!collapsed">NagouBuy ERP</span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-group" v-for="group in menuGroups" :key="group.label">
          <p class="nav-group-label" v-show="!collapsed">{{ group.label }}</p>
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            <span class="nav-label" v-show="!collapsed">{{ item.label }}</span>
            <span v-if="item.badge && !collapsed" class="nav-badge">{{ item.badge }}</span>
          </RouterLink>
        </div>
      </nav>

      <div class="sidebar-footer" v-show="!collapsed">
        <div class="user-info">
          <div class="user-avatar">{{ auth.user?.name?.charAt(0) }}</div>
          <div class="user-meta">
            <p class="user-name">{{ auth.user?.name }}</p>
            <p class="user-role">{{ auth.roleLabel }}</p>
          </div>
          <el-button text @click="handleLogout" class="logout-btn">
            <el-icon><SwitchButton /></el-icon>
          </el-button>
        </div>
      </div>
    </aside>

    <!-- Main area -->
    <div class="main-area">
      <!-- Header -->
      <header class="app-header">
        <div class="header-left">
          <el-button text @click="collapsed = !collapsed" class="collapse-btn">
            <el-icon size="18"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          </el-button>
          <BreadCrumb />
        </div>
        <div class="header-right">
          <el-badge :value="pendingCount" class="notif-badge">
            <el-button text class="icon-btn"><el-icon size="18"><Bell /></el-icon></el-button>
          </el-badge>
          <div class="header-user">
            <div class="header-avatar">{{ auth.user?.name?.charAt(0) }}</div>
            <span class="header-name">{{ auth.user?.name }}</span>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import BreadCrumb from '@/components/common/BreadCrumb.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const pendingCount = ref(8)

const menuGroups = [
  {
    label: '總覽',
    items: [
      { path: '/dashboard', label: '儀表板', icon: 'Odometer' },
    ]
  },
  {
    label: '商品',
    items: [
      { path: '/products', label: '商品管理', icon: 'ShoppingBag' },
      { path: '/categories', label: '分類管理', icon: 'Grid' },
      { path: '/inventory', label: '庫存管理', icon: 'Box' },
    ]
  },
  {
    label: '訂單與客戶',
    items: [
      { path: '/orders', label: '訂單管理', icon: 'List', badge: pendingCount.value },
      { path: '/customers', label: '客戶管理', icon: 'UserFilled' },
    ]
  },
  {
    label: '財務',
    items: [
      { path: '/finance', label: '財務管理', icon: 'Money' },
    ]
  },
  {
    label: '系統',
    items: [
      { path: '/settings', label: '系統設定', icon: 'Setting' },
    ]
  },
]

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

async function handleLogout() {
  await ElMessageBox.confirm('確定要登出系統嗎？', '登出確認', {
    confirmButtonText: '確定',
    cancelButtonText: '取消',
    type: 'warning',
  })
  auth.logout()
  ElMessage.success('已成功登出')
  router.push('/login')
}
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--color-sidebar);
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease, min-width 0.25s ease;
  overflow: hidden;
  z-index: 100;
}
.sidebar.collapsed { width: 64px; min-width: 64px; }

.sidebar-brand {
  height: var(--header-height);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.brand-icon { font-size: 22px; flex-shrink: 0; }
.brand-text {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  letter-spacing: -0.3px;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 8px;
}
.sidebar-nav::-webkit-scrollbar { width: 0; }

.nav-group { margin-bottom: 4px; }
.nav-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.25);
  padding: 8px 10px 4px;
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: rgba(255,255,255,0.55);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  transition: all 0.18s;
  margin-bottom: 1px;
  white-space: nowrap;
  position: relative;
}
.nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }
.nav-item.active { background: rgba(99,102,241,0.18); color: #a5b4fc; }
.nav-item.active .nav-icon { color: #818cf8; }
.nav-icon { font-size: 16px; flex-shrink: 0; color: rgba(255,255,255,0.4); transition: color 0.18s; }
.nav-label { flex: 1; }
.nav-badge {
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
}

.sidebar-footer {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 12px;
  flex-shrink: 0;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.user-name { font-size: 13px; font-weight: 600; color: #fff; }
.user-role { font-size: 11px; color: rgba(255,255,255,0.4); }
.user-meta { flex: 1; }
.logout-btn { color: rgba(255,255,255,0.35) !important; padding: 4px !important; }
.logout-btn:hover { color: #ef4444 !important; }

/* ── Main area ── */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.app-header {
  height: var(--header-height);
  background: var(--color-header);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  z-index: 50;
}
.header-left { display: flex; align-items: center; gap: 8px; }
.header-right { display: flex; align-items: center; gap: 12px; }
.collapse-btn { padding: 6px !important; color: var(--color-text-secondary) !important; }
.icon-btn { padding: 6px !important; color: var(--color-text-secondary) !important; }
.notif-badge :deep(.el-badge__content) { top: 4px; right: 4px; }
.header-user { display: flex; align-items: center; gap: 8px; }
.header-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.header-name { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Page transitions */
.page-enter-active, .page-leave-active { transition: opacity 0.2s, transform 0.2s; }
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to { opacity: 0; transform: translateY(-4px); }
</style>

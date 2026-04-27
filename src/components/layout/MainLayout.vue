<template>
  <div class="main-layout">
    <!-- ═══ Sidebar ═══ -->
    <aside class="sidebar" :class="{ collapsed }">

      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-logo">
          <span class="brand-logo-icon">J</span>
        </div>
        <div class="brand-text-wrap" v-show="!collapsed">
          <span class="brand-name">JelloJam</span>
          <span class="brand-sub">ERP System</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="sidebar-nav">
        <template v-for="group in menuGroups" :key="group.label">
          <p class="nav-group-label" v-show="!collapsed">{{ group.label }}</p>
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <div class="nav-item-icon-wrap">
              <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            </div>
            <span class="nav-label" v-show="!collapsed">{{ item.label }}</span>
            <span v-if="item.badge && !collapsed" class="nav-badge">{{ item.badge }}</span>
          </RouterLink>
        </template>
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="user-row" v-show="!collapsed">
          <div class="user-avatar">{{ auth.user?.name?.charAt(0) || 'U' }}</div>
          <div class="user-meta">
            <p class="user-name">{{ auth.user?.name }}</p>
            <p class="user-role">{{ auth.roleLabel }}</p>
          </div>
          <button class="logout-btn" @click="handleLogout" title="登出">
            <el-icon><SwitchButton /></el-icon>
          </button>
        </div>
        <button v-if="collapsed" class="logout-btn-collapsed" @click="handleLogout" title="登出">
          <el-icon><SwitchButton /></el-icon>
        </button>
      </div>
    </aside>

    <!-- ═══ Main Area ═══ -->
    <div class="main-area">

      <!-- Header -->
      <header class="app-header">
        <div class="header-left">
          <button class="collapse-btn" @click="collapsed = !collapsed">
            <el-icon size="17"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          </button>
          <div class="breadcrumb-wrap">
            <BreadCrumb />
          </div>
        </div>
        <div class="header-right">
          <el-badge :value="pendingCount || null" :max="99" class="notif-badge">
            <button class="header-icon-btn"><el-icon size="17"><Bell /></el-icon></button>
          </el-badge>
          <div class="header-divider"></div>

          <!-- User dropdown -->
          <el-dropdown trigger="click" placement="bottom-end" @command="handleUserCommand">
            <div class="header-user">
              <div class="header-avatar">{{ auth.user?.name?.charAt(0) || 'U' }}</div>
              <div class="header-user-info">
                <span class="header-user-name">{{ auth.user?.name }}</span>
                <span class="header-user-role">{{ auth.roleLabel }}</span>
              </div>
              <el-icon size="12" style="color:var(--color-text-muted);margin-left:2px"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="user-dropdown-menu">
                <!-- Profile header -->
                <div class="user-dropdown-header">
                  <div class="dropdown-avatar">{{ auth.user?.name?.charAt(0) || 'U' }}</div>
                  <div>
                    <p class="dropdown-name">{{ auth.user?.name }}</p>
                    <p class="dropdown-email">{{ auth.user?.email }}</p>
                    <span class="dropdown-role-badge">{{ auth.roleLabel }}</span>
                  </div>
                </div>
                <el-divider style="margin:6px 0" />

                <!-- Switch user -->
                <p class="dropdown-section-label">切換帳號</p>
                <el-dropdown-item
                  v-for="u in otherUsers"
                  :key="u.id"
                  :command="{ action: 'switch', user: u }"
                  class="switch-user-item"
                >
                  <div class="switch-user-avatar">{{ u.name.charAt(0) }}</div>
                  <div>
                    <p class="switch-user-name">{{ u.name }}</p>
                    <p class="switch-user-role">{{ roleLabels[u.role] }}</p>
                  </div>
                </el-dropdown-item>

                <el-divider style="margin:6px 0" />

                <el-dropdown-item :command="{ action: 'settings' }">
                  <el-icon><Setting /></el-icon> 系統設定
                </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'logout' }" class="logout-menu-item">
                  <el-icon><SwitchButton /></el-icon> 登出
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Page -->
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
import { ref, computed } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useAppDataStore } from '@/stores/appData'
import BreadCrumb from '@/components/common/BreadCrumb.vue'

const auth = useAuthStore()
const store = useAppDataStore()
const route = useRoute()
const router = useRouter()
const collapsed = ref(false)

const roleLabels = { super_admin: '超級管理員', admin: '管理員' }

const USERS = [
  { id: 1, name: 'Kelsey', email: 'kelsey@jellojam.com', role: 'super_admin' },
  { id: 2, name: 'Karina', email: 'karina@jellojam.com', role: 'admin' },
]

const otherUsers = computed(() => USERS.filter(u => u.id !== auth.user?.id))

const pendingCount = computed(() =>
  store.ordersRaw.filter(o => ['台灣待出貨', '已填表單', '在美現貨'].includes(o.status)).length || null
)

async function handleUserCommand({ action, user }) {
  if (action === 'logout') {
    await handleLogout()
  } else if (action === 'switch') {
    await ElMessageBox.confirm(
      `確定要切換到「${user.name}」帳號嗎？`,
      '切換帳號',
      { confirmButtonText: '確定', cancelButtonText: '取消', type: 'info' }
    )
    auth.switchUser(user)
    ElMessage.success(`已切換到 ${user.name}`)
    store.refresh()
  } else if (action === 'settings') {
    router.push('/settings')
  }
}

const menuGroups = [
  {
    label: '總覽',
    items: [{ path: '/dashboard', label: '儀表板', icon: 'Odometer' }],
  },
  {
    label: '商品',
    items: [
      { path: '/products',   label: '商品管理', icon: 'ShoppingBag' },
      { path: '/categories', label: '分類管理', icon: 'Grid' },
      { path: '/inventory',  label: '庫存管理', icon: 'Box' },
    ],
  },
  {
    label: '訂單 & 客戶',
    items: [
      { path: '/orders',    label: '訂單管理', icon: 'List' },
      { path: '/customers', label: '客戶管理', icon: 'UserFilled' },
    ],
  },
  {
    label: '財務',
    items: [{ path: '/finance', label: '財務管理', icon: 'Money' }],
  },
  {
    label: '系統',
    items: [{ path: '/settings', label: '系統設定', icon: 'Setting' }],
  },
]

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

async function handleLogout() {
  await ElMessageBox.confirm('確定要登出系統嗎？', '登出確認', {
    confirmButtonText: '確定', cancelButtonText: '取消', type: 'warning',
  })
  auth.logout()
  ElMessage.success('已成功登出')
  router.push('/login')
}
</script>

<style scoped>
.main-layout { display: flex; height: 100vh; overflow: hidden; background: var(--color-bg); }

/* ══ Sidebar ══════════════════════════════════════════════════════ */
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--color-sidebar);
  display: flex;
  flex-direction: column;
  transition: width 0.28s cubic-bezier(0.4,0,0.2,1),
              min-width 0.28s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
  z-index: 100;
  border-right: 1px solid rgba(255,255,255,0.04);
  position: relative;
}
.sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 200% 50% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%);
  pointer-events: none;
}
.sidebar.collapsed { width: 64px; min-width: 64px; }

/* Brand */
.sidebar-brand {
  height: var(--header-height);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}
.brand-logo {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(99,102,241,0.5);
}
.brand-logo-icon {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  font-family: var(--font-sans);
  line-height: 1;
}
.brand-text-wrap { display: flex; flex-direction: column; overflow: hidden; }
.brand-name {
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  white-space: nowrap;
  letter-spacing: -0.3px;
  line-height: 1.2;
}
.brand-sub {
  font-size: 10px;
  color: rgba(255,255,255,0.30);
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* Nav */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 10px;
  scrollbar-width: none;
}
.sidebar-nav::-webkit-scrollbar { width: 0; }

.nav-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: rgba(255,255,255,0.20);
  padding: 10px 8px 4px;
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  color: rgba(255,255,255,0.45);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.18s ease;
  margin-bottom: 2px;
  white-space: nowrap;
  position: relative;
}
.nav-item:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.80);
}
.nav-item.active {
  background: rgba(99,102,241,0.18);
  color: #a5b4fc;
}
.nav-item-icon-wrap {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 0.18s;
}
.nav-item.active .nav-item-icon-wrap {
  background: rgba(99,102,241,0.30);
}
.nav-icon { font-size: 15px; color: inherit; }
.nav-label { flex: 1; font-weight: 500; }
.nav-item.active .nav-label { font-weight: 600; }
.nav-badge {
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  line-height: 1.6;
}

/* Footer */
.sidebar-footer {
  border-top: 1px solid rgba(255,255,255,0.05);
  padding: 12px 10px;
  flex-shrink: 0;
}
.user-row { display: flex; align-items: center; gap: 10px; }
.user-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.user-meta { flex: 1; min-width: 0; }
.user-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 10px; color: rgba(255,255,255,0.30); }
.logout-btn {
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.25);
  display: flex; align-items: center;
  padding: 4px; border-radius: 6px;
  transition: color 0.18s, background 0.18s;
}
.logout-btn:hover { color: #f87171; background: rgba(239,68,68,0.12); }
.logout-btn-collapsed {
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  width: 100%; padding: 6px;
  border-radius: 8px;
  transition: color 0.18s, background 0.18s;
}
.logout-btn-collapsed:hover { color: #f87171; background: rgba(239,68,68,0.12); }

/* ══ Main Area ════════════════════════════════════════════════════ */
.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

/* Header */
.app-header {
  height: var(--header-height);
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
  z-index: 50;
  position: relative;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-right { display: flex; align-items: center; gap: 8px; }

.collapse-btn {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-secondary);
  width: 34px; height: 34px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--transition), color var(--transition);
  flex-shrink: 0;
}
.collapse-btn:hover { background: var(--color-bg); color: var(--color-text-primary); }

.breadcrumb-wrap { display: flex; align-items: center; }

.header-icon-btn {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-secondary);
  width: 36px; height: 36px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--transition), color var(--transition);
}
.header-icon-btn:hover { background: var(--color-bg); color: var(--color-text-primary); }

.header-divider { width: 1px; height: 24px; background: var(--color-border); margin: 0 4px; }

.header-user {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background var(--transition);
}
.header-user:hover { background: var(--color-bg); }
.header-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.header-user-info { display: flex; flex-direction: column; }
.header-user-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); line-height: 1.2; }
.header-user-role { font-size: 10px; color: var(--color-text-muted); }

.notif-badge :deep(.el-badge__content) { top: 2px; right: 2px; font-size: 10px; height: 16px; min-width: 16px; padding: 0 4px; }

/* ── User Dropdown ── */
:deep(.user-dropdown-menu) {
  padding: 8px !important;
  min-width: 240px !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 30px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08) !important;
  border: 1px solid var(--color-border) !important;
}
.user-dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px 8px;
}
.dropdown-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(99,102,241,0.35);
}
.dropdown-name { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
.dropdown-email { font-size: 11px; color: var(--color-text-muted); margin-top: 1px; }
.dropdown-role-badge {
  display: inline-block;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 20px;
  margin-top: 3px;
}
.dropdown-section-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 2px 8px 4px;
}
:deep(.switch-user-item) {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 8px 10px !important;
  border-radius: 10px !important;
}
.switch-user-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #34d399);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.switch-user-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); line-height: 1.2; }
.switch-user-role { font-size: 10px; color: var(--color-text-muted); }
:deep(.logout-menu-item) {
  color: #ef4444 !important;
  border-radius: 10px !important;
}
:deep(.logout-menu-item:hover) { background: #fef2f2 !important; }

/* Page */
.page-content { flex: 1; overflow-y: auto; padding: 28px; }

/* Transitions */
.page-enter-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.page-leave-active { transition: opacity 0.14s ease; }
.page-enter-from   { opacity: 0; transform: translateY(8px); }
.page-leave-to     { opacity: 0; }
</style>

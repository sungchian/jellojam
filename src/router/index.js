import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // ── Public admin login ─────────────────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },

  // ── Admin / ERP (token-protected) ──────────────────────────────────────────
  // Root redirects to /store; ERP staff navigate directly to /dashboard
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/store',
    children: [
      { path: 'dashboard',         name: 'Dashboard',      component: () => import('@/views/dashboard/Dashboard.vue'),        meta: { title: '儀表板' } },
      { path: 'orders',            name: 'Orders',         component: () => import('@/views/orders/OrderList.vue'),           meta: { title: '訂單管理' } },
      { path: 'orders/merge',      name: 'MergeOrders',    component: () => import('@/views/orders/MergeOrders.vue'),          meta: { title: '併單作業' } },
      { path: 'orders/:id',        name: 'OrderDetail',    component: () => import('@/views/orders/OrderDetail.vue'),         meta: { title: '訂單詳情' } },
      { path: 'products',          name: 'Products',       component: () => import('@/views/products/ProductList.vue'),       meta: { title: '商品管理' } },
      { path: 'products/add',      name: 'ProductAdd',     component: () => import('@/views/products/ProductForm.vue'),       meta: { title: '新增商品' } },
      { path: 'products/edit/:id', name: 'ProductEdit',    component: () => import('@/views/products/ProductForm.vue'),       meta: { title: '編輯商品' } },
      { path: 'categories',        name: 'Categories',     component: () => import('@/views/products/Categories.vue'),        meta: { title: '分類管理' } },
      { path: 'inventory',         name: 'Inventory',      component: () => import('@/views/inventory/Inventory.vue'),        meta: { title: '庫存管理' } },
      { path: 'customers',         name: 'Customers',      component: () => import('@/views/customers/CustomerList.vue'),     meta: { title: '客戶管理' } },
      { path: 'customers/:id',     name: 'CustomerDetail', component: () => import('@/views/customers/CustomerDetail.vue'),   meta: { title: '客戶詳情' } },
      { path: 'finance',           name: 'Finance',        component: () => import('@/views/finance/Finance.vue'),            meta: { title: '財務管理' } },
      { path: 'settings',          name: 'Settings',       component: () => import('@/views/settings/Settings.vue'),         meta: { title: '系統設定' } },
      { path: 'journal',           name: 'JournalList',    component: () => import('@/views/journal/JournalList.vue'),        meta: { title: '文章管理' } },
      { path: 'journal/new',       name: 'JournalNew',     component: () => import('@/views/journal/JournalForm.vue'),        meta: { title: '新增文章' } },
      { path: 'journal/:id',       name: 'JournalEdit',    component: () => import('@/views/journal/JournalForm.vue'),        meta: { title: '編輯文章' } },
    ],
  },

  // ── Storefront ─────────────────────────────────────────────────────────────
  {
    path: '/store',
    component: () => import('@/views/store/StoreLayout.vue'),
    children: [
      // Public store pages
      {
        path: '',
        name: 'StoreHome',
        component: () => import('@/views/store/StoreHome.vue'),
        meta: { public: true, store: true, title: '首頁' },
      },
      {
        path: 'catalog',
        name: 'StoreCatalog',
        component: () => import('@/views/store/StoreCatalog.vue'),
        meta: { public: true, store: true, title: '商品目錄' },
      },
      {
        path: 'product/:id',
        name: 'StoreProduct',
        component: () => import('@/views/store/StoreProduct.vue'),
        meta: { public: true, store: true, title: '商品詳情' },
      },
      {
        path: 'cart',
        name: 'StoreCart',
        component: () => import('@/views/store/StoreCart.vue'),
        meta: { public: true, store: true, title: '購物車' },
      },
      {
        path: 'checkout',
        name: 'StoreCheckout',
        component: () => import('@/views/store/StoreCheckout.vue'),
        meta: { public: true, store: true, title: '結帳' },
      },

      // Member page — :id is the customer's UUID
      {
        path: 'member/:id',
        name: 'StoreMember',
        component: () => import('@/views/store/StoreMember.vue'),
        meta: { store: true, requireAuth: true, title: '會員中心' },
      },

      // Auth flow pages
      {
        path: 'auth',
        name: 'StoreAuth',
        component: () => import('@/views/store/StoreLogin.vue'),
        meta: { public: true, store: true, title: '登入' },
      },
      {
        path: 'auth/callback',
        name: 'StoreAuthCallback',
        component: () => import('@/views/store/StoreAuthCallback.vue'),
        meta: { public: true, store: true, title: '登入中' },
      },

      // Journal / 日記
      {
        path: 'membership',
        name: 'StoreMembership',
        component: () => import('@/views/store/StoreMembership.vue'),
        meta: { public: true, store: true, title: '會員制度' },
      },
      {
        path: 'news',
        name: 'StoreNews',
        component: () => import('@/views/store/StoreNews.vue'),
        meta: { public: true, store: true, title: '最新消息' },
      },
      {
        path: 'journal',
        name: 'StoreJournal',
        component: () => import('@/views/store/StoreJournal.vue'),
        meta: { public: true, store: true, title: 'JelloJam 日記' },
      },
      {
        path: 'journal/:slug',
        name: 'StoreJournalPost',
        component: () => import('@/views/store/StoreJournalPost.vue'),
        meta: { public: true, store: true, title: '日記文章' },
      },

      // Public order tracking — no auth required
      {
        path: 'order-tracking',
        name: 'StoreOrderTracking',
        component: () => import('@/views/store/StoreOrderTracking.vue'),
        meta: { public: true, store: true, title: '訂單查詢' },
      },

      // Catch-all: redirect any unmatched /store/* back to store home
      {
        path: ':pathMatch(.*)*',
        redirect: '/store',
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes })

// One-shot flag: PKCE params in window.location.search should only be acted on
// during the very first navigation after the OAuth redirect. Hash router never
// clears search params on subsequent navigations, so we must track this ourselves.
let _pkceHandled = false

// ── Navigation guards ──────────────────────────────────────────────────────
router.beforeEach(async (to, _from, next) => {
  // 0. Supabase PKCE OAuth callback — ?code=&state= arrive in search string.
  //    Only act on them once (first navigation after OAuth redirect).
  //    After that, _pkceHandled = true and we skip this block forever.
  // 0a. LINE server-side callback — Edge Function redirects here with ?line_state=
  //     (no customer UUID in URL — exchanged server-side via line_tokens table)
  if (!_pkceHandled && window.location.search.includes('line_state=line_')) {
    _pkceHandled = true
    const sp    = new URLSearchParams(window.location.search)
    const state = sp.get('line_state') ?? ''
    sessionStorage.setItem('line_callback_state', state)
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    return next('/store/auth/callback')
  }

  // 0b. Supabase PKCE OAuth callback — ?code=&state= arrive in search string.
  if (
    !_pkceHandled &&
    window.location.search.includes('code=') &&
    window.location.search.includes('state=') &&
    to.path !== '/store/auth/callback'
  ) {
    _pkceHandled = true
    // The auth code was already stashed synchronously in main.js (jj_pkce_code)
    // before this guard ran; storeAuth.init() exchanges it for a session.
    // Here we just strip it from the URL and route to the callback page.
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    return next('/store/auth/callback')
  }
  _pkceHandled = true  // also mark handled once we pass the check (no params present)

  // 1. ERP admin routes: validate real Supabase JWT (not a fake timestamp)
  if (!to.path.startsWith('/store') && !to.meta.public) {
    const { supabaseERP } = await import('@/lib/supabase')
    const { data: { session } } = await supabaseERP.auth.getSession()
    if (!session) return next('/login')
  }

  // 2. Store routes requiring customer login
  if (to.meta.requireAuth) {
    const { useStoreAuthStore } = await import('@/stores/storeAuth')
    const auth = useStoreAuthStore()

    // Wait for initial session check to complete (poll without Vue watch context)
    if (auth.loading) {
      await new Promise(resolve => {
        const tick = () => auth.loading ? setTimeout(tick, 20) : resolve()
        tick()
      })
    }

    if (!auth.isLoggedIn) {
      return next({ path: '/store/auth', query: { redirect: to.fullPath } })
    }

    // Hard-reject if :id doesn't match the logged-in customer.
    // Redirect instead of 403 to avoid leaking whether a UUID exists.
    // This prevents IDOR: user A visiting /store/member/<user-B-UUID>.
    if (to.params.id && to.params.id !== auth.customer?.id) {
      return next(`/store/member/${auth.customer.id}`)
    }

    // Ensure :id is always present (derive from session, don't trust URL alone)
    if (!to.params.id && auth.customer?.id) {
      return next(`/store/member/${auth.customer.id}`)
    }
  }

  next()
})

export default router

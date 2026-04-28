import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  // ── Public admin login ───────────────────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },

  // ── Admin / ERP (token-protected) ───────────────────────────────────────────
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard',         name: 'Dashboard',      component: () => import('@/views/dashboard/Dashboard.vue'),        meta: { title: '儀表板' } },
      { path: 'orders',            name: 'Orders',         component: () => import('@/views/orders/OrderList.vue'),           meta: { title: '訂單管理' } },
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
    ],
  },

  // ── Storefront (public — no admin token needed) ──────────────────────────────
  {
    path: '/store',
    component: () => import('@/views/store/StoreLayout.vue'),
    children: [
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
      {
        path: 'member',
        name: 'StoreMember',
        component: () => import('@/views/store/StoreMember.vue'),
        meta: { public: true, store: true, title: '會員中心' },
      },
      {
        path: 'member/orders',
        name: 'StoreMemberOrders',
        redirect: '/store/member',
        meta: { public: true, store: true, title: '我的訂單' },
      },
    ],
  },
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to, _from, next) => {
  // Store routes and any other explicitly public routes skip the token check
  if (to.meta.public || to.path.startsWith('/store')) {
    return next()
  }

  const token = localStorage.getItem('jj_token')
  if (!token) return next('/login')

  next()
})

export default router

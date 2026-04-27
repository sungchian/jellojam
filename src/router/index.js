import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard',     name: 'Dashboard',      component: () => import('@/views/dashboard/Dashboard.vue'),        meta: { title: '儀表板' } },
      { path: 'orders',        name: 'Orders',         component: () => import('@/views/orders/OrderList.vue'),           meta: { title: '訂單管理' } },
      { path: 'orders/:id',    name: 'OrderDetail',    component: () => import('@/views/orders/OrderDetail.vue'),         meta: { title: '訂單詳情' } },
      { path: 'products',      name: 'Products',       component: () => import('@/views/products/ProductList.vue'),       meta: { title: '商品管理' } },
      { path: 'products/add',  name: 'ProductAdd',     component: () => import('@/views/products/ProductForm.vue'),       meta: { title: '新增商品' } },
      { path: 'products/edit/:id', name: 'ProductEdit', component: () => import('@/views/products/ProductForm.vue'),     meta: { title: '編輯商品' } },
      { path: 'categories',    name: 'Categories',     component: () => import('@/views/products/Categories.vue'),        meta: { title: '分類管理' } },
      { path: 'inventory',     name: 'Inventory',      component: () => import('@/views/inventory/Inventory.vue'),        meta: { title: '庫存管理' } },
      { path: 'customers',     name: 'Customers',      component: () => import('@/views/customers/CustomerList.vue'),     meta: { title: '客戶管理' } },
      { path: 'customers/:id', name: 'CustomerDetail', component: () => import('@/views/customers/CustomerDetail.vue'),   meta: { title: '客戶詳情' } },
      { path: 'finance',       name: 'Finance',        component: () => import('@/views/finance/Finance.vue'),            meta: { title: '財務管理' } },
      { path: 'settings',      name: 'Settings',       component: () => import('@/views/settings/Settings.vue'),         meta: { title: '系統設定' } },
    ],
  },
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('jj_token')
  if (!to.meta.public && !token) return next('/login')
  next()
})

export default router

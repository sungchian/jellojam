<template>
  <el-breadcrumb separator="/" class="breadcrumb">
    <el-breadcrumb-item :to="{ path: '/dashboard' }">首頁</el-breadcrumb-item>
    <el-breadcrumb-item v-for="(crumb, i) in crumbs" :key="i" :to="crumb.path">
      {{ crumb.title }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const routeMap = {
  '/dashboard': '儀表板',
  '/products': '商品管理',
  '/products/add': '新增商品',
  '/categories': '分類管理',
  '/inventory': '庫存管理',
  '/orders': '訂單管理',
  '/customers': '客戶管理',
  '/finance': '財務管理',
  '/settings': '系統設定',
}

const crumbs = computed(() => {
  const path = route.path
  const parts = path.split('/').filter(Boolean)
  const result = []
  let current = ''
  for (const part of parts) {
    current += '/' + part
    const title = routeMap[current]
    if (title && current !== '/dashboard') {
      result.push({ path: current, title })
    }
  }
  if (route.meta?.title && !result.find(r => r.title === route.meta.title)) {
    result.push({ path: route.path, title: route.meta.title })
  }
  return [...new Map(result.map(r => [r.path, r])).values()]
})
</script>

<style scoped>
.breadcrumb { font-size: 13px; }
:deep(.el-breadcrumb__inner a), :deep(.el-breadcrumb__inner.is-link) {
  color: var(--color-text-secondary);
  font-weight: 400;
}
:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--color-text-primary);
  font-weight: 600;
}
</style>

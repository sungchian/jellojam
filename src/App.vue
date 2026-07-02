<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>

<!-- non-scoped: 最後注入，確保贏過 Element Plus 動態注入的 CSS -->
<style>
/* ═══════════════════════════════════════════════════════════
   操作欄位按鈕 Hover 效果
   目標：表格 col-action 內的 icon/text 按鈕
═══════════════════════════════════════════════════════════ */
.col-action .el-button {
  border-radius: 6px !important;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease !important;
}

/* 預設／Primary text 按鈕 hover → 淡紫背景 + 紫色 */
.col-action .el-button:not(.el-button--danger):hover {
  background: rgba(99, 102, 241, 0.10) !important;
  color: var(--color-primary) !important;
  transform: scale(1.08) !important;
}

/* Danger 按鈕 hover → 淡紅背景 + 紅色 */
.col-action .el-button--danger:hover {
  background: rgba(239, 68, 68, 0.10) !important;
  color: #ef4444 !important;
  transform: scale(1.08) !important;
}
</style>

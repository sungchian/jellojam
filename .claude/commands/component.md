# /component [name]

快速建立一個符合 JelloJam 規範的 Vue 3 SFC 元件。

## 用法
```
/component MyButton
/component store/ProductCard
```

## 規範
- `<script setup>` 語法
- 使用 `var(--jj-*)` CSS 變數（定義在 src/styles/global.css）
- props 用 `defineProps<{...}>()` TypeScript 形式
- emits 用 `defineEmits<{...}>()`
- scoped styles
- 如果是 store 元件，放在 `src/views/store/`；ERP 元件放在 `src/views/` 對應資料夾
- 建立後告知完整路徑

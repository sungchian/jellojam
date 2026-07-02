# /db [query description]

用自然語言查詢 JelloJam Supabase 資料庫。

## 用法
```
/db 最近 7 天的訂單數量
/db 目前庫存低於 5 的商品
/db 白金會員有哪些人
```

## 說明
- 使用 Supabase MCP 直接查詢（唯讀）
- 主要資料表：`orders`, `order_items`, `customers`, `products`, `inventory`
- 輸出格式：表格 + 簡短摘要
- 如果需要寫入操作，會提示去 Supabase Dashboard 執行

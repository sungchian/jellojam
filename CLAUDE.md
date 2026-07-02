# JelloJam ERP — Claude Code Guide

## 專案簡介
JelloJam 北美代購的 ERP 後台 + 電商前台，單一 Vue 3 SPA，同時包含：
- **ERP 後台**（`/dashboard`, `/orders`, `/products` 等）— 員工使用，Supabase Auth JWT
- **購物前台**（`/store/*`）— 客戶使用，Google OAuth + LINE OAuth

## Tech Stack
- **Frontend**: Vue 3 + Vite + Pinia + Vue Router (hash mode)
- **UI**: Element Plus（ERP） + 自訂 CSS（前台，使用 `--jj-*` 變數）
- **Backend**: Supabase（PostgreSQL + Auth + Edge Functions）
- **編輯器**: Quill（日記文章）
- **安全**: DOMPurify（XSS 防護）

## 重要檔案
| 路徑 | 用途 |
|------|------|
| `src/lib/supabase.js` | Supabase client（`supabase` = 前台, `supabaseERP` = 後台） |
| `src/stores/storeAuth.js` | 前台 Auth（Google + LINE + email） |
| `src/stores/auth.js` | ERP Auth（Supabase JWT） |
| `src/router/index.js` | 路由 + auth guards |
| `src/styles/global.css` | 全域 CSS 變數（`--jj-rose`, `--jj-text` 等） |
| `supabase/functions/line-auth/` | LINE OAuth Edge Function（部署為 `super-service`） |
| `.env` | 環境變數（`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_LINE_CHANNEL_ID`） |

## Supabase 主要資料表
- `orders` + `order_items` — 訂單
- `customers` — 客戶（含 `auth_user_id`, `line_oauth_id`）
- `products` + `inventory` — 商品庫存
- `journal_posts` — 日記文章
- `line_tokens` — LINE OAuth 短效 token（5分鐘過期）
- `auth_audit_log` — 登入稽核紀錄
- `store_sessions` — 前台 session 管理

## 安全規則（已修復，勿退回）
- **所有 customer 查詢**必須加 `.eq('customer_id', auth.customer.id)` 或 `.eq('id', auth.customer.id)`
- **v-html** 必須用 `DOMPurify.sanitize()`
- **redirect 參數**必須用 `/^\/(?!\/)/.test(raw)` 驗證
- **console.error** 只印 `e?.code`，不印完整 error 物件
- **loginByName 已刪除**，不要重新加入

## 開發指令
```bash
npm run dev      # 開發伺服器 localhost:3000
npm run build    # 生產 build
supabase functions deploy super-service --project-ref iifhubablhxibpsyeagi
```

## Slash Commands
- `/security` — 資安掃描最近改動的檔案
- `/component [name]` — 建立新 Vue 元件
- `/db [query]` — 用自然語言查 Supabase
- `/pr` — PR 前的完整檢查清單

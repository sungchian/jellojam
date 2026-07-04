# PROJECT_FACTS — JelloJam 已驗證事實表

> **用途**：這是「動手前查事實」的權威來源，取代 CLAUDE.md 裡容易過時的細節。
> **鐵則**：這裡的每一條都附驗證日期。**schema 會變，動手當下仍要再驗一次**（怎麼驗見 [`SUPABASE_ACCESS.md`](SUPABASE_ACCESS.md)）。若你驗證後發現與此檔不符，**先更新此檔再繼續**（見 `.claude/playbook/40-maintenance.md`）。
>
> 最後全面驗證：**2026-07-02**（由 Fable 5 直連生產 DB 確認）

---

## 技術棧（修正過的）
- Vue 3 + Vite + Pinia + **Vue Router `createWebHistory`（history mode，不是 hash mode）**
- UI：Element Plus（ERP 後台） + 自訂 CSS（前台，`--jj-*` 變數，定義於 `src/styles/global.css`）
- 後端：Supabase（PostgreSQL + Auth + Edge Functions），專案 ref `iifhubablhxibpsyeagi`
- 兩個 Supabase client（`src/lib/supabase.js`）：`supabase`=前台顧客、`supabaseERP`(=`supabaseAdmin`)=ERP 後台

## 真實訂單狀態字串（`ORDER_STATUSES`，`src/stores/appData.js`）
**只有這 7 個，用字要一字不差**：
`已填表單`、`在美現貨`、`台灣待出貨`、`已出貨`、`已完成`、`顧客已取消`、`已併單`
- ⚠️ 不存在 `已取消`（正確是 `顧客已取消`）、不存在 `處理中`、不存在 `待確認`。舊碼有這些殘留字串都是 bug。
- 營收/點數/庫存彙總要**排除 `顧客已取消` 與 `已併單`**（`NON_SALE_STATUSES`）。

## 資料表關鍵事實（2026-07-02 全部 RLS 已開啟）
- `products`：**沒有 `price` 欄位**。前台售價 = 歷史 `order_items.selling_price` 的均價（`public_catalog()` RPC 算）。欄位：id, name, jellycat_category, jellycat_category_zh, brand, tj_category, box_label, safe_stock。
- `orders`：有 `customer_id, order_no, status, sales_date, sales_week, payment_amount, addon_amount, "711_fee"(帶引號的欄名), addon_items(jsonb), idempotency_key(uuid), coupon_code, discount_amount, payment_method, payment_status, paid_at, deleted_at, merged_into`。⚠️ **沒有** `selling_price`、`tracking_no`。訂單總額要用 items 現算，不是 `payment_amount`（那是店員對帳後手填、常為 null）。
- `order_items`：id, order_id, product_id, product_name, qty, selling_price, payment_amount, addon_amount。⚠️ 售價是**單價**，總額要 `× qty`。
- `customers`：id, auth_user_id, line_oauth_id, line_user_id, email, display_name, phone, current_points, lifetime_points, is_banned。**191/195 是 LINE-only（無 auth_user_id），只有極少數是 Google/email**。
- `inventory`：有 `current_stock` 欄但**全部是 0（未維護，別用）**；真實庫存 = `opening_qty + Σpurchases.qty − Σ已售 order_items.qty`（排除取消/併單）。
- 其他表：order_status_logs（訂單狀態審計，append-only）、points_transactions、purchases、expenses、coupons（目前空）、staff_accounts、line_tokens、journal_posts。

## 認證與 RLS 現況（重要，勿退回）
- **RLS 已全面啟用**。安全邊界是**資料庫層**，不是 client-side `.eq()` 過濾（舊 CLAUDE.md 那條已過時）。
- 員工 vs 顧客靠 `is_staff()`（比對 `staff_accounts.email` = JWT email 且 active）與 `current_customer_id()`（`customers.auth_user_id = auth.uid()`）。
- **真正能登入 ERP 的員工只有** `kelsey@jellojam.com`、`karina@jellojam.com`（其餘 staff_accounts 列無 Auth 帳號）。
- ⚠️ `jellojam.com` 網域不存在、收不到信 → Supabase 寄信類功能（忘記密碼）無法真正寄出。改密碼走「登入後在系統設定改」或用 service key admin 直接改。
- LINE 登入現在會由 `super-service` edge function **簽發真實 Supabase session**（非舊的 localStorage UUID）。

## 應用層關鍵 RPC（前端呼叫這些，別再直接寫表）
- `create_storefront_order(p_payload jsonb)` — 前台下單。伺服器重算價格/運費/加購/優惠、檢查庫存、冪等。**結帳走這支，不要直接 insert orders**。
- `public_catalog()` — 匿名安全商品目錄（只回商品層級彙總，無 PII）。前台商品頁資料來源。
- `redeem_points(p_reward_name, p_cost)` — 點數兌換（顧客不能直接改 `current_points`，有 `guard_customer_points` trigger 擋）。
- `exchange_line_token(p_state)` — LINE 回呼用 state 換 customer_id + token_hash。
- `merge_orders_transaction(p_primary_id, p_secondary_ids)` — 併單（僅員工）。
- 其他：`redeem_coupon`、`get_order_status_by_no`、`search_products`、`rpc_check_order_fraud`（存在但前端未接）、`encrypt_pii`/`decrypt_pii`。

## Edge Functions（`supabase/functions/`）
- `super-service` — **LINE OAuth（部署後要簽 session）。部署時必須加 `--no-verify-jwt`**（掉了會 `UNAUTHORIZED_NO_AUTH_HEADER`）。
- `send-order-email`、`abandoned-cart-mailer` — 需 `FUNCTION_SECRET`/`CRON_SECRET`，部署也要 `--no-verify-jwt`。
- `create-order`、`payment-webhook`、`issue-invoice` — **scaffold，尚未完成**（金流/電子發票，需 ECPay/綠界商家帳號才能做）。

## 部署指令（已驗證）
```bash
npm run build                       # 生產 build（會跑到，用它驗證前端沒壞）
# edge function（注意 --no-verify-jwt）：
supabase functions deploy super-service --no-verify-jwt --project-ref iifhubablhxibpsyeagi
# 前端：git push 到 origin/main → Vercel 自動部署
```

## 已知未完成 / 待辦（2026-07-02）
- 金流（P0-1）、電子發票（P0-2）：只有 scaffold，需商家帳號。
- 207/339 筆歷史訂單 `customer_id` 為空（靠姓名記錄），LINE 顧客會員中心的歷史訂單可能是空的 → 需店員人工連結，**不可用姓名自動猜配（會讓 A 看到 B 的單）**。
- Google 登入 PKCE 修法已寫但**未在真實 Google OAuth 上實測**。
- 本次資安修補的 SQL 在 repo 上一層 `../EMERGENCY_*.sql`、`../FIX_*.sql`（**未納版控**），對應邏輯已套用到線上 DB。完整報告 `../REVIEW_REPORT.md`、`../findings.json`。
  ⚠️ 這些檔在 git repo 之外、未同步，未來**可能已不存在——找不到屬正常，不必當缺失去追**。線上 DB 的實際狀態才是真相，一律用 `SUPABASE_ACCESS.md` 直查為準。

## 驗證紀錄
| 日期 | 驗證者 | 內容 |
|------|--------|------|
| 2026-07-02 | Fable 5 | 直連生產 DB 確認：全表 RLS 開啟、上述 RPC 存在、狀態字串、customer 分布、products 無 price |

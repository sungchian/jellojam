# SUPABASE_ACCESS — 直連生產資料庫的守則與範本

> 這把鑰匙很危險。先讀完「安全鐵則」再用。讀者是 Sonnet/Haiku 等級模型。

## 鑰匙在哪
`jellojam/.env.service`（已被 `.gitignore` 的 `.env.*` 忽略，**確認過不會進版控**）：
- `SUPABASE_SERVICE_ROLE_KEY` — **繞過所有 RLS 的萬能鑰匙**（admin API、無視權限）
- `SUPABASE_DB_URL` — Postgres 連線字串，**含資料庫密碼**

## 🔒 安全鐵則（違反會造成外洩或無法復原）
1. **絕不** 把這兩個值貼進對話、寫進任何會 commit 的檔、或命名成 `VITE_` 開頭（`VITE_` 會被打包進前端 = 公開）。
2. 讀取檔案內容時用 `grep ... | cut`，**不要 `cat .env.service`**（避免 key 出現在輸出/log）。
3. service_role 繞過 RLS：你用它查到的資料，**不代表一般使用者查得到**。要驗「顧客能不能看到 X」必須用 `SET ROLE`（見下方範本），不能用 service_role 直接查。
4. 這是**生產資料庫**，不是測試庫。沒有另一套環境。任何寫入都是動真的。

## 連線範本（複製即用；務必寫檔再跑，別用 `node -e` 內嵌複雜 SQL）
`pg` 套件可能沒裝，先 `npm i pg --no-save`（`--no-save` 才不會污染 package.json）。

**唯讀查詢**（可自主執行）：把查詢寫成 `probe.js`，然後：
```bash
cd jellojam
export DBURL=$(grep "^SUPABASE_DB_URL=" .env.service | cut -d= -f2- | tr -d '\r\n')
export NODE_PATH="$(pwd)/node_modules"
node /path/to/probe.js   # probe.js 內用 new Client({connectionString: process.env.DBURL, ssl:{rejectUnauthorized:false}})
unset DBURL NODE_PATH
```
> ⚠️ 教訓：**不要**用 `node -e "client.query(\`...$fn$...\`)"`——bash 的 dollar-quote 和 `\u` 跳脫會把 SQL 弄壞（這個 session 為此失敗好幾次）。一律「SQL/JS 寫成檔案」。

## 操作分級（按風險決定要不要先問使用者）
| 動作 | 例子 | 規則 |
|------|------|------|
| 🟢 讀 | `SELECT`、`information_schema`、`pg_policies`、`pg_class` | **可自主**。查完更新 `PROJECT_FACTS.md` 若有出入。 |
| 🟡 改少量資料 | 修一筆訂單、補一個欄位值 | 先 `SELECT` 存下原值（能還原）、範圍用 `WHERE id=` 精確鎖定、**做完立刻驗證**。 |
| 🔴 DDL / 結構 / 批次 | `CREATE/ALTER/DROP`、改 RLS policy、`UPDATE` 無 `WHERE`、跑 migration | **先把 SQL 寫成 `.sql` 檔**（供 review/回溯）；**動 RLS、認證、刪資料、影響 >10 列 → 先問使用者**（見 `20-judgment-rubrics.md`「何時該停下來問」）。 |

## 測試務必用臨時資料 + 測完清理（這個 session 的做法）
要驗證「某流程對真實資料正確」時：**建臨時資料 → 測 → 還原**，不要拿真實使用者的資料做實驗。
範例（驗證某顧客登入後只看得到自己的訂單）：
1. 建臨時 customer + 臨時 order（記下 id）
2. 用 admin API 建臨時 auth user、`generateLink` → 前端 `verifyOtp` 拿 session
3. 用該 session 查 orders → 斷言只看到 1 筆
4. `finally`：刪臨時 order、customer、auth user（**一定要在 finally 清理**）

## 常用查詢片段（貼進 probe.js）
```js
// 查某表真實欄位
`SELECT column_name,data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`
// 查所有 RLS policy
`SELECT tablename,policyname,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename`
// 查某表 RLS 是否開啟
`SELECT relrowsecurity FROM pg_class WHERE relname=$1`
```

## 用 SET ROLE 真正驗證 RLS（強技巧，這個 session 靠它抓到越權）
postgres 連線預設**繞過** RLS，所以要模擬「一般登入使用者」才驗得準：
```js
await c.query('BEGIN')
await c.query("SET LOCAL ROLE authenticated")               // 或 'anon'
await c.query("SELECT set_config('request.jwt.claims',$1,true)",
              [JSON.stringify({ sub: '<某顧客的 auth_user_id>', email:'x@x.com', role:'authenticated' })])
const r = await c.query('SELECT count(*) FROM orders')       // 應只看到該顧客的
await c.query('ROLLBACK')                                    // 還原角色，不留痕跡
```
> 誠實標註：這招需要用 service_role/superuser 連線才能 `SET ROLE`。若 `SET ROLE` 被拒，代表連線權限不足，改用 anon key 走 REST API 實測（`curl -H "apikey: <ANON>" .../rest/v1/<table>`）。

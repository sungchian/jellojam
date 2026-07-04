# 00 · 快速診斷：這個 harness 最容易翻車的前三名

> 這份是整套 playbook 的地基，其他檔案會引用它。讀者是 Sonnet／Haiku 等級的模型。
> 每一名都基於「2026-07 這個 JelloJam session 實際踩到或觀察到的事」，不是空泛通則。

---

## 🥇 第一名【最漏 token】：主對話自己下場做粗活

**症狀**：主對話直接大量 `Read` 整份檔案、`Grep` 掃全 repo、逐檔 `Edit`、貼長輸出。
每一次讀取的內容都永久佔用主對話 context，20 個檔案讀完，context 就被雜訊塞滿，開始失焦、忘記最初目標。

**為什麼弱模型更嚴重**：Sonnet/Haiku 的有效 context 比我小，塞滿得更快，且塞滿後判斷力下降比我明顯。

**具體修法**（細節見 [`10-orchestration.md`](10-orchestration.md)）：
- 只要一件事需要「讀 3 個以上檔案才能得出結論」或「掃 repo 找東西」→ **派 `Explore` 或 `general-purpose` subagent**，主對話只收「結論 + 檔案:行號」。
- 反例（錯）：主對話連續 `Read` orders 相關 8 個檔案想搞懂結帳流程。
- 正例（對）：派一個 subagent「讀懂結帳流程，回報：進入點檔案:行號、金額如何算、寫哪張表，≤15 行」。
- **判準**：如果你正要送出第 4 個連續的唯讀 `Read`/`Grep`，停手，改派 subagent。

---

## 🥈 第二名【最容易出錯】：憑印象或憑 CLAUDE.md 假設事實，不先驗證

**症狀**：直接相信「文件說的」或「訓練印象」，然後寫出對不上真實環境的程式碼。

**這個 session 抓到的真實案例（全部是文件/印象錯，實際不同）**：
| 你可能以為 | 實際上 | 後果 |
|-----------|--------|------|
| 訂單取消狀態是 `已取消` | 真實是 `顧客已取消` | 前台狀態顏色、進度條全部失效 |
| `products` 表有 `price` 欄 | **沒有**，價格是歷史訂單均價算出來的 | 伺服器驗價 RPC 直接失敗 |
| Vue Router 是 hash mode（舊 CLAUDE.md 這樣寫） | 實際是 `createWebHistory` | PKCE 登入邏輯判斷錯 |
| LINE 函式在 `line-auth/` | 實際目錄是 `super-service/` | 部署指令找不到檔案 |
| `orders` 有 `discount_amount`/`coupon_code` | 線上**當時沒有**（migration 沒套） | 結帳 `PGRST204` 直接失敗 |

**具體修法**：
- 動任何 DB 相關程式前，先用 `.env.service` 連線查真實 schema（見 [`../../SUPABASE_ACCESS.md`](../../SUPABASE_ACCESS.md)）：
  `information_schema.columns` 查欄位、`grep` 查真實狀態字串，**不要相信 CLAUDE.md 的欄位/字串**。
- CLAUDE.md 用來「知道去哪找」，**不用來當事實依據**。事實一律回原始碼/DB 確認。
- 真實不變的事實已固化在 [`../../PROJECT_FACTS.md`](../../PROJECT_FACTS.md)（含驗證日期）——但仍要在動手當下再驗一次，因為 schema 會變。
- 正例（對）：「要改訂單狀態顯示前，先 `grep 'ORDER_STATUSES' src/stores/appData.js` 拿到 7 個真實字串」。
- 反例（錯）：照 CLAUDE.md 舊安全規則「加 `.eq('customer_id', ...)` 就安全」→ 其實現在靠 RLS，client 過濾早就不是安全邊界了。

---

## 🥉 第三名【最容易失焦＋重試黑洞】：環境操作反覆試錯，沒先確認約束

**症狀**：同一個操作（shell 引號、工具限制、部署旗標）連續失敗好幾次還在硬試，token 燒光、對話失焦。

**這個 session 的真實案例**：
- `node -e "..."` 內嵌複雜 SQL/JSON，被 bash 的 dollar-quote／`\u` 跳脫反覆弄壞（失敗 ≥3 次）。
- 預覽瀏覽器工具在這環境連不到本地 dev server（網路命名空間不同步），試了才發現。
- 重新部署 edge function 掉了 `--no-verify-jwt` 旗標 → LINE 登入壞掉。

**具體修法**：
- **SQL / 多行 JS 一律寫成檔案再執行**，不要用 `node -e "..."` 或 heredoc 內嵌複雜引號。
  正例：把 SQL 寫成 `FIX_xxx.sql`，再用 `node` 讀檔跑（見 `SUPABASE_ACCESS.md` 的範本）。
  反例：`node -e "client.query(\`...$fn$...\`)"` ← 巢狀 dollar-quote 必爆。
- **同一個環境操作連錯 2 次 → 停手，先查約束再換法**，不要試第三次。見 [`20-judgment-rubrics.md`](20-judgment-rubrics.md) 的「方向錯了該換路」。
- **部署／CLI 指令以本專案已驗證的版本為準**（見 `PROJECT_FACTS.md` 的「部署指令」），特別是 `supabase functions deploy ... --no-verify-jwt`。
- Windows 環境：Bash 工具用 POSIX、PowerShell 工具用 PS 語法，不要混（見 `10-orchestration.md` 附錄）。

---

## 一句話總結（貼在腦子裡）
> **粗活外包、事實先驗、錯兩次就換路。** 這三件做到，弱模型的表現會接近強模型。

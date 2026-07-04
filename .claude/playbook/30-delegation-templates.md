# 30 · 派工 prompt 模板（複製即用）

> 用法：挑對應型態，把 `<...>` 換成你的內容，用 `Agent` 工具送出（`subagent_type` 與 `model` 已標好）。
> 每個模板都內建「派工三件套」（目標/驗收/回報）與回報長度上限。原理見 [`10-orchestration.md`](10-orchestration.md)。

---

## 1. 搜尋 / 定位  → `Agent(subagent_type='Explore', model='sonnet')`
```
目標：<我要搞懂/找到什麼，為什麼>
範圍：在 C:/Users/kelsey/Downloads/jellojam-erp-final/jellojam 內。先讀 PROJECT_FACTS.md 掌握事實。
驗收：找到確切位置與關鍵邏輯，不要臆測；找不到就說找不到。
回報（≤12 行）：① 結論一句 ② 關鍵 檔案:行號 清單 ③ 我還沒確認/可能有陷阱的地方
```
範例目標：「搞懂前台商品價格是怎麼算出來的、資料來源是哪張表/哪個 RPC」。

---

## 2. 實作  → `Agent(subagent_type='general-purpose', model='sonnet')`；高風險改 `model='opus'`
```
目標：<要做出什麼功能/修好什麼，為什麼>
事實依據：先讀 PROJECT_FACTS.md；動 DB 前用 SUPABASE_ACCESS.md 的範本驗真實 schema。
硬性限制：
  - 遵守 CLAUDE.md 三條鐵則（RLS 是安全邊界、事實先驗、v-html/redirect/console 規則）。
  - 前台顧客資料一律走 RPC，不直接 insert/update orders/customers/points。
  - 不擴大範圍，只做這件事。
驗收：npm run build 必須通過；<其他可測條件，如「訪客能下單且金額由伺服器算」>。
回報（≤15 行）：① 改了哪些 檔案:行號 ② 怎麼驗證的、結果 ③ 沒做/需使用者接手的部分（誠實列）
```
範例目標：「在會員中心訂單卡片加上金額明細（小計/加購/運費/折扣/總額）」。

---

## 3. 重構  → `Agent(subagent_type='general-purpose', model='sonnet')`
```
目標：<把什麼重構成什麼，為什麼（可讀性/去重/效能）>
不可改變的行為：<列出重構後必須維持一致的外部行為/輸出>
事實依據：先讀 PROJECT_FACTS.md。先找出所有呼叫點再動（用 grep 列出）。
驗收：npm run build 通過；行為與重構前一致（列出你怎麼確認一致）；無多餘改動。
回報（≤12 行）：① 動了哪些 檔案:行號 ② 呼叫點清單與是否全數更新 ③ 風險點
```
範例目標：「把散在 3 個檔的訂單狀態→顏色對應集中成一個共用 map」。

---

## 4. 研究（外部/技術可行性）  → `Agent(subagent_type='general-purpose', model='sonnet')`，深題可用 deep-research skill
```
問題：<具體問題，越窄越好>
產出用途：<拿來做什麼決定>
要求：附來源；區分「查證到的事實」與「推論」；矛盾證據要並列。
驗收：能回答問題並標明信心程度；查不到就說查不到，不要編。
回報（≤15 行）：① 直接答案 ② 依據/來源 ③ 不確定或需驗證處。長內容寫成檔案傳路徑。
```
範例問題：「ECPay（綠界）信用卡串接，Supabase Edge Function 端最少需要哪些參數與簽章步驟？」

---

## 5. 審查 / 驗收  → `Agent(subagent_type='general-purpose', model='opus')`，**務必 fresh-context（沒參與實作）**
```
目標：獨立審查 <某次改動/某個檔>，找出會出錯的地方。你沒做過這個改動，請以懷疑角度檢查。
必查項：
  - 事實是否對（對照 PROJECT_FACTS.md：狀態字串、欄位、RLS 是否為真正安全邊界）。
  - 規則衝突、路徑/工具名錯誤、弱模型會誤讀的模糊語句。
  - 邊界情況（空值、qty>1、未登入、取消/併單、超庫存）。
  - 高風險（會不會 A 看到 B 資料/扣錯錢/刪錯資料）。
驗收：逐項給「通過/問題」；有問題附 檔案:行號 與具體修法。
回報（≤20 行）：問題清單（嚴重度排序），每條含 檔案:行號 + 修法。沒問題也要明說「已逐項確認通過」。
```
範例目標：「審查這次對 StoreMember.vue 訂單卡片的改動」。

---

## 通用提醒
- 每個模板都可加一句：「若中途發現前提錯誤（如欄位不存在），停下來回報，不要硬試。」
- 需要結構化 JSON 結果或要控制 effort → **先確認你有 `Workflow` 工具**（不一定有）；有才用它的 `agent(prompt,{schema,model,effort})`。**沒有 `Workflow` 就用 `Agent`**，在 prompt 裡明寫「只輸出符合這個格式的 JSON，不要其他文字」，並靠選 `model` 補算力（Agent 無法指定 effort）。
- subagent 回來的長產物若沒落檔，要求它落檔後只給路徑，別讓它把 3000 字貼回主對話。

# JelloJam 電商平台 — 完整程式碼審查與修正報告

> 審查日期：2026-07-01
> 範圍：`jellojam/`（Vue 3 + Pinia + Element Plus + Supabase）— 後台 ERP + 前台商店
> 方式：由安全、前台功能、後台功能、資料層四個方向分工審查，逐項對照實際程式碼驗證，非臆測。

---

## 0. 總覽

這是一個純前端 SPA，所有資料庫操作都由瀏覽器用同一把 **Supabase anon key** 直連。這代表：

- **能在本 repo 內修好的**：程式邏輯錯誤、資料計算錯誤、結帳資料遺失、庫存扣減、XSS/注入面、輸入驗證、記憶體洩漏、UX 陷阱等 —— 本次已修，見 §1。
- **無法只靠本 repo 修好的**：真正的身分驗證與權限，必須在 Supabase 後端設定 **Auth + Row Level Security (RLS) + Edge Function**。前端再怎麼防都能被繞過。這些誠實列在 §2，不假裝已解決。

建置狀態：`npm run build` 通過（僅剩既有的 bundle 過大警告，與本次修改無關）。

---

## 1. 本次已修正項目

以下每一項都已改在程式碼中，可直接 review 對應檔案。

### 1A. 安全性

| # | 問題 | 修正 | 檔案 |
|---|------|------|------|
| S1 | Supabase URL/anon key 寫死在原始碼 | 改讀 `import.meta.env.VITE_SUPABASE_*`，並新增 `.env` / `.env.example`；保留 fallback 讓現有部署不中斷 | [src/lib/supabase.js](src/lib/supabase.js)、`.env.example` |
| S2 | 登入頁直接把密碼 `jellojam2026` 印在畫面上、且預填管理員帳密 | 移除密碼提示與測試帳號區塊，表單改為空白 | [src/views/Login.vue](src/views/Login.vue) |
| S3 | 會員「登入」把使用者輸入直接串進 PostgREST `.or()` → filter injection，且用 `%ilike%` 模糊比對可冒用任意會員 | 改用完全參數化的 `.eq()` 精準比對（LINE ID → 姓名 → 顯示名），移除字串拼接；關鍵字過短時拒絕 | [src/stores/storeMember.js](src/stores/storeMember.js) |
| S4 | 前台商店 `onMounted` 就呼叫 `fetchAll()`，匿名訪客一次載入**全部客戶 PII、費用、點數交易** | 新增 `fetchStore()`，前台只載入商品/庫存/採購/訂單，不再撈客戶名單、費用、點數交易 | [src/stores/appData.js](src/stores/appData.js)、[src/views/store/StoreLayout.vue](src/views/store/StoreLayout.vue) |
| S5 | 系統設定頁任何登入者皆可進入 | 路由加 `meta.roles: ['super_admin']` 角色守衛，側邊選單依角色隱藏 | [src/router/index.js](src/router/index.js)、[src/components/layout/MainLayout.vue](src/components/layout/MainLayout.vue) |
| S6 | `auth.js` 開檔時 `JSON.parse` 無防護，localStorage 毀損會白屏 | 包 try/catch，毀損則清除 | [src/stores/auth.js](src/stores/auth.js) |
| S7 | `.env.example` 被 `.env.*` 規則忽略、無 `*.log`/`.vscode` 忽略 | 修正 `.gitignore` | `.gitignore` |

### 1B. 前台商店功能

| # | 問題 | 修正 | 檔案 |
|---|------|------|------|
| F1 | **購物車崩潰**：從目錄/商品頁加入購物車時傳入 `store_price`/`current_stock`，但 cart 讀 `price`/`stock` → `price:undefined`、`qty:NaN`，購物車頁整頁崩潰且寫進 localStorage | `cart.addItem` 統一正規化欄位、過濾 NaN，回傳 `{ok}` | [src/stores/cart.js](src/stores/cart.js) |
| F2 | **結帳遺失關鍵資料**：電話、Email、LINE、取貨方式、付款方式全部沒寫入訂單；宅配沒有地址欄位 | 新增宅配地址欄位；把聯絡/取貨/付款資訊整理寫入 `note`（既有欄位，不依賴未知 schema）；`payment_amount` 帶入結帳金額 | [src/views/store/StoreCheckout.vue](src/views/store/StoreCheckout.vue) |
| F3 | 無電話/Email 格式驗證 | 加台灣手機 `09xxxxxxxx` 與 Email regex 驗證、空購物車擋下 | [src/views/store/StoreCheckout.vue](src/views/store/StoreCheckout.vue) |
| F4 | **不扣庫存 → 超賣**：結帳與後台新增訂單寫 `order_items` 時都沒帶 `product_id`，而庫存是靠 `product_id` 推算 | 兩處都依商品名稱對應 `product_id` 後寫入 | [src/views/store/StoreCheckout.vue](src/views/store/StoreCheckout.vue)、[src/views/orders/OrderList.vue](src/views/orders/OrderList.vue) |
| F5 | 結帳出貨前不驗庫存 | 送出前依即時庫存再驗證數量，超量/售完擋下 | [src/views/store/StoreCheckout.vue](src/views/store/StoreCheckout.vue) |
| F6 | 訂單主檔寫入成功但商品項目失敗 → 留下孤兒訂單，使用者重送造成重複訂單 | 失敗時補償刪除已建立的訂單主檔，讓使用者可安全重試 | [src/views/store/StoreCheckout.vue](src/views/store/StoreCheckout.vue) |
| F7 | **NT$0 結帳**：無定價（洽詢價）商品被以 0 元加入並可結帳 | `cart.addItem` 拒絕無價商品；商品頁對無價商品停用購買鈕 | [src/stores/cart.js](src/stores/cart.js)、[src/views/store/StoreProduct.vue](src/views/store/StoreProduct.vue) |
| F8 | **同商品兩種價格**：首頁用 `成本×1.35`，目錄/商品頁用歷史平均售價 | 首頁改用與目錄相同的 `appData.storeProducts` 來源 | [src/views/store/StoreHome.vue](src/views/store/StoreHome.vue) |
| F9 | 商品詳情頁 `Number(id)` 比對，若 id 為非數字（uuid）永遠找不到；目錄「最新」排序同因 | 改為字串比對 / `localeCompare(numeric)` | [src/views/store/StoreProduct.vue](src/views/store/StoreProduct.vue)、[src/views/store/StoreCatalog.vue](src/views/store/StoreCatalog.vue) |
| F10 | 手機版「清除篩選」按鈕 `@click="clearFilters; ..."` 是運算式不是呼叫，篩選沒被清除 | 修正為 `clearFilters()` | [src/views/store/StoreCatalog.vue](src/views/store/StoreCatalog.vue) |
| F11 | 會員登入按鈕載入中顯示「查詢失敗」字樣 | 新增 `member.querying` 鍵並使用 | [src/views/store/StoreMember.vue](src/views/store/StoreMember.vue)、locales |
| F12 | 加入購物車在目錄/商品頁無任何回饋 | 加成功/失敗訊息（含無價、售完提示） | StoreCatalog/StoreProduct/StoreHome |
| F13 | 首頁 toast `setTimeout` 未於卸載清除 | `onUnmounted` 清除 | [src/views/store/StoreHome.vue](src/views/store/StoreHome.vue) |

### 1C. 後台 ERP 功能

| # | 問題 | 修正 | 檔案 |
|---|------|------|------|
| A1 | **營收漏乘數量**：`selling_price` 是單價，營收/消費額只加總未乘 qty | `mockSales`、`total_spent` 皆改為單價 × 數量 | [src/stores/appData.js](src/stores/appData.js) |
| A2 | **已取消訂單灌水營收**：`totalRevenue`、週/月營收含取消訂單 | 全部排除 `顧客已取消` | [src/stores/appData.js](src/stores/appData.js) |
| A3 | **已取消訂單永久扣庫存**：`soldQty` 不分訂單狀態 | 只計有效訂單的售出量 | [src/stores/appData.js](src/stores/appData.js) |
| A4 | `updateOrderStatus` 失敗仍被吞掉，呼叫端照樣報成功 | 改為回傳 `{success}`；批次更新與訂單詳情依結果顯示成功/失敗、失敗不 patch | appData.js、OrderList.vue、OrderDetail.vue |
| A5 | `fetchAll` 即使全部資料表載入失敗也標記 `initialized=true`，之後永遠顯示 0 筆且不重試 | 全部失敗時不標記 initialized、顯示錯誤；部分失敗記 log | [src/stores/appData.js](src/stores/appData.js) |
| A6 | **編輯採購/費用時自動重算覆蓋原值**：打開編輯就把 `total_cost`/TWD 依 qty×unit 重算，改寫掉原本存的值；且 `RATE` 沒有舊幣別 `'US'` → TWD 少算 33 倍 | 加 `isHydrating` 旗標，載入舊資料時暫停重算；`RATE` 補上 `US`；幣別篩選改用 `store.CURRENCIES` | [src/views/finance/Finance.vue](src/views/finance/Finance.vue) |
| A7 | 儀表板毛利潤用 `Math.abs`，虧損顯示成正數 | 移除 abs，保留正負號 | [src/views/dashboard/Dashboard.vue](src/views/dashboard/Dashboard.vue) |
| A8 | 儀表板 resize 監聽器 + echarts 實例未清理 → 每次進出洩漏 | `onUnmounted` 移除監聽並 `dispose()` | [src/views/dashboard/Dashboard.vue](src/views/dashboard/Dashboard.vue) |
| A9 | 客戶詳情用「姓名」關聯訂單，與統計卡的 `customer_id` 關聯不一致（同名客戶會混淆） | 改用 `customer_id` 關聯 | [src/views/customers/CustomerDetail.vue](src/views/customers/CustomerDetail.vue) |
| A10 | CSV 匯出 `join(',')` 完全沒跳脫，備註/名稱含逗號或換行就跑欄位 | 新增共用 `downloadCsv`（RFC 4180 跳脫 + BOM），套用到訂單/庫存/財務/客戶四處 | [src/lib/csv.js](src/lib/csv.js) 等 4 檔 |
| A11 | 分類頁 `deleteCat`、設定頁 `deleteStaff`、側邊欄切換/登出 的 `ElMessageBox.confirm` 未 catch，按「取消」丟未處理 rejection | 全部包 try/catch | Categories.vue、Settings.vue、MainLayout.vue |
| A12 | **`ProductForm.vue` 儲存不寫入任何資料**（資料遺失陷阱），且未被任何地方連結；欄位模型與實際 schema 完全不同 | 將 `/products/add`、`/products/edit/:id` 導向商品列表（真正的新增/編輯 modal），避免誤用 | [src/router/index.js](src/router/index.js) |

---

## 2. 需要後端處理（無法只靠本 repo 修復）— 請務必處理

這些是**最重要**的安全問題，但根治點在 Supabase 專案設定，不在前端程式碼。前端目前的改動只是降低暴露面與防呆，**不能取代**下列後端工作：

1. **啟用 Supabase Auth 取代假登入**
   `auth.js` 目前是寫死的 2 人清單 + 寫死密碼 `jellojam2026` + 假 token（`'jj_'+Date.now()`）。任何人在 DevTools 執行 `localStorage.jj_token='x'` 即可進入後台。
   → 需改用 `supabase.auth.signInWithPassword`，員工身分放 `staff_accounts` 表，角色寫進 JWT claims。（本次已停止在畫面上洩漏密碼，但機制仍需後端改造。）

2. **每張資料表都要開 RLS（Row Level Security）**
   目前所有讀寫都用 anon key，沒有任何 user context。就算前端不撈 `customers`，攻擊者仍可用同一把 anon key 直接打 PostgREST 讀/刪 `customers`、`orders`、`purchases`、`expenses`、`staff_accounts`。
   → 必須為每張表設定 RLS，依 `auth.uid()` / 角色限制讀寫。這是整個系統安全的真正防線。

3. **價格/金額改由伺服器端計算（Edge Function / RPC）**
   結帳的 `selling_price`、運費、加購費目前都來自前端購物車（localStorage 可竄改）。即使本次加了送出前庫存驗證，價格仍可被竄改。
   → 應以 `SECURITY DEFINER` 的 RPC 只接收「商品 ID + 數量」，由 DB 查可信價格並建立訂單；RLS 禁止前端直接 insert `orders`/`order_items`。

4. **會員身分驗證**
   即使本次改為精準比對，會員登入仍只憑「姓名或 LINE ID」無密碼。
   → 需 Supabase Auth 或 LINE Login 等真正驗證。

5. **訂單編號改由 DB 產生**
   `ORD+日期+4 位亂數` 有碰撞風險（且 `updateOrderStatus` 以 `order_no` 為鍵，撞號會同時改到兩筆）。
   → 用 DB 的 UUID 或序列產生，並加 unique 約束。

6. **已提交的敏感資料需清理 git 歷史**
   - `src/mock/customers.json` 等含 **120 筆真實客戶 LINE ID + 姓名**（目前未被程式 import，但仍在版控與 git 歷史中）。
   - `src/lib/supabase.js` 舊 commit、`src/stores/auth.js` 的密碼，都留在 git 歷史。
   → 需用 `git filter-repo`/BFG 清除歷史，並輪替 anon key。本次未刪除這些資料檔以免誤刪你的備份，請自行確認後處理。

7. **金流/物流密鑰不可放前端**
   設定頁收集 ECPay HashKey、LINE Pay secret、SMTP 密碼等 —— 這些第三方密鑰只能放伺服器端（Edge Function secrets）。

---

## 3. 已知但本次未改（範圍/風險考量，建議後續處理）

- **前台會員點數不含兌換/調整**：`StoreMember.vue` 只用訂單數量算點數（`currentPoints = lifetimePoints`），未計入 `points_transactions`；且前台已改為不載入該表。與後台 `mockCustomers` 的算法不同。建議由後端 view 提供一致的點數餘額。
- **多處 i18n 誤用/寫死中文**：如 `checkout.addon_toggle` 被拿來當「免費」顯示、加購品名寫死中文、部分「view all」用到 `filter` 鍵等（詳見前台審查）。屬顯示文案，未影響功能。
- **`src/mock/*` 為死碼**：無任何 import，且 `mock/index.js` 還 import 了不存在的檔案。可整包刪除，本次保留未動。
- **儀表板時間範圍**：卡片 1-2 吃篩選、卡片 3-4 為全期；「每週」只涵蓋 7 天。屬報表口徑，建議另行對齊。
- **ProductForm / Categories / 大部分 Settings 為假 UI**：Categories 與 Settings 各分頁（匯率/金流/物流/通知/稽核日誌）目前只跳成功訊息、不落地。需要時再依實際 schema 接上。
- **StoreCart 數量輸入負數會直接移除該列**：屬邊界 UX，未修。

---

## 4. 變更檔案清單

新增：
- `src/lib/csv.js`（CSV 跳脫共用工具）
- `.env` / `.env.example`（Supabase 連線設定；`.env` 已忽略）
- `CODE_REVIEW.md`（本檔）

修改：`src/lib/supabase.js`、`src/stores/{appData,auth,cart,storeMember}.js`、`src/router/index.js`、`src/components/layout/MainLayout.vue`、`src/views/Login.vue`、`src/views/store/{StoreLayout,StoreHome,StoreCatalog,StoreProduct,StoreCheckout,StoreMember}.vue`、`src/views/orders/{OrderList,OrderDetail}.vue`、`src/views/finance/Finance.vue`、`src/views/dashboard/Dashboard.vue`、`src/views/inventory/Inventory.vue`、`src/views/customers/{CustomerList,CustomerDetail}.vue`、`src/views/products/Categories.vue`、`src/views/settings/Settings.vue`、`src/locales/{zh,en}.js`、`.gitignore`

---

## 5. 如何驗證

```bash
cd jellojam
npm install
npm run build      # 應通過（僅剩既有 bundle 過大警告）
npm run dev        # 手動走查下列情境
```

手動驗證建議：
1. 前台目錄頁「加入購物車」→ 進購物車頁不再崩潰、金額正確（F1）。
2. 無定價商品無法加入、無法結帳（F7）。
3. 結帳填電話（09 開頭）、選宅配→需填地址；送出後訂單 `note` 含電話/取貨/付款資訊（F2/F3）。
4. 後台儀表板營收與已取消訂單無關、虧損顯示負號（A1/A2/A7）。
5. 財務編輯一筆舊採購，不改欄位直接存 → 金額不被竄改（A6）。
6. 匯出含逗號備註的訂單 CSV，欄位不跑掉（A10）。
7. 以非 super_admin 角色無法進入 `/settings`（S5）。

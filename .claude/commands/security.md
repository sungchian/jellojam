# /security

針對最近修改的檔案執行資安檢查。

## 步驟
1. 執行 `git diff --name-only HEAD` 找出修改的檔案
2. 對這些檔案進行以下檢查：
   - XSS：有沒有未消毒的 `v-html`
   - 硬編碼密鑰：有沒有 API key / password / secret 直接寫在程式碼裡
   - IDOR：Supabase 查詢有沒有確保 `.eq('customer_id', auth.customer.id)`
   - Open redirect：`router.push/replace` 有沒有驗證 redirect 參數
   - Console 洩漏：`console.error(err)` 有沒有印出完整 error 物件
3. 輸出清單：✅ 安全 / ⚠️ 需注意 / ❌ 需修復

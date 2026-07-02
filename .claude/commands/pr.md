# /pr

建立 Pull Request 前的完整檢查清單。

## 步驟
1. `git diff main...HEAD --stat` 確認改了哪些檔案
2. 逐一檢查：
   - [ ] 沒有 `.env` 或 secret 被 commit
   - [ ] 沒有未消毒的 `v-html`
   - [ ] Auth 查詢都有 customer_id 保護
   - [ ] `console.error` 沒有印出完整 error 物件
   - [ ] 新功能有對應的 UI 文字（中文）
3. 輸出 PR description 草稿（繁體中文）：
   - 這次改了什麼
   - 為什麼改
   - 如何測試

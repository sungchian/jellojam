# JelloJam Agent Pipeline

## 流程圖

```
使用者需求
    ↓
[01] researcher          → 研究報告
    ↓
[02] requirements-organizer → User Story 文件
    ↓
🛑 人工檢查點 1：確認 Story
    ↓（通過才繼續）
[03] spec-writer         → Technical Spec 文件
    ↓
🛑 人工檢查點 2：確認 Spec
    ↓（通過才繼續）
[04] backend-engineer    → DB migration + Edge Function + Store
[05] frontend-engineer   → Vue 元件 + 路由（可與後端平行）
    ↓（兩者皆完成）
[06] test-engineer       → 測試報告（Pass / Bug 清單）
    ↓（無 Critical bug）
[07] code-reviewer       → Code Review 報告
    ↓
🛑 人工檢查點 3：Review & PR
    ↓（通過才 merge）
✅  部署
```

---

## Agent 一覽

| 檔案 | Agent 名稱 | 職責 | 輸入 | 輸出 |
|-----|-----------|------|------|------|
| `01-researcher.md` | researcher | 調查需求、程式碼庫、技術可行性 | 使用者需求 | 研究報告 |
| `02-requirements-organizer.md` | requirements-organizer | 整理成 User Story + AC | 研究報告 | Story 文件 |
| `03-spec-writer.md` | spec-writer | 架構設計、技術規格、資安審查 | 確認的 Story | Technical Spec |
| `04-backend-engineer.md` | backend-engineer | DB / Edge Function / Store 實作 | 確認的 Spec | 後端程式碼 |
| `05-frontend-engineer.md` | frontend-engineer | Vue 元件 / UI 實作 | 確認的 Spec | 前端程式碼 |
| `06-test-engineer.md` | test-engineer | 功能測試、資安測試、回歸測試 | 實作成果 + AC | 測試報告 |
| `07-code-reviewer.md` | code-reviewer | 品質、架構、安全性四維度審查 | 測試通過的程式碼 | Review 報告 |

---

## 人工檢查點說明

### 🛑 檢查點 1 — 確認 Story
**檢查前，你需要問自己：**
- 這些 Story 完整涵蓋了我想要的功能嗎？
- 有沒有我沒提到但應該要做的邊界情境？
- 優先級排序符合現在的業務目標嗎？

**通過條件**：所有 Story 的業務邏輯正確，AC 可驗收，範圍合理

---

### 🛑 檢查點 2 — 確認 Spec
**檢查前，你需要問自己：**
- DB schema 的設計符合長期需求嗎？
- API 設計夠清楚讓工程師直接實作嗎？
- 資安審查 checklist 都勾選了嗎？
- 有沒有 `[TBD]` 需要你決策的開放問題？

**通過條件**：Spec 無模糊地帶，資安 checklist 全部通過，架構決策已確定

---

### 🛑 檢查點 3 — Review & PR
**檢查前，你需要問自己：**
- Code Review 有無 🔴 BLOCK 問題？
- 測試報告有無未解決的 🔴 Critical bug？
- 這個 PR 的範圍是否只包含這次的功能，無多餘改動？

**通過條件**：無阻擋問題，測試全過，即可建立 PR 並 merge

---

## 如何啟動一個 Agent

在對話中直接告訴 Claude：

```
「以 researcher agent 的身分，研究這個需求：[需求描述]」

「現在切換到 requirements-organizer，
 根據以下研究報告整理 User Story：[貼入報告]」

「以 spec-writer 身分，根據以下已確認的 Story 撰寫 Technical Spec：[貼入 Story]」
```

或更簡潔：
```
「[researcher] 幫我研究：使用者要在前台選擇 7-11 門市」
「[spec-writer] 根據這份 Story 寫 spec」
```

---

## Handoff 模板（agent 之間交接用）

```
From: [agent 名稱]
To: [下一個 agent 名稱]
Context: [這一棒完成了什麼，決定了什麼]
Deliverable: [附上輸出文件]
Blocking issues: [若有未解決問題，列在這裡]
```

---

## 注意事項

- **後端與前端可以平行**：檢查點 2 通過後，`backend-engineer` 和 `frontend-engineer` 可以同時啟動
- **Bug 修復後需重測**：`test-engineer` 發現 bug，工程師修復後，測試工程師要重新驗證受影響的 AC
- **Code Review 不通過要重做**：`code-reviewer` 標記 🔴 BLOCK，退回工程師修復後重新走完 test → review
- **CLAUDE.md 安全規則優先於一切**：所有 agent 都必須遵守，任何 agent 都無權豁免

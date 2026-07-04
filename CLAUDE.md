# JelloJam ERP — Claude 導航

JelloJam 北美代購的 ERP 後台（`/dashboard`,`/orders`… 員工用）＋ 電商前台（`/store/*` 顧客用），單一 Vue 3 + Supabase SPA。

> 這份是**導航**，不是事實依據。細節容易過時，一律去引用檔查。

## 🚦 動手前必讀（依任務挑一個）
| 你要做的事 | 先讀 |
|-----------|------|
| 查任何「事實」（欄位名、狀態字串、RPC、資料表、認證現況） | **[PROJECT_FACTS.md](PROJECT_FACTS.md)**（已驗證、附日期）— **不要憑 CLAUDE.md 或印象** |
| 連生產 DB 查資料 / 套 migration | [SUPABASE_ACCESS.md](SUPABASE_ACCESS.md)（金鑰守則 + 範本） |
| 決定怎麼工作（要不要派 subagent、用哪個模型、怎麼驗證） | [.claude/playbook/](.claude/playbook/) — 見下方索引 |

## 🔴 三條最高鐵則（違反會出事，其餘細節在 PROJECT_FACTS.md）
1. **安全邊界是資料庫 RLS，不是前端**。前台顧客資料一律走 RPC（如 `create_storefront_order`、`public_catalog`、`redeem_points`），**不要直接 `insert`/`update` orders/customers/points**。（舊規則「加 `.eq('customer_id')` 就安全」已作廢。）
2. **動手前先驗證真實 schema/字串**，尤其：訂單狀態是 `顧客已取消`（不是 `已取消`）、`products` 沒有 `price` 欄、`orders` 總額要用 items 現算。清單見 PROJECT_FACTS.md。
3. **`v-html` 必用 `DOMPurify.sanitize()`**；**redirect 參數**用 `/^\/(?!\/)/.test(raw)` 驗證；**console.error 只印 `e?.code`** 不印完整 error 物件。

## 開發指令
```bash
npm run build     # 用它驗證前端沒編譯壞（這環境的 dev server 預覽工具連不到，靠 build + DB 直測）
supabase functions deploy super-service --no-verify-jwt --project-ref iifhubablhxibpsyeagi   # 少了 --no-verify-jwt 會壞 LINE 登入
# 前端：git push origin main → Vercel 自動部署
```

## Playbook 索引（`.claude/playbook/`）— 較弱模型的工作制度
- **[00-diagnosis.md](.claude/playbook/00-diagnosis.md)** — 最容易翻車的前三名 + 修法（先讀這份）
- **[10-orchestration.md](.claude/playbook/10-orchestration.md)** — 模型調度：指揮官不下場、派工三件套、model/effort 怎麼指定、回報合約、升降級
- **[20-judgment-rubrics.md](.claude/playbook/20-judgment-rubrics.md)** — 判斷力 checklist：何時升級、何時算完成、何時該問、方向錯的訊號、品質底線
- **[30-delegation-templates.md](.claude/playbook/30-delegation-templates.md)** — 派工模板：搜尋/實作/重構/研究/審查（填空即用）
- **[40-maintenance.md](.claude/playbook/40-maintenance.md)** — 怎麼安全更新這些制度檔（哪些可自改、哪些先問）
- **[50-letter-to-future.md](.claude/playbook/50-letter-to-future.md)** — 給未來 session 的交接信

## 舊的 `agents/*.md`
`agents/` 目錄是**角色扮演文件**（把主對話當成不同角色的敘述），不是真正的 subagent 調度。真正的委派方式見 `10-orchestration.md`。舊檔保留供參考，但**以 playbook 為準**。

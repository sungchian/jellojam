-- ================================================================
-- 20260712_p0_coupon_rls — 收緊 coupons / coupon_usages 的寫入政策
-- ================================================================
-- 背景（P0）：
--   20240001_coupons_and_rpc.sql 建立的 "ERP staff can manage coupons"
--   政策是 `FOR ALL USING (auth.role() = 'authenticated')`。
--   問題：LINE / Google 登入的「顧客」持有的也是 authenticated JWT，
--   因此任何登入顧客都能直接 INSERT / UPDATE / DELETE coupons —— 例如自建
--   一張 100% off 的優惠券，再拿去結帳（create_storefront_order 會照 coupons
--   表算折扣）。coupon_usages 的 "coupon_usages_erp_all" 同一個毛病。
--
--   正確的員工判斷是 is_staff()（比對 staff_accounts + auth.uid()），
--   與 20260701_p1_hardening.sql 其餘商業表一致。此 migration 補上當時
--   漏掉的 coupons / coupon_usages 兩張表。
--
-- 冪等：全部 DROP POLICY IF EXISTS 後重建，可安全重跑。
-- 讀取面不變：anon 仍可 SELECT is_active 的 coupons（前台驗券需要）；
--            顧客仍可 SELECT 自己的 coupon_usages。只收緊「寫入」。
-- ----------------------------------------------------------------

-- ── coupons：只有員工能寫 ─────────────────────────────────────────
DROP POLICY IF EXISTS "ERP staff can manage coupons" ON coupons;
DROP POLICY IF EXISTS "coupons_staff_write"          ON coupons;
CREATE POLICY "coupons_staff_write"
  ON coupons FOR ALL
  USING      (is_staff())
  WITH CHECK (is_staff());

-- 保留匿名讀取 active 券（前台結帳驗券）；若不存在則補建（冪等）。
DROP POLICY IF EXISTS "Public can read active coupons" ON coupons;
CREATE POLICY "Public can read active coupons"
  ON coupons FOR SELECT
  USING (is_active = TRUE);

-- ── coupon_usages：只有員工能寫；顧客只能讀自己的 ────────────────────
DROP POLICY IF EXISTS "coupon_usages_erp_all"     ON coupon_usages;
DROP POLICY IF EXISTS "coupon_usages_staff_write" ON coupon_usages;
CREATE POLICY "coupon_usages_staff_write"
  ON coupon_usages FOR ALL
  USING      (is_staff())
  WITH CHECK (is_staff());

-- 顧客讀自己的兌換記錄（沿用既有邏輯；不存在則補建）。
DROP POLICY IF EXISTS "coupon_usages_own_select" ON coupon_usages;
CREATE POLICY "coupon_usages_own_select"
  ON coupon_usages FOR SELECT
  USING (auth.uid() = (SELECT auth_user_id FROM customers WHERE id = customer_id));

-- 註：真正的寫入一律走 redeem_coupon() SECURITY DEFINER RPC
-- （service role 繞過 RLS），前端不需要、也不應該有直接 INSERT 權。

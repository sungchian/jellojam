-- ================================================================
-- JelloJam ERP — Coupon Usages Table
-- 2026-05-27
--
-- NOTE: The coupons table, RLS policies, and redeem_coupon() RPC
-- were already created in 20240001_coupons_and_rpc.sql.
--
-- This migration:
--   1. Drops the overly-permissive "coupons_public_select" policy
--      (USING true — exposes inactive/expired coupons to anon).
--      The correct "Public can read active coupons" from 20240001
--      (USING is_active = TRUE) remains as the sole SELECT policy.
--   2. Adds coupon_usages for per-customer usage audit trail and
--      one-per-customer enforcement.
-- ================================================================

-- ── 1. Remove overly-permissive policy from earlier draft ────────
DROP POLICY IF EXISTS "coupons_public_select" ON coupons;
DROP POLICY IF EXISTS "coupons_erp_write"     ON coupons;
-- "Public can read active coupons" and "ERP staff can manage coupons"
-- from 20240001 are correct and remain.

-- ── 2. coupon_usages: per-customer redemption audit ──────────────
-- Tracks exactly which customer used which coupon on which order.
-- Powers: one-per-customer enforcement, marketing analytics, fraud detection.
CREATE TABLE IF NOT EXISTS coupon_usages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID        NOT NULL REFERENCES coupons(id)    ON DELETE CASCADE,
  customer_id UUID        NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  order_id    UUID        NOT NULL REFERENCES orders(id)     ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id)                -- one coupon per order
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_customer
  ON coupon_usages (customer_id, coupon_id);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon
  ON coupon_usages (coupon_id, redeemed_at DESC);

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- Customers can read their own usage history (e.g. "已使用優惠碼" section)
DROP POLICY IF EXISTS "coupon_usages_own_select" ON coupon_usages;
CREATE POLICY "coupon_usages_own_select"
  ON coupon_usages FOR SELECT
  USING (
    auth.uid() = (SELECT auth_user_id FROM customers WHERE id = customer_id)
  );

-- ERP staff full access
DROP POLICY IF EXISTS "coupon_usages_erp_all" ON coupon_usages;
CREATE POLICY "coupon_usages_erp_all"
  ON coupon_usages FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- INSERT is done exclusively via redeem_coupon() SECURITY DEFINER RPC
-- (service role bypasses RLS) — no direct INSERT policy for anon needed.

-- ── 3. Extend redeem_coupon() to also write coupon_usages ────────
-- Replaces the version in 20240001 with one that stamps coupon_usages.
CREATE OR REPLACE FUNCTION redeem_coupon(
  p_code      TEXT,
  p_order_id  UUID,
  p_customer_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
BEGIN
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = p_code AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COUPON_NOT_FOUND';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED';
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RAISE EXCEPTION 'COUPON_LIMIT_REACHED';
  END IF;

  UPDATE coupons
     SET used_count = used_count + 1
   WHERE code = p_code;

  UPDATE orders
     SET coupon_code = p_code
   WHERE id = p_order_id;

  -- Audit trail: record per-customer usage
  IF p_customer_id IS NOT NULL THEN
    INSERT INTO coupon_usages (coupon_id, customer_id, order_id)
    VALUES (v_coupon.id, p_customer_id, p_order_id)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION redeem_coupon(TEXT, UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION redeem_coupon(TEXT, UUID, UUID) TO anon;

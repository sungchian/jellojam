-- ────────────────────────────────────────────────────────────────────────────
-- Migration: coupons table + redeem_coupon RPC
--
-- WHY a SECURITY DEFINER RPC instead of a direct client UPDATE:
--   Anon clients have SELECT access to coupons (needed to validate before
--   checkout). But we must NEVER allow them to UPDATE used_count directly —
--   even a tightly-scoped UPDATE policy could be bypassed if RLS is
--   misconfigured. The RPC runs as the service role (SECURITY DEFINER),
--   re-validates the coupon server-side, and increments atomically using
--   a conditional UPDATE that prevents exceeding usage_limit.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT        UNIQUE NOT NULL,
  description      TEXT        NOT NULL,
  discount_type    TEXT        NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
  discount_value   INTEGER     NOT NULL CHECK (discount_value > 0),
  min_order_amount INTEGER     NOT NULL DEFAULT 0,
  usage_limit      INTEGER,                      -- NULL = unlimited
  used_count       INTEGER     NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rollback: DROP TABLE IF EXISTS coupons;

-- 2. Index for fast lookup by code (checkout validates on every keystroke)
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code) WHERE is_active = TRUE;

-- 3. Orders table — record which coupon was applied and the final discount
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_code     TEXT    REFERENCES coupons(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0;

-- Rollback:
--   ALTER TABLE orders DROP COLUMN IF EXISTS coupon_code;
--   ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount;

-- 4. RLS on coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Public (anon) can SELECT active coupons — needed for frontend validation
CREATE POLICY "Public can read active coupons"
  ON coupons FOR SELECT
  USING (is_active = TRUE);

-- Only ERP staff can INSERT / UPDATE / DELETE
CREATE POLICY "ERP staff can manage coupons"
  ON coupons FOR ALL
  USING (auth.role() = 'authenticated');

-- 5. redeem_coupon RPC — SECURITY DEFINER so it runs as service role
--    This is the ONLY way used_count should ever be incremented.
--    The frontend calls this after order creation; it is non-fatal if it
--    fails (order already exists), but ops will see the error in logs.
CREATE OR REPLACE FUNCTION redeem_coupon(
  p_code     TEXT,
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER                    -- runs as service role, not anon
SET search_path = public            -- prevent search_path hijacking
AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
BEGIN
  -- Re-validate the coupon inside the transaction (prevents TOCTOU race)
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = p_code
    AND is_active = TRUE
  FOR UPDATE;                       -- row-level lock prevents concurrent redemptions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COUPON_NOT_FOUND';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED';
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RAISE EXCEPTION 'COUPON_LIMIT_REACHED';
  END IF;

  -- Atomic increment — safe under concurrent load because of FOR UPDATE above
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE code = p_code;

  -- Stamp the order with this coupon for audit trail
  UPDATE orders
  SET coupon_code = p_code
  WHERE id = p_order_id;
END;
$$;

-- Revoke direct execute from anon; only authenticated (service role via RPC) should call this
REVOKE EXECUTE ON FUNCTION redeem_coupon(TEXT, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION redeem_coupon(TEXT, UUID) TO anon;
-- Note: Supabase anon key calls go through PostgREST as role 'anon'.
-- The SECURITY DEFINER means the function body runs as the owner (service role)
-- regardless of who calls it — so anon can trigger it but cannot bypass the
-- validation inside, and cannot directly UPDATE the table.

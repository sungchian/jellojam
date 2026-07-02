-- ================================================================
-- JelloJam ERP — P1 E-Commerce Tables
-- 2026-05-27
-- Covers: product_variants, product_reviews, wishlists,
--         abandoned_carts
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. product_variants — 商品規格（顏色 / 尺寸）
--    Allows the same product to have multiple SKUs with individual
--    stock and optional price deltas.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name  TEXT        NOT NULL,          -- e.g. "顏色", "尺寸"
  variant_value TEXT        NOT NULL,          -- e.g. "粉紅", "小號"
  sku           TEXT        UNIQUE,            -- optional SKU for logistics
  price_delta   INTEGER     NOT NULL DEFAULT 0, -- NT$ adjustment on top of product store_price
  stock         INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    SMALLINT    NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product
  ON product_variants (product_id, is_active, sort_order);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Public read (same access as products)
DROP POLICY IF EXISTS "variants_public_select" ON product_variants;
CREATE POLICY "variants_public_select"
  ON product_variants FOR SELECT
  USING (is_active = TRUE);

-- ERP write
DROP POLICY IF EXISTS "variants_erp_all" ON product_variants;
CREATE POLICY "variants_erp_all"
  ON product_variants FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────────
-- 2. product_reviews — 商品評價（需人工審核）
--    One review per customer per product.
--    is_approved = FALSE until ERP staff approves.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id    UUID        REFERENCES orders(id) ON DELETE SET NULL,
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content     TEXT        CHECK (char_length(content) <= 1000),
  is_approved BOOLEAN     NOT NULL DEFAULT FALSE,
  approved_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, customer_id)   -- one review per customer per product
);

CREATE INDEX IF NOT EXISTS idx_reviews_product
  ON product_reviews (product_id, is_approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_customer
  ON product_reviews (customer_id, created_at DESC);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
DROP POLICY IF EXISTS "reviews_public_approved" ON product_reviews;
CREATE POLICY "reviews_public_approved"
  ON product_reviews FOR SELECT
  USING (is_approved = TRUE);

-- Customer can read their own (including pending)
DROP POLICY IF EXISTS "reviews_own_select" ON product_reviews;
CREATE POLICY "reviews_own_select"
  ON product_reviews FOR SELECT
  USING (
    auth.uid() = (SELECT auth_user_id FROM customers WHERE id = customer_id)
  );

-- Customer can insert their own review
DROP POLICY IF EXISTS "reviews_own_insert" ON product_reviews;
CREATE POLICY "reviews_own_insert"
  ON product_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM customers WHERE id = customer_id)
  );

-- Customer can update/delete their own pending review
DROP POLICY IF EXISTS "reviews_own_update" ON product_reviews;
CREATE POLICY "reviews_own_update"
  ON product_reviews FOR UPDATE
  USING (
    auth.uid() = (SELECT auth_user_id FROM customers WHERE id = customer_id)
    AND is_approved = FALSE
  );

-- ERP staff full access (for moderation)
DROP POLICY IF EXISTS "reviews_erp_all" ON product_reviews;
CREATE POLICY "reviews_erp_all"
  ON product_reviews FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────────
-- 3. wishlists — 願望清單
--    One row per (customer, product) — simple add/remove.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_customer
  ON wishlists (customer_id, created_at DESC);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Customers manage their own wishlist only
DROP POLICY IF EXISTS "wishlists_own" ON wishlists;
CREATE POLICY "wishlists_own"
  ON wishlists FOR ALL
  USING (
    auth.uid() = (SELECT auth_user_id FROM customers WHERE id = customer_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM customers WHERE id = customer_id)
  );

-- ERP can see all (for analytics)
DROP POLICY IF EXISTS "wishlists_erp_select" ON wishlists;
CREATE POLICY "wishlists_erp_select"
  ON wishlists FOR SELECT
  USING (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────────
-- 4. abandoned_carts — 棄單追蹤
--    Populated by the storefront when a customer adds to cart but
--    doesn't check out. The abandoned-cart-mailer Edge Function
--    reads rows where:
--      converted_at IS NULL
--      AND rescued_at IS NULL
--      AND updated_at < NOW() - INTERVAL '24 hours'
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID        REFERENCES customers(id) ON DELETE SET NULL,
  session_id   TEXT,                       -- browser fingerprint for guest carts
  items        JSONB       NOT NULL DEFAULT '[]',
  total_amount INTEGER     NOT NULL DEFAULT 0,
  email        TEXT,                       -- for rescue email (guests may have no customer_id)
  rescued_at   TIMESTAMPTZ,               -- NULL = rescue email not yet sent
  converted_at TIMESTAMPTZ,               -- NULL = not yet converted to order
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_rescue
  ON abandoned_carts (updated_at)
  WHERE converted_at IS NULL AND rescued_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_customer
  ON abandoned_carts (customer_id, updated_at DESC)
  WHERE customer_id IS NOT NULL;

ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Customers can manage their own cart record
DROP POLICY IF EXISTS "abandoned_carts_own" ON abandoned_carts;
CREATE POLICY "abandoned_carts_own"
  ON abandoned_carts FOR ALL
  USING (
    auth.uid() = (SELECT auth_user_id FROM customers WHERE id = customer_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM customers WHERE id = customer_id)
  );

-- ERP staff read-all (for analytics + sending rescue emails)
DROP POLICY IF EXISTS "abandoned_carts_erp_select" ON abandoned_carts;
CREATE POLICY "abandoned_carts_erp_select"
  ON abandoned_carts FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── auto-update updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_abandoned_carts_updated_at ON abandoned_carts;
CREATE TRIGGER trg_abandoned_carts_updated_at
  BEFORE UPDATE ON abandoned_carts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

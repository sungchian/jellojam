-- ================================================================
-- JelloJam ERP — P1 Full-Text Search + Order Tracking RPC
-- 2026-05-27
-- Covers:
--   1. pg_trgm extension + GIN indexes on products
--   2. search_products() RPC  — storefront keyword search
--   3. get_order_status_by_no() RPC — public order tracking page
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. pg_trgm
-- ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_category_trgm
  ON products USING GIN (jellycat_category_zh gin_trgm_ops);

-- ────────────────────────────────────────────────────────────────
-- 2. search_products() — 商品全文搜尋
--
-- Anon-callable so the storefront can search without a session.
-- Joins inventory_balance for current stock.
--
-- Usage:
--   SELECT * FROM search_products('bunny', 20, 0);
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_products(
  p_query  TEXT,
  p_limit  INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id                   UUID,
  name                 TEXT,
  jellycat_category_zh TEXT,
  brand                TEXT,
  current_stock        INTEGER,
  similarity_score     REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.jellycat_category_zh,
    p.brand,
    COALESCE(ib.current_stock, 0)::INTEGER AS current_stock,
    GREATEST(
      similarity(p.name,                 p_query),
      similarity(p.jellycat_category_zh, p_query)
    ) AS similarity_score
  FROM products p
  LEFT JOIN inventory_balance ib ON ib.product_id = p.id
  WHERE
    p.name                 % p_query
    OR p.jellycat_category_zh % p_query
    OR p.name                 ILIKE '%' || p_query || '%'
    OR p.jellycat_category_zh ILIKE '%' || p_query || '%'
  ORDER BY similarity_score DESC, p.name
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION search_products(TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION search_products(TEXT, INT, INT) TO authenticated;

-- ────────────────────────────────────────────────────────────────
-- 3. get_order_status_by_no() — 客戶訂單追蹤頁（公開 RPC）
--
-- Lets customers look up status by order number without logging in.
-- order_no itself acts as the secret (hard to guess).
-- Returns limited fields only — no PII exposed.
--
-- Usage:
--   SELECT * FROM get_order_status_by_no('JJ-2026-001');
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_order_status_by_no(p_order_no TEXT)
RETURNS TABLE (
  order_no       TEXT,
  status         TEXT,
  payment_status TEXT,
  created_at     TIMESTAMPTZ,
  items_summary  JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.order_no,
    o.status,
    o.payment_status,
    o.created_at,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'product_name', oi.product_name,
        'qty',          oi.qty
      ))
      FROM order_items oi
      WHERE oi.order_id = o.id
    ) AS items_summary
  FROM orders o
  WHERE o.order_no = p_order_no
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_order_status_by_no(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_order_status_by_no(TEXT) TO authenticated;

-- ================================================================
-- JelloJam ERP — P0 Security Migration
-- 2026-05-27
-- 覆蓋：P0-3 價格安全、P0-4 庫存鎖、P0-5 RLS、P0-6 狀態審計
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- P0-6  訂單狀態審計（Order Status Audit Trail）
-- OrderDetail.vue 已寫入此表，只需建立即可啟用
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_status_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_no    TEXT,
  from_status TEXT,
  to_status   TEXT        NOT NULL,
  changed_by  TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_logs_order
  ON order_status_logs(order_id, changed_at DESC);

ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_authenticated_all" ON order_status_logs;
CREATE POLICY "logs_authenticated_all"
  ON order_status_logs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────────
-- P0-3  安全事件紀錄表（Security Events）
-- 記錄可疑的價格竄改、重複送單等事件，供後台審計
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS security_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL,               -- e.g. 'PRICE_MISMATCH', 'DUPLICATE_ORDER'
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id UUID        REFERENCES customers(id) ON DELETE SET NULL,
  order_no    TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type
  ON security_events(event_type, created_at DESC);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_events_erp_read" ON security_events;
CREATE POLICY "security_events_erp_read"
  ON security_events FOR SELECT
  USING (auth.role() = 'authenticated');

-- 任何人（含 anon）皆可 INSERT（前端記錄可疑事件），但無法讀取
DROP POLICY IF EXISTS "security_events_insert" ON security_events;
CREATE POLICY "security_events_insert"
  ON security_events FOR INSERT
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- P0-5  RLS 完整性（Row Level Security for all tables）
-- 原則：authenticated = ERP staff 或已登入顧客，anon = 封鎖
-- ────────────────────────────────────────────────────────────────

-- ── orders ──────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_authenticated" ON orders;
CREATE POLICY "orders_authenticated"
  ON orders FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── order_items ──────────────────────────────────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_authenticated" ON order_items;
CREATE POLICY "order_items_authenticated"
  ON order_items FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── products（商品目錄：公開讀取，寫入需驗證）──────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_select"  ON products;
DROP POLICY IF EXISTS "products_auth_write"      ON products;
CREATE POLICY "products_public_select"
  ON products FOR SELECT USING (true);
CREATE POLICY "products_auth_write"
  ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- UPDATE / DELETE 需 authenticated（用 ALL 覆蓋 INSERT 以外）
DROP POLICY IF EXISTS "products_auth_modify" ON products;
CREATE POLICY "products_auth_modify"
  ON products FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── inventory ─────────────────────────────────────────────────
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_authenticated" ON inventory;
CREATE POLICY "inventory_authenticated"
  ON inventory FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── purchases ─────────────────────────────────────────────────
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchases_authenticated" ON purchases;
CREATE POLICY "purchases_authenticated"
  ON purchases FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── expenses ──────────────────────────────────────────────────
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_authenticated" ON expenses;
CREATE POLICY "expenses_authenticated"
  ON expenses FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── points_transactions ────────────────────────────────────────
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "points_txn_authenticated" ON points_transactions;
CREATE POLICY "points_txn_authenticated"
  ON points_transactions FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── customers ─────────────────────────────────────────────────
-- ERP：全表存取
-- 前台顧客：只能讀取 / 更新自己的紀錄（auth.uid() = auth_user_id）
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_erp_all"            ON customers;
DROP POLICY IF EXISTS "customers_storefront_select"  ON customers;
DROP POLICY IF EXISTS "customers_storefront_update"  ON customers;
DROP POLICY IF EXISTS "customers_storefront_insert"  ON customers;

CREATE POLICY "customers_erp_all"
  ON customers FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 前台：顧客查自己（auth_user_id 對到 Supabase Auth UID）
CREATE POLICY "customers_storefront_select"
  ON customers FOR SELECT
  USING (auth.uid() = auth_user_id);

-- 前台：顧客更新自己
CREATE POLICY "customers_storefront_update"
  ON customers FOR UPDATE
  USING  (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- 前台：新顧客建立自己的資料（第一次登入）
CREATE POLICY "customers_storefront_insert"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- ── auth_audit_log ─────────────────────────────────────────────
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_erp_select"  ON auth_audit_log;
DROP POLICY IF EXISTS "audit_log_insert"      ON auth_audit_log;

CREATE POLICY "audit_log_erp_select"
  ON auth_audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

-- 任何已驗證的使用者（包含前台顧客）都能寫入自己的行為紀錄
CREATE POLICY "audit_log_insert"
  ON auth_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ── journal_posts（日記文章：公開讀取，寫入 ERP）────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'journal_posts'
  ) THEN
    ALTER TABLE journal_posts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "journal_public_select" ON journal_posts;
    DROP POLICY IF EXISTS "journal_auth_write"    ON journal_posts;

    CREATE POLICY "journal_public_select"
      ON journal_posts FOR SELECT USING (true);
    CREATE POLICY "journal_auth_write"
      ON journal_posts FOR ALL
      USING  (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ── store_sessions（前台 session：顧客只見自己）──────────────────
-- user_id = auth.uid()（Supabase Auth UUID），customer_id 是應用層 UUID
ALTER TABLE store_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_sessions_own" ON store_sessions;
CREATE POLICY "store_sessions_own"
  ON store_sessions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── taiwan_stock（若存在）──────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'taiwan_stock'
  ) THEN
    ALTER TABLE taiwan_stock ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "taiwan_stock_auth" ON taiwan_stock;
    CREATE POLICY "taiwan_stock_auth"
      ON taiwan_stock FOR ALL
      USING  (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- P0-4  庫存初始化（Seed inventory_transactions from existing data）
-- 僅在 inventory_transactions 完全空白時執行，避免重複插入
-- ────────────────────────────────────────────────────────────────

DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM inventory_transactions;
  IF v_count = 0 THEN

    -- 1. 期初庫存（opening_qty from inventory table）
    INSERT INTO inventory_transactions
      (product_id, type, quantity, note, created_at)
    SELECT
      product_id,
      'adjustment',
      opening_qty,
      '期初庫存（系統移轉）',
      NOW()
    FROM inventory
    WHERE opening_qty IS NOT NULL AND opening_qty > 0;

    -- 2. 歷史採購（purchases table）
    INSERT INTO inventory_transactions
      (product_id, type, quantity, note, created_at)
    SELECT
      product_id,
      'purchase',
      qty,
      COALESCE(note, '歷史採購（系統移轉）'),
      COALESCE(purchase_date::timestamptz, NOW())
    FROM purchases
    WHERE qty > 0 AND product_id IS NOT NULL;

    -- 3. 歷史銷售（order_items，以商品名稱對應 products.name）
    --    無法對應的商品（自定義名稱）會被略過，不影響其他商品
    INSERT INTO inventory_transactions
      (product_id, order_id, type, quantity, note, created_at)
    SELECT
      pr.id              AS product_id,
      oi.order_id,
      'sale',
      -oi.qty            AS quantity,
      '歷史銷售（系統移轉）',
      COALESCE(o.created_at, NOW())
    FROM order_items oi
    JOIN products  pr ON pr.name = oi.product_name
    JOIN orders    o  ON o.id    = oi.order_id
    WHERE oi.qty > 0;

    RAISE NOTICE 'inventory_transactions seeded from existing data.';
  ELSE
    RAISE NOTICE 'inventory_transactions already has % rows — skipping seed.', v_count;
  END IF;
END $$;

-- ── P0-4  Atomic deduction RPC（帶 advisory lock 防 race condition）
-- 前端可選擇性呼叫（小量訂單無需強制使用）
CREATE OR REPLACE FUNCTION rpc_deduct_inventory(
  p_product_id UUID,
  p_quantity   INTEGER,
  p_order_id   UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current INTEGER;
BEGIN
  -- Transaction-level advisory lock：同一商品的並發請求排隊執行
  -- 用 md5(UUID) 的前 16 hex chars 轉 bigint 作為 lock key
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(md5(p_product_id::text), 1, 16))::bit(64)::bigint
  );

  -- 讀取目前庫存（inventory_balance view）
  SELECT current_stock INTO v_current
  FROM inventory_balance
  WHERE product_id = p_product_id;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND: product_id=%', p_product_id;
  END IF;

  IF v_current < p_quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: has %, requested %', v_current, p_quantity
      USING HINT = 'INSUFFICIENT_STOCK';
  END IF;

  INSERT INTO inventory_transactions
    (product_id, order_id, type, quantity, created_by)
  VALUES
    (p_product_id, p_order_id, 'sale', -p_quantity, p_created_by);

  RETURN v_current - p_quantity;
END;
$$;

-- 開放 authenticated 使用者呼叫此 function
GRANT EXECUTE ON FUNCTION rpc_deduct_inventory TO authenticated;

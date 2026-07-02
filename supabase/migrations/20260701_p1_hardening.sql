-- ================================================================
-- JelloJam ERP — P0/P1 Hardening Migration
-- 2026-07-01
--
-- ⚠️  REVIEW BEFORE APPLYING. This migration changes RLS so that a
--     logged-in STOREFRONT customer can no longer read/write other
--     customers' data. It depends on a `staff_accounts` table to tell
--     staff apart from customers. Read section 0 first.
--
-- Fixes, keyed to the review findings + PRD P0 items:
--   §0  staff_accounts + is_staff() helper (prerequisite for RLS split)
--   §1  inventory_transactions TABLE + inventory_balance VIEW  (P0-4 schema
--        the existing 20260527_p0_security.sql already REFERENCES but never
--        creates — makes the migration set self-consistent)
--   §2  RLS rewrite: staff vs. customer vs. anon on orders / order_items /
--        customers / inventory / purchases / expenses / points_transactions /
--        inventory_transactions / staff_accounts        (P0-5, finding #4/#5)
--   §3  line_tokens: remove USING(true) SELECT; exchange via RPC   (finding)
--   §4  order_status_logs: DB trigger + immutable (INSERT/SELECT only)  (P0-6)
--   §5  create_order() SECURITY DEFINER RPC — server-side price recompute,
--        coupon validation, atomic stock deduction, idempotency   (P0-1/3/4)
--   §6  redeem_points() RPC — server-authoritative points redemption (finding)
--   §7  merge_orders_transaction() RPC (referenced by MergeOrders.vue,
--        defined nowhere)                                          (finding)
--   §8  invoices + invoice_errors tables (P0-2 e-invoice scaffolding)
--   §9  pg_cron daily RLS audit (PRD P0-5 AC-5)
--
-- Rollout order (see REVIEW_REPORT.md §"部署順序"):
--   1. Populate staff_accounts with every ERP staff auth.uid FIRST.
--   2. Apply this migration in a maintenance window.
--   3. Point StoreCheckout.submitOrder at create_order() (frontend follow-up).
-- ================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- §0  Staff identity — the missing discriminator behind every RLS bug
-- ─────────────────────────────────────────────────────────────────
-- The shipped policies used `auth.role() = 'authenticated'`, but storefront
-- customers who sign in via Google/LINE OAuth are ALSO 'authenticated'. We need
-- to distinguish ERP staff from customers. staff_accounts holds staff auth uids.

CREATE TABLE IF NOT EXISTS staff_accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'staff',   -- 'admin' | 'staff'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper: is the current JWT a staff member?  STABLE so the planner caches it.
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM staff_accounts s WHERE s.user_id = auth.uid());
$$;

-- Helper: the customer row owned by the current storefront JWT.
CREATE OR REPLACE FUNCTION current_customer_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id FROM customers c WHERE c.auth_user_id = auth.uid() LIMIT 1;
$$;

ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_accounts_self_read" ON staff_accounts;
DROP POLICY IF EXISTS "staff_accounts_admin_all" ON staff_accounts;
-- A staff member can see the roster; only admins can modify it.
CREATE POLICY "staff_accounts_self_read" ON staff_accounts
  FOR SELECT USING (is_staff());
CREATE POLICY "staff_accounts_admin_all" ON staff_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff_accounts s WHERE s.user_id = auth.uid() AND s.role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────
-- §1  inventory_transactions + inventory_balance  (P0-4 missing schema)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  order_id   UUID,
  type       TEXT NOT NULL CHECK (type IN ('purchase','sale','return','adjustment','sale_reversal')),
  quantity   INTEGER NOT NULL,   -- signed: +in / -out
  note       TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_txn_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_order   ON inventory_transactions(order_id);

CREATE OR REPLACE VIEW inventory_balance AS
  SELECT product_id, SUM(quantity)::INTEGER AS current_stock
  FROM inventory_transactions
  GROUP BY product_id;

-- ─────────────────────────────────────────────────────────────────
-- §2  RLS rewrite — staff vs. customer vs. anon
-- ─────────────────────────────────────────────────────────────────

-- ── orders ───────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_authenticated"      ON orders;
DROP POLICY IF EXISTS "orders_staff_all"          ON orders;
DROP POLICY IF EXISTS "orders_customer_select"    ON orders;
-- Staff: full access.
CREATE POLICY "orders_staff_all" ON orders
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());
-- Customer: read ONLY their own orders. No direct INSERT/UPDATE/DELETE —
-- order creation goes through create_order() (SECURITY DEFINER).
CREATE POLICY "orders_customer_select" ON orders
  FOR SELECT USING (customer_id = current_customer_id());

-- ── order_items ──────────────────────────────────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_authenticated"    ON order_items;
DROP POLICY IF EXISTS "order_items_staff_all"        ON order_items;
DROP POLICY IF EXISTS "order_items_customer_select"  ON order_items;
CREATE POLICY "order_items_staff_all" ON order_items
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "order_items_customer_select" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
              AND o.customer_id = current_customer_id())
  );

-- ── customers ────────────────────────────────────────────────────
-- Remove the over-broad customers_erp_all (auth.role()='authenticated').
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_erp_all"            ON customers;
DROP POLICY IF EXISTS "customers_staff_all"          ON customers;
DROP POLICY IF EXISTS "customers_storefront_select"  ON customers;
DROP POLICY IF EXISTS "customers_storefront_update"  ON customers;
DROP POLICY IF EXISTS "customers_storefront_insert"  ON customers;
CREATE POLICY "customers_staff_all" ON customers
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "customers_storefront_select" ON customers
  FOR SELECT USING (auth.uid() = auth_user_id);
-- Customers may update only their own row. NOTE: current_points / lifetime_points
-- are protected by the trigger below so customers cannot self-grant points.
CREATE POLICY "customers_storefront_update" ON customers
  FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "customers_storefront_insert" ON customers
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Reject customer-driven changes to points columns (only service_role / RPCs).
CREATE OR REPLACE FUNCTION guard_customer_points()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF is_staff() THEN RETURN NEW; END IF;               -- staff/RPC path allowed
  IF NEW.current_points  IS DISTINCT FROM OLD.current_points
  OR NEW.lifetime_points IS DISTINCT FROM OLD.lifetime_points THEN
    RAISE EXCEPTION 'POINTS_READONLY: points may only be changed server-side';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_customer_points ON customers;
CREATE TRIGGER trg_guard_customer_points
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION guard_customer_points();

-- ── staff-only business tables (no customer/anon access at all) ───
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['inventory','purchases','expenses','points_transactions',
                           'inventory_transactions','taiwan_stock','opening_stock'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_authenticated', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_staff_all', t);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL USING (is_staff()) WITH CHECK (is_staff())',
        t||'_staff_all', t);
    END IF;
  END LOOP;
END $$;

-- points_transactions: customers may READ their own ledger (member page).
DROP POLICY IF EXISTS "points_txn_customer_select" ON points_transactions;
CREATE POLICY "points_txn_customer_select" ON points_transactions
  FOR SELECT USING (customer_id = current_customer_id());

-- ─────────────────────────────────────────────────────────────────
-- §3  line_tokens — stop anon full-table enumeration
-- ─────────────────────────────────────────────────────────────────
-- The old `USING (true)` SELECT let anyone list every {state -> customer_id}.
-- Exchange must go through a keyed SECURITY DEFINER RPC instead.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='line_tokens') THEN
    EXECUTE 'ALTER TABLE line_tokens ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "line_tokens_select" ON line_tokens';
    EXECUTE 'DROP POLICY IF EXISTS "line_tokens_staff_read" ON line_tokens';
    EXECUTE 'CREATE POLICY "line_tokens_staff_read" ON line_tokens
               FOR SELECT USING (is_staff())';
  END IF;
END $$;

-- Keyed exchange: returns exactly the row matching a known state, then deletes
-- it (single-use). anon may EXECUTE this but cannot scan the table.
CREATE OR REPLACE FUNCTION exchange_line_token(p_state TEXT)
RETURNS TABLE (customer_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    DELETE FROM line_tokens
    WHERE state = p_state AND expires_at > NOW()
    RETURNING line_tokens.customer_id;
END; $$;
GRANT EXECUTE ON FUNCTION exchange_line_token(TEXT) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────
-- §4  order_status_logs — DB trigger + immutable  (P0-6)
-- ─────────────────────────────────────────────────────────────────
-- Every status change (batch, single, webhook, or malicious direct UPDATE)
-- is logged by the DB itself. Client-side inserts become redundant.
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_authenticated_all" ON order_status_logs;
DROP POLICY IF EXISTS "logs_staff_select"      ON order_status_logs;
-- Read: staff only. No UPDATE/DELETE policies exist → history is immutable.
CREATE POLICY "logs_staff_select" ON order_status_logs
  FOR SELECT USING (is_staff());

CREATE OR REPLACE FUNCTION fn_log_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_logs (order_id, order_no, from_status, to_status, changed_by)
    VALUES (NEW.id, NEW.order_no, OLD.status, NEW.status,
            COALESCE(auth.uid()::text, 'system'));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_order_status_change ON orders;
CREATE TRIGGER trg_order_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_log_status_change();

-- ─────────────────────────────────────────────────────────────────
-- §5  create_order() — the server-side authority  (P0-1 / P0-3 / P0-4)
-- ─────────────────────────────────────────────────────────────────
-- Accepts only product_id + qty (+ optional coupon). Recomputes every price
-- from products, deducts stock atomically (advisory lock), enforces the
-- idempotency key, and inserts orders + order_items + inventory_transactions
-- in ONE transaction. The frontend must stop trusting client prices and call
-- this instead of raw table inserts.
--
-- p_items: jsonb array of { "product_id": uuid, "qty": int }
CREATE OR REPLACE FUNCTION create_order(
  p_idempotency_key TEXT,
  p_customer_id     UUID,
  p_customer_name   TEXT,
  p_phone           TEXT,
  p_email           TEXT,
  p_shipping_fee    NUMERIC,
  p_addon_amount    NUMERIC,
  p_coupon_code     TEXT,
  p_items           JSONB
)
RETURNS TABLE (order_id UUID, order_no TEXT, total NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing   orders%ROWTYPE;
  v_order_id   UUID;
  v_order_no   TEXT;
  v_item       JSONB;
  v_pid        UUID;
  v_qty        INTEGER;
  v_price      NUMERIC;
  v_stock      INTEGER;
  v_subtotal   NUMERIC := 0;
  v_discount   NUMERIC := 0;
  v_total      NUMERIC := 0;
  v_coupon     RECORD;
BEGIN
  -- Idempotency: if this key already produced an order, return it.
  SELECT * INTO v_existing FROM orders WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing.id, v_existing.order_no,
                        COALESCE(v_existing.selling_price, 0);
    RETURN;
  END IF;

  v_order_no := 'ORD' || to_char(NOW() AT TIME ZONE 'Asia/Taipei','YYYYMMDD')
                       || lpad((floor(random()*10000))::text, 4, '0');
  v_order_id := gen_random_uuid();

  INSERT INTO orders (id, order_no, idempotency_key, customer_id, customer_name,
                      phone, email, status, sales_date, addon_amount, "711_fee")
  VALUES (v_order_id, v_order_no, p_idempotency_key, p_customer_id, p_customer_name,
          p_phone, p_email, '已填表單',
          (NOW() AT TIME ZONE 'Asia/Taipei')::date,
          COALESCE(p_addon_amount,0), COALESCE(p_shipping_fee,0));

  -- Per-item: lock, verify stock, recompute price, insert item + stock movement.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'qty')::int;
    IF v_qty <= 0 THEN RAISE EXCEPTION 'INVALID_QTY'; END IF;

    PERFORM pg_advisory_xact_lock(('x'||substr(md5(v_pid::text),1,16))::bit(64)::bigint);

    SELECT price INTO v_price FROM products WHERE id = v_pid;
    IF v_price IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', v_pid; END IF;

    SELECT current_stock INTO v_stock FROM inventory_balance WHERE product_id = v_pid;
    IF COALESCE(v_stock,0) < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: product=% has=% want=%', v_pid, COALESCE(v_stock,0), v_qty
        USING HINT = 'INSUFFICIENT_STOCK';
    END IF;

    INSERT INTO order_items (order_id, product_id, product_name, qty, selling_price)
    SELECT v_order_id, v_pid, p.name, v_qty, v_price FROM products p WHERE p.id = v_pid;

    INSERT INTO inventory_transactions (product_id, order_id, type, quantity, note)
    VALUES (v_pid, v_order_id, 'sale', -v_qty, '前台訂單 '||v_order_no);

    v_subtotal := v_subtotal + v_price * v_qty;
  END LOOP;

  -- Coupon: validate + compute discount server-side (min_order_amount, expiry,
  -- usage_limit) and increment atomically.
  IF p_coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon FROM coupons
    WHERE code = p_coupon_code AND is_active
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (usage_limit IS NULL OR used_count < usage_limit)
    FOR UPDATE;
    IF FOUND AND v_subtotal >= COALESCE(v_coupon.min_order_amount,0) THEN
      IF v_coupon.discount_type = 'percent' THEN
        v_discount := floor(v_subtotal * v_coupon.discount_value / 100);
      ELSE
        v_discount := LEAST(v_coupon.discount_value, v_subtotal);
      END IF;
      UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
    END IF;
  END IF;

  v_total := GREATEST(0, v_subtotal + COALESCE(p_shipping_fee,0)
                       + COALESCE(p_addon_amount,0) - v_discount);

  UPDATE orders SET selling_price = v_total, discount_amount = NULLIF(v_discount,0),
                    coupon_code = p_coupon_code
  WHERE id = v_order_id;

  RETURN QUERY SELECT v_order_id, v_order_no, v_total;
END; $$;
GRANT EXECUTE ON FUNCTION create_order(TEXT,UUID,TEXT,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,JSONB)
  TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────
-- §6  redeem_points() — server-authoritative redemption
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION redeem_points(p_reward_name TEXT, p_cost INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cid UUID; v_cur INTEGER;
BEGIN
  v_cid := current_customer_id();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_cost <= 0 THEN RAISE EXCEPTION 'INVALID_COST'; END IF;

  SELECT current_points INTO v_cur FROM customers WHERE id = v_cid FOR UPDATE;
  IF COALESCE(v_cur,0) < p_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS: has=% want=%', COALESCE(v_cur,0), p_cost;
  END IF;

  UPDATE customers SET current_points = current_points - p_cost WHERE id = v_cid;
  INSERT INTO points_transactions (customer_id, type, points, note)
  VALUES (v_cid, 'redeem', -p_cost, '兌換「'||p_reward_name||'」');
  RETURN v_cur - p_cost;
END; $$;
GRANT EXECUTE ON FUNCTION redeem_points(TEXT,INTEGER) TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- §7  merge_orders_transaction() — referenced by MergeOrders.vue
-- ─────────────────────────────────────────────────────────────────
-- Moves items from secondary orders into the primary, flags sources as 已併單,
-- and carries their money fields — atomically. Same-customer guard included.
CREATE OR REPLACE FUNCTION merge_orders_transaction(
  p_primary_id    UUID,
  p_secondary_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cust UUID;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'STAFF_ONLY'; END IF;

  SELECT customer_id INTO v_cust FROM orders WHERE id = p_primary_id;
  -- Guard: every secondary must belong to the same customer and not be terminal.
  IF EXISTS (
    SELECT 1 FROM orders
    WHERE id = ANY(p_secondary_ids)
      AND (customer_id IS DISTINCT FROM v_cust
           OR status IN ('已出貨','已完成','已併單'))
  ) THEN
    RAISE EXCEPTION 'MERGE_GUARD: secondary orders must be same customer and not shipped/completed/merged';
  END IF;

  -- Move items to the primary.
  UPDATE order_items SET order_id = p_primary_id
  WHERE order_id = ANY(p_secondary_ids);

  -- Carry money fields onto the primary so totals aren't lost.
  UPDATE orders p SET
    payment_amount = COALESCE(p.payment_amount,0) + COALESCE(s.sum_pay,0),
    addon_amount   = COALESCE(p.addon_amount,0)   + COALESCE(s.sum_addon,0)
  FROM (
    SELECT SUM(COALESCE(payment_amount,0)) sum_pay,
           SUM(COALESCE(addon_amount,0))   sum_addon
    FROM orders WHERE id = ANY(p_secondary_ids)
  ) s
  WHERE p.id = p_primary_id;

  -- Flag sources as merged (excluded from revenue/points/stock by the app).
  UPDATE orders SET status = '已併單' WHERE id = ANY(p_secondary_ids);
END; $$;
GRANT EXECUTE ON FUNCTION merge_orders_transaction(UUID,UUID[]) TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- §8  invoices + invoice_errors  (P0-2 Taiwan e-invoice scaffolding)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number TEXT,
  invoice_date   DATE,
  carrier_type   TEXT,          -- 'mobile_barcode' | 'tax_id' | 'member' | null
  carrier_id     TEXT,
  tax_id         TEXT,          -- 統一編號 (B2B)
  tax_amount     NUMERIC,
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending|issued|voided|allowance
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS invoice_errors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID,
  error_code TEXT,
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_staff_all"        ON invoices;
DROP POLICY IF EXISTS "invoices_customer_select"  ON invoices;
DROP POLICY IF EXISTS "invoice_errors_staff_all"  ON invoice_errors;
CREATE POLICY "invoices_staff_all" ON invoices
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "invoices_customer_select" ON invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = invoices.order_id
              AND o.customer_id = current_customer_id())
  );
CREATE POLICY "invoice_errors_staff_all" ON invoice_errors
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- ─────────────────────────────────────────────────────────────────
-- §9  Daily RLS audit  (PRD P0-5 AC-5)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rls_audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION audit_rls_disabled()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO rls_audit_log (table_name)
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = false;
END; $$;
-- Schedule (requires pg_cron extension enabled on the project):
--   SELECT cron.schedule('rls-audit-daily', '0 3 * * *', 'SELECT audit_rls_disabled()');

COMMIT;

-- ================================================================
-- POST-APPLY CHECKS (run manually with service_role):
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--   -- anon must get [] here, not rows:
--   -- curl -H "apikey: <ANON>" .../rest/v1/orders?select=*
-- ================================================================

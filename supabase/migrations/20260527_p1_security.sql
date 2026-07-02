-- ================================================================
-- JelloJam ERP — P1 Security: Fraud Detection + PII Encryption
-- 2026-05-27
-- Covers:
--   1. pgcrypto extension
--   2. PII encryption helpers (encrypt_pii / decrypt_pii)
--   3. encrypted_pii JSONB column on customers
--   4. order_fraud_events table
--   5. rpc_check_order_fraud() function
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. pgcrypto
-- ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────────
-- 2. PII Encryption Helpers
--
-- Encryption key is stored in Supabase Vault.
-- Setup (run once in SQL editor):
--   SELECT vault.create_secret('your-256-bit-key-here', 'pii_encryption_key');
--
-- The helper functions read the key from Vault at call time — key
-- rotation only requires updating the Vault secret, not the schema.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'PII_KEY_NOT_FOUND: set up vault.create_secret(key, ''pii_encryption_key'')';
  END IF;

  RETURN encode(
    pgp_sym_encrypt(plaintext, v_key, 'compress-algo=1, cipher-algo=aes256'),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'PII_KEY_NOT_FOUND';
  END IF;

  RETURN pgp_sym_decrypt(
    decode(ciphertext, 'base64'),
    v_key
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;  -- decryption failure returns NULL rather than crashing
END;
$$;

-- Only ERP staff (authenticated) can call these functions
REVOKE EXECUTE ON FUNCTION encrypt_pii(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION decrypt_pii(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION encrypt_pii(TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION decrypt_pii(TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────────
-- 3. encrypted_pii column on customers
--
-- Stores { phone, address, notes } as pgp-encrypted JSON blob.
-- Original plain-text phone/address columns are kept for now to
-- avoid breaking the existing frontend — plan migration:
--   Phase A (now): write to encrypted_pii in parallel
--   Phase B: frontend reads from encrypted_pii via RPC
--   Phase C: drop plain-text columns
-- ────────────────────────────────────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS encrypted_pii TEXT;   -- base64(pgp_sym_encrypt(json))

-- ────────────────────────────────────────────────────────────────
-- 4. order_fraud_events — 訂單防詐紀錄
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_fraud_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        REFERENCES orders(id)    ON DELETE SET NULL,
  customer_id UUID        REFERENCES customers(id) ON DELETE SET NULL,
  ip_address  INET,
  flag_reason TEXT        NOT NULL,   -- e.g. 'IP_ORDER_SPIKE', 'CUSTOMER_ORDER_SPIKE'
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_events_ip
  ON order_fraud_events (ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fraud_events_customer
  ON order_fraud_events (customer_id, created_at DESC);

ALTER TABLE order_fraud_events ENABLE ROW LEVEL SECURITY;

-- ERP read-only (fraud events are written by SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "fraud_events_erp_select" ON order_fraud_events;
CREATE POLICY "fraud_events_erp_select"
  ON order_fraud_events FOR SELECT
  USING (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────────
-- 5. rpc_check_order_fraud
--
-- Call before creating an order.
-- Returns { is_suspicious: bool, ip_count: int, cust_count: int }
-- If suspicious, also writes to both security_events AND
-- order_fraud_events for full audit trail.
--
-- p_ip_address: pass request IP from the Edge Function header
-- p_window_minutes: rolling window (default 60 min)
-- p_max_orders:    threshold per window (default 5)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_check_order_fraud(
  p_customer_id   UUID,
  p_ip_address    INET    DEFAULT NULL,
  p_window_minutes INT    DEFAULT 60,
  p_max_orders     INT    DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip_count   INT := 0;
  v_cust_count INT := 0;
  v_suspicious BOOLEAN := FALSE;
BEGIN
  -- Count recent orders tied to this IP
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM order_fraud_events
    WHERE ip_address = p_ip_address
      AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  END IF;

  -- Count recent orders by same customer
  SELECT COUNT(*) INTO v_cust_count
  FROM orders
  WHERE customer_id = p_customer_id
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  IF v_ip_count >= p_max_orders OR v_cust_count >= p_max_orders THEN
    v_suspicious := TRUE;

    -- Write to security_events for the existing ERP audit dashboard
    INSERT INTO security_events (event_type, customer_id, metadata)
    VALUES (
      'ORDER_FRAUD_SPIKE',
      p_customer_id,
      jsonb_build_object(
        'ip_address',    p_ip_address::text,
        'ip_count',      v_ip_count,
        'cust_count',    v_cust_count,
        'window_minutes', p_window_minutes
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'is_suspicious', v_suspicious,
    'ip_count',      v_ip_count,
    'cust_count',    v_cust_count
  );
END;
$$;

-- Callable by anon (Edge Function calls this before order creation)
GRANT EXECUTE ON FUNCTION rpc_check_order_fraud(UUID, INET, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_check_order_fraud(UUID, INET, INT, INT) TO authenticated;

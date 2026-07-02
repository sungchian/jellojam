-- ================================================================
-- JelloJam ERP — P1 Orders Enhancement
-- 2026-05-27
-- Covers: idempotency_key, payment columns
--
-- These columns are also required by P0-1 (payment gateway) — adding
-- them here so schema is ready before the Edge Function is deployed.
-- ================================================================

ALTER TABLE orders
  -- Idempotency: client generates UUID v4 before submitting.
  -- DB UNIQUE prevents duplicate orders on network retry.
  ADD COLUMN IF NOT EXISTS idempotency_key  TEXT        UNIQUE,

  -- Payment lifecycle
  ADD COLUMN IF NOT EXISTS payment_status   TEXT        NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'awaiting_payment', 'paid', 'failed', 'refunded', 'cancelled')),
  ADD COLUMN IF NOT EXISTS payment_method   TEXT
    CHECK (payment_method IN ('credit_card', 'atm', 'line_pay', 'manual', NULL)),
  ADD COLUMN IF NOT EXISTS payment_ref      TEXT,       -- gateway transaction ID
  ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMPTZ;

-- Fast lookup for "show all unpaid orders" dashboard widget
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON orders (payment_status, created_at DESC)
  WHERE payment_status IN ('pending', 'awaiting_payment');

-- Lookup by idempotency key (gateway webhook deduplication)
CREATE INDEX IF NOT EXISTS idx_orders_idempotency
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

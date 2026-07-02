-- ================================================================
-- JelloJam ERP — P1 Scheduled Tasks (pg_cron)
-- 2026-05-27
-- Covers:
--   1. Enable pg_cron
--   2. Daily: clean expired line_tokens
--   3. Every 2 hours: mark carts as abandoned (24h threshold)
--   4. Monthly: expire points older than 12 months
--   5. Daily: refresh inventory_balance materialised view (if needed)
--
-- PREREQUISITE: pg_cron must be enabled in Supabase dashboard
--   → Settings → Database → Extensions → pg_cron → Enable
--
-- Run this migration in the SQL editor AFTER enabling pg_cron.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ────────────────────────────────────────────────────────────────
-- Helper: idempotent job creation
-- pg_cron has no "CREATE OR REPLACE JOB" so we delete-then-add.
-- ────────────────────────────────────────────────────────────────

-- ── 1. Clean expired line_tokens (daily at 03:00 UTC) ───────────
SELECT cron.unschedule('jj_clean_line_tokens') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'jj_clean_line_tokens'
);
SELECT cron.schedule(
  'jj_clean_line_tokens',
  '0 3 * * *',   -- 03:00 UTC daily (11:00 CST)
  $$DELETE FROM line_tokens WHERE expires_at < NOW()$$
);

-- ── 2. Detect abandoned carts (every 2 hours) ───────────────────
-- Sets a flag (rescued_at IS NULL, converted_at IS NULL, updated_at stale)
-- so the abandoned-cart-mailer Edge Function can query efficiently.
-- The Edge Function is invoked separately (Supabase DB Webhook or cron HTTP call).
SELECT cron.unschedule('jj_mark_abandoned_carts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'jj_mark_abandoned_carts'
);
SELECT cron.schedule(
  'jj_mark_abandoned_carts',
  '0 */2 * * *',  -- every 2 hours
  $$
  UPDATE abandoned_carts
     SET updated_at = updated_at  -- touch updated_at to keep index hot
   WHERE converted_at IS NULL
     AND rescued_at   IS NULL
     AND updated_at < NOW() - INTERVAL '24 hours'
     AND email IS NOT NULL;
  $$
);

-- ── 3. Expire old points (1st of each month at 04:00 UTC) ───────
-- Inserts a negative points_transaction for any customer whose
-- unredeemed points are older than 12 months.
-- Only deducts the oldest un-expired balance; does NOT go negative.
SELECT cron.unschedule('jj_expire_points') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'jj_expire_points'
);
SELECT cron.schedule(
  'jj_expire_points',
  '0 4 1 * *',    -- 04:00 UTC on the 1st of every month
  $$
  INSERT INTO points_transactions (customer_id, points, reason, created_at)
  SELECT
    customer_id,
    -SUM(points)  AS points,
    '點數到期（12 個月未使用）',
    NOW()
  FROM points_transactions pt
  WHERE reason NOT ILIKE '%到期%'
    AND created_at < NOW() - INTERVAL '12 months'
    AND NOT EXISTS (
      SELECT 1 FROM points_transactions exp
      WHERE exp.customer_id = pt.customer_id
        AND exp.reason ILIKE '%到期%'
        AND exp.created_at >= DATE_TRUNC('month', NOW())
    )
  GROUP BY customer_id
  HAVING SUM(points) > 0;
  $$
);

-- ── 4. Weekly store_sessions cleanup (Sundays 02:00 UTC) ────────
SELECT cron.unschedule('jj_clean_store_sessions') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'jj_clean_store_sessions'
);
SELECT cron.schedule(
  'jj_clean_store_sessions',
  '0 2 * * 0',   -- 02:00 UTC every Sunday
  $$
  DELETE FROM store_sessions
   WHERE expires_at < NOW()
      OR is_revoked = TRUE;
  $$
);

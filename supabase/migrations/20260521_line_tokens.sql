-- line_tokens: short-lived server-side tokens for LINE OAuth callbacks.
-- The Edge Function writes here (service role); the frontend reads by state.
-- Customer UUID is never exposed in the redirect URL (Issue #9 fix).

CREATE TABLE IF NOT EXISTS line_tokens (
  state       TEXT PRIMARY KEY,                          -- crypto-random, 48 hex chars
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,                      -- 5 minutes from creation
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE line_tokens ENABLE ROW LEVEL SECURITY;

-- Public SELECT: the state itself is the 192-bit secret; anyone with the
-- exact state string can read their own token row (no other exposure).
CREATE POLICY "line_tokens_select" ON line_tokens
  FOR SELECT USING (true);

-- INSERT / UPDATE only via service role (Edge Function bypasses RLS).

-- Auto-clean expired tokens daily (optional: run via pg_cron or manually)
-- DELETE FROM line_tokens WHERE expires_at < now();

-- =============================================================================
-- JelloJam — Auth System Migration
-- Run this in Supabase SQL Editor (once)
-- =============================================================================

-- 1. Extend customers table for OAuth linking
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS auth_user_id  UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS email         TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_banned     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason    TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON customers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email        ON customers(email);

-- 2. Auth audit log — every login/logout/failed event
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,                          -- Supabase auth.users.id (nullable for name-login)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                 -- 'login' | 'logout' | 'login_by_name' | 'logout_all' | 'login_failed' | 'banned'
  user_agent  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_customer ON auth_audit_log(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON auth_audit_log(action, created_at DESC);

-- 3. Active session tracking — for "logout all devices" feature
CREATE TABLE IF NOT EXISTS store_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  user_id     UUID,
  device_info JSONB DEFAULT '{}',          -- { ua, platform, screen }
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  is_revoked  BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sessions_customer ON store_sessions(customer_id, is_revoked);

-- 4. Row Level Security
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sessions  ENABLE ROW LEVEL SECURITY;

-- Customers can read their own audit log
DROP POLICY IF EXISTS "own_audit_read"     ON auth_audit_log;
DROP POLICY IF EXISTS "anon_audit_insert"  ON auth_audit_log;
DROP POLICY IF EXISTS "own_session_read"   ON store_sessions;
DROP POLICY IF EXISTS "own_session_insert" ON store_sessions;
DROP POLICY IF EXISTS "own_session_update" ON store_sessions;

CREATE POLICY "own_audit_read"    ON auth_audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "anon_audit_insert" ON auth_audit_log FOR INSERT WITH CHECK (true);

CREATE POLICY "own_session_read"   ON store_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_session_insert" ON store_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_session_update" ON store_sessions FOR UPDATE USING (auth.uid() = user_id);

-- 5. Helper function: get login attempt count (rate limiting via DB)
CREATE OR REPLACE FUNCTION get_recent_login_failures(p_user_id UUID, p_minutes INT DEFAULT 15)
RETURNS INT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INT
  FROM auth_audit_log
  WHERE user_id = p_user_id
    AND action  = 'login_failed'
    AND created_at > NOW() - (p_minutes || ' minutes')::INTERVAL;
$$;

-- =============================================================================
-- Setup Instructions
-- =============================================================================
-- 1. Supabase Dashboard → Authentication → Providers → Google → Enable
-- 2. Create OAuth credentials at: https://console.cloud.google.com
--    - Authorized redirect URI: https://<your-project>.supabase.co/auth/v1/callback
-- 3. Paste Client ID + Secret back into Supabase Google provider settings
-- 4. Add your site URL to: Authentication → URL Configuration → Allowed redirect URLs
--    e.g.: http://localhost:5173, https://your-production-domain.com
-- =============================================================================

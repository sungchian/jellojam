-- ================================================================
-- 20260712_p1_resolve_customer — 前台顧客解析/連結改走 SECURITY DEFINER RPC
-- ================================================================
-- 背景（P1）：
--   storeAuth.js 的 _resolveCustomer 直接對 customers 表 select/update/insert：
--     1. 依 auth_user_id 找（回訪顧客）—— RLS 下 OK
--     2. 依 email 找別人的舊資料列來「連結」—— 但新登入的 auth.uid() 配不到
--        該列，RLS SELECT 直接擋掉 → 回 null → 老顧客被當新客重建空帳號
--        （0 點、看不到歷史訂單）
--     3. insert fallback（不帶 auth_user_id）—— 被 customers INSERT 政策
--        `WITH CHECK (auth.uid() = auth_user_id)` 擋掉
--   違反「前台一律走 RPC、不直接寫表」鐵則，且行為在 RLS 下是壞的。
--
--   本 RPC 以 SECURITY DEFINER 執行（繞過 RLS），一次原子完成
--   「找→連結→建立」，並修掉原邏輯的兩個安全/正確性問題：
--     - email 連結只認 auth_user_id IS NULL 的列（不搶已綁其他帳號的顧客）
--     - 合成 LINE 信箱不參與 email 比對（那條路由 super-service 負責）
--
-- 前端搭配：storeAuth._resolveCustomer 會優先呼叫本 RPC，若尚未部署
--   （PGRST202）則 fall back 到舊邏輯 —— 所以「先合併前端、後部署此檔」
--   不會壞現有登入，部署後自動切換到正確路徑。
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION resolve_customer(
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url   TEXT DEFAULT NULL
)
RETURNS SETOF customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT := auth.jwt() ->> 'email';
  v_row   customers%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- 1. 依 auth_user_id 找（回訪顧客）
  SELECT * INTO v_row FROM customers WHERE auth_user_id = v_uid LIMIT 1;
  IF FOUND THEN
    UPDATE customers SET last_login_at = NOW() WHERE id = v_row.id;
    RETURN QUERY SELECT * FROM customers WHERE id = v_row.id;
    RETURN;
  END IF;

  -- 2. 依 email 連結既有顧客（LINE 匯入 / ERP 建立、但還沒綁 auth 帳號者）。
  --    只認 auth_user_id IS NULL 的列，避免搶走已綁其他帳號的顧客；
  --    合成 LINE 信箱不參與比對。
  IF v_email IS NOT NULL AND v_email <> ''
     AND v_email NOT LIKE '%@line.jellojam.local' THEN
    SELECT * INTO v_row FROM customers
    WHERE lower(email) = lower(v_email) AND auth_user_id IS NULL
    LIMIT 1;
    IF FOUND THEN
      UPDATE customers
         SET auth_user_id  = v_uid,
             avatar_url     = COALESCE(p_avatar_url, avatar_url),
             last_login_at  = NOW()
       WHERE id = v_row.id;
      RETURN QUERY SELECT * FROM customers WHERE id = v_row.id;
      RETURN;
    END IF;
  END IF;

  -- 3. 建立新顧客（首次 Google / email 登入）
  RETURN QUERY
    INSERT INTO customers (auth_user_id, email, display_name, avatar_url,
                           current_points, lifetime_points, last_login_at)
    VALUES (
      v_uid,
      NULLIF(v_email, ''),
      COALESCE(NULLIF(p_display_name, ''), NULLIF(split_part(COALESCE(v_email,''),'@',1),''), '新會員'),
      p_avatar_url,
      0, 0, NOW()
    )
    RETURNING *;
END; $$;

GRANT EXECUTE ON FUNCTION resolve_customer(TEXT, TEXT) TO authenticated;

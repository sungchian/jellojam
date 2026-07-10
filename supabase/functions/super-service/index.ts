import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // ── GET: LINE redirects here after user authorises ───────────────────────
  // URL: /functions/v1/super-service?code=xxx&state=yyy
  if (req.method === 'GET') {
    const code  = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    // strip trailing slash so path concatenation never yields //store/... (breaks routing)
    const FRONTEND_URL = (Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/+$/, '')

    // NOTE: the router is history mode (createWebHistory) — hash URLs like
    // /#/store/auth land on the homepage and the error is never shown.
    // Error codes are a fixed enum the login page maps to friendly copy.
    if (!code || !state) {
      return Response.redirect(`${FRONTEND_URL}/store/auth?error=missing_params`, 302)
    }

    // Basic state sanity-check: our client always generates 'line_' prefixed states
    if (!state.startsWith('line_')) {
      return Response.redirect(`${FRONTEND_URL}/store/auth?error=invalid_state`, 302)
    }

    try {
      const customer = await processLineLogin(code, state)

      // Issue #9: never put the customer UUID in the URL.
      // Instead, the UUID was stored server-side (in line_tokens) keyed by the
      // cryptographic state.  The frontend exchanges the state for the UUID.
      // Only pass the state back — which the browser already has in sessionStorage.
      return Response.redirect(
        `${FRONTEND_URL}/?line_state=${encodeURIComponent(state)}`,
        302,
      )
    } catch (err) {
      console.error('[line-auth] error:', err)
      // Fixed code only — details stay in server logs, never in the customer's URL.
      return Response.redirect(
        `${FRONTEND_URL}/store/auth?error=line_login_failed`,
        302,
      )
    }
  }

  return new Response('Not found', { status: 404 })
})

async function processLineLogin(code: string, state: string) {
  const CHANNEL_ID     = Deno.env.get('LINE_CHANNEL_ID')!
  const CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')!
  const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // redirect_uri must exactly match LINE Developers Console + the authorization request
  const redirectUri = Deno.env.get('LINE_REDIRECT_URI')!

  // 1. Exchange code for access token
  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     CHANNEL_ID,
      client_secret: CHANNEL_SECRET,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    throw new Error(tokenData.error_description || 'LINE token exchange failed')
  }

  // 2. Get LINE profile
  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = await profileRes.json()
  if (!profile.userId) throw new Error('Failed to fetch LINE profile')

  // 3. Find or create customer
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Match by line_oauth_id (the real LINE userId, not the display LINE ID)
  let { data: customer, error: fetchErr } = await supabase
    .from('customers')
    .select('*')
    .eq('line_oauth_id', profile.userId)
    .maybeSingle()

  if (fetchErr) throw fetchErr

  if (customer) {
    const { data: updated } = await supabase
      .from('customers')
      .update({
        last_login_at: new Date().toISOString(),
        avatar_url:    profile.pictureUrl || customer.avatar_url,
      })
      .eq('id', customer.id)
      .select()
      .single()
    customer = updated ?? customer
  } else {
    const { data: created, error: createErr } = await supabase
      .from('customers')
      .insert({
        display_name:    profile.displayName,
        avatar_url:      profile.pictureUrl || null,
        line_oauth_id:   profile.userId,
        current_points:  0,
        lifetime_points: 0,
      })
      .select()
      .single()
    if (createErr) throw createErr
    customer = created
  }

  // 4. Mint a REAL Supabase Auth session for this LINE user, so the storefront
  //    runs authenticated and RLS can isolate each customer's data (previously
  //    LINE users were anonymous and could not be isolated).
  //
  //    Deterministic synthetic email per LINE identity — never collides with a
  //    real Google/email account and needs no LINE 'email' scope.
  const authEmail = (customer.email && customer.email.includes('@'))
    ? customer.email
    : `line_${profile.userId}@line.jellojam.local`

  // Create the auth user if it doesn't exist yet; otherwise reuse it.
  let authUserId: string | null = customer.auth_user_id ?? null
  let createdNow = false
  if (!authUserId) {
    const { data: createdUser, error: cuErr } = await supabase.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
      user_metadata: { provider: 'line', line_oauth_id: profile.userId, display_name: profile.displayName },
    })
    if (createdUser?.user) {
      authUserId = createdUser.user.id
      createdNow = true
    } else {
      // Already exists (e.g. re-login before customers.auth_user_id was linked):
      // find the existing user by email via pagination.
      let page = 1
      while (!authUserId && page <= 20) {
        const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
        const hit = list?.users?.find((u) => u.email === authEmail)
        if (hit) authUserId = hit.id
        if (!list || list.users.length < 200) break
        page++
      }
      if (!authUserId) throw cuErr ?? new Error('無法建立或取得 LINE 登入帳號')
    }
    // Link the customer row to this auth user (idempotent).
    await supabase.from('customers').update({ auth_user_id: authUserId }).eq('id', customer.id)
  }

  // Backfill user_metadata.provider for auth users created before this metadata
  // existed (the frontend's isLineAuth reads it). Only for LINE-only synthetic
  // accounts — never touch a real-email (possibly Google) account's metadata.
  if (authUserId && !createdNow && authEmail.endsWith('@line.jellojam.local')) {
    await supabase.auth.admin.updateUserById(authUserId, {
      user_metadata: { provider: 'line', line_oauth_id: profile.userId, display_name: profile.displayName },
    })
  }

  // Generate a one-time magic-link token; the frontend exchanges it (via
  // line_tokens keyed by state) and calls verifyOtp() to establish the session.
  const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: authEmail,
  })
  if (linkErr || !link?.properties?.hashed_token) {
    throw linkErr ?? new Error('無法簽發 LINE 登入 session')
  }

  // 5. Store { state → customer_id, token_hash } (server-side, 5-min expiry).
  //    The UUID is never exposed in the redirect URL.
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  await supabase.from('line_tokens').upsert(
    { state, customer_id: customer.id, token_hash: link.properties.hashed_token, expires_at: expiresAt },
    { onConflict: 'state' },
  )

  return customer
}

/**
 * abandoned-cart-mailer — Abandoned Cart Rescue Edge Function
 *
 * Triggered by: pg_cron HTTP call (or Supabase DB Webhook on abandoned_carts)
 *
 * Finds carts that:
 *   - Have not been converted to an order (converted_at IS NULL)
 *   - Have not yet received a rescue email (rescued_at IS NULL)
 *   - Have been stale for >= 24 hours (updated_at < NOW() - 24h)
 *   - Have an email address to send to
 *
 * Sends one rescue email per cart, then sets rescued_at = NOW().
 *
 * Required Supabase Secrets:
 *   RESEND_API_KEY   — from resend.com
 *   FROM_EMAIL       — e.g. "JelloJam <orders@jellojam.com>"
 *   SITE_URL         — e.g. "https://jellojam.com"
 *   CRON_SECRET      — shared secret for cron HTTP auth
 *
 * Deploy:
 *   supabase functions deploy abandoned-cart-mailer --project-ref iifhubablhxibpsyeagi
 *
 * pg_cron invocation (add to 20260527_p1_cron.sql after deploying):
 *   SELECT cron.schedule(
 *     'jj_abandoned_cart_mailer',
 *     '30 */2 * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://iifhubablhxibpsyeagi.functions.supabase.co/abandoned-cart-mailer',
 *       headers := '{"Authorization": "Bearer <CRON_SECRET>"}',
 *       body := '{}'
 *     )$$
 *   );
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API = 'https://api.resend.com/emails'

interface CartItem {
  id: string
  product_name: string
  price: number
  qty: number
}

interface AbandonedCart {
  id: string
  email: string
  items: CartItem[]
  total_amount: number
  customer_id: string | null
}

Deno.serve(async (req) => {
  // Verify caller is the pg_cron job (or internal). FAIL CLOSED: if CRON_SECRET
  // is not configured, reject everything — otherwise a missing env var would
  // silently make this bulk-email endpoint publicly invokable (spam / cost).
  const authHeader = req.headers.get('Authorization') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'JelloJam <orders@jellojam.com>'
  const siteUrl   = Deno.env.get('SITE_URL')   ?? 'https://jellojam.com'

  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Find carts eligible for rescue
  const { data: carts, error } = await supabase
    .from('abandoned_carts')
    .select('id, email, items, total_amount, customer_id')
    .is('converted_at', null)
    .is('rescued_at', null)
    .not('email', 'is', null)
    .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(50)   // process max 50 per run to stay within Edge Function timeout

  if (error) {
    console.error('[abandoned-cart-mailer] fetch error', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!carts || carts.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let failed = 0

  for (const cart of carts as AbandonedCart[]) {
    try {
      const items: CartItem[] = Array.isArray(cart.items) ? cart.items : []
      if (items.length === 0) continue

      const itemsHtml = items
        .map(
          (i) => `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.product_name}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">${i.qty}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">NT$ ${((i.price || 0) * i.qty).toLocaleString()}</td>
          </tr>`,
        )
        .join('')

      const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <div style="background:#f9e4ec;padding:32px 24px;text-align:center;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:24px;color:#c25c7c">🐰 您的購物車還在等您！</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #f0d6e0;border-top:none;border-radius:0 0 8px 8px">
    <p>嗨，您上次將這些可愛的娃娃放入購物車，但還沒有完成結帳喔：</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#fdf0f5">
        <th style="padding:8px;text-align:left;font-size:13px">商品</th>
        <th style="padding:8px;text-align:center;font-size:13px">數量</th>
        <th style="padding:8px;text-align:right;font-size:13px">小計</th>
      </tr>
      ${itemsHtml}
    </table>

    <p style="text-align:right;font-size:16px;font-weight:bold">
      合計：NT$ ${(cart.total_amount || 0).toLocaleString()}
    </p>

    <div style="text-align:center;margin:24px 0">
      <a href="${siteUrl}/#/store/cart"
         style="background:#c25c7c;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px">
        回到購物車完成結帳
      </a>
    </div>

    <p style="font-size:13px;color:#aaa;text-align:center">
      庫存有限，手刀搶購！如有問題請透過 LINE 聯絡我們。
    </p>
  </div>
</body>
</html>`

      const resendRes = await fetch(RESEND_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    fromEmail,
          to:      [cart.email],
          subject: '🐰 您的 JelloJam 購物車還在等您！',
          html,
        }),
      })

      if (!resendRes.ok) {
        throw new Error(await resendRes.text())
      }

      // Mark as rescued so we don't re-send
      await supabase
        .from('abandoned_carts')
        .update({ rescued_at: new Date().toISOString() })
        .eq('id', cart.id)

      sent++
    } catch (err) {
      console.error('[abandoned-cart-mailer] failed for cart', cart.id, err)
      failed++
    }
  }

  console.log(`[abandoned-cart-mailer] done — sent: ${sent}, failed: ${failed}`)

  return new Response(JSON.stringify({ ok: true, sent, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

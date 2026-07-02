/**
 * send-order-email — Order Confirmation Edge Function
 *
 * Triggered by:
 *   1. Supabase DB Webhook on orders.payment_status = 'paid'   (recommended)
 *   2. Direct POST from the payment webhook Edge Function
 *
 * Required Supabase Secrets (supabase secrets set ...):
 *   RESEND_API_KEY   — from resend.com
 *   FROM_EMAIL       — e.g. "JelloJam <orders@jellojam.com>"
 *   SITE_URL         — e.g. "https://jellojam.com"
 *
 * Request body:
 *   { order_id: string }
 *
 * Deploy:
 *   supabase functions deploy send-order-email --project-ref iifhubablhxibpsyeagi
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API = 'https://api.resend.com/emails'

// CORS restricted to the site origin (never '*'). This endpoint is server-to-
// server (DB webhook / payment webhook) so browsers shouldn't call it at all.
const ALLOWED_ORIGIN = Deno.env.get('SITE_URL') ?? 'https://www.jellojam.com'
const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // ── Auth (fail closed) ──────────────────────────────────────────────────
  // Require a shared secret so a leaked/guessed order_id can't be used to spam
  // confirmation emails. The DB webhook / payment webhook must send it.
  const fnSecret  = Deno.env.get('FUNCTION_SECRET')
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!fnSecret || authHeader !== `Bearer ${fnSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

  let orderId: string
  try {
    const body = await req.json()
    orderId = body.order_id
    if (!orderId) throw new Error('missing order_id')
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Use service-role client to read order data (bypasses RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Fetch order + items + customer email
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(`
      id, order_no, status, payment_status,
      customer_id, customer_name, email, created_at,
      coupon_code, discount_amount,
      order_items ( product_name, qty, selling_price )
    `)
    .eq('id', orderId)
    .single()

  if (orderErr || !order) {
    console.error('[send-order-email] order fetch error', orderErr?.message)
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Resolve the customer by id (the reliable key). The old lookup used
  // .eq('name', ...) but the customers table has no `name` column (it's
  // display_name), so it always failed.
  let customer: { email?: string; display_name?: string } | null = null
  if (order.customer_id) {
    const { data } = await supabase
      .from('customers')
      .select('email, display_name')
      .eq('id', order.customer_id)
      .single()
    customer = data
  }

  // Fall back to the email captured on the order itself (guest checkout).
  const toEmail = customer?.email ?? order.email
  if (!toEmail) {
    console.warn('[send-order-email] no email for order', order.order_no)
    return new Response(JSON.stringify({ skipped: 'no customer email' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const items = (order.order_items ?? []) as Array<{
    product_name: string
    qty: number
    selling_price: number
  }>

  const subtotal = items.reduce((sum, i) => sum + (i.selling_price || 0) * (i.qty || 1), 0)
  const discount = order.discount_amount ?? 0
  const total    = subtotal - discount

  const itemsHtml = items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.product_name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">${i.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">NT$ ${i.selling_price?.toLocaleString() ?? '-'}</td>
      </tr>`,
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <div style="background:#f9e4ec;padding:32px 24px;text-align:center;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:24px;color:#c25c7c">🐰 JelloJam 訂單確認</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #f0d6e0;border-top:none;border-radius:0 0 8px 8px">
    <p>Hi ${customer?.display_name ?? order.customer_name}，</p>
    <p>您的訂單已收到，感謝您的購買！</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#fdf0f5">
        <th style="padding:8px;text-align:left;font-size:13px">商品</th>
        <th style="padding:8px;text-align:center;font-size:13px">數量</th>
        <th style="padding:8px;text-align:right;font-size:13px">小計</th>
      </tr>
      ${itemsHtml}
    </table>

    ${discount > 0 ? `<p style="text-align:right;color:#888;font-size:14px">優惠碼折抵：-NT$ ${discount.toLocaleString()}</p>` : ''}
    <p style="text-align:right;font-size:18px;font-weight:bold;margin-top:8px">
      合計：NT$ ${total.toLocaleString()}
    </p>

    <hr style="border:none;border-top:1px solid #f0d6e0;margin:16px 0"/>

    <p style="font-size:13px;color:#888">
      訂單編號：<strong>${order.order_no}</strong><br/>
      訂單時間：${new Date(order.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
    </p>

    <div style="text-align:center;margin:24px 0">
      <a href="${siteUrl}/#/store/order/${order.order_no}"
         style="background:#c25c7c;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px">
        查看訂單狀態
      </a>
    </div>

    <p style="font-size:13px;color:#aaa;text-align:center">
      如有任何問題請透過 LINE 聯絡我們。謝謝！
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
      to:      [toEmail],
      subject: `JelloJam 訂單確認 — ${order.order_no}`,
      html,
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text()
    console.error('[send-order-email] Resend error', err)
    return new Response(JSON.stringify({ error: 'Email send failed', detail: err }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id: emailId } = await resendRes.json()
  console.log('[send-order-email] sent', order.order_no, '→', toEmail, 'emailId:', emailId)

  return new Response(JSON.stringify({ ok: true, email_id: emailId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

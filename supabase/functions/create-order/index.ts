/**
 * create-order — Server-side order creation  (PRD P0-1 / P0-3 / P0-4)
 *
 * ⚠️  SCAFFOLD for review. Wire StoreCheckout.submitOrder to POST here INSTEAD
 *     of doing raw supabase.from('orders').insert(...). This function is the
 *     single authority for prices, stock, coupons and idempotency.
 *
 * Why this exists:
 *   Today the browser inserts orders/order_items with client-computed prices —
 *   anyone can set price=0 in DevTools. This function recomputes every amount
 *   from the DB via the create_order() RPC (see 20260701_p1_hardening.sql),
 *   so the client price is never trusted.
 *
 * Request:
 *   POST  { customer_id?, customer_name, phone?, email?, shipping_fee,
 *           addon_amount, coupon_code?, items: [{ product_id, qty }] }
 *   Header: X-Idempotency-Key: <uuid>   (reused across retries by the client)
 *
 * Response:
 *   200 { order_id, order_no, total }
 *   400 { error: 'PRICE/STOCK/...' }   409 INSUFFICIENT_STOCK
 *
 * Secrets required for the ECPay step (leave unset to run in "record only" mode):
 *   ECPAY_MERCHANT_ID, ECPAY_HASH_KEY, ECPAY_HASH_IV
 *
 * Deploy:
 *   supabase functions deploy create-order --project-ref iifhubablhxibpsyeagi
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('SITE_URL') ?? 'https://www.jellojam.com'
const cors = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  const idem = req.headers.get('X-Idempotency-Key')
  if (!idem) return json({ error: 'MISSING_IDEMPOTENCY_KEY' }, 400)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'BAD_JSON' }, 400) }

  if (!Array.isArray(body.items) || body.items.length === 0)
    return json({ error: 'EMPTY_CART' }, 400)

  // Service-role client — the create_order RPC is SECURITY DEFINER, but we run
  // it as service_role so RLS never blocks the internal inserts.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase.rpc('create_order', {
    p_idempotency_key: idem,
    p_customer_id:     body.customer_id ?? null,
    p_customer_name:   body.customer_name ?? '',
    p_phone:           body.phone ?? null,
    p_email:           body.email ?? null,
    p_shipping_fee:    Number(body.shipping_fee) || 0,
    p_addon_amount:    Number(body.addon_amount) || 0,
    p_coupon_code:     body.coupon_code ?? null,
    p_items:           body.items,
  })

  if (error) {
    // Map domain errors raised by the RPC to HTTP status codes.
    const msg = error.message || ''
    if (msg.includes('INSUFFICIENT_STOCK')) return json({ error: 'INSUFFICIENT_STOCK' }, 409)
    if (msg.includes('PRODUCT_NOT_FOUND'))  return json({ error: 'PRODUCT_NOT_FOUND' }, 400)
    console.error('[create-order] rpc error, code:', error.code)
    return json({ error: 'ORDER_FAILED' }, 400)
  }

  const order = Array.isArray(data) ? data[0] : data

  // ── ECPay hand-off (optional) ───────────────────────────────────────────
  // When ECPAY_* secrets are set, build the AioCheckOut payment form here and
  // return its parameters/URL for the client to POST to ECPay. Left as a TODO
  // so the function is safe to deploy in "record only" mode meanwhile.
  const ecpayMerchant = Deno.env.get('ECPAY_MERCHANT_ID')
  const payment = ecpayMerchant
    ? { gateway: 'ecpay', TODO: 'build CheckMacValue-signed AioCheckOut params' }
    : null

  return json({ order_id: order.order_id, order_no: order.order_no, total: order.total, payment })
})

/**
 * payment-webhook — ECPay payment callback  (PRD P0-1)
 *
 * ⚠️  SCAFFOLD for review. Receives ECPay's server-to-server callback, verifies
 *     the CheckMacValue (HMAC), flips orders.payment_status → 'paid', and fires
 *     the confirmation email + e-invoice.
 *
 * Security: ECPay does NOT send an auth header — the signature IS the auth.
 *   NEVER trust the body without recomputing CheckMacValue from the raw params
 *   using ECPAY_HASH_KEY / ECPAY_HASH_IV. A mismatch → 400, do NOT update.
 *
 * Secrets: ECPAY_HASH_KEY, ECPAY_HASH_IV, FUNCTION_SECRET (to call send-order-email)
 *
 * Deploy:
 *   supabase functions deploy payment-webhook --project-ref iifhubablhxibpsyeagi
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// TODO: implement ECPay's CheckMacValue algorithm:
//   1. sort params by key (case-insensitive), 2. urlencode + lowercase,
//   3. prepend HashKey= / append &HashIV=, 4. .NET-style urlencode,
//   5. SHA-256, 6. uppercase. Compare to the CheckMacValue param.
async function verifyCheckMacValue(_params: Record<string, string>): Promise<boolean> {
  const hashKey = Deno.env.get('ECPAY_HASH_KEY')
  const hashIv  = Deno.env.get('ECPAY_HASH_IV')
  if (!hashKey || !hashIv) return false   // fail closed until configured
  return false                            // TODO: real HMAC comparison
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const form = await req.formData()
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) params[k] = String(v)

  if (!(await verifyCheckMacValue(params))) {
    console.error('[payment-webhook] CheckMacValue verification failed')
    return new Response('0|ErrorMessage', { status: 400 })
  }

  const orderNo = params.MerchantTradeNo
  const paid    = params.RtnCode === '1'   // 1 = success per ECPay

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  if (paid) {
    const { data: order } = await supabase
      .from('orders')
      .update({ payment_status: 'paid', payment_ref: params.TradeNo, paid_at: new Date().toISOString() })
      .eq('order_no', orderNo)
      .select('id')
      .single()

    // Fire confirmation email (authenticated with the shared secret).
    if (order?.id) {
      const fnSecret = Deno.env.get('FUNCTION_SECRET')
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${fnSecret}` },
        body: JSON.stringify({ order_id: order.id }),
      }).catch(() => {})
      // TODO: also invoke issue-invoice for P0-2.
    }
  }

  // ECPay expects exactly this ack string.
  return new Response('1|OK', { status: 200 })
})

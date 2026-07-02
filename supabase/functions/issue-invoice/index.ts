/**
 * issue-invoice — Taiwan e-invoice issuance  (PRD P0-2)
 *
 * ⚠️  SCAFFOLD for review. Called asynchronously by payment-webhook after an
 *     order is paid. Issues a 統一發票 via ECPay/ezPay e-invoice API and records
 *     it in `invoices`; on failure writes `invoice_errors` (never blocks the
 *     order — see PRD 3.4 AC-5).
 *
 * Legal note: 台灣《營業稅法》requires invoices once turnover crosses the
 *   threshold. This is currently 0% implemented — highest legal-risk gap.
 *
 * Secrets: EINVOICE_MERCHANT_ID, EINVOICE_HASH_KEY, EINVOICE_HASH_IV, FUNCTION_SECRET
 *
 * Request:  { order_id }   Header: Authorization: Bearer <FUNCTION_SECRET>
 * Deploy:   supabase functions deploy issue-invoice --project-ref iifhubablhxibpsyeagi
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // Fail-closed shared-secret auth.
  const fnSecret = Deno.env.get('FUNCTION_SECRET')
  if (!fnSecret || req.headers.get('Authorization') !== `Bearer ${fnSecret}`)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { order_id } = await req.json().catch(() => ({}))
  if (!order_id) return new Response(JSON.stringify({ error: 'missing order_id' }), { status: 400 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_no, selling_price, tax_id, carrier_type, carrier_id, email')
    .eq('id', order_id)
    .single()
  if (!order) return new Response(JSON.stringify({ error: 'order not found' }), { status: 404 })

  const merchant = Deno.env.get('EINVOICE_MERCHANT_ID')
  if (!merchant) {
    // Not configured yet — record the gap so ops can backfill, don't fail.
    await supabase.from('invoice_errors').insert({
      order_id, error_code: 'NOT_CONFIGURED', message: 'EINVOICE_* secrets unset',
    })
    return new Response(JSON.stringify({ skipped: 'einvoice not configured' }), { status: 200 })
  }

  try {
    // Tax on a tax-inclusive price: tax = round(total / 1.05 * 0.05).
    const total   = Number(order.selling_price) || 0
    const taxAmt  = Math.round((total / 1.05) * 0.05)

    // TODO: build the ECPay/ezPay e-invoice request (carrier / tax_id handling),
    //       sign it, POST it, and parse the returned invoice number.
    const invoiceNumber = `TODO-${order.order_no}`

    await supabase.from('invoices').insert({
      order_id, invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().slice(0, 10),
      carrier_type: order.carrier_type ?? null,
      carrier_id:   order.carrier_id ?? null,
      tax_id:       order.tax_id ?? null,
      tax_amount:   taxAmt, status: 'issued',
    })
    return new Response(JSON.stringify({ ok: true, invoice_number: invoiceNumber }), { status: 200 })
  } catch (e) {
    await supabase.from('invoice_errors').insert({
      order_id, error_code: 'ISSUE_FAILED', message: String((e as Error)?.message).slice(0, 300),
    })
    return new Response(JSON.stringify({ error: 'issue failed' }), { status: 502 })
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabaseAdmin as supabase, supabase as storefrontClient } from '@/lib/supabase'
import { ElMessage } from 'element-plus'

// ── Constants ─────────────────────────────────────────────────────────
export const ORDER_STATUSES = {
  '已填表單':  { label: '已填表單',  badge: 'pending',    color: '#f59e0b' },
  '在美現貨':  { label: '在美現貨',  badge: 'paid',       color: '#3b82f6' },
  '台灣待出貨': { label: '台灣待出貨', badge: 'processing', color: '#8b5cf6' },
  '已出貨':    { label: '已出貨',    badge: 'shipped',    color: '#6366f1' },
  '已完成':    { label: '已完成',    badge: 'completed',  color: '#10b981' },
  '顧客已取消': { label: '顧客已取消', badge: 'cancelled',  color: '#94a3b8' },
  '已併單':     { label: '已併單',     badge: 'merged',     color: '#6b7280' },
}

export const EXPENSE_TYPES = ['油費', '寄貨', '破壞袋', '大陸寄貨', '貼紙', '貼紙補差價', 'Ka媽帶回', '退款']
export const CURRENCIES    = ['USD', 'GBP', 'RMB', 'TWD']
export const PAYERS        = ['Kelsey', 'Karina']
export const BANKS         = ['BOA', 'Chase', 'CHASE', '台新', 'Zelle', '現金', '支付寶', 'Jellycat', 'paypal']
export const USD_TO_TWD    = 33
export const RMB_TO_TWD    = 4.6

// ── 會員等級（集點制，每隻娃娃 = 1 點）─────────────────────────────────
export const MEMBER_TIERS = [
  { name: '一般會員', minPoints: 0,  color: '#94a3b8', tagType: 'info'    },
  { name: '銀牌會員', minPoints: 5,  color: '#64748b', tagType: 'info'    },
  { name: '金牌會員', minPoints: 15, color: '#f59e0b', tagType: 'warning' },
  { name: '白金會員', minPoints: 30, color: '#6366f1', tagType: 'primary' },
]

// 根據點數取得等級設定
export function getTierByPoints(points) {
  return [...MEMBER_TIERS].reverse().find(t => points >= t.minPoints) || MEMBER_TIERS[0]
}

// ─────────────────────────────────────────────────────────────────────
// Statuses that must NOT contribute to revenue / points / sold-stock
// aggregations. 已併單 (merged) rows keep their items so ERP can still
// inspect them, but their value now lives on the primary order — counting
// them again double-counts. 顧客已取消 (cancelled) never counted as a sale.
const NON_SALE_STATUSES = ['已併單', '顧客已取消']

async function safeFetch(table, query = '*') {
  const res = await supabase.from(table).select(query)
  if (res.error) {
    console.warn(`[appData] ${table} fetch error, code:`, res.error?.code)
    return []
  }
  return res.data || []
}

// Shared CSV cell escaper — RFC-4180 quoting so commas/quotes/newlines in
// free-text fields (notes, product names) don't shift columns in Excel.
export function csvEscape(v) {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"'
}

export const useAppDataStore = defineStore('appData', () => {
  // ── Raw data ──────────────────────────────────────────────────────
  const ordersRaw    = ref([])
  const itemsRaw     = ref([])
  const customersRaw = ref([])
  const productsRaw  = ref([])
  const inventoryRaw    = ref([])
  const invBalanceRaw   = ref([])   // P0-4：inventory_balance view（seeded 後為正確庫存）
  const purchasesRaw    = ref([])
  const expensesRaw  = ref([])
  const pointsTxnRaw = ref([])   // points_transactions

  const loading     = ref(false)
  const error       = ref(null)
  const initialized = ref(false)

  // ── mockSales: one row per ORDER ──────────────────────────────────
  const mockSales = computed(() =>
    ordersRaw.value.map(order => {
      const items        = itemsRaw.value.filter(i => i.order_id === order.id)
      // selling_price is a UNIT price (the new-order dialog stores qty and unit
      // price separately, then totals selling_price × qty) — so multiply by qty.
      const totalSelling = items.reduce((a, i) => a + (Number(i.selling_price) || 0) * (Number(i.qty) || 1), 0)
      const totalPayment = items.reduce((a, i) => a + (Number(i.payment_amount) || 0), 0)
      const productNames = items.map(i => i.product_name).filter(Boolean).join('、')
      return {
        ...order,
        id:             order.id,
        order_id:       order.order_no,
        order_status:   order.status,
        customer:       order.customer_name,
        product_name:   productNames || order.product_name || '',
        selling_price:  totalSelling || Number(order.selling_price) || null,
        payment_amount: totalPayment || Number(order.payment_amount) || null,
        items,
        statusConfig: ORDER_STATUSES[order.status] || { badge: 'inactive', color: '#94a3b8' },
      }
    })
  )

  const salesCustomers = computed(() =>
    [...new Set(ordersRaw.value.map(o => o.customer_name).filter(Boolean))].sort()
  )
  const salesProducts = computed(() =>
    [...new Set(itemsRaw.value.map(i => i.product_name).filter(Boolean))].sort()
  )
  const salesGroups = computed(() =>
    [...new Set(ordersRaw.value.map(o => o.group_name).filter(Boolean))].sort()
  )

  // ── mockCustomers ─────────────────────────────────────────────────
  const mockCustomers = computed(() =>
    customersRaw.value.map(c => {
      const custOrders   = ordersRaw.value.filter(o => o.customer_id === c.id)
      // total_spent counts only real sales (exclude cancelled + merged), and
      // uses unit-price × qty.
      const spentItems   = custOrders
        .filter(o => !NON_SALE_STATUSES.includes(o.status))
        .flatMap(o => itemsRaw.value.filter(i => i.order_id === o.id))
      const custTxns     = pointsTxnRaw.value.filter(t => t.customer_id === c.id)

      // ── 集點計算 ──────────────────────────────────────────────────
      // 來源1：訂單商品 qty。只有「已完成」訂單才給點，與 awardPointsForOrder
      // 的觸發條件一致（避免未完成訂單先顯示點數、取消/併單重複計點）。
      const completedOrders = custOrders.filter(o => o.status === '已完成')
      const completedItems  = completedOrders.flatMap(o => itemsRaw.value.filter(i => i.order_id === o.id))
      const pointsFromOrders = completedItems.reduce((a, i) => a + (Number(i.qty) || 1), 0)

      // 來源2：手動紀錄 earn / adjust（正值）
      const pointsFromEarn = custTxns
        .filter(t => t.type === 'earn' || (t.type === 'adjust' && t.points > 0))
        .reduce((a, t) => a + (Number(t.points) || 0), 0)

      // 已兌換 & 負調整（從 redeem / 負 adjust 扣除）
      const pointsRedeemed = custTxns
        .filter(t => t.type === 'redeem' || (t.type === 'adjust' && t.points < 0))
        .reduce((a, t) => a + Math.abs(Number(t.points) || 0), 0)

      // lifetime_points：歷史累積賺到的點（只增不減，用於決定等級）
      const lifetimePoints = pointsFromOrders + pointsFromEarn

      // current_points：可兌換的餘額（可被兌換扣掉）
      const currentPoints  = Math.max(0, lifetimePoints - pointsRedeemed)

      // 等級依 lifetimePoints 決定（不因兌換下降）
      const tierCfg = getTierByPoints(lifetimePoints)

      return {
        ...c,
        name:            c.display_name || c.name || '',
        order_count:     custOrders.length,
        total_spent:     spentItems.reduce((a, i) => a + (Number(i.selling_price) || 0) * (Number(i.qty) || 1), 0),
        lifetime_points: lifetimePoints,   // 歷史累積（決定等級）
        current_points:  currentPoints,    // 當前可用餘額（可扣）
        tier:            tierCfg.name,
        tierConfig:      tierCfg,
      }
    })
  )

  // ── mockInventory ─────────────────────────────────────────────────
  // P0-4：current_stock 優先從 inventory_balance view 取（含 inventory_transactions seed）
  // 若 view 尚無該商品，降級用舊公式（opening + purchases - sold）
  // Order ids whose items must NOT reduce displayed stock (cancelled/merged).
  const nonSaleOrderIds = computed(() =>
    new Set(ordersRaw.value.filter(o => NON_SALE_STATUSES.includes(o.status)).map(o => o.id))
  )

  const mockInventory = computed(() =>
    inventoryRaw.value.map(inv => {
      const product        = productsRaw.value.find(p => p.id === inv.product_id) || {}
      const totalPurchased = purchasesRaw.value
        .filter(p => p.product_id === inv.product_id)
        .reduce((a, p) => a + (Number(p.qty) || 0), 0)
      const soldQty = itemsRaw.value
        .filter(i => i.product_id === inv.product_id && !nonSaleOrderIds.value.has(i.order_id))
        .reduce((a, i) => a + (Number(i.qty) || 1), 0)
      const legacyStock = (Number(inv.opening_qty) || 0) + totalPurchased - soldQty

      // inventory_balance view 有記錄時使用（migration seed 後生效）
      const balanceRow   = invBalanceRaw.value.find(b => b.product_id === inv.product_id)
      const currentStock = balanceRow ? balanceRow.current_stock : legacyStock

      return {
        ...inv,
        id:               inv.product_id,
        product_name:     product.name           || inv.product_name     || '',
        brand:            product.brand          || inv.brand            || 'jellycat',
        jellycat_category:    product.jellycat_category    || inv.jellycat_category || '',
        jellycat_category_zh: product.jellycat_category_zh || '',
        tj_category:      product.tj_category    || inv.tj_category      || '',
        box:              product.box_label       || inv.box_label        || '',
        box_label:        product.box_label       || inv.box_label        || '',
        avg_cost:         Number(inv.avg_cost_twd) || 0,
        avg_cost_twd:     Number(inv.avg_cost_twd) || 0,
        total_purchased:  totalPurchased,
        sold_qty:         soldQty,
        current_stock:    currentStock,
      }
    })
  )

  // 前台訪客只有 publicCatalogRaw（productsRaw 只在 ERP fetchAll 後才有資料）
  const jellycatCategories = computed(() => {
    const source = publicCatalogLoaded.value ? publicCatalogRaw.value : productsRaw.value
    return [...new Set(source.map(p => p.jellycat_category).filter(Boolean))].sort()
  })
  const lowStockProducts = computed(() =>
    mockInventory.value.filter(p => typeof p.current_stock === 'number' && p.current_stock <= 2)
  )

  // ── 前台商品目錄：public_catalog() RPC ──────────────────────────────
  // 訪客/顧客沒有權限直接讀 orders/order_items（RLS 已鎖），所以商店頁面
  // 改走這個安全的伺服器端彙總函式（只回傳商品層級的數字，不含任何客戶
  // 或訂單原始資料）。用前台 client（storefrontClient），不是 admin client。
  const publicCatalogRaw = ref([])
  const publicCatalogLoaded = ref(false)
  const publicCatalogError = ref(false)

  async function fetchPublicCatalog() {
    if (publicCatalogLoaded.value) return
    publicCatalogError.value = false
    const { data, error: err } = await storefrontClient.rpc('public_catalog')
    if (err) {
      console.warn('[appData] public_catalog fetch error, code:', err?.code)
      publicCatalogError.value = true
      return
    }
    publicCatalogRaw.value = data || []
    publicCatalogLoaded.value = true
  }

  // ── storeProducts（前台商品列表）─────────────────────────────────────
  // 優先使用 public_catalog()（訪客安全來源）；尚未載入時 fallback 到舊的
  // 「從 ERP 資料算」邏輯（僅在已登入 ERP context 才會有資料可用）。
  const storeProducts = computed(() => {
    if (publicCatalogLoaded.value) return publicCatalogRaw.value

    return mockInventory.value
      .filter(p => p.product_name)
      .map(p => {
        const soldItems = itemsRaw.value.filter(
          i => i.product_name === p.product_name && Number(i.selling_price) > 0
        )
        const avgPrice = soldItems.length
          ? Math.round(soldItems.reduce((a, i) => a + Number(i.selling_price), 0) / soldItems.length)
          : null
        return {
          ...p,
          store_price: avgPrice,
          in_stock:    p.current_stock > 0,
        }
      })
  })

  // ── mockPurchases ─────────────────────────────────────────────────
  const mockPurchases = computed(() =>
    purchasesRaw.value.map(p => ({ ...p, date: p.purchase_date }))
  )

  const purchaseSummaryByPayer = computed(() =>
    PAYERS.map(payer => ({
      payer,
      total_usd: purchasesRaw.value
        .filter(p => p.paid_by === payer && (p.currency === 'USD' || p.currency === 'US'))
        .reduce((a, p) => a + (Number(p.total_cost) || 0), 0),
      total_twd: purchasesRaw.value
        .filter(p => p.paid_by === payer)
        .reduce((a, p) => a + (Number(p.total_cost_twd) || 0), 0),
      count: purchasesRaw.value.filter(p => p.paid_by === payer).length,
    }))
  )

  // ── mockExpenses ──────────────────────────────────────────────────
  const mockExpenses = computed(() =>
    expensesRaw.value.map(e => ({ ...e, date: e.expense_date }))
  )

  const expenseSummaryByType = computed(() =>
    EXPENSE_TYPES.map(type => ({
      type,
      total_twd: expensesRaw.value
        .filter(e => e.type === type)
        .reduce((a, e) => a + (Number(e.amount_twd) || 0), 0),
      count: expensesRaw.value.filter(e => e.type === type).length,
    })).filter(e => e.count > 0)
  )

  // ── Analytics ─────────────────────────────────────────────────────
  // Revenue must exclude merged/cancelled orders (their value is already
  // counted on the primary order or was never a sale).
  const validSales = computed(() =>
    mockSales.value.filter(o => !NON_SALE_STATUSES.includes(o.order_status))
  )

  const revenueByWeek = computed(() => {
    const m = {}
    validSales.value.forEach(o => {
      if (!o.sales_week || !o.selling_price) return
      if (!m[o.sales_week]) m[o.sales_week] = { week: o.sales_week, revenue: 0, count: 0 }
      m[o.sales_week].revenue += o.selling_price
      m[o.sales_week].count++
    })
    return Object.values(m).sort((a, b) => a.week.localeCompare(b.week))
  })

  const revenueByMonth = computed(() => {
    const m = {}
    validSales.value.forEach(o => {
      if (!o.sales_date || !o.selling_price) return
      const key = String(o.sales_date).substring(0, 7)
      if (!m[key]) m[key] = { month: key, revenue: 0, count: 0 }
      m[key].revenue += o.selling_price
      m[key].count++
    })
    return Object.values(m).sort((a, b) => a.month.localeCompare(b.month))
  })

  const topProducts = computed(() => {
    const m = {}
    itemsRaw.value.forEach(i => {
      if (i.product_name) m[i.product_name] = (m[i.product_name] || 0) + (Number(i.qty) || 1)
    })
    return Object.entries(m).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 10)
  })

  const orderStatusDist = computed(() =>
    Object.entries(ORDER_STATUSES).map(([key, cfg]) => ({
      name:  cfg.label,
      value: ordersRaw.value.filter(o => o.status === key).length,
      color: cfg.color,
    })).filter(s => s.value > 0)
  )

  const categorySalesDist = computed(() => {
    const m = {}
    mockInventory.value.forEach(p => {
      if (!p.jellycat_category || !p.sold_qty) return
      m[p.jellycat_category] = (m[p.jellycat_category] || 0) + p.sold_qty
    })
    return Object.entries(m).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8)
  })

  // ── Totals ────────────────────────────────────────────────────────
  const totalRevenue = computed(() => validSales.value.reduce((a, o) => a + (o.selling_price || 0), 0))
  const totalCost    = computed(() => purchasesRaw.value.reduce((a, p) => a + (Number(p.total_cost_twd) || 0), 0))
  const totalExpense = computed(() => expensesRaw.value.reduce((a, e) => a + (Number(e.amount_twd) || 0), 0))
  const totalProfit  = computed(() => totalRevenue.value - totalCost.value - totalExpense.value)

  const mockDashStats = computed(() => ({
    totalOrders:     ordersRaw.value.length,
    completedOrders: ordersRaw.value.filter(o => o.status === '已完成').length,
    pendingOrders:   ordersRaw.value.filter(o => ['台灣待出貨', '已填表單'].includes(o.status)).length,
    cancelledOrders: ordersRaw.value.filter(o => o.status === '顧客已取消').length,
    totalRevenue:    totalRevenue.value,
    totalCost:       totalCost.value,
    totalExpense:    totalExpense.value,
    totalProfit:     totalProfit.value,
    totalCustomers:  customersRaw.value.length,
    totalProducts:   inventoryRaw.value.length,
    lowStockCount:   lowStockProducts.value.length,
    revenueByWeek:   revenueByWeek.value,
    revenueByMonth:  revenueByMonth.value,
    topProducts:     topProducts.value,
    orderStatusDist: orderStatusDist.value,
    categorySalesDist: categorySalesDist.value,
    recentOrders:       [...mockSales.value]
                          .sort((a, b) => String(b.sales_date || '').localeCompare(String(a.sales_date || '')))
                          .slice(0, 8),
    lowStockProducts:   lowStockProducts.value.slice(0, 5),
    purchaseSummaryByPayer: purchaseSummaryByPayer.value,
    expenseSummaryByType:   expenseSummaryByType.value,
  }))

  // ── Actions ───────────────────────────────────────────────────────
  // Single in-flight fetch shared by all concurrent callers, so a second
  // caller awaits the SAME load instead of resolving immediately with empty
  // data (Dashboard/Finance both call fetchAll on mount).
  let _inflight = null

  async function fetchAll() {
    if (initialized.value) return
    if (_inflight) return _inflight

    loading.value = true
    error.value   = null

    _inflight = (async () => {
      // orders + order_items are CRITICAL: if they error, we must NOT mark the
      // store initialized (that would strand the dashboard on all-zeros with no
      // retry). Other tables degrade to [] via safeFetch.
      const ordRes = await supabase.from('orders').select('*').is('deleted_at', null)
      const itmRes = await supabase.from('order_items').select('*')
      const critErr = ordRes.error || itmRes.error
      if (critErr) {
        error.value = critErr.code || critErr.message || 'orders_fetch_failed'
        console.warn('[appData] critical fetch failed, code:', critErr.code)
        return
      }

      const [cust, prod, inv, pur, exp, ptxn, bal] = await Promise.all([
        safeFetch('customers'),
        safeFetch('products'),
        safeFetch('inventory'),
        safeFetch('purchases'),
        safeFetch('expenses'),
        safeFetch('points_transactions'),
        safeFetch('inventory_balance'),   // P0-4
      ])
      ordersRaw.value     = ordRes.data || []
      itemsRaw.value      = itmRes.data || []
      customersRaw.value  = cust
      productsRaw.value   = prod
      inventoryRaw.value  = inv
      purchasesRaw.value  = pur
      expensesRaw.value   = exp
      pointsTxnRaw.value  = ptxn
      invBalanceRaw.value = bal
      initialized.value   = true
    })()

    try {
      await _inflight
      if (error.value) ElMessage.error('資料載入失敗，請重新整理再試')
    } finally {
      loading.value = false
      _inflight = null
    }
  }

  async function refresh() {
    initialized.value = false
    _inflight = null
    await fetchAll()
  }

  // Returns true on success, false on failure — callers (e.g. batch update)
  // must inspect this rather than assuming success.
  async function updateOrderStatus(orderNo, status) {
    try {
      // Snapshot current status BEFORE updating (used to detect transition)
      const target       = ordersRaw.value.find(o => o.order_no === orderNo)
      const fromStatus   = target?.status ?? null
      const wasCompleted = fromStatus === '已完成'

      if (fromStatus === status) return true  // no-op

      const { error: err } = await supabase
        .from('orders')
        .update({ status })
        .eq('order_no', orderNo)
      if (err) throw err

      if (target) target.status = status

      // Audit trail (P0-6): every status change — including batch — is logged.
      // Best-effort until the DB trigger in 20260701_p1_hardening.sql lands.
      try {
        await supabase.from('order_status_logs').insert({
          order_id:    target?.id ?? null,
          order_no:    orderNo,
          from_status: fromStatus,
          to_status:   status,
          changed_by:  'erp',
        })
      } catch { /* table/trigger may supersede this — non-fatal */ }

      // Points: award on entering 已完成, deduct on leaving it (symmetric, so
      // toggling completed → other → completed cannot double-award).
      if (status === '已完成' && !wasCompleted) {
        await awardPointsForOrder(target)
      } else if (wasCompleted && status !== '已完成') {
        await deductPointsForOrder(target)
      }
      return true
    } catch (err) {
      ElMessage.error(`更新失敗：${err.message}`)
      return false
    }
  }

  async function awardPointsForOrder(order) {
    if (!order?.customer_id) return  // guest order — no customer to credit

    // Count qty across all order items (1 item = 1 point)
    const { data: items, error: itemErr } = await supabase
      .from('order_items')
      .select('qty')
      .eq('order_id', order.id)

    if (itemErr) { console.warn('[points] order_items fetch error, code:', itemErr?.code); return }

    const earned = (items || []).reduce((sum, i) => sum + (Number(i.qty) || 1), 0)
    if (earned <= 0) return

    // Fetch current points
    const { data: cust, error: custErr } = await supabase
      .from('customers')
      .select('current_points, lifetime_points, display_name')
      .eq('id', order.customer_id)
      .single()

    if (custErr || !cust) { console.warn('[points] customer fetch error, code:', custErr?.code); return }

    const newCurrent  = (cust.current_points  || 0) + earned
    const newLifetime = (cust.lifetime_points || 0) + earned

    // Update customer points
    const { error: updErr } = await supabase
      .from('customers')
      .update({ current_points: newCurrent, lifetime_points: newLifetime })
      .eq('id', order.customer_id)

    if (updErr) { console.warn('[points] update error, code:', updErr?.code); return }

    // Audit log (non-critical, ignore errors)
    try {
      await supabase.from('auth_audit_log').insert({
        customer_id: order.customer_id,
        action:      'points_awarded',
        metadata: {
          order_no:      order.order_no,
          points_earned: earned,
          pts_before:    cust.current_points || 0,
          pts_after:     newCurrent,
        },
      })
    } catch { /* non-critical */ }

    // Update local cache so ERP reflects new points immediately
    const localCust = customersRaw.value.find(c => c.id === order.customer_id)
    if (localCust) {
      localCust.current_points  = newCurrent
      localCust.lifetime_points = newLifetime
    }

    ElMessage.success(
      `✅ 已為「${cust.display_name || order.customer_name}」累積 ${earned} 點（訂單 ${order.order_no}）`
    )
  }

  async function deductPointsForOrder(order) {
    if (!order?.customer_id) return

    const { data: items, error: itemErr } = await supabase
      .from('order_items')
      .select('qty')
      .eq('order_id', order.id)

    if (itemErr) { console.warn('[points] deduct item fetch error, code:', itemErr?.code); return }

    const deducted = (items || []).reduce((sum, i) => sum + (Number(i.qty) || 1), 0)
    if (deducted <= 0) return

    const { data: cust, error: custErr } = await supabase
      .from('customers')
      .select('current_points, lifetime_points, display_name')
      .eq('id', order.customer_id)
      .single()

    if (custErr || !cust) { console.warn('[points] deduct customer fetch error, code:', custErr?.code); return }

    const newCurrent  = Math.max(0, (cust.current_points  || 0) - deducted)
    const newLifetime = Math.max(0, (cust.lifetime_points || 0) - deducted)

    const { error: updErr } = await supabase
      .from('customers')
      .update({ current_points: newCurrent, lifetime_points: newLifetime })
      .eq('id', order.customer_id)

    if (updErr) { console.warn('[points] deduct update error, code:', updErr?.code); return }

    try {
      await supabase.from('auth_audit_log').insert({
        customer_id: order.customer_id,
        action:      'points_deducted',
        metadata: {
          order_no:        order.order_no,
          points_deducted: deducted,
          pts_before:      cust.current_points || 0,
          pts_after:       newCurrent,
        },
      })
    } catch { /* non-critical */ }

    const localCust = customersRaw.value.find(c => c.id === order.customer_id)
    if (localCust) {
      localCust.current_points  = newCurrent
      localCust.lifetime_points = newLifetime
    }

    ElMessage.warning(
      `⚠️ 已扣除「${cust.display_name || order.customer_name}」${deducted} 點（訂單 ${order.order_no} 取消完成）`
    )
  }

  return {
    ORDER_STATUSES, EXPENSE_TYPES, CURRENCIES, PAYERS, BANKS, USD_TO_TWD, RMB_TO_TWD,
    MEMBER_TIERS, getTierByPoints,
    loading, error, initialized,
    mockSales, mockCustomers, mockInventory, mockPurchases, mockExpenses, storeProducts,
    salesCustomers, salesProducts, salesGroups,
    jellycatCategories, lowStockProducts,
    purchaseSummaryByPayer, expenseSummaryByType,
    revenueByWeek, revenueByMonth, topProducts, orderStatusDist, categorySalesDist,
    totalRevenue, totalCost, totalExpense, totalProfit,
    mockDashStats,
    fetchAll, refresh, updateOrderStatus, awardPointsForOrder, deductPointsForOrder,
    fetchPublicCatalog, publicCatalogRaw, publicCatalogLoaded, publicCatalogError,
    ordersRaw, itemsRaw, customersRaw, productsRaw, inventoryRaw, purchasesRaw, expensesRaw, pointsTxnRaw, invBalanceRaw,
  }
})

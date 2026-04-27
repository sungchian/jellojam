import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { ElMessage } from 'element-plus'

// ── Constants ─────────────────────────────────────────────────────────
export const ORDER_STATUSES = {
  '已出貨':    { label: '已出貨',    badge: 'completed',  color: '#10b981' },
  '台灣待出貨': { label: '台灣待出貨', badge: 'processing', color: '#8b5cf6' },
  '在美現貨':  { label: '在美現貨',  badge: 'paid',       color: '#3b82f6' },
  '已填表單':  { label: '已填表單',  badge: 'pending',    color: '#f59e0b' },
  '顧客已取消': { label: '顧客已取消', badge: 'cancelled',  color: '#94a3b8' },
}

export const EXPENSE_TYPES = ['油費', '寄貨', '破壞袋', '大陸寄貨', '貼紙', '貼紙補差價', 'Ka媽帶回', '退款']
export const CURRENCIES    = ['USD', 'GBP', 'RMB', 'TWD']
export const PAYERS        = ['Kelsey', 'Karina']
export const BANKS         = ['BOA', 'Chase', 'CHASE', '台新', 'Zelle', '現金', '支付寶', 'Jellycat', 'paypal']
export const USD_TO_TWD    = 33
export const RMB_TO_TWD    = 4.6

// ─────────────────────────────────────────────────────────────────────
async function safeFetch(table, query = '*') {
  const res = await supabase.from(table).select(query)
  if (res.error) {
    console.warn(`[appData] ${table} fetch error:`, res.error.message)
    return []
  }
  return res.data || []
}

export const useAppDataStore = defineStore('appData', () => {
  // ── Raw data ──────────────────────────────────────────────────────
  const ordersRaw    = ref([])
  const itemsRaw     = ref([])
  const customersRaw = ref([])
  const productsRaw  = ref([])
  const inventoryRaw = ref([])
  const purchasesRaw = ref([])
  const expensesRaw  = ref([])

  const loading     = ref(false)
  const error       = ref(null)
  const initialized = ref(false)

  // ── mockSales: one row per ORDER ──────────────────────────────────
  const mockSales = computed(() =>
    ordersRaw.value.map(order => {
      const items        = itemsRaw.value.filter(i => i.order_id === order.id)
      const totalSelling = items.reduce((a, i) => a + (Number(i.selling_price) || 0), 0)
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
      const custOrders = ordersRaw.value.filter(o => o.customer_id === c.id)
      const custItems  = custOrders.flatMap(o => itemsRaw.value.filter(i => i.order_id === o.id))
      return {
        ...c,
        name:        c.display_name || c.name || '',
        order_count: custOrders.length,
        total_spent: custItems.reduce((a, i) => a + (Number(i.selling_price) || 0), 0),
      }
    })
  )

  // ── mockInventory ─────────────────────────────────────────────────
  const mockInventory = computed(() =>
    inventoryRaw.value.map(inv => {
      const product        = productsRaw.value.find(p => p.id === inv.product_id) || {}
      const totalPurchased = purchasesRaw.value
        .filter(p => p.product_id === inv.product_id)
        .reduce((a, p) => a + (Number(p.qty) || 0), 0)
      const soldQty = itemsRaw.value
        .filter(i => i.product_id === inv.product_id)
        .reduce((a, i) => a + (Number(i.qty) || 1), 0)
      const currentStock = (Number(inv.opening_qty) || 0) + totalPurchased - soldQty
      return {
        ...inv,
        id:               inv.product_id,
        product_name:     product.name           || inv.product_name     || '',
        jellycat_category:    product.jellycat_category    || inv.jellycat_category || '',
        jellycat_category_zh: product.jellycat_category_zh || '',
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

  const jellycatCategories = computed(() =>
    [...new Set(productsRaw.value.map(p => p.jellycat_category).filter(Boolean))].sort()
  )
  const lowStockProducts = computed(() =>
    mockInventory.value.filter(p => typeof p.current_stock === 'number' && p.current_stock <= 2)
  )

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
  const revenueByWeek = computed(() => {
    const m = {}
    mockSales.value.forEach(o => {
      if (!o.sales_week || !o.selling_price) return
      if (!m[o.sales_week]) m[o.sales_week] = { week: o.sales_week, revenue: 0, count: 0 }
      m[o.sales_week].revenue += o.selling_price
      m[o.sales_week].count++
    })
    return Object.values(m).sort((a, b) => a.week.localeCompare(b.week))
  })

  const revenueByMonth = computed(() => {
    const m = {}
    mockSales.value.forEach(o => {
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
  const totalRevenue = computed(() => mockSales.value.reduce((a, o) => a + (o.selling_price || 0), 0))
  const totalCost    = computed(() => purchasesRaw.value.reduce((a, p) => a + (Number(p.total_cost_twd) || 0), 0))
  const totalExpense = computed(() => expensesRaw.value.reduce((a, e) => a + (Number(e.amount_twd) || 0), 0))
  const totalProfit  = computed(() => totalRevenue.value - totalCost.value - totalExpense.value)

  const mockDashStats = computed(() => ({
    totalOrders:     ordersRaw.value.length,
    completedOrders: ordersRaw.value.filter(o => o.status === '已出貨').length,
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
    recentOrders:       mockSales.value.slice(-8).reverse(),
    lowStockProducts:   lowStockProducts.value.slice(0, 5),
    purchaseSummaryByPayer: purchaseSummaryByPayer.value,
    expenseSummaryByType:   expenseSummaryByType.value,
  }))

  // ── Actions ───────────────────────────────────────────────────────
  async function fetchAll() {
    // Guard: skip if already loaded or currently loading
    if (initialized.value || loading.value) return
    loading.value = true
    error.value   = null
    try {
      // Fetch all tables independently — one failure won't break others
      const [ord, itm, cust, prod, inv, pur, exp] = await Promise.all([
        safeFetch('orders'),
        safeFetch('order_items'),
        safeFetch('customers'),
        safeFetch('products'),
        safeFetch('inventory'),
        safeFetch('purchases'),
        safeFetch('expenses'),
      ])
      ordersRaw.value    = ord
      itemsRaw.value     = itm
      customersRaw.value = cust
      productsRaw.value  = prod
      inventoryRaw.value = inv
      purchasesRaw.value = pur
      expensesRaw.value  = exp
      initialized.value  = true

      console.log('[appData] Loaded:', {
        orders: ord.length, items: itm.length, customers: cust.length,
        products: prod.length, inventory: inv.length, purchases: pur.length, expenses: exp.length,
      })
    } catch (err) {
      error.value = err.message
      ElMessage.error(`資料載入失敗：${err.message}`)
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    initialized.value = false
    await fetchAll()
  }

  async function updateOrderStatus(orderNo, status) {
    try {
      const { error: err } = await supabase
        .from('orders')
        .update({ status })
        .eq('order_no', orderNo)
      if (err) throw err
      const target = ordersRaw.value.find(o => o.order_no === orderNo)
      if (target) target.status = status
    } catch (err) {
      ElMessage.error(`更新失敗：${err.message}`)
    }
  }

  return {
    ORDER_STATUSES, EXPENSE_TYPES, CURRENCIES, PAYERS, BANKS, USD_TO_TWD, RMB_TO_TWD,
    loading, error, initialized,
    mockSales, mockCustomers, mockInventory, mockPurchases, mockExpenses,
    salesCustomers, salesProducts, salesGroups,
    jellycatCategories, lowStockProducts,
    purchaseSummaryByPayer, expenseSummaryByType,
    revenueByWeek, revenueByMonth, topProducts, orderStatusDist, categorySalesDist,
    totalRevenue, totalCost, totalExpense, totalProfit,
    mockDashStats,
    fetchAll, refresh, updateOrderStatus,
    ordersRaw, itemsRaw, customersRaw, productsRaw, inventoryRaw, purchasesRaw, expensesRaw,
  }
})

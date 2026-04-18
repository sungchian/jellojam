/**
 * Real data imported from Jellycats_2026.xlsx
 * Sheets: Sales, Customers, Inventory, Purchase, Mancellunation, Taiwan, Opening Stock
 */
import salesRaw      from './sales.json'
import customersRaw  from './customers.json'
import inventoryRaw  from './inventory.json'
import purchasesRaw  from './purchases.json'
import expensesRaw   from './expenses.json'
import taiwanRaw     from './taiwan_stock.json'
import openingRaw    from './opening_stock.json'

// ── Constants ─────────────────────────────────────────────────────────
export const ORDER_STATUSES = {
  '已出貨':    { label: '已出貨',    badge: 'completed',  color: '#10b981' },
  '台灣待出貨': { label: '台灣待出貨', badge: 'processing', color: '#8b5cf6' },
  '在美現貨':  { label: '在美現貨',  badge: 'paid',       color: '#3b82f6' },
  '已填表單':  { label: '已填表單',  badge: 'pending',    color: '#f59e0b' },
  '顧客已取消': { label: '顧客已取消', badge: 'cancelled',  color: '#94a3b8' },
}

export const EXPENSE_TYPES = ['油費', '寄貨', '破壞袋', '大陸寄貨', '貼紙', '貼紙補差價', 'Ka媽帶回', '退款']
export const CURRENCIES    = ['US', 'TWD', 'RMB']
export const PAYERS        = ['Kelsey', 'Karina']
export const BANKS         = ['BOA', 'Chase', 'CHASE', '台新', 'Zelle', '現金', '支付寶', 'Jellycat', 'paypal']
export const USD_TO_TWD    = 33
export const RMB_TO_TWD    = 4.6

// ── Sales ─────────────────────────────────────────────────────────────
export const mockSales = salesRaw.map(r => ({
  ...r,
  statusConfig: ORDER_STATUSES[r.order_status] || { badge: 'inactive', color: '#94a3b8' },
}))

export const salesCustomers = [...new Set(mockSales.map(r => r.customer).filter(Boolean))].sort()
export const salesProducts   = [...new Set(mockSales.map(r => r.product_name).filter(Boolean))].sort()
export const salesGroups     = [...new Set(mockSales.map(r => r.group_name).filter(Boolean))].sort()

// ── Customers ─────────────────────────────────────────────────────────
export const mockCustomers = customersRaw.map((c, i) => ({
  ...c,
  id: i + 1,
  order_count: mockSales.filter(s => s.customer === c.name).length,
  total_spent: mockSales
    .filter(s => s.customer === c.name && s.selling_price)
    .reduce((acc, s) => acc + (s.selling_price || 0), 0),
}))

// ── Inventory ─────────────────────────────────────────────────────────
export const mockInventory = inventoryRaw.map((p, i) => ({
  ...p,
  id: i + 1,
  taiwan_stock: taiwanRaw.find(t => t.product_name === p.product_name)?.qty || p.taiwan_stock || 0,
  opening_detail: openingRaw.find(o => o.product_name === p.product_name) || null,
}))

export const jellycatCategories = [...new Set(inventoryRaw.map(p => p.jellycat_category).filter(Boolean))].sort()
export const lowStockProducts   = mockInventory.filter(p => p.current_stock !== null && p.current_stock <= 2)

// ── Purchases ─────────────────────────────────────────────────────────
export const mockPurchases = purchasesRaw.map((p, i) => ({ ...p, id: i + 1 }))

export const purchaseSummaryByPayer = PAYERS.map(payer => ({
  payer,
  total_usd: mockPurchases.filter(p => p.paid_by === payer && p.currency === 'US').reduce((a, p) => a + (p.total_cost || 0), 0),
  total_twd: mockPurchases.filter(p => p.paid_by === payer).reduce((a, p) => a + (p.total_cost_twd || 0), 0),
  count: mockPurchases.filter(p => p.paid_by === payer).length,
}))

// ── Expenses ──────────────────────────────────────────────────────────
export const mockExpenses = expensesRaw.map((e, i) => ({ ...e, id: i + 1 }))

export const expenseSummaryByType = EXPENSE_TYPES.map(type => ({
  type,
  total_twd: mockExpenses.filter(e => e.type === type).reduce((a, e) => a + (e.amount_twd || 0), 0),
  count: mockExpenses.filter(e => e.type === type).length,
})).filter(e => e.count > 0)

// ── Taiwan & Opening Stock ────────────────────────────────────────────
export const mockTaiwanStock  = taiwanRaw.map((t, i) => ({ ...t, id: i + 1 }))
export const mockOpeningStock = openingRaw.map((o, i) => ({ ...o, id: i + 1 }))

// ── Dashboard Stats ───────────────────────────────────────────────────
const completedSales = mockSales.filter(s => s.order_status === '已出貨')
const pendingSales   = mockSales.filter(s => ['台灣待出貨','已填表單'].includes(s.order_status))

// Revenue by week
const weekMap = {}
mockSales.forEach(s => {
  if (!s.sales_week || !s.selling_price) return
  if (!weekMap[s.sales_week]) weekMap[s.sales_week] = { week: s.sales_week, revenue: 0, orders: new Set(), count: 0 }
  weekMap[s.sales_week].revenue += s.selling_price
  weekMap[s.sales_week].orders.add(s.order_id)
  weekMap[s.sales_week].count++
})
export const revenueByWeek = Object.values(weekMap)
  .sort((a, b) => a.week.localeCompare(b.week))
  .map(w => ({ ...w, orders: w.orders.size }))

// Revenue by month
const monthMap = {}
mockSales.forEach(s => {
  if (!s.sales_date || !s.selling_price) return
  const m = s.sales_date.substring(0, 7)
  if (!monthMap[m]) monthMap[m] = { month: m, revenue: 0, count: 0 }
  monthMap[m].revenue += s.selling_price
  monthMap[m].count++
})
export const revenueByMonth = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))

// Top products
const prodMap = {}
mockSales.forEach(s => { if (s.product_name) prodMap[s.product_name] = (prodMap[s.product_name] || 0) + 1 })
export const topProducts = Object.entries(prodMap)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10)

// Order status distribution
export const orderStatusDist = Object.entries(ORDER_STATUSES).map(([key, cfg]) => ({
  name: cfg.label, value: mockSales.filter(s => s.order_status === key).length, color: cfg.color,
})).filter(s => s.value > 0)

// Category distribution from inventory
const catMap = {}
mockInventory.forEach(p => {
  if (!p.jellycat_category || !p.sold_qty) return
  catMap[p.jellycat_category] = (catMap[p.jellycat_category] || 0) + p.sold_qty
})
export const categorySalesDist = Object.entries(catMap)
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 8)

// Totals
export const totalRevenue = mockSales.reduce((a, s) => a + (s.selling_price || 0), 0)
export const totalCost    = mockPurchases.reduce((a, p) => a + (p.total_cost_twd || 0), 0)
export const totalExpense = mockExpenses.reduce((a, e) => a + (e.amount_twd || 0), 0)
export const totalProfit  = totalRevenue - totalCost - totalExpense

export const mockDashStats = {
  totalOrders:     mockSales.length,
  completedOrders: completedSales.length,
  pendingOrders:   pendingSales.length,
  cancelledOrders: mockSales.filter(s => s.order_status === '顧客已取消').length,
  totalRevenue,
  totalCost,
  totalExpense,
  totalProfit,
  totalCustomers:  mockCustomers.length,
  totalProducts:   mockInventory.length,
  lowStockCount:   lowStockProducts.length,
  revenueByWeek,
  revenueByMonth,
  topProducts,
  orderStatusDist,
  categorySalesDist,
  recentOrders:         mockSales.slice(-8).reverse(),
  lowStockProducts:     lowStockProducts.slice(0, 5),
  purchaseSummaryByPayer,
  expenseSummaryByType,
}

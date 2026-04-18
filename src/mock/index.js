// ─────────────────────────────────────────────────────────────────────────────
// JelloJam ERP — Real data from Jellycats_2026.xlsx
// Extracted: all 10 sheets → 7 JSON datasets
// ─────────────────────────────────────────────────────────────────────────────
import salesRaw      from './sales.json'
import customersRaw  from './customers.json'
import inventoryRaw  from './inventory.json'
import purchasesRaw  from './purchases.json'
import expensesRaw   from './expenses.json'
import taiwanRaw     from './taiwan.json'
import openingRaw    from './opening.json'

// ── Order status config ────────────────────────────────────────────────────
export const ORDER_STATUSES = {
  '已出貨':    { label: '已出貨',    badge: 'badge-completed', color: '#10b981' },
  '台灣待出貨': { label: '台灣待出貨', badge: 'badge-shipped',   color: '#f97316' },
  '在美現貨':  { label: '在美現貨',  badge: 'badge-processing', color: '#8b5cf6' },
  '已填表單':  { label: '已填表單',  badge: 'badge-paid',       color: '#3b82f6' },
  '顧客已取消': { label: '顧客已取消', badge: 'badge-cancelled',  color: '#94a3b8' },
}

// ── Currency & payment config ──────────────────────────────────────────────
export const CURRENCIES = ['US', 'TWD', 'RMB']
export const BANKS = ['BOA', 'Chase', 'CHASE', 'chase', '台新', 'Zelle', '現金', '支付寶', 'Jellycat', 'paypal']
export const PAYERS = ['Kelsey', 'Karina']
export const EXPENSE_TYPES = ['油費', '寄貨', '破壞袋', '大陸寄貨', '貼紙', '貼紙補差價', 'Ka媽帶回', '退款']
export const USD_TO_TWD = 33
export const RMB_TO_TWD = 4.6

// ── Jellycat official categories (31 from real data) ──────────────────────
export const JELLYCAT_CATEGORIES = [
  'Bashful Bunnies', 'Bashful Bunnies (Luxe)', 'Bashful Bag Charms', 'Bashfuls', 'Bashful',
  'Bears', 'Bears (Smudge)',
  'Amuseables Food', 'Amuseables Flowers', 'Amuseables Bag Charms', 'Amuseables Bags',
  'Amuseables Insects', 'Amuseables Sport', 'Amuseables Garden', 'Amuseables Plants', 'Amuseables',
  'Animals', 'Birds', 'Dogs', 'Dragons', 'Sea Creatures', 'Monsters',
  'Accessories', 'Bag Charms', 'Backpack Pets',
  'Little', 'Riverside Ramblers', 'Fuddlewuddles',
  'Soothers', 'Bedtime', 'Christmas',
]

// ── Helpers ───────────────────────────────────────────────────────────────
export function convertToTWD(amount, currency) {
  if (!amount) return 0
  if (currency === 'TWD') return amount
  if (currency === 'US' || currency === 'USD') return Math.round(amount * USD_TO_TWD)
  if (currency === 'RMB') return Math.round(amount * RMB_TO_TWD * 10) / 10
  return amount
}

// ── Exports ───────────────────────────────────────────────────────────────
export const mockSales      = salesRaw
export const mockCustomers  = customersRaw
export const mockInventory  = inventoryRaw
export const mockPurchases  = purchasesRaw
export const mockExpenses   = expensesRaw
export const mockTaiwan     = taiwanRaw
export const mockOpening    = openingRaw

// ── Derived: unique product list ──────────────────────────────────────────
export const mockProducts = [...new Set([
  ...inventoryRaw.map(i => i.product_name),
  ...salesRaw.map(s => s.product_name),
].filter(Boolean))].sort().map((name, idx) => {
  const inv = inventoryRaw.find(i => i.product_name === name) || {}
  return {
    id: idx + 1,
    name,
    jellycat_category: inv.jellycat_category || null,
    current_stock: inv.current_stock || 0,
    avg_cost: inv.avg_cost || 0,
    sold_qty: inv.sold_qty || 0,
    box: inv.box || null,
  }
})

// ── Derived: dashboard stats ──────────────────────────────────────────────
export function getDashboardStats() {
  const completedSales = mockSales.filter(s => s.order_status === '已出貨')
  const pendingSales   = mockSales.filter(s => ['台灣待出貨','在美現貨','已填表單'].includes(s.order_status))
  const totalRevenue   = completedSales.reduce((a, s) => a + (s.selling_price || 0), 0)
  const totalProfit    = completedSales.reduce((a, s) => a + (s.profit || 0), 0)
  const totalCost      = mockPurchases.reduce((a, p) => a + (p.total_cost_twd || 0), 0)
  const totalExpenses  = mockExpenses.reduce((a, e) => a + (e.amount_twd || 0), 0)

  // Sales by week
  const byWeek = {}
  mockSales.forEach(s => {
    const w = s.sales_week || 'unknown'
    if (!byWeek[w]) byWeek[w] = { week: w, orders: 0, revenue: 0 }
    byWeek[w].orders++
    byWeek[w].revenue += s.selling_price || 0
  })
  const weeklyTrend = Object.values(byWeek).slice(-12)

  // Order status distribution
  const statusDist = Object.entries(
    mockSales.reduce((acc, s) => {
      const k = s.order_status || '未知'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  // Top products by sales count
  const productCount = {}
  mockSales.forEach(s => {
    if (s.product_name) productCount[s.product_name] = (productCount[s.product_name] || 0) + 1
  })
  const topProducts = Object.entries(productCount)
    .sort((a,b) => b[1]-a[1]).slice(0, 8)
    .map(([name, count]) => ({ name: name.length > 10 ? name.slice(0,10)+'…' : name, count }))

  // Category revenue
  const catRevenue = {}
  mockSales.forEach(s => {
    const inv = mockInventory.find(i => i.product_name === s.product_name)
    const cat = inv?.jellycat_category || '其他'
    catRevenue[cat] = (catRevenue[cat] || 0) + (s.selling_price || 0)
  })
  const categoryShare = Object.entries(catRevenue)
    .sort((a,b) => b[1]-a[1]).slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  return {
    totalOrders: mockSales.length,
    completedOrders: completedSales.length,
    pendingOrders: pendingSales.length,
    cancelledOrders: mockSales.filter(s => s.order_status === '顧客已取消').length,
    totalRevenue: Math.round(totalRevenue),
    totalProfit: Math.round(totalProfit),
    totalCost: Math.round(totalCost),
    totalExpenses: Math.round(totalExpenses),
    totalCustomers: mockCustomers.length,
    totalProducts: mockProducts.length,
    lowStockProducts: mockInventory.filter(i => i.current_stock > 0 && i.current_stock <= 2).slice(0, 5),
    outOfStockProducts: mockInventory.filter(i => Number(i.current_stock) === 0).length,
    weeklyTrend,
    statusDist,
    topProducts,
    categoryShare,
    recentOrders: mockSales.slice(-8).reverse(),
  }
}

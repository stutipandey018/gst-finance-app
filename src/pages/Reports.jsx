import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '../utils/gstCalculations'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

function Reports({ invoices = [], expenses = [] }) {
  const [activeTab, setActiveTab] = useState('overview')

  // Real calculations from actual data
  const totalSales = invoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total || inv.grandTotal) || 0), 0)
  const totalGST = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_gst || inv.totalGST) || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const netProfit = totalSales - totalExpenses

  // Monthly data from real invoices
  const monthlyData = MONTHS.map(month => {
    const monthInvoices = invoices.filter(inv => {
      const d = new Date(inv.date || inv.created_at)
      return d.toLocaleString('en', { month: 'short' }) === month
    })
    const monthExpenses = expenses.filter(exp => {
      const d = new Date(exp.date || exp.created_at)
      return d.toLocaleString('en', { month: 'short' }) === month
    })
    return {
      month,
      sales: monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total || inv.grandTotal) || 0), 0),
      expenses: monthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
      gst: monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_gst || inv.totalGST) || 0), 0),
    }
  }).filter(m => m.sales > 0 || m.expenses > 0)

  // Expense breakdown by category
  const expenseByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || 'Other'
    acc[cat] = (acc[cat] || 0) + (parseFloat(e.amount) || 0)
    return acc
  }, {})

  const expenseBreakdown = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports</h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalSales), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'GST Collected', value: formatCurrency(totalGST), color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Net Profit', value: formatCurrency(netProfit), color: netProfit >= 0 ? 'text-purple-600' : 'text-red-600', bg: 'bg-purple-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {['overview', 'gst', 'expenses'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {tab === 'gst' ? 'GST Summary' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Revenue vs Expenses (FY 2025-26)</h3>
          {monthlyData.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📊</p>
              <p>Abhi koi data nahi hai.</p>
              <p className="text-sm mt-1">Invoices aur Expenses add karo — chart yahan dikhega.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {activeTab === 'gst' && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">GST Collected Monthly</h3>
          {monthlyData.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>Koi invoice nahi hai abhi.</p>
              <p className="text-sm mt-1">Invoice banao — GST summary yahan dikhegi.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="gst" name="GST Collected" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 bg-green-50 rounded-lg p-4">
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">Total GST Collected</span>
                  <span className="font-semibold">{formatCurrency(totalGST)}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">Total Invoices</span>
                  <span className="font-semibold">{invoices.length}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Expense Breakdown</h3>
            {expenseBreakdown.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">💰</p>
                <p>Koi expense nahi hai abhi.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={100}
                    dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {expenseBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Category wise</h3>
            {expenseBreakdown.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">Expenses add karo yahan dikhega.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenseBreakdown.map((item, i) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full"
                        style={{
                          width: `${(item.value / totalExpenses) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length]
                        }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
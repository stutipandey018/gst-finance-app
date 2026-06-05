import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '../utils/gstCalculations'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
const MONTH_NAMES = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March']
const MONTH_MAP = { 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11, 'Jan': 0, 'Feb': 1, 'Mar': 2 }

function Reports({ invoices = [], expenses = [] }) {
  const [activeTab, setActiveTab] = useState('overview')

  const totalSales = invoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total || inv.grandTotal) || 0), 0)
  const totalGST = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_gst || inv.totalGST) || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const netProfit = totalSales - totalExpenses

  const monthlyData = MONTHS.map((month, idx) => {
    const monthNum = MONTH_MAP[month]
    const monthInvoices = invoices.filter(inv => new Date(inv.date).getMonth() === monthNum)
    const monthExpenses = expenses.filter(exp => new Date(exp.date).getMonth() === monthNum)
    return {
      month,
      sales: monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total || inv.grandTotal) || 0), 0),
      expenses: monthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
      gst: monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_gst || inv.totalGST) || 0), 0),
    }
  }).filter(m => m.sales > 0 || m.expenses > 0)

  const expenseByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || 'Other'
    acc[cat] = (acc[cat] || 0) + (parseFloat(e.amount) || 0)
    return acc
  }, {})
  const expenseBreakdown = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))

  // Export functions
  const exportInvoices = () => {
    if (invoices.length === 0) { alert('No invoices to export'); return }
    const data = invoices.map(inv => ({
      'Invoice No': inv.invoice_no || inv.invoiceNo,
      'Date': inv.date,
      'Customer Name': inv.customer_name || inv.customerName,
      'Customer GSTIN': inv.customer_gstin || inv.customerGSTIN || '',
      'Subtotal (₹)': parseFloat(inv.subtotal) || 0,
      'CGST (₹)': parseFloat(inv.total_cgst || inv.totalCGST) || 0,
      'SGST (₹)': parseFloat(inv.total_sgst || inv.totalSGST) || 0,
      'IGST (₹)': parseFloat(inv.total_igst || inv.totalIGST) || 0,
      'Total GST (₹)': parseFloat(inv.total_gst || inv.totalGST) || 0,
      'Grand Total (₹)': parseFloat(inv.grand_total || inv.grandTotal) || 0,
      'Type': (inv.is_inter_state || inv.isInterState) ? 'Inter-State' : 'Intra-State',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf]), `Invoices_FY2025-26.xlsx`)
  }

  const exportExpenses = () => {
    if (expenses.length === 0) { alert('No expenses to export'); return }
    const data = expenses.map(exp => ({
      'Date': exp.date,
      'Description': exp.description,
      'Category': exp.category,
      'Vendor': exp.vendor || '',
      'Amount (₹)': parseFloat(exp.amount) || 0,
      'GST Paid (₹)': parseFloat(exp.gst_paid || exp.gstPaid) || 0,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf]), `Expenses_FY2025-26.xlsx`)
  }

  const exportGSTSummary = () => {
    const monthlyRows = MONTHS.map(month => {
      const monthNum = MONTH_MAP[month]
      const monthInvoices = invoices.filter(inv => new Date(inv.date).getMonth() === monthNum)
      return {
        'Month': MONTH_NAMES[MONTHS.indexOf(month)],
        'No. of Invoices': monthInvoices.length,
        'Total Sales (₹)': monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total || inv.grandTotal) || 0), 0),
        'Taxable Amount (₹)': monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.subtotal) || 0), 0),
        'CGST (₹)': monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_cgst || inv.totalCGST) || 0), 0),
        'SGST (₹)': monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_sgst || inv.totalSGST) || 0), 0),
        'IGST (₹)': monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_igst || inv.totalIGST) || 0), 0),
        'Total GST (₹)': monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_gst || inv.totalGST) || 0), 0),
      }
    })
    const ws = XLSX.utils.json_to_sheet(monthlyRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'GST Summary')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf]), `GST_Summary_FY2025-26.xlsx`)
  }

  const exportPL = () => {
    const data = [
      { 'Particulars': 'INCOME', 'Amount (₹)': '' },
      { 'Particulars': 'Total Sales (excl. GST)', 'Amount (₹)': invoices.reduce((sum, inv) => sum + (parseFloat(inv.subtotal) || 0), 0) },
      { 'Particulars': '', 'Amount (₹)': '' },
      { 'Particulars': 'EXPENSES', 'Amount (₹)': '' },
      ...Object.entries(expenseByCategory).map(([cat, amt]) => ({ 'Particulars': cat, 'Amount (₹)': amt })),
      { 'Particulars': '', 'Amount (₹)': '' },
      { 'Particulars': 'Total Expenses', 'Amount (₹)': totalExpenses },
      { 'Particulars': 'NET PROFIT / LOSS', 'Amount (₹)': invoices.reduce((sum, inv) => sum + (parseFloat(inv.subtotal) || 0), 0) - totalExpenses },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'P&L Statement')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf]), `PL_Statement_FY2025-26.xlsx`)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalSales), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'GST Collected', value: formatCurrency(totalGST), color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Net Profit', value: formatCurrency(netProfit), color: netProfit >= 0 ? 'text-purple-600' : 'text-red-600', bg: 'bg-purple-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-lg font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">📥 Export to Excel</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={exportInvoices}
            className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
            <span className="text-2xl mb-1">🧾</span>
            <span className="text-sm font-medium text-blue-700">All Invoices</span>
            <span className="text-xs text-gray-500 mt-1">{invoices.length} records</span>
          </button>
          <button onClick={exportExpenses}
            className="flex flex-col items-center p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
            <span className="text-2xl mb-1">💰</span>
            <span className="text-sm font-medium text-red-700">All Expenses</span>
            <span className="text-xs text-gray-500 mt-1">{expenses.length} records</span>
          </button>
          <button onClick={exportGSTSummary}
            className="flex flex-col items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
            <span className="text-2xl mb-1">📊</span>
            <span className="text-sm font-medium text-green-700">GST Summary</span>
            <span className="text-xs text-gray-500 mt-1">Monthly GSTR data</span>
          </button>
          <button onClick={exportPL}
            className="flex flex-col items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
            <span className="text-2xl mb-1">📈</span>
            <span className="text-sm font-medium text-purple-700">P&L Statement</span>
            <span className="text-xs text-gray-500 mt-1">For CA / ITR filing</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
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
              <p>No data yet. Add invoices and expenses to see charts.</p>
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
              <p>No invoices yet. Create invoices to see GST summary.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Expense Breakdown</h3>
            {expenseBreakdown.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">💰</p>
                <p>No expenses yet.</p>
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
                <p className="text-sm">Add expenses to see breakdown.</p>
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
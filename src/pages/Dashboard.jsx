import { formatCurrency } from '../utils/gstCalculations'
import { Link } from 'react-router-dom'

function Dashboard({ invoices = [], expenses = [] }) {
  const totalSales = invoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total || inv.grandTotal) || 0), 0)
  const totalGST = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_gst || inv.totalGST) || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const netProfit = totalSales - totalExpenses

  const recentInvoices = invoices.slice(0, 5)
  const recentExpenses = expenses.slice(0, 5)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Sales', value: formatCurrency(totalSales), color: 'bg-blue-500' },
          { label: 'GST Collected', value: formatCurrency(totalGST), color: 'bg-green-500' },
          { label: 'Expenses', value: formatCurrency(totalExpenses), color: 'bg-red-500' },
          { label: 'Net Profit', value: formatCurrency(netProfit), color: netProfit >= 0 ? 'bg-purple-500' : 'bg-red-500' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm">
            <div className={`w-10 h-10 ${card.color} rounded-lg mb-3`}></div>
            <p className="text-gray-500 text-sm">{card.label}</p>
            <p className="text-xl font-bold text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">Recent Invoices</h3>
            <Link to="/invoices" className="text-blue-600 text-sm hover:underline">View all</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No invoices yet. Create your first invoice!</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{inv.invoice_no || inv.invoiceNo}</p>
                    <p className="text-xs text-gray-500">{inv.customer_name || inv.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(inv.grand_total || inv.grandTotal)}</p>
                    <p className="text-xs text-gray-500">{inv.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">Recent Expenses</h3>
            <Link to="/expenses" className="text-blue-600 text-sm hover:underline">View all</Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No expenses yet. Add your first expense!</p>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{exp.description}</p>
                    <p className="text-xs text-gray-500">{exp.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">{formatCurrency(parseFloat(exp.amount) || 0)}</p>
                    <p className="text-xs text-gray-500">{exp.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/invoices', icon: '🧾', label: 'New Invoice' },
            { to: '/expenses', icon: '💰', label: 'Add Expense' },
            { to: '/gst', icon: '📊', label: 'GST Returns' },
            { to: '/tax', icon: '🧮', label: 'Income Tax' },
          ].map(link => (
            <Link key={link.to} to={link.to}
              className="flex flex-col items-center p-4 bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <span className="text-2xl mb-2">{link.icon}</span>
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
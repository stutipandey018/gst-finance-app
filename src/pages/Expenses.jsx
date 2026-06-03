import { useState } from 'react'
import { formatCurrency } from '../utils/gstCalculations'
import { supabase } from '../supabase'

const CATEGORIES = [
  'Office Rent', 'Salaries', 'Raw Materials', 'Travel',
  'Utilities', 'Marketing', 'Equipment', 'Software', 'Other'
]

const emptyExpense = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  category: 'Other',
  amount: '',
  gst_paid: '',
  vendor: '',
}

function Expenses({ expenses, setExpenses, userId }) {
  const [form, setForm] = useState(emptyExpense)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterMonth, setFilterMonth] = useState('All')
  const [sortBy, setSortBy] = useState('newest')

  const saveExpense = async () => {
    if (!form.description || !form.amount) {
      alert('Please fill Description and Amount')
      return
    }
    setLoading(true)
    const expenseData = {
      user_id: userId,
      date: form.date,
      description: form.description,
      category: form.category,
      amount: parseFloat(form.amount),
      gst_paid: parseFloat(form.gst_paid) || 0,
      vendor: form.vendor,
    }
    const { data, error } = await supabase.from('expenses').insert([expenseData]).select()
    if (error) alert('Error: ' + error.message)
    else { setExpenses(prev => [data[0], ...prev]); setForm(emptyExpense); setShowForm(false) }
    setLoading(false)
  }

  const deleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const months = ['All', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  let filtered = expenses.filter(exp => {
    const desc = (exp.description || '').toLowerCase()
    const vendor = (exp.vendor || '').toLowerCase()
    const matchSearch = desc.includes(search.toLowerCase()) || vendor.includes(search.toLowerCase())
    const matchCategory = filterCategory === 'All' || exp.category === filterCategory
    const matchMonth = filterMonth === 'All' || new Date(exp.date).toLocaleString('en', { month: 'long' }) === filterMonth
    return matchSearch && matchCategory && matchMonth
  })

  if (sortBy === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date))
  else if (sortBy === 'oldest') filtered = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date))
  else if (sortBy === 'highest') filtered = [...filtered].sort((a, b) => b.amount - a.amount)
  else if (sortBy === 'lowest') filtered = [...filtered].sort((a, b) => a.amount - b.amount)

  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const totalGSTPaid = expenses.reduce((sum, e) => sum + (parseFloat(e.gst_paid || e.gstPaid) || 0), 0)
  const totalFiltered = filtered.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Expenses</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">GST Paid (ITC eligible)</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalGSTPaid)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Net Expense (after ITC)</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalExpenses - totalGSTPaid)}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Add Expense</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Category</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Description *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="What was this expense for?"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Vendor Name</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Vendor / Supplier name"
                value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Total Amount (₹) *</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="0.00" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">GST Paid (₹) — for ITC</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="0.00" value={form.gst_paid}
                onChange={e => setForm({ ...form, gst_paid: e.target.value })} />
            </div>
          </div>
          <button onClick={saveExpense} disabled={loading}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="🔍 Search by description or vendor..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <select className="w-full border rounded-lg px-3 py-2 text-sm"
              value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              {months.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <select className="w-full border rounded-lg px-3 py-2 text-sm"
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {['All', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{cat}</button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
          <span>Showing <strong>{filtered.length}</strong> of {expenses.length} expenses</span>
          <span>Total: <strong className="text-red-600">{formatCurrency(totalFiltered)}</strong></span>
          {(search || filterCategory !== 'All' || filterMonth !== 'All') && (
            <button onClick={() => { setSearch(''); setFilterCategory('All'); setFilterMonth('All') }}
              className="text-red-500 hover:underline text-xs">Clear filters</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {expenses.length === 0 ? "No expenses yet. Click '+ Add Expense' to add one." : 'No expenses match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Vendor</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-right px-4 py-3">GST Paid</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(exp => (
                  <tr key={exp.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{exp.date}</td>
                    <td className="px-4 py-3 font-medium">{exp.description}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">{exp.category}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{exp.vendor || '—'}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">
                      {formatCurrency(parseFloat(exp.amount) || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatCurrency(parseFloat(exp.gst_paid || exp.gstPaid) || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => deleteExpense(exp.id)}
                        className="text-red-400 hover:text-red-600 text-lg">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Expenses
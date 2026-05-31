import { useState } from 'react'
import { formatCurrency } from '../utils/gstCalculations'

const MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
]

const MONTH_MAP = {
  'April': 3, 'May': 4, 'June': 5, 'July': 6,
  'August': 7, 'September': 8, 'October': 9, 'November': 10,
  'December': 11, 'January': 0, 'February': 1, 'March': 2
}

const FILING_DEADLINES = {
  'GSTR-1': '11th of next month',
  'GSTR-3B': '20th of next month',
  'GSTR-9': '31st December',
}

function GSTReturns({ invoices = [], expenses = [] }) {
  const [selectedMonth, setSelectedMonth] = useState('April')
  const [returns, setReturns] = useState(() => {
    const saved = localStorage.getItem('gst_returns')
    return saved ? JSON.parse(saved) : {}
  })
  const [manualOverride, setManualOverride] = useState(false)
  const [form, setForm] = useState({
    totalSales: '',
    taxableSales: '',
    cgstCollected: '',
    sgstCollected: '',
    igstCollected: '',
    cgstPaid: '',
    sgstPaid: '',
    igstPaid: '',
  })

  // Auto calculate from invoices for selected month
  const getAutoData = (month) => {
    const monthNum = MONTH_MAP[month]
    const monthInvoices = invoices.filter(inv => {
      const d = new Date(inv.date)
      return d.getMonth() === monthNum
    })
    const monthExpenses = expenses.filter(exp => {
      const d = new Date(exp.date)
      return d.getMonth() === monthNum
    })

    const totalSales = monthInvoices.reduce((sum, inv) =>
      sum + (parseFloat(inv.grand_total || inv.grandTotal) || 0), 0)
    const taxableSales = monthInvoices.reduce((sum, inv) =>
      sum + (parseFloat(inv.subtotal) || 0), 0)
    const cgstCollected = monthInvoices.reduce((sum, inv) =>
      sum + (parseFloat(inv.total_cgst || inv.totalCGST) || 0), 0)
    const sgstCollected = monthInvoices.reduce((sum, inv) =>
      sum + (parseFloat(inv.total_sgst || inv.totalSGST) || 0), 0)
    const igstCollected = monthInvoices.reduce((sum, inv) =>
      sum + (parseFloat(inv.total_igst || inv.totalIGST) || 0), 0)
    const cgstPaid = monthExpenses.reduce((sum, exp) =>
      sum + (parseFloat(exp.gst_paid || exp.gstPaid) || 0) / 2, 0)
    const sgstPaid = monthExpenses.reduce((sum, exp) =>
      sum + (parseFloat(exp.gst_paid || exp.gstPaid) || 0) / 2, 0)

    return {
      totalSales: totalSales.toFixed(2),
      taxableSales: taxableSales.toFixed(2),
      cgstCollected: cgstCollected.toFixed(2),
      sgstCollected: sgstCollected.toFixed(2),
      igstCollected: igstCollected.toFixed(2),
      cgstPaid: cgstPaid.toFixed(2),
      sgstPaid: sgstPaid.toFixed(2),
      igstPaid: '0.00',
      invoiceCount: monthInvoices.length,
      expenseCount: monthExpenses.length,
    }
  }

  const autoData = getAutoData(selectedMonth)
  const activeForm = manualOverride ? form : autoData

  const calculateLiability = () => {
    const cgstCollected = parseFloat(activeForm.cgstCollected) || 0
    const sgstCollected = parseFloat(activeForm.sgstCollected) || 0
    const igstCollected = parseFloat(activeForm.igstCollected) || 0
    const cgstPaid = parseFloat(activeForm.cgstPaid) || 0
    const sgstPaid = parseFloat(activeForm.sgstPaid) || 0
    const igstPaid = parseFloat(activeForm.igstPaid) || 0
    const totalCollected = cgstCollected + sgstCollected + igstCollected
    const totalITC = cgstPaid + sgstPaid + igstPaid
    const netPayable = Math.max(0, totalCollected - totalITC)
    return { totalCollected, totalITC, netPayable }
  }

  const saveReturn = () => {
    const liability = calculateLiability()
    const updated = {
      ...returns,
      [selectedMonth]: {
        ...activeForm,
        ...liability,
        status: 'Saved',
        month: selectedMonth,
        savedAt: new Date().toISOString()
      }
    }
    setReturns(updated)
    localStorage.setItem('gst_returns', JSON.stringify(updated))
    alert(`GST Return for ${selectedMonth} saved!`)
  }

  const markFiled = (month) => {
    const updated = {
      ...returns,
      [month]: { ...returns[month], status: 'Filed' }
    }
    setReturns(updated)
    localStorage.setItem('gst_returns', JSON.stringify(updated))
  }

  const handleMonthChange = (month) => {
    setSelectedMonth(month)
    setManualOverride(false)
    const existing = returns[month]
    if (existing) {
      setForm(existing)
    } else {
      setForm({
        totalSales: '', taxableSales: '',
        cgstCollected: '', sgstCollected: '', igstCollected: '',
        cgstPaid: '', sgstPaid: '', igstPaid: '',
      })
    }
  }

  const liability = calculateLiability()
  const saved = returns[selectedMonth]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">GST Returns</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(FILING_DEADLINES).map(([type, deadline]) => (
          <div key={type} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
            <p className="font-semibold text-gray-800">{type}</p>
            <p className="text-sm text-gray-500 mt-1">Due: {deadline}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <h3 className="font-semibold text-gray-700">Monthly Return</h3>
            <select className="border rounded-lg px-3 py-2 text-sm"
              value={selectedMonth} onChange={e => handleMonthChange(e.target.value)}>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
            {saved && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                saved.status === 'Filed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>{saved.status}</span>
            )}
          </div>

          {/* Auto data info box */}
          <div className={`rounded-lg p-3 mb-4 text-sm flex items-center justify-between ${
            manualOverride ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div>
              {manualOverride ? (
                <p className="text-orange-700">✏️ Manual mode — apne numbers daalo</p>
              ) : (
                <p className="text-blue-700">
                  ⚡ Auto mode — <strong>{autoData.invoiceCount} invoices</strong> aur <strong>{autoData.expenseCount} expenses</strong> se {selectedMonth} ka data fill hua
                </p>
              )}
            </div>
            <button
              onClick={() => setManualOverride(!manualOverride)}
              className={`text-xs px-3 py-1 rounded-lg ${
                manualOverride
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}>
              {manualOverride ? '⚡ Auto use karo' : '✏️ Manual edit karo'}
            </button>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">Sales Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Total Sales (₹)</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm bg-blue-50"
                  value={activeForm.totalSales} readOnly={!manualOverride}
                  onChange={e => setForm({ ...form, totalSales: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Taxable Sales (₹)</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm bg-blue-50"
                  value={activeForm.taxableSales} readOnly={!manualOverride}
                  onChange={e => setForm({ ...form, taxableSales: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">GST Collected (Output Tax)</h4>
            <div className="grid grid-cols-3 gap-3">
              {['cgst', 'sgst', 'igst'].map(type => (
                <div key={type}>
                  <label className="text-sm text-gray-500 block mb-1">{type.toUpperCase()} (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm bg-blue-50"
                    value={activeForm[`${type}Collected`]} readOnly={!manualOverride}
                    onChange={e => setForm({ ...form, [`${type}Collected`]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">GST Paid on Purchases (ITC)</h4>
            <div className="grid grid-cols-3 gap-3">
              {['cgst', 'sgst', 'igst'].map(type => (
                <div key={type}>
                  <label className="text-sm text-gray-500 block mb-1">{type.toUpperCase()} ITC (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm bg-blue-50"
                    value={activeForm[`${type}Paid`]} readOnly={!manualOverride}
                    onChange={e => setForm({ ...form, [`${type}Paid`]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">Total Output GST (GSTR-3B)</span>
              <span className="font-medium">{formatCurrency(liability.totalCollected)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">Total ITC Available</span>
              <span className="font-medium text-green-600">- {formatCurrency(liability.totalITC)}</span>
            </div>
            <div className="flex justify-between py-2 text-base font-bold border-t mt-1 pt-2">
              <span>Net GST Payable</span>
              <span className={liability.netPayable > 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(liability.netPayable)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={saveReturn}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Save Return
            </button>
            {saved && saved.status !== 'Filed' && (
              <button onClick={() => markFiled(selectedMonth)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                Mark as Filed ✓
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Filing Status FY 2025-26</h3>
          <div className="space-y-2">
            {MONTHS.map(month => {
              const r = returns[month]
              const autoD = getAutoData(month)
              return (
                <div key={month} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm text-gray-700">{month}</span>
                    {autoD.invoiceCount > 0 && (
                      <span className="text-xs text-gray-400 ml-2">{autoD.invoiceCount} inv</span>
                    )}
                  </div>
                  {r ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        r.status === 'Filed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>{r.status}</span>
                      {r.status !== 'Filed' && (
                        <button onClick={() => markFiled(month)}
                          className="text-xs text-blue-600 hover:underline">Filed</button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {autoD.invoiceCount > 0 ? '⚠️ Pending' : 'No data'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">Actual filing kaise karein?</p>
            <p>1. Yahan Save Return karo</p>
            <p>2. gst.gov.in pe jao</p>
            <p>3. Login karo GSTIN se</p>
            <p>4. Returns → GSTR-1/3B</p>
            <p>5. Yahan ke numbers wahan bharo</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GSTReturns
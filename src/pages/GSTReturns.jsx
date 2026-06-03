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
  const [activeTab, setActiveTab] = useState('returns')
  const [selectedMonth, setSelectedMonth] = useState('April')
  const [returns, setReturns] = useState(() => {
    const saved = localStorage.getItem('gst_returns')
    return saved ? JSON.parse(saved) : {}
  })
  const [manualOverride, setManualOverride] = useState(false)
  const [form, setForm] = useState({
    totalSales: '', taxableSales: '',
    cgstCollected: '', sgstCollected: '', igstCollected: '',
    cgstPaid: '', sgstPaid: '', igstPaid: '',
  })

  // Late fee calculator state
  const [lateFee, setLateFee] = useState({
    returnType: 'GSTR-3B',
    dueDate: '',
    filingDate: '',
    hasTaxLiability: 'yes',
    taxpayerType: 'regular',
  })

  const getAutoData = (month) => {
    const monthNum = MONTH_MAP[month]
    const monthInvoices = invoices.filter(inv => new Date(inv.date).getMonth() === monthNum)
    const monthExpenses = expenses.filter(exp => new Date(exp.date).getMonth() === monthNum)
    return {
      totalSales: monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total || inv.grandTotal) || 0), 0).toFixed(2),
      taxableSales: monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.subtotal) || 0), 0).toFixed(2),
      cgstCollected: monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_cgst || inv.totalCGST) || 0), 0).toFixed(2),
      sgstCollected: monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_sgst || inv.totalSGST) || 0), 0).toFixed(2),
      igstCollected: monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_igst || inv.totalIGST) || 0), 0).toFixed(2),
      cgstPaid: (monthExpenses.reduce((sum, exp) => sum + (parseFloat(exp.gst_paid || exp.gstPaid) || 0), 0) / 2).toFixed(2),
      sgstPaid: (monthExpenses.reduce((sum, exp) => sum + (parseFloat(exp.gst_paid || exp.gstPaid) || 0), 0) / 2).toFixed(2),
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
    return { totalCollected, totalITC, netPayable: Math.max(0, totalCollected - totalITC) }
  }

  const saveReturn = () => {
    const liability = calculateLiability()
    const updated = {
      ...returns,
      [selectedMonth]: { ...activeForm, ...liability, status: 'Saved', month: selectedMonth }
    }
    setReturns(updated)
    localStorage.setItem('gst_returns', JSON.stringify(updated))
    alert(`GST Return for ${selectedMonth} saved!`)
  }

  const markFiled = (month) => {
    const updated = { ...returns, [month]: { ...returns[month], status: 'Filed' } }
    setReturns(updated)
    localStorage.setItem('gst_returns', JSON.stringify(updated))
  }

  const handleMonthChange = (month) => {
    setSelectedMonth(month)
    setManualOverride(false)
    const existing = returns[month]
    if (existing) setForm(existing)
    else setForm({ totalSales: '', taxableSales: '', cgstCollected: '', sgstCollected: '', igstCollected: '', cgstPaid: '', sgstPaid: '', igstPaid: '' })
  }

  // Late fee calculation
  const calcLateFee = () => {
    if (!lateFee.dueDate || !lateFee.filingDate) return null
    const due = new Date(lateFee.dueDate)
    const filed = new Date(lateFee.filingDate)
    if (filed <= due) return { days: 0, cgst: 0, sgst: 0, total: 0, message: 'Filed on time! No late fee.' }

    const days = Math.ceil((filed - due) / (1000 * 60 * 60 * 24))

    let dailyFee = 0
    if (lateFee.hasTaxLiability === 'yes') {
      dailyFee = lateFee.taxpayerType === 'regular' ? 50 : 25 // 25+25 or 10+10
    } else {
      dailyFee = lateFee.taxpayerType === 'regular' ? 20 : 10 // nil return
    }

    // Max late fee cap
    let maxFee = 10000
    if (lateFee.returnType === 'GSTR-9') maxFee = 25000

    const totalFee = Math.min(days * dailyFee, maxFee)
    const cgstFee = totalFee / 2
    const sgstFee = totalFee / 2

    return { days, cgst: cgstFee, sgst: sgstFee, total: totalFee, maxFee, capped: (days * dailyFee) > maxFee }
  }

  const lf = calcLateFee()
  const liability = calculateLiability()
  const saved = returns[selectedMonth]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">GST Returns</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'returns', label: '📋 Monthly Returns' },
          { id: 'latefee', label: '⚠️ Late Fee Calculator' },
          { id: 'rcm', label: '🔄 RCM (Reverse Charge)' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'returns' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(FILING_DEADLINES).map(([type, deadline]) => (
              <div key={type} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
                <p className="font-semibold text-gray-800">{type}</p>
                <p className="text-sm text-gray-500 mt-1">Due: {deadline}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-xl p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 mb-4">
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

              <div className={`rounded-lg p-3 mb-4 text-sm flex flex-wrap items-center justify-between gap-2 ${
                manualOverride ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <p className={manualOverride ? 'text-orange-700' : 'text-blue-700'}>
                  {manualOverride
                    ? '✏️ Manual mode — enter your numbers'
                    : `⚡ Auto mode — ${autoData.invoiceCount} invoices and ${autoData.expenseCount} expenses auto-filled for ${selectedMonth}`}
                </p>
                <button onClick={() => setManualOverride(!manualOverride)}
                  className={`text-xs px-3 py-1 rounded-lg ${
                    manualOverride ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                  {manualOverride ? '⚡ Use Auto' : '✏️ Edit Manually'}
                </button>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">Sales Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

              <div className="flex flex-wrap gap-3">
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
                            r.status === 'Filed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{r.status}</span>
                          {r.status !== 'Filed' && (
                            <button onClick={() => markFiled(month)} className="text-xs text-blue-600 hover:underline">Filed</button>
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
                <p className="font-semibold mb-1">How to file actual return?</p>
                <p>1. Save return here</p>
                <p>2. Go to gst.gov.in</p>
                <p>3. Login with your GSTIN</p>
                <p>4. Go to Returns → GSTR-1/3B</p>
                <p>5. Enter these numbers there</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'latefee' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">GST Late Fee Calculator</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Return Type</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={lateFee.returnType}
                  onChange={e => setLateFee({ ...lateFee, returnType: e.target.value })}>
                  <option value="GSTR-1">GSTR-1</option>
                  <option value="GSTR-3B">GSTR-3B</option>
                  <option value="GSTR-4">GSTR-4 (Composition)</option>
                  <option value="GSTR-9">GSTR-9 (Annual)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">Taxpayer Type</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={lateFee.taxpayerType}
                  onChange={e => setLateFee({ ...lateFee, taxpayerType: e.target.value })}>
                  <option value="regular">Regular Taxpayer</option>
                  <option value="small">Small Taxpayer (Turnover &lt; ₹5 crore)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">Has Tax Liability?</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={lateFee.hasTaxLiability}
                  onChange={e => setLateFee({ ...lateFee, hasTaxLiability: e.target.value })}>
                  <option value="yes">Yes — Tax payable</option>
                  <option value="no">No — Nil return</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">Due Date</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={lateFee.dueDate}
                  onChange={e => setLateFee({ ...lateFee, dueDate: e.target.value })} />
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">Actual Filing Date</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={lateFee.filingDate}
                  onChange={e => setLateFee({ ...lateFee, filingDate: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {lf && (
              <div className={`rounded-xl p-6 shadow-sm ${lf.days === 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h4 className="font-semibold mb-4 text-gray-700">Late Fee Calculation</h4>
                {lf.days === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-4xl mb-2">✅</p>
                    <p className="text-green-700 font-semibold">{lf.message}</p>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Days delayed</span>
                      <span className="font-bold text-red-600">{lf.days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST Late Fee</span>
                      <span className="font-medium">{formatCurrency(lf.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST Late Fee</span>
                      <span className="font-medium">{formatCurrency(lf.sgst)}</span>
                    </div>
                    {lf.capped && (
                      <div className="bg-yellow-100 rounded-lg p-2 text-xs text-yellow-800">
                        ⚠️ Late fee capped at maximum limit of {formatCurrency(lf.maxFee)}
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                      <span>Total Late Fee</span>
                      <span className="text-red-600">{formatCurrency(lf.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h4 className="font-semibold text-gray-700 mb-3">Late Fee Rules</h4>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between py-1 border-b">
                  <span>GSTR-1/3B (with tax liability)</span>
                  <span className="font-medium">₹50/day (₹25 CGST + ₹25 SGST)</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>GSTR-1/3B (nil return)</span>
                  <span className="font-medium">₹20/day (₹10 + ₹10)</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>Maximum cap (GSTR-1/3B)</span>
                  <span className="font-medium">₹10,000</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>Maximum cap (GSTR-9)</span>
                  <span className="font-medium">0.25% of turnover</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Interest on late tax payment</span>
                  <span className="font-medium">18% per annum</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">Important</p>
              <p>Late fee is separate from interest on unpaid tax. Interest @ 18% p.a. is charged on outstanding tax liability from due date to payment date.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rcm' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b">Reverse Charge Mechanism (RCM)</h3>
            <p className="text-xs text-gray-400 mb-4">Under RCM, the buyer pays GST directly to the government instead of the supplier</p>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3">When does RCM apply?</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  {[
                    { service: 'Goods Transport Agency (GTA)', rate: '5%', note: 'Receiver pays GST' },
                    { service: 'Legal services by advocate', rate: '18%', note: 'Business recipient pays' },
                    { service: 'Services by director to company', rate: '18%', note: 'Company pays GST' },
                    { service: 'Import of services', rate: 'Applicable rate', note: 'Importer pays IGST' },
                    { service: 'Unregistered dealer purchases', rate: 'Applicable rate', note: 'Registered buyer pays' },
                    { service: 'Renting of motor vehicle', rate: '5%', note: 'Recipient pays' },
                    { service: 'Security services', rate: '18%', note: 'Recipient pays' },
                    { service: 'Services by insurance agent', rate: '18%', note: 'Insurance company pays' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-start py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-800">{item.service}</p>
                        <p className="text-xs text-gray-500">{item.note}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium ml-2 whitespace-nowrap">{item.rate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h4 className="font-semibold text-gray-700 mb-3">RCM Calculator</h4>
              <RCMCalculator />
            </div>

            <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-800">
              <p className="font-semibold mb-2">RCM Key Rules</p>
              <p>• RCM liability must be paid in cash — ITC cannot be used</p>
              <p>• ITC on RCM paid is available in the same month</p>
              <p>• Self-invoicing required for unregistered purchases</p>
              <p>• RCM applies on interstate purchases from unregistered dealers</p>
              <p>• Must be reported in GSTR-3B (Table 3.1d)</p>
            </div>

            <div className="bg-green-50 rounded-xl p-4 text-xs text-green-800">
              <p className="font-semibold mb-2">RCM ITC Benefit</p>
              <p>Good news — the GST you pay under RCM can be claimed back as Input Tax Credit (ITC) in the same month, so the net cost is often zero for registered businesses!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RCMCalculator() {
  const [rcm, setRcm] = useState({
    service: 'GTA',
    amount: '',
    rate: 5,
  })

  const { formatCurrency } = require('../utils/gstCalculations') || {}

  const RCM_SERVICES = [
    { value: 'GTA', label: 'Goods Transport Agency', rate: 5 },
    { value: 'legal', label: 'Legal Services (Advocate)', rate: 18 },
    { value: 'director', label: 'Director Services', rate: 18 },
    { value: 'import', label: 'Import of Services', rate: 18 },
    { value: 'security', label: 'Security Services', rate: 18 },
    { value: 'vehicle', label: 'Renting of Motor Vehicle', rate: 5 },
    { value: 'unregistered', label: 'Purchase from Unregistered Dealer', rate: 18 },
  ]

  const amount = parseFloat(rcm.amount) || 0
  const gstAmount = (amount * rcm.rate) / 100
  const igst = gstAmount
  const cgst = gstAmount / 2
  const sgst = gstAmount / 2

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm text-gray-600 block mb-1">Service Type</label>
        <select className="w-full border rounded-lg px-3 py-2 text-sm"
          value={rcm.service}
          onChange={e => {
            const found = RCM_SERVICES.find(s => s.value === e.target.value)
            setRcm({ ...rcm, service: e.target.value, rate: found ? found.rate : 18 })
          }}>
          {RCM_SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-1">Invoice Amount (₹)</label>
        <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="0.00" value={rcm.amount}
          onChange={e => setRcm({ ...rcm, amount: e.target.value })} />
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-1">GST Rate (%)</label>
        <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
          value={rcm.rate}
          onChange={e => setRcm({ ...rcm, rate: e.target.value })} />
      </div>

      {amount > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2 mt-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Invoice Amount</span>
            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>RCM GST Payable (Cash)</span>
            <span className="font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gstAmount)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>ITC Available (Same month)</span>
            <span className="font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gstAmount)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span>Net Cost</span>
            <span className="text-blue-600">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(0)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default GSTReturns
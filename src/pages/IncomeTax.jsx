import { useState } from 'react'
import { formatCurrency } from '../utils/gstCalculations'

const OLD_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 5 },
  { min: 500000, max: 1000000, rate: 20 },
  { min: 1000000, max: Infinity, rate: 30 },
]

const NEW_SLABS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 600000, rate: 5 },
  { min: 600000, max: 900000, rate: 10 },
  { min: 900000, max: 1200000, rate: 15 },
  { min: 1200000, max: 1500000, rate: 20 },
  { min: 1500000, max: Infinity, rate: 30 },
]

function calcTax(income, slabs) {
  let tax = 0
  for (const slab of slabs) {
    if (income <= slab.min) break
    const taxable = Math.min(income, slab.max) - slab.min
    tax += (taxable * slab.rate) / 100
  }
  return tax
}

function calcSurcharge(tax, income) {
  if (income > 50000000) return tax * 0.37
  if (income > 20000000) return tax * 0.25
  if (income > 10000000) return tax * 0.15
  if (income > 5000000) return tax * 0.10
  return 0
}

function IncomeTax() {
  const [activeTab, setActiveTab] = useState('personal')

  const [personal, setPersonal] = useState({
    salary: '', hra_received: '', rent_paid: '', city_type: 'metro',
    other_income: '', interest_income: '', section80c: '', section80d: '',
    section80ccd: '', home_loan_interest: '', tds_deducted: '', age: 'below60',
  })

  const [business, setBusiness] = useState({
    turnover: '', net_profit: '', scheme: 'regular',
    tds_received: '', advance_tax_paid: '', depreciation: '',
  })

  const [capitalGains, setCapitalGains] = useState({
    stcg_equity: '',
    ltcg_equity: '',
    stcg_property: '',
    ltcg_property: '',
    stcg_debt: '',
    ltcg_debt: '',
    stcg_gold: '',
    ltcg_gold: '',
    indexation: 'yes',
  })

  const [depreciation, setDepreciation] = useState({
    asset_type: 'plant',
    opening_wdv: '',
    additions: '',
    disposals: '',
    rate: 15,
  })

  const updateP = (f, v) => setPersonal({ ...personal, [f]: v })
  const updateB = (f, v) => setBusiness({ ...business, [f]: v })
  const updateCG = (f, v) => setCapitalGains({ ...capitalGains, [f]: v })
  const updateD = (f, v) => setDepreciation({ ...depreciation, [f]: v })

  const calcPersonalTax = () => {
    const salary = parseFloat(personal.salary) || 0
    const otherIncome = parseFloat(personal.other_income) || 0
    const interestIncome = parseFloat(personal.interest_income) || 0
    const standardDeduction = Math.min(50000, salary)
    const hraReceived = parseFloat(personal.hra_received) || 0
    const rentPaid = parseFloat(personal.rent_paid) || 0
    const basicSalary = salary * 0.4
    const hraExempt = Math.max(0, Math.min(
      hraReceived,
      rentPaid - (basicSalary * 0.1),
      personal.city_type === 'metro' ? basicSalary * 0.5 : basicSalary * 0.4
    ))
    const grossIncome = salary - standardDeduction - hraExempt + otherIncome + interestIncome
    const d80c = Math.min(parseFloat(personal.section80c) || 0, 150000)
    const d80d = Math.min(parseFloat(personal.section80d) || 0, personal.age === 'senior' ? 50000 : 25000)
    const d80ccd = Math.min(parseFloat(personal.section80ccd) || 0, 50000)
    const homeLoan = parseFloat(personal.home_loan_interest) || 0
    const totalDeductions = d80c + d80d + d80ccd + homeLoan
    const taxableOld = Math.max(0, grossIncome - totalDeductions)
    const taxableNew = Math.max(0, grossIncome)
    let oldTax = calcTax(taxableOld, OLD_SLABS)
    let newTax = calcTax(taxableNew, NEW_SLABS)
    if (taxableOld <= 500000) oldTax = Math.max(0, oldTax - 12500)
    if (taxableNew <= 700000) newTax = 0
    const oldSurcharge = calcSurcharge(oldTax, taxableOld)
    const newSurcharge = calcSurcharge(newTax, taxableNew)
    const oldCess = (oldTax + oldSurcharge) * 0.04
    const newCess = (newTax + newSurcharge) * 0.04
    const oldTotal = oldTax + oldSurcharge + oldCess
    const newTotal = newTax + newSurcharge + newCess
    const tds = parseFloat(personal.tds_deducted) || 0
    return {
      grossIncome, taxableOld, taxableNew, totalDeductions,
      standardDeduction, hraExempt,
      oldTax: oldTotal, newTax: newTotal,
      oldPayable: Math.max(0, oldTotal - tds),
      newPayable: Math.max(0, newTotal - tds),
      betterRegime: oldTotal <= newTotal ? 'old' : 'new',
      savings: Math.abs(oldTotal - newTotal),
    }
  }

  const calcBusinessTax = () => {
    const turnover = parseFloat(business.turnover) || 0
    const netProfit = parseFloat(business.net_profit) || 0
    const tdsReceived = parseFloat(business.tds_received) || 0
    const advanceTax = parseFloat(business.advance_tax_paid) || 0
    let taxableIncome = netProfit
    let presumptiveIncome = 0
    if (business.scheme === '44ad') { presumptiveIncome = turnover * 0.08; taxableIncome = presumptiveIncome }
    else if (business.scheme === '44ada') { presumptiveIncome = turnover * 0.50; taxableIncome = presumptiveIncome }
    const tax = calcTax(taxableIncome, NEW_SLABS)
    const cess = tax * 0.04
    const totalTax = tax + cess
    const taxDue = Math.max(0, totalTax - tdsReceived - advanceTax)
    return {
      taxableIncome, presumptiveIncome, totalTax, taxDue,
      tdsReceived, advanceTax,
      auditRequired: turnover > 10000000,
      advanceTaxRequired: totalTax > 10000,
      q1Due: totalTax * 0.15,
      q2Due: totalTax * 0.30,
      q3Due: totalTax * 0.30,
      q4Due: totalTax * 0.25,
    }
  }

  const calcCapitalGains = () => {
    const stcg_equity = parseFloat(capitalGains.stcg_equity) || 0
    const ltcg_equity = parseFloat(capitalGains.ltcg_equity) || 0
    const stcg_property = parseFloat(capitalGains.stcg_property) || 0
    const ltcg_property = parseFloat(capitalGains.ltcg_property) || 0
    const stcg_debt = parseFloat(capitalGains.stcg_debt) || 0
    const ltcg_debt = parseFloat(capitalGains.ltcg_debt) || 0
    const stcg_gold = parseFloat(capitalGains.stcg_gold) || 0
    const ltcg_gold = parseFloat(capitalGains.ltcg_gold) || 0

    // Tax rates as per Budget 2024
    const tax_stcg_equity = stcg_equity * 0.20        // 20% flat
    const tax_ltcg_equity = Math.max(0, ltcg_equity - 125000) * 0.125  // 12.5% above 1.25L
    const tax_stcg_property = calcTax(stcg_property, NEW_SLABS)  // slab rate
    const tax_ltcg_property = ltcg_property * 0.125   // 12.5% without indexation
    const tax_stcg_debt = calcTax(stcg_debt, NEW_SLABS)  // slab rate
    const tax_ltcg_debt = calcTax(ltcg_debt, NEW_SLABS)  // slab rate (post 2023)
    const tax_stcg_gold = calcTax(stcg_gold, NEW_SLABS)  // slab rate
    const tax_ltcg_gold = ltcg_gold * 0.125           // 12.5%

    const totalGains = stcg_equity + ltcg_equity + stcg_property + ltcg_property +
      stcg_debt + ltcg_debt + stcg_gold + ltcg_gold
    const totalTax = tax_stcg_equity + tax_ltcg_equity + tax_stcg_property +
      tax_ltcg_property + tax_stcg_debt + tax_ltcg_debt + tax_stcg_gold + tax_ltcg_gold
    const cess = totalTax * 0.04

    return {
      stcg_equity, ltcg_equity, stcg_property, ltcg_property,
      stcg_debt, ltcg_debt, stcg_gold, ltcg_gold,
      tax_stcg_equity, tax_ltcg_equity, tax_stcg_property, tax_ltcg_property,
      tax_stcg_debt, tax_ltcg_debt, tax_stcg_gold, tax_ltcg_gold,
      totalGains, totalTax, cess, grandTotal: totalTax + cess,
    }
  }

  const calcDepreciation = () => {
    const openingWDV = parseFloat(depreciation.opening_wdv) || 0
    const additions = parseFloat(depreciation.additions) || 0
    const disposals = parseFloat(depreciation.disposals) || 0
    const rate = parseFloat(depreciation.rate) || 15
    const wdvBeforeDepreciation = openingWDV + additions - disposals
    const depreciationAmount = wdvBeforeDepreciation * rate / 100
    const closingWDV = wdvBeforeDepreciation - depreciationAmount
    return { openingWDV, additions, disposals, wdvBeforeDepreciation, depreciationAmount, closingWDV, rate }
  }

  const pt = calcPersonalTax()
  const bt = calcBusinessTax()
  const cg = calcCapitalGains()
  const dep = calcDepreciation()

  const ASSET_TYPES = [
    { value: 'plant', label: 'Plant & Machinery', rate: 15 },
    { value: 'computer', label: 'Computers & Software', rate: 40 },
    { value: 'building', label: 'Building (Residential)', rate: 5 },
    { value: 'building_commercial', label: 'Building (Commercial)', rate: 10 },
    { value: 'furniture', label: 'Furniture & Fixtures', rate: 10 },
    { value: 'vehicle', label: 'Motor Vehicle', rate: 15 },
    { value: 'intangible', label: 'Intangible Assets', rate: 25 },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Income Tax Calculator</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'personal', label: '👤 Personal Tax (ITR-1/2)' },
          { id: 'business', label: '🏢 Business Tax (ITR-3/4)' },
          { id: 'capital', label: '📈 Capital Gains' },
          { id: 'depreciation', label: '🏭 Depreciation (WDV)' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Income Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Age Group</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={personal.age} onChange={e => updateP('age', e.target.value)}>
                    <option value="below60">Below 60 years</option>
                    <option value="senior">60-80 years (Senior)</option>
                    <option value="supersenior">Above 80 (Super Senior)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Annual Salary / Pension (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0" value={personal.salary} onChange={e => updateP('salary', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">HRA Received (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0" value={personal.hra_received} onChange={e => updateP('hra_received', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Rent Paid (₹/year)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0" value={personal.rent_paid} onChange={e => updateP('rent_paid', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">City Type</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={personal.city_type} onChange={e => updateP('city_type', e.target.value)}>
                    <option value="metro">Metro (Delhi, Mumbai, Kolkata, Chennai)</option>
                    <option value="nonmetro">Non-Metro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Other Income (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Rental, freelance etc." value={personal.other_income}
                    onChange={e => updateP('other_income', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Interest Income (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="FD, savings interest" value={personal.interest_income}
                    onChange={e => updateP('interest_income', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">TDS Already Deducted (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="From Form 16 / 26AS" value={personal.tds_deducted}
                    onChange={e => updateP('tds_deducted', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-1 pb-2 border-b">Deductions (Old Regime only)</h3>
              <p className="text-xs text-gray-400 mb-4">These don't apply in New Regime</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Section 80C (₹) — max ₹1.5L</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="PPF, ELSS, LIC, EPF, tuition" value={personal.section80c}
                    onChange={e => updateP('section80c', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Section 80D (₹) — Health Insurance</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Max ₹25K / ₹50K for senior" value={personal.section80d}
                    onChange={e => updateP('section80d', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">NPS 80CCD(1B) (₹) — max ₹50K</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Additional NPS contribution" value={personal.section80ccd}
                    onChange={e => updateP('section80ccd', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Home Loan Interest (₹) — max ₹2L</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Section 24b deduction" value={personal.home_loan_interest}
                    onChange={e => updateP('home_loan_interest', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`rounded-xl p-5 shadow-sm border-2 ${pt.betterRegime === 'new' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-700">New Regime</h4>
                {pt.betterRegime === 'new' && <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Better ✓</span>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Taxable Income</span><span>{formatCurrency(pt.taxableNew)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tax + Cess</span><span>{formatCurrency(pt.newTax)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>Tax Payable</span><span className="text-blue-600">{formatCurrency(pt.newPayable)}</span>
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-5 shadow-sm border-2 ${pt.betterRegime === 'old' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-700">Old Regime</h4>
                {pt.betterRegime === 'old' && <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Better ✓</span>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Gross Income</span><span>{formatCurrency(pt.grossIncome)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Standard Deduction</span><span>- {formatCurrency(pt.standardDeduction)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">HRA Exempt</span><span>- {formatCurrency(pt.hraExempt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">80C/80D/NPS</span><span>- {formatCurrency(pt.totalDeductions)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Taxable Income</span><span>{formatCurrency(pt.taxableOld)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>Tax Payable</span><span className="text-blue-600">{formatCurrency(pt.oldPayable)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-blue-800 mb-1">Save {formatCurrency(pt.savings)} with {pt.betterRegime === 'old' ? 'Old' : 'New'} Regime</p>
              <p className="text-blue-600 text-xs">Based on your inputs above</p>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Tax Rules FY 2025-26</p>
              <p>• Standard deduction: ₹50,000</p>
              <p>• New regime rebate: income up to ₹7L = zero tax</p>
              <p>• 87A rebate (old): income up to ₹5L = zero tax</p>
              <p>• Cess: 4% on all tax</p>
              <p>• ITR due date: 31st July 2026</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'business' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Business Income Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Tax Scheme</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={business.scheme} onChange={e => updateB('scheme', e.target.value)}>
                    <option value="regular">Regular (Actual P&L)</option>
                    <option value="44ad">44AD — Presumptive (Trading/Business)</option>
                    <option value="44ada">44ADA — Presumptive (Professionals)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {business.scheme === '44ad' && '8% of turnover treated as profit (6% for digital)'}
                    {business.scheme === '44ada' && '50% of gross receipts treated as profit'}
                    {business.scheme === 'regular' && 'Actual books of accounts profit used'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Annual Turnover (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Total sales / receipts" value={business.turnover}
                    onChange={e => updateB('turnover', e.target.value)} />
                </div>
                {business.scheme === 'regular' && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Net Profit (₹)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="After all expenses" value={business.net_profit}
                      onChange={e => updateB('net_profit', e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-600 block mb-1">TDS Deducted by Clients (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="From Form 26AS" value={business.tds_received}
                    onChange={e => updateB('tds_received', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Advance Tax Already Paid (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Self assessment paid" value={business.advance_tax_paid}
                    onChange={e => updateB('advance_tax_paid', e.target.value)} />
                </div>
              </div>
            </div>

            {bt.advanceTaxRequired && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Advance Tax Schedule</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { q: 'Q1', date: '15th June 2025', amt: bt.q1Due, pct: '15%' },
                    { q: 'Q2', date: '15th Sep 2025', amt: bt.q2Due, pct: '30%' },
                    { q: 'Q3', date: '15th Dec 2025', amt: bt.q3Due, pct: '30%' },
                    { q: 'Q4', date: '15th Mar 2026', amt: bt.q4Due, pct: '25%' },
                  ].map(q => (
                    <div key={q.q} className="bg-blue-50 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-800">{q.q} ({q.pct})</span>
                        <span className="font-bold">{formatCurrency(q.amt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Due: {q.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-blue-200">
              <h4 className="font-semibold text-gray-700 mb-3">Tax Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Taxable Income</span><span>{formatCurrency(bt.taxableIncome)}</span></div>
                {business.scheme !== 'regular' && (
                  <div className="flex justify-between"><span className="text-gray-500">Presumptive Income</span><span>{formatCurrency(bt.presumptiveIncome)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">Total Tax + Cess</span><span>{formatCurrency(bt.totalTax)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">TDS Credit</span><span>- {formatCurrency(bt.tdsReceived)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Advance Tax Paid</span><span>- {formatCurrency(bt.advanceTax)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>Tax Due</span>
                  <span className={bt.taxDue > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(bt.taxDue)}</span>
                </div>
              </div>
            </div>

            {bt.auditRequired && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                <p className="font-semibold mb-1">⚠️ Tax Audit Required</p>
                <p>Turnover exceeds ₹1 crore — Tax audit u/s 44AB is mandatory.</p>
                <p className="mt-1">Due date: 30th September 2026</p>
              </div>
            )}

            <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Business Tax Rules</p>
              <p>• 44AD: Turnover limit ₹3 crore</p>
              <p>• 44ADA: Receipts limit ₹75 lakh</p>
              <p>• Advance tax if liability &gt; ₹10,000</p>
              <p>• TDS u/s 194C: 1-2% on contractors</p>
              <p>• TDS u/s 194J: 10% on professionals</p>
              <p>• ITR-4 for presumptive, ITR-3 for regular</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'capital' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b">Capital Gains — FY 2025-26</h3>
              <p className="text-xs text-gray-400 mb-4">As per Budget 2024 revised rates</p>

              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-3">Equity / Mutual Funds</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">STCG — Short Term (₹) <span className="text-xs text-gray-400">Held &lt; 1 year — 20% tax</span></label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="0" value={capitalGains.stcg_equity}
                        onChange={e => updateCG('stcg_equity', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">LTCG — Long Term (₹) <span className="text-xs text-gray-400">Held &gt; 1 year — 12.5% above ₹1.25L</span></label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="0" value={capitalGains.ltcg_equity}
                        onChange={e => updateCG('ltcg_equity', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">Property / Real Estate</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">STCG (₹) <span className="text-xs text-gray-400">Held &lt; 2 years — Slab rate</span></label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="0" value={capitalGains.stcg_property}
                        onChange={e => updateCG('stcg_property', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">LTCG (₹) <span className="text-xs text-gray-400">Held &gt; 2 years — 12.5%</span></label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="0" value={capitalGains.ltcg_property}
                        onChange={e => updateCG('ltcg_property', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-3">Gold / Debt Funds</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Debt STCG (₹) <span className="text-xs text-gray-400">Slab rate</span></label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="0" value={capitalGains.stcg_debt}
                        onChange={e => updateCG('stcg_debt', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Debt LTCG (₹) <span className="text-xs text-gray-400">Slab rate</span></label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="0" value={capitalGains.ltcg_debt}
                        onChange={e => updateCG('ltcg_debt', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Gold STCG (₹) <span className="text-xs text-gray-400">Slab rate</span></label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="0" value={capitalGains.stcg_gold}
                        onChange={e => updateCG('stcg_gold', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Gold LTCG (₹) <span className="text-xs text-gray-400">12.5%</span></label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="0" value={capitalGains.ltcg_gold}
                        onChange={e => updateCG('ltcg_gold', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h4 className="font-semibold text-gray-700 mb-4">Tax Summary</h4>
              <div className="space-y-2 text-sm">
                {cg.stcg_equity > 0 && <div className="flex justify-between"><span className="text-gray-500">Equity STCG Tax (20%)</span><span>{formatCurrency(cg.tax_stcg_equity)}</span></div>}
                {cg.ltcg_equity > 0 && <div className="flex justify-between"><span className="text-gray-500">Equity LTCG Tax (12.5%)</span><span>{formatCurrency(cg.tax_ltcg_equity)}</span></div>}
                {cg.stcg_property > 0 && <div className="flex justify-between"><span className="text-gray-500">Property STCG Tax</span><span>{formatCurrency(cg.tax_stcg_property)}</span></div>}
                {cg.ltcg_property > 0 && <div className="flex justify-between"><span className="text-gray-500">Property LTCG Tax (12.5%)</span><span>{formatCurrency(cg.tax_ltcg_property)}</span></div>}
                {cg.stcg_debt > 0 && <div className="flex justify-between"><span className="text-gray-500">Debt STCG Tax</span><span>{formatCurrency(cg.tax_stcg_debt)}</span></div>}
                {cg.ltcg_debt > 0 && <div className="flex justify-between"><span className="text-gray-500">Debt LTCG Tax</span><span>{formatCurrency(cg.tax_ltcg_debt)}</span></div>}
                {cg.stcg_gold > 0 && <div className="flex justify-between"><span className="text-gray-500">Gold STCG Tax</span><span>{formatCurrency(cg.tax_stcg_gold)}</span></div>}
                {cg.ltcg_gold > 0 && <div className="flex justify-between"><span className="text-gray-500">Gold LTCG Tax (12.5%)</span><span>{formatCurrency(cg.tax_ltcg_gold)}</span></div>}
                <div className="flex justify-between py-1 text-sm border-t mt-1 pt-2">
                  <span className="text-gray-500">Total Gains</span>
                  <span>{formatCurrency(cg.totalGains)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">Total Tax</span>
                  <span>{formatCurrency(cg.totalTax)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">Cess (4%)</span>
                  <span>{formatCurrency(cg.cess)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>Total Tax Payable</span>
                  <span className="text-red-600">{formatCurrency(cg.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Capital Gains Rules (Budget 2024)</p>
              <p>• Equity STCG: 20% (held &lt; 1 yr)</p>
              <p>• Equity LTCG: 12.5% above ₹1.25L</p>
              <p>• Property LTCG: 12.5% (no indexation)</p>
              <p>• Debt funds: slab rate</p>
              <p>• Gold LTCG: 12.5%</p>
              <p>• Section 54/54F: property reinvestment exemption</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'depreciation' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b">Depreciation Calculator (WDV Method)</h3>
              <p className="text-xs text-gray-400 mb-4">As per Income Tax Act — Block of Assets method</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600 block mb-1">Asset Type</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={depreciation.asset_type}
                    onChange={e => {
                      const found = ASSET_TYPES.find(a => a.value === e.target.value)
                      updateD('asset_type', e.target.value)
                      if (found) updateD('rate', found.rate)
                    }}>
                    {ASSET_TYPES.map(a => (
                      <option key={a.value} value={a.value}>{a.label} — {a.rate}%</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Opening WDV (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Value at start of year" value={depreciation.opening_wdv}
                    onChange={e => updateD('opening_wdv', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Additions during year (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="New assets purchased" value={depreciation.additions}
                    onChange={e => updateD('additions', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Disposals during year (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Assets sold / discarded" value={depreciation.disposals}
                    onChange={e => updateD('disposals', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Depreciation Rate (%)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={depreciation.rate}
                    onChange={e => updateD('rate', e.target.value)} />
                </div>
              </div>

              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">Calculation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Opening WDV</span><span>{formatCurrency(dep.openingWDV)}</span></div>
                  <div className="flex justify-between text-green-600"><span>+ Additions</span><span>{formatCurrency(dep.additions)}</span></div>
                  <div className="flex justify-between text-red-500"><span>- Disposals</span><span>{formatCurrency(dep.disposals)}</span></div>
                  <div className="flex justify-between border-t pt-2 mt-1"><span className="text-gray-600">WDV before depreciation</span><span className="font-medium">{formatCurrency(dep.wdvBeforeDepreciation)}</span></div>
                  <div className="flex justify-between text-red-600"><span>- Depreciation @ {dep.rate}%</span><span className="font-bold">{formatCurrency(dep.depreciationAmount)}</span></div>
                  <div className="flex justify-between border-t pt-2 mt-1 font-bold text-base"><span>Closing WDV</span><span className="text-blue-600">{formatCurrency(dep.closingWDV)}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-5">
              <h4 className="font-semibold text-blue-800 mb-3">Depreciation Summary</h4>
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Depreciation Allowed</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{formatCurrency(dep.depreciationAmount)}</p>
                <p className="text-xs text-gray-400 mt-2">This reduces your taxable business income</p>
              </div>
              <div className="text-sm space-y-1 mt-2">
                <div className="flex justify-between"><span className="text-gray-500">Tax saving (@30%)</span><span className="font-medium text-green-600">{formatCurrency(dep.depreciationAmount * 0.30)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Closing WDV</span><span className="font-medium">{formatCurrency(dep.closingWDV)}</span></div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">WDV Depreciation Rates</p>
              <p>• Plant & Machinery: 15%</p>
              <p>• Computers: 40%</p>
              <p>• Buildings (Residential): 5%</p>
              <p>• Buildings (Commercial): 10%</p>
              <p>• Furniture: 10%</p>
              <p>• Motor Vehicle: 15%</p>
              <p>• Intangible Assets: 25%</p>
              <p className="mt-2 font-medium">Half year rule: Assets bought after Oct 1 get 50% depreciation</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IncomeTax
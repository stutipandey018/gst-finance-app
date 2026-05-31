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
    salary: '',
    hra_received: '',
    rent_paid: '',
    city_type: 'metro',
    other_income: '',
    interest_income: '',
    section80c: '',
    section80d: '',
    section80ccd: '',
    nps_employer: '',
    home_loan_interest: '',
    tds_deducted: '',
    age: 'below60',
  })

  const [business, setBusiness] = useState({
    turnover: '',
    net_profit: '',
    scheme: 'regular',
    tds_received: '',
    advance_tax_paid: '',
    depreciation: '',
  })

  const updateP = (f, v) => setPersonal({ ...personal, [f]: v })
  const updateB = (f, v) => setBusiness({ ...business, [f]: v })

  // Personal tax calculation
  const calcPersonalTax = () => {
    const salary = parseFloat(personal.salary) || 0
    const otherIncome = parseFloat(personal.other_income) || 0
    const interestIncome = parseFloat(personal.interest_income) || 0

    // Standard deduction
    const standardDeduction = Math.min(50000, salary)

    // HRA exemption
    const hraReceived = parseFloat(personal.hra_received) || 0
    const rentPaid = parseFloat(personal.rent_paid) || 0
    const basicSalary = salary * 0.4
    const hraExempt = Math.min(
      hraReceived,
      rentPaid - (basicSalary * 0.1),
      personal.city_type === 'metro' ? basicSalary * 0.5 : basicSalary * 0.4
    )
    const actualHRA = Math.max(0, hraExempt)

    // Gross total income
    const grossIncome = salary - standardDeduction - actualHRA + otherIncome + interestIncome

    // Deductions (Old regime only)
    const d80c = Math.min(parseFloat(personal.section80c) || 0, 150000)
    const d80d = Math.min(parseFloat(personal.section80d) || 0, personal.age === 'senior' ? 50000 : 25000)
    const d80ccd = Math.min(parseFloat(personal.section80ccd) || 0, 50000)
    const homeLoan = parseFloat(personal.home_loan_interest) || 0

    const totalDeductions = d80c + d80d + d80ccd + homeLoan
    const taxableOld = Math.max(0, grossIncome - totalDeductions)
    const taxableNew = Math.max(0, grossIncome)

    // Tax calculation
    let oldTax = calcTax(taxableOld, OLD_SLABS)
    let newTax = calcTax(taxableNew, NEW_SLABS)

    // Rebate u/s 87A
    if (taxableOld <= 500000) oldTax = Math.max(0, oldTax - 12500)
    if (taxableNew <= 700000) newTax = 0

    // Surcharge
    const oldSurcharge = calcSurcharge(oldTax, taxableOld)
    const newSurcharge = calcSurcharge(newTax, taxableNew)

    // Health & Education Cess 4%
    const oldCess = (oldTax + oldSurcharge) * 0.04
    const newCess = (newTax + newSurcharge) * 0.04

    const oldTotal = oldTax + oldSurcharge + oldCess
    const newTotal = newTax + newSurcharge + newCess

    const tds = parseFloat(personal.tds_deducted) || 0

    return {
      grossIncome,
      taxableOld,
      taxableNew,
      totalDeductions,
      standardDeduction,
      hraExempt: actualHRA,
      oldTax: oldTotal,
      newTax: newTotal,
      oldPayable: Math.max(0, oldTotal - tds),
      newPayable: Math.max(0, newTotal - tds),
      betterRegime: oldTotal <= newTotal ? 'old' : 'new',
      savings: Math.abs(oldTotal - newTotal),
    }
  }

  // Business tax calculation
  const calcBusinessTax = () => {
    const turnover = parseFloat(business.turnover) || 0
    const netProfit = parseFloat(business.net_profit) || 0
    const tdsReceived = parseFloat(business.tds_received) || 0
    const advanceTax = parseFloat(business.advance_tax_paid) || 0

    let taxableIncome = netProfit
    let presumptiveIncome = 0

    if (business.scheme === '44ad') {
      presumptiveIncome = turnover * 0.08
      taxableIncome = presumptiveIncome
    } else if (business.scheme === '44ada') {
      presumptiveIncome = turnover * 0.50
      taxableIncome = presumptiveIncome
    }

    const tax = calcTax(taxableIncome, NEW_SLABS)
    const cess = tax * 0.04
    const totalTax = tax + cess
    const taxDue = Math.max(0, totalTax - tdsReceived - advanceTax)

    const auditRequired = turnover > 10000000
    const advanceTaxRequired = totalTax > 10000

    return {
      taxableIncome,
      presumptiveIncome,
      totalTax,
      taxDue,
      tdsReceived,
      advanceTax,
      auditRequired,
      advanceTaxRequired,
      q1Due: totalTax * 0.15,
      q2Due: totalTax * 0.45 - totalTax * 0.15,
      q3Due: totalTax * 0.75 - totalTax * 0.45,
      q4Due: totalTax * 0.25,
    }
  }

  const pt = calcPersonalTax()
  const bt = calcBusinessTax()

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Income Tax Calculator</h2>

      <div className="flex gap-2 mb-6">
        {['personal', 'business'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg font-medium capitalize ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >{tab === 'personal' ? '👤 Personal Tax (ITR-1/2)' : '🏢 Business Tax (ITR-3/4)'}</button>
        ))}
      </div>

      {activeTab === 'personal' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-5">

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Income Details</h3>
              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="0" value={personal.salary}
                    onChange={e => updateP('salary', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">HRA Received (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0" value={personal.hra_received}
                    onChange={e => updateP('hra_received', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Rent Paid (₹/year)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0" value={personal.rent_paid}
                    onChange={e => updateP('rent_paid', e.target.value)} />
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
              <div className="grid grid-cols-2 gap-4">
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
                  <span>Tax Payable</span>
                  <span className="text-blue-600">{formatCurrency(pt.newPayable)}</span>
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
                <div className="flex justify-between"><span className="text-gray-500">Tax + Cess</span><span>{formatCurrency(pt.oldTax)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>Tax Payable</span>
                  <span className="text-blue-600">{formatCurrency(pt.oldPayable)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-blue-800 mb-1">
                Save {formatCurrency(pt.savings)} with {pt.betterRegime === 'old' ? 'Old' : 'New'} Regime
              </p>
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
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-5">

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Business Income Details</h3>
              <div className="grid grid-cols-2 gap-4">
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
    </div>
  )
}

export default IncomeTax
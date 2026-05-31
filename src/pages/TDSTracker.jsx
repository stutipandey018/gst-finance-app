import { useState, useEffect } from 'react'
import { formatCurrency } from '../utils/gstCalculations'
import { supabase } from '../supabase'

const TDS_SECTIONS = [
  { section: '194C', description: 'Contractor / Sub-contractor', rate: 1 },
  { section: '194J', description: 'Professional / Technical fees', rate: 10 },
  { section: '194H', description: 'Commission / Brokerage', rate: 5 },
  { section: '194I', description: 'Rent (Land/Building)', rate: 10 },
  { section: '194IA', description: 'Purchase of property', rate: 1 },
  { section: '194A', description: 'Interest (other than securities)', rate: 10 },
  { section: '194B', description: 'Lottery / Crossword winnings', rate: 30 },
  { section: '192', description: 'Salary', rate: 0 },
  { section: '194Q', description: 'Purchase of goods', rate: 0.1 },
]

const emptyEntry = {
  date: new Date().toISOString().split('T')[0],
  party_name: '',
  party_pan: '',
  section: '194J',
  payment_amount: '',
  tds_rate: 10,
  tds_deducted: '',
  tds_deposited: false,
  quarter: 'Q1',
  remarks: '',
}

function TDSTracker({ userId }) {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(emptyEntry)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState('deducted')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    const { data } = await supabase
      .from('tds_entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setEntries(data)
  }

  const saveEntry = async () => {
    if (!form.party_name || !form.payment_amount) {
      alert('Party name aur payment amount bharo')
      return
    }
    setLoading(true)

    const { data, error } = await supabase
      .from('tds_entries')
      .insert([{ ...form, user_id: userId }])
      .select()

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setEntries(prev => [data[0], ...prev])
      setForm(emptyEntry)
      setShowForm(false)
    }
    setLoading(false)
  }

  const deleteEntry = async (id) => {
    const { error } = await supabase.from('tds_entries').delete().eq('id', id)
    if (!error) setEntries(prev => prev.filter(e => e.id !== id))
  }

  const toggleDeposited = async (id, current) => {
    const { error } = await supabase
      .from('tds_entries')
      .update({ tds_deposited: !current })
      .eq('id', id)
    if (!error) {
      setEntries(prev => prev.map(e =>
        e.id === id ? { ...e, tds_deposited: !current } : e
      ))
    }
  }

  const handleSectionChange = (section) => {
    const found = TDS_SECTIONS.find(s => s.section === section)
    setForm({ ...form, section, tds_rate: found ? found.rate : 10 })
  }

  const autoCalcTDS = () => {
    const amt = parseFloat(form.payment_amount) || 0
    const tds = (amt * form.tds_rate) / 100
    setForm({ ...form, tds_deducted: tds.toFixed(2) })
  }

  const totalTDSDeducted = entries.reduce((sum, e) => sum + (parseFloat(e.tds_deducted) || 0), 0)
  const totalDeposited = entries.filter(e => e.tds_deposited).reduce((sum, e) => sum + (parseFloat(e.tds_deducted) || 0), 0)
  const totalPending = totalTDSDeducted - totalDeposited

  const byQuarter = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({
    quarter: q,
    total: entries.filter(e => e.quarter === q).reduce((sum, e) => sum + (parseFloat(e.tds_deducted) || 0), 0),
    deposited: entries.filter(e => e.quarter === q && e.tds_deposited).reduce((sum, e) => sum + (parseFloat(e.tds_deducted) || 0), 0),
  }))

  const bySection = TDS_SECTIONS.map(s => ({
    ...s,
    total: entries.filter(e => e.section === s.section).reduce((sum, e) => sum + (parseFloat(e.tds_deducted) || 0), 0),
    count: entries.filter(e => e.section === s.section).length,
  })).filter(s => s.count > 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">TDS Tracker</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ Add TDS Entry'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total TDS Deducted</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totalTDSDeducted)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Deposited to Govt</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalDeposited)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending Deposit</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Entries</p>
          <p className="text-xl font-bold text-gray-800">{entries.length}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Add TDS Entry</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Quarter</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.quarter} onChange={e => setForm({ ...form, quarter: e.target.value })}>
                <option value="Q1">Q1 (Apr-Jun)</option>
                <option value="Q2">Q2 (Jul-Sep)</option>
                <option value="Q3">Q3 (Oct-Dec)</option>
                <option value="Q4">Q4 (Jan-Mar)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">TDS Section</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.section} onChange={e => handleSectionChange(e.target.value)}>
                {TDS_SECTIONS.map(s => (
                  <option key={s.section} value={s.section}>{s.section} — {s.description}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Party Name *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Vendor / Employee name"
                value={form.party_name} onChange={e => setForm({ ...form, party_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Party PAN</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm uppercase"
                placeholder="AAAAA0000A" maxLength={10}
                value={form.party_pan} onChange={e => setForm({ ...form, party_pan: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Payment Amount (₹) *</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="0.00"
                value={form.payment_amount} onChange={e => setForm({ ...form, payment_amount: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">TDS Rate (%)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.tds_rate} onChange={e => setForm({ ...form, tds_rate: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">TDS Amount (₹)</label>
              <div className="flex gap-2">
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="0.00"
                  value={form.tds_deducted} onChange={e => setForm({ ...form, tds_deducted: e.target.value })} />
                <button onClick={autoCalcTDS}
                  className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-xs whitespace-nowrap hover:bg-blue-200">
                  Auto
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Remarks</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Invoice no / description"
                value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
          <button onClick={saveEntry} disabled={loading}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['deducted', 'quarterly', 'sections'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            }`}>
            {tab === 'deducted' ? 'All Entries' : tab === 'quarterly' ? 'Quarterly' : 'By Section'}
          </button>
        ))}
      </div>

      {activeTab === 'deducted' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Koi entry nahi. "+ Add TDS Entry" click karo.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Party</th>
                  <th className="text-left px-4 py-3">Section</th>
                  <th className="text-right px-4 py-3">Payment</th>
                  <th className="text-right px-4 py-3">TDS</th>
                  <th className="text-center px-4 py-3">Deposited</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{e.date}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{e.party_name}</p>
                      {e.party_pan && <p className="text-xs text-gray-400">{e.party_pan}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">{e.section}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(parseFloat(e.payment_amount) || 0)}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(parseFloat(e.tds_deducted) || 0)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleDeposited(e.id, e.tds_deposited)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          e.tds_deposited ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {e.tds_deposited ? 'Deposited ✓' : 'Pending'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => deleteEntry(e.id)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'quarterly' && (
        <div className="grid grid-cols-2 gap-4">
          {byQuarter.map(q => (
            <div key={q.quarter} className="bg-white rounded-xl p-5 shadow-sm">
              <h4 className="font-semibold text-gray-700 mb-3">{q.quarter}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total TDS</span><span className="font-medium">{formatCurrency(q.total)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Deposited</span><span className="text-green-600">{formatCurrency(q.deposited)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="text-gray-500">Pending</span><span className={q.total - q.deposited > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{formatCurrency(q.total - q.deposited)}</span></div>
              </div>
            </div>
          ))}
          <div className="col-span-2 bg-amber-50 rounded-xl p-4 text-xs text-amber-800">
            <p className="font-semibold mb-2">TDS Deposit Due Dates</p>
            <div className="grid grid-cols-2 gap-2">
              <p>• Q1 (Apr-Jun): 7th July</p>
              <p>• Q2 (Jul-Sep): 7th October</p>
              <p>• Q3 (Oct-Dec): 7th January</p>
              <p>• Q4 (Jan-Mar): 30th April</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sections' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {bySection.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No entries yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Section</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-center px-4 py-3">Entries</th>
                  <th className="text-right px-4 py-3">Total TDS</th>
                </tr>
              </thead>
              <tbody>
                {bySection.map(s => (
                  <tr key={s.section} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">{s.section}</span></td>
                    <td className="px-4 py-3 text-gray-600">{s.description}</td>
                    <td className="px-4 py-3 text-center">{s.count}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default TDSTracker
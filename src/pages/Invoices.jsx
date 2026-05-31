import { useState } from 'react'
import { calculateInvoiceTotal, GST_RATES, formatCurrency } from '../utils/gstCalculations'
import InvoicePDF from './InvoicePDF'
import { supabase } from '../supabase'

const emptyItem = { description: '', amount: '', gstRate: 18 }

const emptyInvoice = {
  invoiceNo: '',
  date: new Date().toISOString().split('T')[0],
  customerName: '',
  customerGSTIN: '',
  isInterState: false,
  items: [{ ...emptyItem }],
}

function Invoices({ invoices, setInvoices, userId }) {
  const [form, setForm] = useState(emptyInvoice)
  const [showForm, setShowForm] = useState(false)
  const [pdfInvoice, setPdfInvoice] = useState(null)
  const [loading, setLoading] = useState(false)
  const profile = JSON.parse(localStorage.getItem('gst_profile') || '{}')

  const updateItem = (index, field, value) => {
    const updated = [...form.items]
    updated[index] = { ...updated[index], [field]: value }
    setForm({ ...form, items: updated })
  }

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] })
  }

  const removeItem = (index) => {
    if (form.items.length === 1) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  const totals = calculateInvoiceTotal(form.items, form.isInterState)

  const saveInvoice = async () => {
    if (!form.invoiceNo || !form.customerName) {
      alert('Invoice No aur Customer Name bharo')
      return
    }
    setLoading(true)

    const invoiceData = {
      user_id: userId,
      invoice_no: form.invoiceNo,
      date: form.date,
      customer_name: form.customerName,
      customer_gstin: form.customerGSTIN,
      is_inter_state: form.isInterState,
      items: form.items,
      subtotal: totals.subtotal,
      total_cgst: totals.totalCGST,
      total_sgst: totals.totalSGST,
      total_igst: totals.totalIGST,
      total_gst: totals.totalGST,
      grand_total: totals.grandTotal,
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select()

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setInvoices(prev => [data[0], ...prev])
      setForm(emptyInvoice)
      setShowForm(false)
    }
    setLoading(false)
  }

  const deleteInvoice = async (id) => {
    if (!confirm('Yeh invoice delete karna chahte ho?')) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (!error) setInvoices(prev => prev.filter(inv => inv.id !== id))
  }

  // Helper for both old and new field names
  const getField = (inv, newName, oldName) => inv[newName] ?? inv[oldName] ?? 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Invoices</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ New Invoice'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Create Invoice</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Invoice No *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="INV-001" value={form.invoiceNo}
                onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Customer Name *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Customer / Business name" value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Customer GSTIN</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="22AAAAA0000A1Z5" value={form.customerGSTIN}
                onChange={e => setForm({ ...form, customerGSTIN: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input type="checkbox" id="interstate" checked={form.isInterState}
              onChange={e => setForm({ ...form, isInterState: e.target.checked })} />
            <label htmlFor="interstate" className="text-sm text-gray-600">
              Inter-state sale (IGST applies)
            </label>
          </div>

          <h4 className="font-medium text-gray-700 mb-2">Items</h4>
          <div className="space-y-2 mb-3">
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input className="col-span-5 border rounded-lg px-3 py-2 text-sm"
                  placeholder="Description" value={item.description}
                  onChange={e => updateItem(i, 'description', e.target.value)} />
                <input type="number" className="col-span-3 border rounded-lg px-3 py-2 text-sm"
                  placeholder="Amount (₹)" value={item.amount}
                  onChange={e => updateItem(i, 'amount', e.target.value)} />
                <select className="col-span-3 border rounded-lg px-3 py-2 text-sm"
                  value={item.gstRate}
                  onChange={e => updateItem(i, 'gstRate', e.target.value)}>
                  {GST_RATES.map(r => <option key={r} value={r}>GST {r}%</option>)}
                </select>
                <button onClick={() => removeItem(i)}
                  className="col-span-1 text-red-400 hover:text-red-600 text-lg font-bold">×</button>
              </div>
            ))}
          </div>

          <button onClick={addItem} className="text-blue-600 text-sm hover:underline mb-4">
            + Add item
          </button>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {form.isInterState ? (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">IGST</span>
                <span>{formatCurrency(totals.totalIGST)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">CGST</span>
                  <span>{formatCurrency(totals.totalCGST)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">SGST</span>
                  <span>{formatCurrency(totals.totalSGST)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-1 font-bold text-base border-t mt-1 pt-2">
              <span>Grand Total</span>
              <span className="text-blue-600">{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>

          <button onClick={saveInvoice} disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No invoices yet. Click "+ New Invoice" to create one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Invoice No</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-right px-4 py-3">Subtotal</th>
                <th className="text-right px-4 py-3">GST</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-blue-600">
                    {inv.invoice_no || inv.invoiceNo}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{inv.date}</td>
                  <td className="px-4 py-3">{inv.customer_name || inv.customerName}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(getField(inv, 'subtotal', 'subtotal'))}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatCurrency(getField(inv, 'total_gst', 'totalGST'))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {formatCurrency(getField(inv, 'grand_total', 'grandTotal'))}
                  </td>
                  <td className="px-4 py-3 text-center flex gap-2 justify-center">
                    <button onClick={() => setPdfInvoice(inv)}
                      className="text-blue-600 text-xs border border-blue-300 px-2 py-1 rounded hover:bg-blue-50">
                      PDF
                    </button>
                    <button onClick={() => deleteInvoice(inv.id)}
                      className="text-red-400 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pdfInvoice && (
        <InvoicePDF
          invoice={pdfInvoice}
          profile={profile}
          onClose={() => setPdfInvoice(null)}
        />
      )}
    </div>
  )
}

export default Invoices
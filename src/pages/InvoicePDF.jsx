import { useRef } from 'react'
import { formatCurrency } from '../utils/gstCalculations'

function InvoicePDF({ invoice, profile, onClose }) {
  const printRef = useRef()

  // Handle both old and new field names
  const invoiceNo = invoice.invoice_no || invoice.invoiceNo || ''
  const customerName = invoice.customer_name || invoice.customerName || ''
  const customerGSTIN = invoice.customer_gstin || invoice.customerGSTIN || ''
  const isInterState = invoice.is_inter_state || invoice.isInterState || false
  const items = invoice.items || []
  const subtotal = parseFloat(invoice.subtotal) || 0
  const totalCGST = parseFloat(invoice.total_cgst || invoice.totalCGST) || 0
  const totalSGST = parseFloat(invoice.total_sgst || invoice.totalSGST) || 0
  const totalIGST = parseFloat(invoice.total_igst || invoice.totalIGST) || 0
  const grandTotal = parseFloat(invoice.grand_total || invoice.grandTotal) || 0

  const handleDownload = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(printRef.current, { scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const width = pdf.internal.pageSize.getWidth()
    const height = (canvas.height * width) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, width, height)
    pdf.save(`Invoice-${invoiceNo}.pdf`)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-gray-700">Invoice Preview</h3>
          <div className="flex gap-2">
            <button onClick={handleDownload}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              Download PDF
            </button>
            <button onClick={onClose}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
              Close
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-8 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-blue-800">{profile?.businessName || profile?.business_name || 'Your Business'}</h1>
              <p className="text-gray-600 text-sm mt-1">{profile?.ownerName || profile?.owner_name}</p>
              <p className="text-gray-500 text-sm">{profile?.address}</p>
              <p className="text-gray-500 text-sm">
                {[profile?.city, profile?.state, profile?.pincode].filter(Boolean).join(', ')}
              </p>
              {profile?.phone && <p className="text-gray-500 text-sm">Ph: {profile.phone}</p>}
              {profile?.email && <p className="text-gray-500 text-sm">{profile.email}</p>}
              {(profile?.gstin) && (
                <p className="text-sm mt-1"><span className="font-semibold">GSTIN:</span> {profile.gstin}</p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-300 uppercase">Invoice</h2>
              <p className="text-lg font-bold text-gray-800 mt-1">#{invoiceNo}</p>
              <p className="text-sm text-gray-500">Date: {invoice.date}</p>
            </div>
          </div>

          <div className="border-t-2 border-blue-800 border-b mb-6 py-4">
            <h4 className="text-xs text-gray-500 uppercase font-semibold mb-1">Bill To</h4>
            <p className="font-semibold text-gray-800">{customerName}</p>
            {customerGSTIN && <p className="text-sm text-gray-600">GSTIN: {customerGSTIN}</p>}
          </div>

          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-right px-3 py-2">GST %</th>
                <th className="text-right px-3 py-2">GST Amt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-2 text-gray-600">{i + 1}</td>
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(parseFloat(item.amount) || 0)}</td>
                  <td className="px-3 py-2 text-right">{item.gstRate}%</td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency((parseFloat(item.amount) * parseFloat(item.gstRate)) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between py-1 text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {isInterState ? (
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">IGST</span>
                  <span>{formatCurrency(totalIGST)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">CGST</span>
                    <span>{formatCurrency(totalCGST)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">SGST</span>
                    <span>{formatCurrency(totalSGST)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-2 text-base font-bold border-t-2 border-blue-800 mt-1">
                <span>Total</span>
                <span className="text-blue-800">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {(profile?.bankName || profile?.bank_name || profile?.upi) && (
            <div className="border-t pt-4 mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                {(profile.bankName || profile.bank_name) && (
                  <p><span className="font-medium">Bank:</span> {profile.bankName || profile.bank_name}</p>
                )}
                {(profile.accountNo || profile.account_no) && (
                  <p><span className="font-medium">A/C:</span> {profile.accountNo || profile.account_no}</p>
                )}
                {profile.ifsc && <p><span className="font-medium">IFSC:</span> {profile.ifsc}</p>}
                {profile.upi && <p><span className="font-medium">UPI:</span> {profile.upi}</p>}
              </div>
            </div>
          )}

          <div className="border-t pt-4 text-center text-xs text-gray-400">
            <p>Thank you for your business!</p>
            <p className="mt-1">This is a computer generated invoice</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoicePDF
export const GST_RATES = [0, 5, 12, 18, 28]

export function calculateGST(amount, gstRate, isInterState = false) {
  const baseAmount = parseFloat(amount) || 0
  const rate = parseFloat(gstRate) || 0
  const gstAmount = (baseAmount * rate) / 100

  if (isInterState) {
    return {
      baseAmount,
      igst: gstAmount,
      cgst: 0,
      sgst: 0,
      totalGST: gstAmount,
      totalAmount: baseAmount + gstAmount,
    }
  } else {
    return {
      baseAmount,
      igst: 0,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      totalGST: gstAmount,
      totalAmount: baseAmount + gstAmount,
    }
  }
}

export function calculateInvoiceTotal(items, isInterState = false) {
  let subtotal = 0
  let totalCGST = 0
  let totalSGST = 0
  let totalIGST = 0

  const calculatedItems = items.map(item => {
    const gst = calculateGST(item.amount, item.gstRate, isInterState)
    subtotal += gst.baseAmount
    totalCGST += gst.cgst
    totalSGST += gst.sgst
    totalIGST += gst.igst
    return { ...item, ...gst }
  })

  return {
    calculatedItems,
    subtotal,
    totalCGST,
    totalSGST,
    totalIGST,
    totalGST: totalCGST + totalSGST + totalIGST,
    grandTotal: subtotal + totalCGST + totalSGST + totalIGST,
  }
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateBillPdf({
  receiptNo,
  collegeName,
  eventName,
  leaderName,
  amount,
  paymentMode,
  date,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Strata — Payment Receipt', 40, 50)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Receipt No: ${receiptNo}`, 40, 80)
  doc.text(`Date: ${date}`, 40, 98)

  doc.autoTable({
    startY: 120,
    head: [['Field', 'Value']],
    body: [
      ['College', collegeName],
      ['Event', eventName],
      ['Student leader', leaderName],
      ['Payment mode', paymentMode],
      ['Amount', `Rs. ${amount}`],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
  })

  doc.save(`receipt_${receiptNo}.pdf`)
}

import jsPDF from 'jspdf'

// Generates a certificate PDF client-side and triggers a download.
// No file is ever uploaded to storage — matches the report's
// no-Storage / Spark-plan constraint.
export function generateCertificatePdf({
  studentName,
  eventName,
  collegeName,
  position,
  certificateNumber,
  date,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

  doc.setDrawColor(180, 140, 80)
  doc.setLineWidth(3)
  doc.rect(24, 24, w - 48, h - 48)

  doc.setFont('times', 'bold')
  doc.setFontSize(30)
  doc.text('Certificate of Achievement', w / 2, 110, { align: 'center' })

  doc.setFont('times', 'normal')
  doc.setFontSize(14)
  doc.text('This is to certify that', w / 2, 160, { align: 'center' })

  doc.setFont('times', 'bold')
  doc.setFontSize(24)
  doc.text(studentName, w / 2, 200, { align: 'center' })

  doc.setFont('times', 'normal')
  doc.setFontSize(14)
  doc.text(`of ${collegeName}`, w / 2, 226, { align: 'center' })
  doc.text(
    `has secured ${position} place in ${eventName}`,
    w / 2,
    252,
    { align: 'center' }
  )

  doc.setFontSize(11)
  doc.text(`Certificate No: ${certificateNumber}`, 60, h - 60)
  doc.text(`Date: ${date}`, w - 180, h - 60)

  doc.save(`${certificateNumber}_${studentName.replace(/\s+/g, '_')}.pdf`)
}

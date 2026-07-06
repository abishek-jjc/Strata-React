import * as XLSX from 'xlsx'

// Exports an array of plain objects to a downloadable .xlsx file.
// Used by the "Export Excel" button on every report/list module.
export function exportToExcel(rows, filename = 'export') {
  let dataToExport = rows

  // Format college exports specially to include formatted QR fields
  if (filename === 'colleges' || (rows.length > 0 && ('college' in rows[0] || 'college_name' in rows[0]))) {
    dataToExport = rows.map(r => {
      const collegeName = r.college || r.college_name || ''
      const deptName = r.department || ''
      const qrUrl = `https://anjacstrata.netlify.app/register?college=${encodeURIComponent(collegeName)}&department=${encodeURIComponent(deptName)}`
      
      return {
        'College': collegeName,
        'Department': deptName,
        'Status': r.status || 'active',
        'QR Code Redirect URL': qrUrl,
        'QR Image Data': r.qr_image_data_url || ''
      }
    })
  }

  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}


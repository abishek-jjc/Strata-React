import * as XLSX from 'xlsx'

// Exports an array of plain objects to a downloadable .xlsx file.
// Used by the "Export Excel" button on every report/list module.
export function exportToExcel(rows, filename = 'export') {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

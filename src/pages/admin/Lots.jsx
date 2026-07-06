import { useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import CrudManager from '../../components/common/CrudManager'

export default function Lots() {
  const fileInputRef = useRef(null)

  const fields = [
    { name: 'lot_name', label: 'Lot Name', type: 'text', required: true },
    { name: 'is_assigned', label: 'Is Assigned?', type: 'toggle' },
    { name: 'assigned_college', label: 'Assigned College', type: 'text' },
  ]

  // Download a blank template the user can fill in
  function handleDownloadTemplate() {
    const template = [
      { 'Lot Name': 'Lot 1', 'Is Assigned': 'false', 'Assigned College': '-' },
      { 'Lot Name': 'Lot 2', 'Is Assigned': 'false', 'Assigned College': '-' },
    ]
    const worksheet = XLSX.utils.json_to_sheet(template)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lots')
    XLSX.writeFile(workbook, 'lots_template.xlsx')
  }

  // Parse and insert rows from an uploaded Excel file
  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-imported

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      if (!rows.length) {
        alert('The uploaded file is empty.')
        return
      }

      const lots = rows.map((row) => ({
        lot_name: String(row['Lot Name'] || row['lot_name'] || '').trim(),
        is_assigned: String(row['Is Assigned'] || row['is_assigned'] || 'false').toLowerCase() === 'true',
        assigned_college: String(row['Assigned College'] || row['assigned_college'] || '-').trim(),
      })).filter((l) => l.lot_name !== '')

      if (!lots.length) {
        alert('No valid rows found. Make sure the column headers are "Lot Name", "Is Assigned", "Assigned College".')
        return
      }

      const { error } = await supabase.from(TABLES.LOTS).insert(lots)
      if (error) throw error

      alert(`Successfully imported ${lots.length} lot(s)!`)
      window.location.reload()
    } catch (err) {
      alert('Import failed: ' + err.message)
    }
  }

  function renderExtraHeaderActions() {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button className="btn" onClick={handleDownloadTemplate}>
          Template
        </button>
        <button className="btn" onClick={() => fileInputRef.current?.click()}>
          Import Excel
        </button>
      </>
    )
  }

  return (
    <CrudManager
      title="Lots"
      table={TABLES.LOTS}
      fields={fields}
      columns={['lot_name', 'is_assigned', 'assigned_college']}
      renderExtraHeaderActions={renderExtraHeaderActions}
    />
  )
}

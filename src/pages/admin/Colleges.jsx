import { useRef, useState } from 'react'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { encryptCollegePayload } from '../../utils/qrCrypto'

const fields = [
  { name: 'college', label: 'College', type: 'text', required: true },
  { name: 'department', label: 'Department', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
]

// Runs after every add/edit: generates the redirect QR payload
// and stores the ready-to-print QR image as a data URL directly on the colleges row.
async function generateAndAttachQr(formData, rowId) {
  const collegeVal = formData.college || formData.college_name || ''
  const deptVal = formData.department || ''
  const payload = {
    college: collegeVal,
    department: deptVal
  }
  const encrypted = encryptCollegePayload(payload)
  const domain = localStorage.getItem('qr_domain_prefix') || window.location.origin
  const qrUrl = `${domain}/register?payload=${encodeURIComponent(encrypted)}`
  const qrImageDataUrl = await QRCode.toDataURL(qrUrl, { width: 240 })
  await supabase
    .from(TABLES.COLLEGES)
    .update({ qr_image_data_url: qrImageDataUrl })
    .eq('id', rowId)
}

function DownloadQrButton({ row }) {
  if (!row.qr_image_data_url) return null
  return (
    <a className="link" href={row.qr_image_data_url} download={`${row.college || row.college_name}_qr.png`}>
      Download QR
    </a>
  )
}

export default function Colleges() {
  const { data } = useTable(TABLES.COLLEGES)
  const fileInputRef = useRef(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedQrCollege, setSelectedQrCollege] = useState(null)
  const [domain, setDomain] = useState(() => {
    return localStorage.getItem('qr_domain_prefix') || window.location.origin
  })

  const [isExportQrModalOpen, setIsExportQrModalOpen] = useState(false)
  const [qrsPerPage, setQrsPerPage] = useState('4')

  const handleDomainChange = (e) => {
    const val = e.target.value
    setDomain(val)
    localStorage.setItem('qr_domain_prefix', val)
  }
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
  })

  const showAlert = (title, message, type = 'info', onConfirm = null) => {
    setAlertState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
    })
  }

  const handleExportQrsPdf = async () => {
    setIsExportQrModalOpen(false)
    
    if (!data || !data.length) {
      showAlert('No Colleges', 'There are no colleges to export.', 'info')
      return
    }

    const N = parseInt(qrsPerPage, 10) || 4
    let cols = 2
    let rows = 2
    if (N <= 1) { cols = 1; rows = 1; }
    else if (N === 2) { cols = 1; rows = 2; }
    else if (N <= 4) { cols = 2; rows = 2; }
    else if (N <= 6) { cols = 2; rows = 3; }
    else if (N <= 9) { cols = 3; rows = 3; }
    else if (N <= 12) { cols = 3; rows = 4; }
    else { cols = 4; rows = Math.ceil(N / 4); }

    const itemsPerPage = cols * rows

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    
    // Page dimensions
    const pageW = 595
    const pageH = 842
    const marginX = 30
    const marginY = 40
    const gapX = 15
    const gapY = 20
    const usableW = pageW - marginX * 2
    const usableH = pageH - marginY * 2
    const cellW = (usableW - gapX * (cols - 1)) / cols
    const cellH = (usableH - gapY * (rows - 1)) / rows

    for (let index = 0; index < data.length; index++) {
      const college = data[index]
      const itemIdxOnPage = index % itemsPerPage
      
      // New page trigger
      if (itemIdxOnPage === 0 && index > 0) {
        doc.addPage()
      }

      // Calculate position
      const colIdx = itemIdxOnPage % cols
      const rowIdx = Math.floor(itemIdxOnPage / cols)
      const startX = marginX + colIdx * (cellW + gapX)
      const startY = marginY + rowIdx * (cellH + gapY)

      // Fetch or generate QR code data URL
      let qrUrl = college.qr_image_data_url
      if (!qrUrl) {
        try {
          const collegeVal = college.college || college.college_name || ''
          const deptVal = college.department || ''
          const payload = { college: collegeVal, department: deptVal }
          const encrypted = encryptCollegePayload(payload)
          const prefix = domain || window.location.origin
          const fullUrl = `${prefix}/register?payload=${encodeURIComponent(encrypted)}`
          qrUrl = await QRCode.toDataURL(fullUrl, { width: 240 })
        } catch (err) {
          console.error('Failed to generate QR on the fly:', err)
          continue
        }
      }

      // Draw subtle dotted card outline
      doc.setDrawColor(220, 224, 230)
      doc.setLineDash([3, 3])
      doc.rect(startX, startY, cellW, cellH)
      doc.setLineDash([])

      // Draw QR image
      const qrSize = Math.min(cellW * 0.7, cellH * 0.6, 130)
      const qrX = startX + (cellW - qrSize) / 2
      const qrY = startY + 12
      doc.addImage(qrUrl, 'PNG', qrX, qrY, qrSize, qrSize)

      // Text placements with bounds check
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(30, 35, 45)
      const textX = startX + cellW / 2
      const textY = qrY + qrSize + 16

      const cName = college.college || college.college_name || ''
      const displayCollege = cName.length > 32 ? cName.slice(0, 30) + '..' : cName
      doc.text(displayCollege, textX, textY, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 110, 120)
      const displayDept = (college.department || '').length > 32 
        ? (college.department || '').slice(0, 30) + '..' 
        : (college.department || '')
      doc.text(displayDept + ' Department', textX, textY + 11, { align: 'center' })
    }

    doc.save('colleges_qr_sheets.pdf')
  }

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsImportModalOpen(false) // Close the import layout

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const fileData = evt.target.result
        const workbook = XLSX.read(fileData, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)

        let successCount = 0
        for (const row of json) {
          const collegeName = row.College || row.college || row['College Name'] || row['college_name']
          const department = row.Department || row.department || row['Department Name'] || row['department_name']

          if (!collegeName || !department) continue

          // Insert college (inserting both college and college_name fields to support old/new schemas)
          const { data: inserted, error } = await supabase
            .from(TABLES.COLLEGES)
            .insert({
              college: collegeName.trim(),
              college_name: collegeName.trim(),
              department: department.trim(),
              status: 'active'
            })
            .select()
            .single()

          if (error) {
            console.error('Error inserting college:', error.message)
            continue
          }

          // Generate QR code for the inserted row
          await generateAndAttachQr(inserted, inserted.id)
          successCount++
        }

        showAlert(
          'Import Successful',
          `Successfully imported and generated QRs for ${successCount} colleges!`,
          'info'
        )
      } catch (err) {
        showAlert('Import Failed', 'Failed to parse Excel file: ' + err.message, 'info')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleRegenerateAllQrs = async () => {
    showAlert(
      'Confirm QR Regeneration',
      'Are you sure you want to regenerate QR codes for ALL colleges? This will overwrite all old QR codes to redirect to the register page.',
      'danger',
      async () => {
        let count = 0
        for (const c of data) {
          try {
            await generateAndAttachQr(c, c.id)
            count++
          } catch (err) {
            console.error(`Failed to generate QR for college ${c.id}:`, err)
          }
        }
        showAlert(
          'Regeneration Complete',
          `Successfully generated redirect URL QR codes for ${count} colleges!`,
          'info'
        )
      }
    )
  }

  const handleDownloadTemplate = () => {
    const templateData = [
      { 'College': 'ANJAC Sivakasi', 'Department': 'Computer Science' },
      { 'College': 'SFR College', 'Department': 'BCA' }
    ]
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Colleges')
    XLSX.writeFile(workbook, 'colleges_import_template.xlsx')
  }

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportExcel}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
      />
      
      {/* Domain prefix setting card */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>QR Code Redirect Domain</h3>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Enter the domain where the register page is hosted. This prefix is embedded into the QR code URL.
        </p>
        <input
          type="text"
          className="input"
          value={domain}
          onChange={handleDomainChange}
          placeholder="e.g. https://anjacstrata.netlify.app"
          style={{ maxWidth: '450px', marginTop: '5px' }}
        />
      </div>

      <CrudManager
        title="Colleges"
        table={TABLES.COLLEGES}
        fields={fields}
        columns={['college', 'department', 'status']}
        onAfterSave={generateAndAttachQr}
        renderExtraActions={(row) => (
          <>
            <DownloadQrButton row={row} />
            {row.qr_image_data_url && (
              <button
                type="button"
                className="link"
                onClick={() => setSelectedQrCollege(row)}
              >
                Show QR
              </button>
            )}
          </>
        )}
        renderExtraHeaderActions={() => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={handleDownloadTemplate}>
              Template
            </button>
            <button className="btn btn-primary" onClick={() => setIsImportModalOpen(true)}>
              Import Excel
            </button>
            <button className="btn" onClick={() => setIsExportQrModalOpen(true)}>
              Export QRs
            </button>
            <button className="btn" onClick={handleRegenerateAllQrs}>
              Regenerate All QRs
            </button>
          </div>
        )}
      />

      {/* Excel Import Modal showing required format */}
      {isImportModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '450px' }}>
            <h3>Import Colleges from Excel</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '10px 0', lineHeight: '1.4' }}>
              Upload an Excel file (.xlsx or .xls) matching the format below. You can also{' '}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent, #f9c20a)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  font: 'inherit'
                }}
              >
                download the template here
              </button>{' '}
              to fill out.
            </p>
            
            {/* Format preview */}
            <div style={{ margin: '15px 0', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', background: 'var(--bg)' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
                    <th style={{ padding: '6px', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)' }}>College</th>
                    <th style={{ padding: '6px', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)' }}>Department</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px' }}>ANJAC Sivakasi</td>
                    <td style={{ padding: '6px' }}>CS</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px' }}>SFR College</td>
                    <td style={{ padding: '6px' }}>BCA</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                Upload Excel File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Confirmation Modal */}
      {alertState.isOpen && (
        <div className="modal-backdrop" onClick={() => setAlertState({ ...alertState, isOpen: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', color: alertState.type === 'danger' ? 'var(--danger)' : 'var(--text-primary)' }}>
              {alertState.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: '15px 0' }}>
              {alertState.message}
            </p>
            <div className="modal-actions">
              {alertState.onConfirm ? (
                <>
                  <button type="button" className="btn" onClick={() => setAlertState({ ...alertState, isOpen: false })}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ backgroundColor: alertState.type === 'danger' ? 'var(--danger)' : 'var(--accent)', borderColor: alertState.type === 'danger' ? 'var(--danger)' : 'var(--accent)', color: alertState.type === 'danger' ? '#fff' : '#0c0e12' }}
                    onClick={() => {
                      alertState.onConfirm()
                      setAlertState({ ...alertState, isOpen: false })
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setAlertState({ ...alertState, isOpen: false })}>
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export QRs Sheet Modal */}
      {isExportQrModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsExportQrModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
            <h3>Export QR Print Sheets</h3>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
              Generate a printable A4 PDF containing college QR codes formatted as a grid.
            </p>
            
            <label className="field">
              <span>How many QRs per A4 page?</span>
              <select 
                value={qrsPerPage} 
                onChange={(e) => setQrsPerPage(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }}
              >
                <option value="1">1 QR per page (Large)</option>
                <option value="2">2 QRs per page (1x2)</option>
                <option value="4">4 QRs per page (2x2 Grid)</option>
                <option value="6">6 QRs per page (2x3 Grid)</option>
                <option value="8">8 QRs per page (2x4 Grid)</option>
                <option value="9">9 QRs per page (3x3 Grid)</option>
                <option value="12">12 QRs per page (3x4 Grid)</option>
                <option value="16">16 QRs per page (4x4 Grid)</option>
              </select>
            </label>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn" onClick={() => setIsExportQrModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleExportQrsPdf}>
                Generate PDF Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show QR Modal */}
      {selectedQrCollege && (
        <div className="modal-backdrop" onClick={() => setSelectedQrCollege(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '360px', textAlign: 'center', padding: '24px' }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              QR Code
            </h3>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'inline-block', margin: '0 auto 16px auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <img
                src={selectedQrCollege.qr_image_data_url}
                alt={`QR for ${selectedQrCollege.college || selectedQrCollege.college_name}`}
                style={{ width: '220px', height: '220px', display: 'block' }}
              />
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#fff' }}>
              {selectedQrCollege.college || selectedQrCollege.college_name}
            </h4>
            <p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 24px 0' }}>
              {selectedQrCollege.department} Department
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: 0 }}>
              <button type="button" className="btn btn-primary" onClick={() => setSelectedQrCollege(null)} style={{ width: '100%' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





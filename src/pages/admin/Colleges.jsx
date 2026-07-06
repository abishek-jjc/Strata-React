import { useRef, useState } from 'react'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'
import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'

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
  const qrUrl = `https://anjacstrata.netlify.app/register?college=${encodeURIComponent(collegeVal)}&department=${encodeURIComponent(deptVal)}`
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
          'info',
          () => window.location.reload()
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
          'info',
          () => window.location.reload()
        )
      }
    )
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
      <CrudManager
        title="Colleges"
        table={TABLES.COLLEGES}
        fields={fields}
        columns={['college', 'department', 'status']}
        onAfterSave={generateAndAttachQr}
        renderExtraActions={(row) => <DownloadQrButton row={row} />}
        renderExtraHeaderActions={() => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={() => setIsImportModalOpen(true)}>
              Import Excel
            </button>
            <button className="btn" onClick={handleRegenerateAllQrs}>
              Regenerate All QRs
            </button>
          </div>
        )}
      />
      <div className="qr-preview-grid">
        {data.filter((c) => c.qr_image_data_url).map((c) => (
          <div className="qr-preview" key={c.id}>
            <img src={c.qr_image_data_url} alt={`QR for ${c.college || c.college_name}`} width={100} />
            <span>{c.college || c.college_name}</span>
          </div>
        ))}
      </div>

      {/* Excel Import Modal showing required format */}
      {isImportModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '450px' }}>
            <h3>Import Colleges from Excel</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '10px 0' }}>
              Upload an Excel file (.xlsx or .xls) matching the layout/format below:
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
    </div>
  )
}





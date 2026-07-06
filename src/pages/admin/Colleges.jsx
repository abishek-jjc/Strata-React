import QRCode from 'qrcode'
import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { supabase } from '../../supabase/client'
import { encryptCollegePayload, generateSecurityToken } from '../../utils/qrCrypto'
import { useTable } from '../../hooks/useTable'

const fields = [
  { name: 'college_name', label: 'College name', type: 'text', required: true },
  { name: 'department', label: 'Department', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text', required: true },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
]

// Runs after every add/edit: (re)generates the encrypted QR payload
// and stores both the ciphertext and a ready-to-print QR image as a
// data URL directly on the colleges row — no Storage bucket needed,
// same as the Firebase version, just a Postgres text column instead
// of a Firestore field.
async function generateAndAttachQr(formData, rowId) {
  const token = generateSecurityToken()
  const ciphertext = encryptCollegePayload({
    collegeId: rowId,
    collegeName: formData.college_name,
    department: formData.department,
    securityToken: token,
  })
  const qrImageDataUrl = await QRCode.toDataURL(ciphertext, { width: 240 })
  await supabase
    .from(TABLES.COLLEGES)
    .update({ security_token: token, encrypted_qr: ciphertext, qr_image_data_url: qrImageDataUrl })
    .eq('id', rowId)
}

function DownloadQrButton({ row }) {
  if (!row.qr_image_data_url) return null
  return (
    <a className="link" href={row.qr_image_data_url} download={`${row.college_name}_qr.png`}>
      Download QR
    </a>
  )
}

export default function Colleges() {
  const { data } = useTable(TABLES.COLLEGES)

  return (
    <div>
      <CrudManager
        title="Colleges"
        table={TABLES.COLLEGES}
        fields={fields}
        columns={['college_name', 'department', 'phone', 'status']}
        onAfterSave={generateAndAttachQr}
        renderExtraActions={(row) => <DownloadQrButton row={row} />}
      />
      <div className="qr-preview-grid">
        {data.filter((c) => c.qr_image_data_url).map((c) => (
          <div className="qr-preview" key={c.id}>
            <img src={c.qr_image_data_url} alt={`QR for ${c.college_name}`} width={100} />
            <span>{c.college_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

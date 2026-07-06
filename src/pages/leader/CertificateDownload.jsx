import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { generateCertificatePdf } from '../../utils/pdfCertificate'

export default function CertificateDownload() {
  const { profile } = useAuth()
  const { data: students } = useTable(TABLES.STUDENTS, [
    ['leader_id', 'eq', profile?.ref_id],
  ])
  const { data: certificates } = useTable(TABLES.CERTIFICATES)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)

  const issued = students.filter((s) => s.certificate_status === 'issued')

  function download(student) {
    const cert = certificates.find((c) => c.student_id === student.id)
    if (!cert) return
    generateCertificatePdf({
      studentName: student.student_name,
      eventName: events.find((e) => e.id === student.event_id)?.event_name || '',
      collegeName: colleges.find((c) => c.id === student.college_id)?.college_name || '',
      position: cert.position,
      certificateNumber: cert.certificate_number,
      date: new Date().toLocaleDateString(),
    })
  }

  return (
    <div>
      <h2>Certificates</h2>
      <table className="data-table">
        <thead><tr><th>Student</th><th>Actions</th></tr></thead>
        <tbody>
          {issued.map((s) => (
            <tr key={s.id}>
              <td>{s.student_name}</td>
              <td><button className="link" onClick={() => download(s)}>Download PDF</button></td>
            </tr>
          ))}
          {issued.length === 0 && (
            <tr><td colSpan={2} className="muted">No certificates issued yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

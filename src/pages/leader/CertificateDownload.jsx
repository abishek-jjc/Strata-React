import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
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
  
  const [settings, setSettings] = useState({})

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from(TABLES.SETTINGS).select('*')
      if (data) {
        const map = {}
        data.forEach((r) => {
          map[r.key_name] = r.value
        })
        setSettings(map)
      }
    }
    loadSettings()
  }, [])

  // Filter certificates issued to students belonging to this leader
  const studentIds = new Set(students.map((s) => s.id))
  const issuedCerts = certificates.filter((c) => studentIds.has(c.student_id))

  function download(cert) {
    const student = students.find((s) => s.id === cert.student_id)
    if (!student) return

    // 1. Identify which template url to use
    let templateUrl = ''
    if (cert.position === 'Participation') {
      templateUrl = settings.participation_cert_url
    } else if (cert.position === '1st Place') {
      templateUrl = settings.winner_cert_1_url
    } else if (cert.position === '2nd Place') {
      templateUrl = settings.winner_cert_2_url
    }

    // 2. If template URL is uploaded, open it in a new window
    if (templateUrl && templateUrl.trim() !== '') {
      window.open(templateUrl, '_blank')
      return
    }

    // 3. Otherwise generate client-side PDF dynamically
    generateCertificatePdf({
      studentName: student.student_name,
      eventName: events.find((e) => e.id === student.event_id)?.event_name || '',
      collegeName: colleges.find((c) => c.id === student.college_id)?.college || '',
      position: cert.position,
      certificateNumber: cert.certificate_number,
      date: new Date().toLocaleDateString(),
    })
  }

  const getStudentName = (studentId) => students.find((s) => s.id === studentId)?.student_name || 'Loading…'
  const getEventName = (eventId) => events.find((e) => e.id === eventId)?.event_name || 'Loading…'

  return (
    <div>
      <h2>Certificates Download</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Event</th>
            <th>Certificate Type</th>
            <th>Certificate No</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {issuedCerts.map((c) => (
            <tr key={c.id}>
              <td>{getStudentName(c.student_id)}</td>
              <td>{getEventName(c.event_id)}</td>
              <td>
                <strong>{c.position || 'Participation'}</strong>
              </td>
              <td>{c.certificate_number}</td>
              <td>
                <button className="link" onClick={() => download(c)}>
                  Download PDF
                </button>
              </td>
            </tr>
          ))}
          {issuedCerts.length === 0 && (
            <tr>
              <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                No certificates issued for your team yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

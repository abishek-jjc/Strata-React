import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { generateCertificatePdf } from '../../utils/pdfCertificate'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export default function CertificateDownload() {
  const { profile } = useAuth()
  const { data: students } = useTable(TABLES.STUDENTS, [
    ['leader_id', 'eq', profile?.ref_id],
  ])
  const { data: certificates } = useTable(TABLES.CERTIFICATES)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)
  
  const [settings, setSettings] = useState({})
  const [downloadingBulk, setDownloadingBulk] = useState(false)

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

  const participationCerts = issuedCerts.filter(c => c.position === 'Participation' || !c.position)
  const winnerCerts = issuedCerts.filter(c => c.position === '1st Place' || c.position === '2nd Place')

  const getStudentName = (studentId) => students.find((s) => s.id === studentId)?.student_name || 'Unknown Student'
  const getEventName = (eventId) => events.find((e) => e.id === eventId)?.event_name || 'Unknown Event'
  const getCollegeName = (studentId) => {
    const student = students.find((s) => s.id === studentId)
    return colleges.find((c) => c.id === student?.college_id)?.college || 'Unknown College'
  }

  function downloadBlob(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function generateCustomPdf(certs, defaultFilename) {
    if (certs.length === 0) return

    setDownloadingBulk(true)
    try {
      const combinedDoc = await PDFDocument.create()

      // Fetch templates if they exist
      const pUrl = settings.participation_cert_url
      const w1Url = settings.winner_cert_1_url
      const w2Url = settings.winner_cert_2_url

      const pBytes = pUrl ? await fetch(pUrl).then(r => r.arrayBuffer()) : null
      const w1Bytes = w1Url ? await fetch(w1Url).then(r => r.arrayBuffer()) : null
      const w2Bytes = w2Url ? await fetch(w2Url).then(r => r.arrayBuffer()) : null

      const getLayout = (key) => {
        try { return JSON.parse(settings[key] || '{}') } catch { return {} }
      }
      const pLayout = getLayout('participation_cert_layout')
      const w1Layout = getLayout('winner_cert_1_layout')
      const w2Layout = getLayout('winner_cert_2_layout')

      for (const cert of certs) {
        const student = students.find((s) => s.id === cert.student_id)
        if (!student) continue

        let tBytes, layout
        if (cert.position === 'Participation' || !cert.position) {
          tBytes = pBytes
          layout = pLayout
        } else if (cert.position === '1st Place') {
          tBytes = w1Bytes
          layout = w1Layout
        } else if (cert.position === '2nd Place') {
          tBytes = w2Bytes
          layout = w2Layout
        }

        if (!tBytes) {
          // If no custom template is set, fallback to client-side basic generation for a single cert (doesn't support bulk well)
          // For now, if bulk fails, we just skip or throw.
          throw new Error(`Admin has not uploaded the PDF template for ${cert.position || 'Participation'}.`)
        }

        const tempDoc = await PDFDocument.load(tBytes)
        const [copiedPage] = await combinedDoc.copyPages(tempDoc, [0])
        combinedDoc.addPage(copiedPage)
        
        const page = combinedDoc.getPages()[combinedDoc.getPageCount() - 1]
        const { width, height } = page.getSize()
        const font = await combinedDoc.embedFont(StandardFonts.HelveticaBold)

        const sName = student.student_name || ''
        const cName = getCollegeName(student.id) || ''
        const eName = getEventName(student.event_id) || ''
        const placeVal = cert.position || ''

        if (layout.student_name) {
          const x = (layout.student_name.x / 100) * width
          const y = height - (layout.student_name.y / 100) * height
          page.drawText(sName, { x, y, size: Number(layout.student_name.fontSize) || 24, font, color: rgb(0.1, 0.1, 0.1) })
        }
        if (layout.college_name) {
          const x = (layout.college_name.x / 100) * width
          const y = height - (layout.college_name.y / 100) * height
          page.drawText(cName, { x, y, size: Number(layout.college_name.fontSize) || 16, font, color: rgb(0.2, 0.2, 0.2) })
        }
        if (layout.event_name) {
          const x = (layout.event_name.x / 100) * width
          const y = height - (layout.event_name.y / 100) * height
          page.drawText(eName, { x, y, size: Number(layout.event_name.fontSize) || 18, font, color: rgb(0.2, 0.2, 0.2) })
        }
        if (layout.place && placeVal !== 'Participation') {
          const x = (layout.place.x / 100) * width
          const y = height - (layout.place.y / 100) * height
          page.drawText(placeVal, { x, y, size: Number(layout.place.fontSize) || 20, font, color: rgb(0.85, 0.3, 0.1) })
        }
      }

      if (combinedDoc.getPageCount() === 0) {
        throw new Error('No certificates could be generated.')
      }

      const combinedBytes = await combinedDoc.save()
      downloadBlob(combinedBytes, defaultFilename)

    } catch (err) {
      alert(err.message || 'Failed to generate certificates.')
    } finally {
      setDownloadingBulk(false)
    }
  }

  function downloadSingle(cert) {
    const student = students.find((s) => s.id === cert.student_id)
    generateCustomPdf([cert], `certificate_${student?.student_name?.replace(/\s+/g, '_') || 'student'}.pdf`)
  }

  function downloadAllParticipation() {
    generateCustomPdf(participationCerts, 'all_participation_certificates.pdf')
  }

  function downloadAllWinners() {
    generateCustomPdf(winnerCerts, 'all_winner_certificates.pdf')
  }

  return (
    <div>
      <h2>Certificates Download</h2>

      <div className="card" style={{ padding: '24px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0, color: 'var(--accent)' }}>Participation Certificates</h3>
          <button 
            className="btn" 
            onClick={downloadAllParticipation} 
            disabled={participationCerts.length === 0 || downloadingBulk}
          >
            {downloadingBulk ? 'Generating...' : 'Download All Participation'}
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Event</th>
              <th>Certificate No</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participationCerts.map((c) => (
              <tr key={c.id}>
                <td>{getStudentName(c.student_id)}</td>
                <td>{getEventName(c.event_id)}</td>
                <td>{c.certificate_number}</td>
                <td>
                  <button className="link" onClick={() => downloadSingle(c)} disabled={downloadingBulk}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
            {participationCerts.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: 'center' }}>
                  No participation certificates issued for your team yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0, color: 'var(--accent)' }}>Winner Certificates</h3>
          <button 
            className="btn" 
            onClick={downloadAllWinners} 
            disabled={winnerCerts.length === 0 || downloadingBulk}
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            {downloadingBulk ? 'Generating...' : 'Download All Winners'}
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Event</th>
              <th>Position</th>
              <th>Certificate No</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {winnerCerts.map((c) => (
              <tr key={c.id}>
                <td>{getStudentName(c.student_id)}</td>
                <td>{getEventName(c.event_id)}</td>
                <td>
                  <strong style={{ color: c.position === '1st Place' ? '#f59e0b' : '#9ca3af' }}>
                    {c.position}
                  </strong>
                </td>
                <td>{c.certificate_number}</td>
                <td>
                  <button className="link" onClick={() => downloadSingle(c)} disabled={downloadingBulk}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
            {winnerCerts.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                  No winner certificates issued for your team yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

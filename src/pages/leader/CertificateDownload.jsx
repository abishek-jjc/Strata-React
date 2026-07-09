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
  const { data: winners } = useTable(TABLES.WINNERS)
  const { data: lots } = useTable(TABLES.LOTS)
  
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

  // 1. Participation Certificates mapping (list all students of this leader)
  const participationList = (students || []).map(student => {
    const cert = certificates?.find(c => c.student_id === student.id && (c.position === 'Participation' || !c.position))
    return {
      student,
      issued: student.certificate_status === 'issued' || !!cert,
      cert: cert || { student_id: student.id, position: 'Participation', certificate_number: `CERT-PART-${student.id.substring(0, 8).toUpperCase()}` }
    }
  })

  // Filter only issued participation certs for bulk download
  const participationCerts = participationList.filter(item => item.issued).map(item => item.cert)

  // 2. Winner Certificates mapping (resolved from winners table)
  const winnerList = []
  const myCollege = colleges?.find(c => c.id === profile?.college_id)
  const myCollegeName = myCollege?.college || ''

  if (winners && lots && students && colleges && certificates && events) {
    winners.forEach(w => {
      const eventName = events.find(e => e.id === w.event_id)?.event_name || ''
      const places = [
        { place: '1st Place', lotName: w.first_place },
        { place: '2nd Place', lotName: w.second_place },
      ]
      places.forEach(({ place, lotName }) => {
        if (!lotName || lotName === '-') return
        const lot = lots.find(l => l.lot_name === lotName)
        if (!lot || lot.assigned_college !== myCollegeName) return

        // Students from my college registered in this event
        const collegeStudents = students.filter(s => s.event_id === w.event_id)
        collegeStudents.forEach(student => {
          const cert = certificates.find(c => c.student_id === student.id && c.position === place)
          winnerList.push({
            student,
            winnerPlace: place,
            winnerEventName: eventName,
            issued: student.certificate_status === 'issued' || !!cert,
            cert: cert || { student_id: student.id, position: place, certificate_number: `CERT-WIN-${student.id.substring(0, 8).toUpperCase()}` }
          })
        })
      })
    })
  }

  // Filter only issued winner certs for bulk download
  const winnerCerts = winnerList.filter(item => item.issued).map(item => item.cert)

  const getStudentName = (studentId) => students?.find((s) => s.id === studentId)?.student_name || 'Unknown Student'
  const getEventName = (eventId) => events?.find((e) => e.id === eventId)?.event_name || 'Unknown Event'
  const getCollegeName = (studentId) => {
    const student = students?.find((s) => s.id === studentId)
    return colleges?.find((c) => c.id === student?.college_id)?.college || 'Unknown College'
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
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Event</th>
                <th>Certificate No</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {participationList.map((item) => (
                <tr key={item.student.id}>
                  <td>{item.student.student_name}</td>
                  <td>{getEventName(item.student.event_id)}</td>
                  <td>{item.issued ? item.cert.certificate_number : '—'}</td>
                  <td>
                    <span className={item.issued ? 'success' : 'muted'}>
                      {item.issued ? '✓ Issued' : 'Not Issued'}
                    </span>
                  </td>
                  <td>
                    {item.issued ? (
                      <button className="link" onClick={() => downloadSingle(item.cert)} disabled={downloadingBulk}>
                        Download Certificate
                      </button>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.85rem' }}>Unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
              {participationList.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                    No participants registered for your college yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Event</th>
                <th>Position</th>
                <th>Certificate No</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {winnerList.map((item, idx) => (
                <tr key={`${item.student.id}-${item.winnerPlace}-${idx}`}>
                  <td>{item.student.student_name}</td>
                  <td>{item.winnerEventName}</td>
                  <td>
                    <strong style={{ color: item.winnerPlace === '1st Place' ? '#f59e0b' : '#9ca3af' }}>
                      {item.winnerPlace}
                    </strong>
                  </td>
                  <td>{item.issued ? item.cert.certificate_number : '—'}</td>
                  <td>
                    <span className={item.issued ? 'success' : 'muted'}>
                      {item.issued ? '✓ Issued' : 'Not Issued'}
                    </span>
                  </td>
                  <td>
                    {item.issued ? (
                      <button className="link" onClick={() => downloadSingle(item.cert)} disabled={downloadingBulk}>
                        Download Certificate
                      </button>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.85rem' }}>Unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
              {winnerList.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: 'center' }}>
                    No winner positions assigned to your college yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

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

  // Filter certificates to only those belonging to this leader's students
  const myStudentIds = new Set((students || []).map(s => s.id))
  const myCertificates = (certificates || []).filter(c => myStudentIds.has(c.student_id))

  // 1. Participation Certificates mapping (list all students of this leader)
  const participationList = (students || []).map(student => {
    const cert = myCertificates.find(c => c.student_id === student.id && (c.position === 'Participation' || !c.position))
    return {
      student,
      issued: !!cert,
      cert: cert
    }
  })

  // Filter only issued participation certs for bulk download
  const participationCerts = participationList.filter(item => item.issued && item.cert).map(item => item.cert)

  // 2. Winner Certificates mapping (resolved from winners table)
  const winnerList = []
  const myCollege = colleges?.find(c => c.id === profile?.college_id)
  const myCollegeName = myCollege ? (myCollege.department ? `${myCollege.college} (${myCollege.department})` : myCollege.college) : ''

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
          const cert = myCertificates.find(c => c.student_id === student.id && c.position === place)
          winnerList.push({
            student,
            winnerPlace: place,
            winnerEventName: eventName,
            issued: !!cert,
            cert: cert
          })
        })
      })
    })
  }

  // Filter only issued winner certs for bulk download
  const winnerCerts = winnerList.filter(item => item.issued && item.cert).map(item => item.cert)

  const getStudentName = (studentId) => students?.find((s) => s.id === studentId)?.student_name || 'Unknown Student'
  const getEventName = (eventId) => events?.find((e) => e.id === eventId)?.event_name || 'Unknown Event'
  const getCollegeName = (studentId) => {
    const student = students?.find((s) => s.id === studentId)
    const college = colleges?.find((c) => c.id === student?.college_id)
    return college ? (college.department ? `${college.college} (${college.department})` : college.college) : 'Unknown College'
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

        // Draw text centered at the anchor point (matches admin generateBulkPdf logic)
        if (layout.student_name) {
          const size = Number(layout.student_name.fontSize) || 24
          const textWidth = font.widthOfTextAtSize(sName, size)
          const x = (layout.student_name.x / 100) * width - textWidth / 2
          const y = height - (layout.student_name.y / 100) * height
          page.drawText(sName, { x, y, size, font, color: rgb(0.1, 0.1, 0.1) })
        }
        if (layout.college_name) {
          const size = Number(layout.college_name.fontSize) || 16
          const textWidth = font.widthOfTextAtSize(cName, size)
          const x = (layout.college_name.x / 100) * width - textWidth / 2
          const y = height - (layout.college_name.y / 100) * height
          page.drawText(cName, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) })
        }
        if (layout.event_name) {
          const size = Number(layout.event_name.fontSize) || 18
          const textWidth = font.widthOfTextAtSize(eName, size)
          const x = (layout.event_name.x / 100) * width - textWidth / 2
          const y = height - (layout.event_name.y / 100) * height
          page.drawText(eName, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) })
        }
        if (layout.place && placeVal && placeVal !== 'Participation') {
          const size = Number(layout.place.fontSize) || 20
          const textWidth = font.widthOfTextAtSize(placeVal, size)
          const x = (layout.place.x / 100) * width - textWidth / 2
          const y = height - (layout.place.y / 100) * height
          page.drawText(placeVal, { x, y, size, font, color: rgb(0.85, 0.3, 0.1) })
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
        {participationList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            No participants registered for your college yet.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            marginTop: '16px'
          }}>
            {participationList.map((item) => (
              <div 
                key={item.student.id}
                className="card"
                style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                    {item.student.student_name}
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '4px', fontWeight: 600 }}>
                    {getEventName(item.student.event_id)}
                  </div>
                  
                  <div style={{ marginTop: '12px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <span className="muted">Certificate No:</span>{' '}
                      <strong style={{ color: '#fff' }}>{item.issued ? item.cert.certificate_number : '—'}</strong>
                    </div>
                    <div>
                      <span className="muted">Status:</span>{' '}
                      <span className={item.issued ? 'success' : 'muted'} style={{ fontWeight: 600 }}>
                        {item.issued ? '✓ Issued' : 'Not Issued'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  {item.issued ? (
                    <button className="link" onClick={() => downloadSingle(item.cert)} disabled={downloadingBulk} style={{ fontWeight: 600 }}>
                      📥 Download PDF
                    </button>
                  ) : (
                    <span className="muted" style={{ fontSize: '0.85rem' }}>Unavailable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
        {winnerList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            No winner positions assigned to your college yet.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            marginTop: '16px'
          }}>
            {winnerList.map((item, idx) => (
              <div 
                key={`${item.student.id}-${item.winnerPlace}-${idx}`}
                className="card"
                style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                      {item.student.student_name}
                    </h4>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: item.winnerPlace === '1st Place' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(156, 163, 175, 0.12)',
                      color: item.winnerPlace === '1st Place' ? '#f59e0b' : '#9ca3af'
                    }}>
                      {item.winnerPlace}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '4px', fontWeight: 600 }}>
                    {item.winnerEventName}
                  </div>
                  
                  <div style={{ marginTop: '12px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <span className="muted">Certificate No:</span>{' '}
                      <strong style={{ color: '#fff' }}>{item.issued ? item.cert.certificate_number : '—'}</strong>
                    </div>
                    <div>
                      <span className="muted">Status:</span>{' '}
                      <span className={item.issued ? 'success' : 'muted'} style={{ fontWeight: 600 }}>
                        {item.issued ? '✓ Issued' : 'Not Issued'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  {item.issued ? (
                    <button className="link" onClick={() => downloadSingle(item.cert)} disabled={downloadingBulk} style={{ fontWeight: 600 }}>
                      📥 Download PDF
                    </button>
                  ) : (
                    <span className="muted" style={{ fontSize: '0.85rem' }}>Unavailable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

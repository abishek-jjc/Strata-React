import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { generateCertificatePdf } from '../../utils/pdfCertificate'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const defaultLayouts = {
  participation: {
    student_name: { x: 50, y: 40, fontSize: 24, font: 'Helvetica-Bold', enabled: true, color: '#00e5ff' },
    college_name: { x: 50, y: 52, fontSize: 16, font: 'Helvetica-Bold', enabled: true, color: '#f9c20a' },
    event_name: { x: 50, y: 64, fontSize: 18, font: 'Helvetica-Bold', enabled: true, color: '#a78bfa' }
  },
  winner1: {
    student_name: { x: 50, y: 40, fontSize: 24, font: 'Helvetica-Bold', enabled: true, color: '#00e5ff' },
    college_name: { x: 25, y: 55, fontSize: 16, font: 'Helvetica-Bold', enabled: true, color: '#f9c20a' },
    event_name: { x: 75, y: 55, fontSize: 18, font: 'Helvetica-Bold', enabled: true, color: '#a78bfa' },
    place: { x: 50, y: 75, fontSize: 20, font: 'Helvetica-Bold', enabled: true, color: '#ff1744' }
  },
  winner2: {
    student_name: { x: 50, y: 40, fontSize: 24, font: 'Helvetica-Bold', enabled: true, color: '#00e5ff' },
    college_name: { x: 25, y: 55, fontSize: 16, font: 'Helvetica-Bold', enabled: true, color: '#f9c20a' },
    event_name: { x: 75, y: 55, fontSize: 18, font: 'Helvetica-Bold', enabled: true, color: '#a78bfa' },
    place: { x: 50, y: 75, fontSize: 20, font: 'Helvetica-Bold', enabled: true, color: '#ff1744' }
  }
}

function mergeDefaultLayout(layoutKey, savedLayout) {
  const merged = {}
  const defaultLayout = defaultLayouts[layoutKey]
  Object.keys(defaultLayout).forEach((key) => {
    merged[key] = {
      ...defaultLayout[key],
      ...(savedLayout?.[key] || {})
    }
    if (merged[key].color && !merged[key].color.startsWith('#')) {
      merged[key].color = '#' + merged[key].color
    }
  })
  return merged
}

function getPdfLibFont(fontKey) {
  switch (fontKey) {
    case 'Helvetica': return StandardFonts.Helvetica
    case 'Helvetica-Bold': return StandardFonts.HelveticaBold
    case 'Times-Roman': return StandardFonts.TimesRoman
    case 'Times-Bold': return StandardFonts.TimesRomanBold
    case 'Courier': return StandardFonts.Courier
    case 'Courier-Bold': return StandardFonts.CourierBold
    default: return StandardFonts.HelveticaBold
  }
}

function hexToRgb(hex) {
  const h = (hex || '#000000').replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  return rgb(r, g, b)
}

export default function CertificateDownload() {
  const { profile } = useAuth()
  // Fetch ALL students for this leader's college (college_id match, not leader_id)
  const { data: students } = useTable(TABLES.STUDENTS, [
    ['college_id', 'eq', profile?.college_id],
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
        if (!lot || !lot.assigned_college || lot.assigned_college.toLowerCase().trim() !== myCollegeName.toLowerCase().trim()) return

        // Students from my college registered in this event
        const collegeStudents = students.filter(s => s.event_id === w.event_id)
        collegeStudents.forEach(student => {
          // Check certificates table by student_id + exact place — do NOT use certificate_status flag
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

      const getLayout = (key, layoutName) => {
        try { return mergeDefaultLayout(layoutName, JSON.parse(settings[key] || '{}')) } catch { return defaultLayouts[layoutName] }
      }
      const pLayout = getLayout('participation_cert_layout', 'participation')
      const w1Layout = getLayout('winner_cert_1_layout', 'winner1')
      const w2Layout = getLayout('winner_cert_2_layout', 'winner2')

      const fontCache = {}
      const getEmbeddedFont = async (fontName) => {
        if (!fontCache[fontName]) {
          const fontRef = getPdfLibFont(fontName)
          fontCache[fontName] = await combinedDoc.embedFont(fontRef)
        }
        return fontCache[fontName]
      }

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

        const sName = student.student_name || ''
        const cName = getCollegeName(student.id) || ''
        const eName = getEventName(student.event_id) || ''
        const placeVal = cert.position || ''

        const drawElement = async (elemLayout, value) => {
          if (!elemLayout || elemLayout.enabled === false || !value) return

          const size = Number(elemLayout.fontSize) || 18
          const fontName = elemLayout.font || 'Helvetica-Bold'
          const font = await getEmbeddedFont(fontName)

          const textWidth = font.widthOfTextAtSize(value, size)
          const x = (elemLayout.x / 100) * width - textWidth / 2
          const y = height - (elemLayout.y / 100) * height

          const hexColor = elemLayout.color || '#000000'
          const colorVal = hexToRgb(hexColor)

          page.drawText(value, { x, y, size, font, color: colorVal })
        }

        await drawElement(layout.student_name, sName)
        await drawElement(layout.college_name, cName)
        await drawElement(layout.event_name, eName)
        if (placeVal && placeVal !== 'Participation') {
          await drawElement(layout.place, placeVal)
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
                  <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {item.student.student_name}
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '4px', fontWeight: 600 }}>
                    {getEventName(item.student.event_id)}
                  </div>
                  
                  <div style={{ marginTop: '12px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <span className="muted">Certificate No:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{item.issued ? item.cert.certificate_number : '—'}</strong>
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
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>
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
                      <strong style={{ color: 'var(--text-primary)' }}>{item.issued ? item.cert.certificate_number : '—'}</strong>
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

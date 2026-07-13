import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'
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

export default function Certificates() {
  const { data: students, loading: studentsLoading } = useTable(TABLES.STUDENTS)
  const { data: registrations } = useTable(TABLES.REGISTRATIONS)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: lots } = useTable(TABLES.LOTS)
  const { data: certificates } = useTable(TABLES.CERTIFICATES)
  const { data: winners } = useTable(TABLES.WINNERS)

  // Settings / Templates state
  const [participationUrl, setParticipationUrl] = useState('')
  const [winner1Url, setWinner1Url] = useState('')
  const [winner2Url, setWinner2Url] = useState('')
  
  const [uploadingTemplate, setUploadingTemplate] = useState(false)

  // Master Layout configurations (in percentages)
  const [layouts, setLayouts] = useState({
    participation: defaultLayouts.participation,
    winner1: defaultLayouts.winner1,
    winner2: defaultLayouts.winner2
  })

  // State for active popup template editor
  const [editingTemplate, setEditingTemplate] = useState(null) // null, 'participation', 'winner1', 'winner2'
  const [modalLayout, setModalLayout] = useState(null)
  const [pdfPageSize, setPdfPageSize] = useState({ width: 841.89, height: 595.28 })

  const [loadingBulk, setLoadingBulk] = useState(false)

  // Tab and search state
  const [activeTab, setActiveTab] = useState('participation')
  const [searchQuery, setSearchQuery] = useState('')

  const [participationPage, setParticipationPage] = useState(1)
  const [winnersPage, setWinnersPage] = useState(1)
  const itemsPerPage = 10

  const canvasRef = useRef(null)

  // Reset pages on search or tab changes
  useEffect(() => {
    setParticipationPage(1)
    setWinnersPage(1)
  }, [searchQuery, activeTab])

  // Load Settings and layouts on mount
  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from(TABLES.SETTINGS).select('*')
      if (data) {
        data.forEach((row) => {
          if (row.key_name === 'participation_cert_url') setParticipationUrl(row.value)
          if (row.key_name === 'winner_cert_1_url') setWinner1Url(row.value)
          if (row.key_name === 'winner_cert_2_url') setWinner2Url(row.value)
          
          if (row.key_name === 'participation_cert_layout') {
            try { setLayouts(prev => ({ ...prev, participation: mergeDefaultLayout('participation', JSON.parse(row.value)) })) } catch (e) {}
          }
          if (row.key_name === 'winner_cert_1_layout') {
            try { setLayouts(prev => ({ ...prev, winner1: mergeDefaultLayout('winner1', JSON.parse(row.value)) })) } catch (e) {}
          }
          if (row.key_name === 'winner_cert_2_layout') {
            try { setLayouts(prev => ({ ...prev, winner2: mergeDefaultLayout('winner2', JSON.parse(row.value)) })) } catch (e) {}
          }
        })
      }
    }
    loadSettings()
  }, [])

  // Sync modal layout when editor opens
  useEffect(() => {
    if (editingTemplate) {
      setModalLayout(layouts[editingTemplate])
    } else {
      setModalLayout(null)
    }
  }, [editingTemplate, layouts])

  const [pageDimensions, setPageDimensions] = useState({ width: 680, height: 480 })
  const [renderingPdf, setRenderingPdf] = useState(false)

  // Load PDF.js dynamically
  useEffect(() => {
    if (window.pdfjsLib) return
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
    }
    document.body.appendChild(script)
  }, [])

  const pdfUrl = useMemo(() => {
    if (!editingTemplate) return ''
    return editingTemplate === 'participation'
      ? participationUrl
      : editingTemplate === 'winner1'
        ? winner1Url
        : winner2Url
  }, [editingTemplate, participationUrl, winner1Url, winner2Url])

  useEffect(() => {
    if (!editingTemplate) return
    if (!pdfUrl) {
      setPageDimensions({ width: 680, height: 480 })
      return
    }
    
    let active = true
    
    async function renderPdfBackground() {
      // Wait for pdfjs to load if not ready
      for (let i = 0; i < 25; i++) {
        if (window.pdfjsLib) break
        await new Promise(r => setTimeout(r, 200))
      }
      if (!window.pdfjsLib || !active) return
      
      setRenderingPdf(true)
      try {
        const loadingTask = window.pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        if (!active) return
        
        const page = await pdf.getPage(1)
        if (!active) return
        
        const canvas = document.getElementById('pdf-render-canvas')
        if (!canvas) return
        
        const context = canvas.getContext('2d')
        
        // We want to scale the page to fit 680px width or 480px height
        const viewport = page.getViewport({ scale: 1.0 })
        setPdfPageSize({ width: viewport.width, height: viewport.height })
        const scaleX = 680 / viewport.width
        const scaleY = 480 / viewport.height
        const scale = Math.min(scaleX, scaleY)
        
        const scaledViewport = page.getViewport({ scale })
        
        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height
        setPageDimensions({ width: scaledViewport.width, height: scaledViewport.height })
        
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        }
        await page.render(renderContext).promise
      } catch (err) {
        console.error('Failed to render background PDF page:', err)
      } finally {
        if (active) setRenderingPdf(false)
      }
    }
    
    // Tiny delay to ensure the canvas DOM element is mounted
    const timer = setTimeout(() => {
      renderPdfBackground()
    }, 150)
    
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [editingTemplate, pdfUrl])

  // Drag and Drop Logic inside Popup Canvas
  const handleDragStart = (e, key) => {
    e.preventDefault()
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    
    const onMouseMove = (moveEvent) => {
      const xPx = moveEvent.clientX - rect.left
      const yPx = moveEvent.clientY - rect.top
      
      const xPct = Math.max(0, Math.min(90, (xPx / rect.width) * 100))
      const yPct = Math.max(0, Math.min(92, (yPx / rect.height) * 100))
      
      setModalLayout(prev => ({
        ...prev,
        [key]: { ...prev[key], x: xPct, y: yPct }
      }))
    }
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // Save layout config
  const handleSaveLayout = async () => {
    if (!editingTemplate) return
    const keyName = editingTemplate === 'participation' 
      ? 'participation_cert_layout' 
      : editingTemplate === 'winner1' 
        ? 'winner_cert_1_layout' 
        : 'winner_cert_2_layout'

    try {
      const { error } = await supabase
        .from(TABLES.SETTINGS)
        .upsert([{ key_name: keyName, value: JSON.stringify(modalLayout) }])
      
      if (error) throw error
      
      setLayouts(prev => ({ ...prev, [editingTemplate]: modalLayout }))
      alert('Layout configuration saved successfully!')
      setEditingTemplate(null)
    } catch (err) {
      alert('Failed to save layout: ' + err.message)
    }
  }

  // File templates Uploader
  async function handleUploadPdf(e, type) {
    const file = e.target.files?.[0]
    if (!file) return

    let setUrl, fileName, keyName
    if (type === 'participation') {
      setUrl = setParticipationUrl
      fileName = `participation_cert_template_${Date.now()}.pdf`
      keyName = 'participation_cert_url'
    } else if (type === 'winner1') {
      setUrl = setWinner1Url
      fileName = `winner_cert_1_template_${Date.now()}.pdf`
      keyName = 'winner_cert_1_url'
    } else if (type === 'winner2') {
      setUrl = setWinner2Url
      fileName = `winner_cert_2_template_${Date.now()}.pdf`
      keyName = 'winner_cert_2_url'
    }

    setUploadingTemplate(true)
    try {
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName)

      const { error: upsertError } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: keyName, value: publicUrl }
      ])
      if (upsertError) throw upsertError

      setUrl(publicUrl)
      alert('Template PDF uploaded successfully!')
    } catch (err) {
      alert(err.message || 'Failed to upload PDF template.')
    } finally {
      setUploadingTemplate(false)
    }
  }

  async function handleRemovePdf(type) {
    if (!confirm('Are you sure you want to remove this template?')) return

    let setUrl, keyName
    if (type === 'participation') {
      setUrl = setParticipationUrl
      keyName = 'participation_cert_url'
    } else if (type === 'winner1') {
      setUrl = setWinner1Url
      keyName = 'winner_cert_1_url'
    } else if (type === 'winner2') {
      setUrl = setWinner2Url
      keyName = 'winner_cert_2_url'
    }

    try {
      const { error: upsertError } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: keyName, value: '' }
      ])
      if (upsertError) throw upsertError
      setUrl('')
    } catch (err) {
      alert(err.message || 'Failed to remove template.')
    }
  }

  // Fetch all participants (as requested: "that are showing in participants")
  const eligibleStudents = students

  const filteredParticipation = eligibleStudents.filter((s) => {
    const nameMatch = s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
    const eventName = events.find((e) => e.id === s.event_id)?.event_name || ''
    const eventMatch = eventName.toLowerCase().includes(searchQuery.toLowerCase())
    const col = colleges.find((c) => c.id === s.college_id)
    const collegeName = col ? (col.department ? `${col.college} (${col.department})` : col.college) : ''
    const collegeMatch = collegeName.toLowerCase().includes(searchQuery.toLowerCase())
    return nameMatch || eventMatch || collegeMatch
  })

  // Winners: build from the winners table (first_place / second_place = lot name)
  const winnerRows = []
  winners.forEach((w) => {
    const eventName = events.find((e) => e.id === w.event_id)?.event_name || ''
    const places = [
      { place: '1st Place', lotName: w.first_place },
      { place: '2nd Place', lotName: w.second_place },
    ]
    places.forEach(({ place, lotName }) => {
      if (!lotName || lotName === '-') return
      
      const lot = lots?.find(l => l.lot_name === lotName)
      if (!lot || !lot.assigned_college) return

      const collegeName = lot.assigned_college
      const college = colleges.find((c) => (c.department ? `${c.college} (${c.department})` : c.college) === collegeName)
      if (!college) return
      
      const collegeStudents = eligibleStudents.filter(
        (s) => s.college_id === college.id && s.event_id === w.event_id
      )
      
      collegeStudents.forEach((s) => {
        winnerRows.push({ ...s, winnerPlace: place, winnerEventName: eventName, winnerCollegeName: collegeName })
      })
    })
  })

  const filteredWinners = winnerRows.filter((s) => {
    const q = searchQuery.toLowerCase()
    return (
      s.student_name.toLowerCase().includes(q) ||
      s.winnerEventName.toLowerCase().includes(q) ||
      s.winnerCollegeName.toLowerCase().includes(q)
    )
  })

  const totalParticipationPages = Math.ceil(filteredParticipation.length / itemsPerPage)
  const totalWinnersPages = Math.ceil(filteredWinners.length / itemsPerPage)

  useEffect(() => {
    if (participationPage > totalParticipationPages && totalParticipationPages > 0) {
      setParticipationPage(totalParticipationPages)
    }
  }, [filteredParticipation, totalParticipationPages, participationPage])

  useEffect(() => {
    if (winnersPage > totalWinnersPages && totalWinnersPages > 0) {
      setWinnersPage(totalWinnersPages)
    }
  }, [filteredWinners, totalWinnersPages, winnersPage])

  const paginatedParticipation = useMemo(() => {
    return filteredParticipation.slice((participationPage - 1) * itemsPerPage, participationPage * itemsPerPage)
  }, [filteredParticipation, participationPage])

  const paginatedWinners = useMemo(() => {
    return filteredWinners.slice((winnersPage - 1) * itemsPerPage, winnersPage * itemsPerPage)
  }, [filteredWinners, winnersPage])

  const getEventName = (id) => events.find((e) => e.id === id)?.event_name || 'Loading…'
  const getCollegeName = (id) => {
    const c = colleges.find((col) => col.id === id)
    if (!c) return 'Loading…'
    return c.department ? `${c.college} (${c.department})` : c.college
  }

  // Helper function to download arrayBuffer as PDF file
  function downloadBlob(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Dynamic Multi-page PDF Builder
  async function generateBulkPdf(studentsList, pdfTemplateUrl, layout) {
    if (!pdfTemplateUrl) {
      throw new Error('Please upload a PDF template first before issuing!')
    }

    const response = await fetch(pdfTemplateUrl)
    const templateBytes = await response.arrayBuffer()

    const combinedDoc = await PDFDocument.create()
    const fontCache = {}
    const getEmbeddedFont = async (fontName) => {
      if (!fontCache[fontName]) {
        const fontRef = getPdfLibFont(fontName)
        fontCache[fontName] = await combinedDoc.embedFont(fontRef)
      }
      return fontCache[fontName]
    }

    for (const student of studentsList) {
      const tempDoc = await PDFDocument.load(templateBytes)
      const [copiedPage] = await combinedDoc.copyPages(tempDoc, [0])
      combinedDoc.addPage(copiedPage)
      
      const page = combinedDoc.getPages()[combinedDoc.getPageCount() - 1]
      const { width, height } = page.getSize()

      const sName = student.student_name || ''
      const cName = student.winnerCollegeName || getCollegeName(student.college_id) || ''
      const eName = student.winnerEventName || getEventName(student.event_id) || ''
      const placeVal = student.winnerPlace || ''

      const drawElement = async (elemKey, value) => {
        const item = layout[elemKey]
        if (!item || item.enabled === false || !value) return

        const size = Number(item.fontSize) || 18
        const fontName = item.font || 'Helvetica-Bold'
        const font = await getEmbeddedFont(fontName)

        const textWidth = font.widthOfTextAtSize(value, size)
        const x = (item.x / 100) * width - textWidth / 2
        const y = height - (item.y / 100) * height

        const hexColor = item.color || '#000000'
        const colorVal = hexToRgb(hexColor)

        page.drawText(value, { x, y, size, font, color: colorVal })
      }

      await drawElement('student_name', sName)
      await drawElement('college_name', cName)
      await drawElement('event_name', eName)
      if (placeVal) {
        await drawElement('place', placeVal)
      }
    }

    const combinedBytes = await combinedDoc.save()
    return combinedBytes
  }

  // Issue helpers
  async function issueParticipation(student) {
    const certNumber = `CERT-PART-${Date.now()}`
    try {
      const layout = layouts.participation
      const sName = student.student_name
      const cName = getCollegeName(student.college_id)
      const eName = getEventName(student.event_id)
      
      const singleList = [{ ...student, student_name: sName, winnerCollegeName: cName, winnerEventName: eName }]
      const bytes = await generateBulkPdf(singleList, participationUrl, layout)
      
      downloadBlob(bytes, `participation_${sName.replace(/\s+/g, '_')}.pdf`)

      const { error: certError } = await supabase.from(TABLES.CERTIFICATES).insert({
        student_id: student.id,
        event_id: student.event_id,
        certificate_number: certNumber,
        position: 'Participation',
      })
      if (certError) throw certError

      await supabase
        .from(TABLES.STUDENTS)
        .update({ certificate_status: 'issued' })
        .eq('id', student.id)
    } catch (err) {
      alert(err.message || 'Failed to issue participation certificate.')
    }
  }

  async function issueWinner(student) {
    const certNumber = `CERT-WIN-${Date.now()}`
    try {
      const templateVal = student.winnerPlace === '1st Place' ? winner1Url : winner2Url
      const layout = student.winnerPlace === '1st Place' ? layouts.winner1 : layouts.winner2
      
      const singleList = [student]
      const bytes = await generateBulkPdf(singleList, templateVal, layout)
      
      downloadBlob(bytes, `winner_${student.winnerPlace.replace(/\s+/g, '_')}_${student.student_name.replace(/\s+/g, '_')}.pdf`)

      const { error: certError } = await supabase.from(TABLES.CERTIFICATES).insert({
        student_id: student.id,
        event_id: student.event_id,
        certificate_number: certNumber,
        position: student.winnerPlace,
      })
      if (certError) throw certError

      await supabase
        .from(TABLES.STUDENTS)
        .update({ certificate_status: 'issued' })
        .eq('id', student.id)
    } catch (err) {
      alert(err.message || 'Failed to issue winner certificate.')
    }
  }  // Unified Issue All — works for both participation and winner tabs
  async function issueAll() {
    if (activeTab === 'participation') {
      const unissued = filteredParticipation.filter(
        (s) => !certificates.some((c) => c.student_id === s.id && c.position === 'Participation')
      )
      if (unissued.length === 0) {
        alert('All eligible participants have already been issued certificates!')
        return
      }
      if (!confirm(`Issue participation certificates in the database for all ${unissued.length} unissued participants?`)) return

      setLoadingBulk(true)
      try {
        for (const student of unissued) {
          const certNumber = `CERT-PART-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          const { error: certErr } = await supabase.from(TABLES.CERTIFICATES).insert({
            student_id: student.id,
            event_id: student.event_id,
            certificate_number: certNumber,
            position: 'Participation',
          })
          if (certErr) throw certErr
          await supabase.from(TABLES.STUDENTS).update({ certificate_status: 'issued' }).eq('id', student.id)
        }
        alert(`Successfully issued ${unissued.length} participation certificate(s) in the database!`)
      } catch (err) {
        alert('Bulk issue failed: ' + err.message)
      } finally {
        setLoadingBulk(false)
      }

    } else {
      // Winners tab — check by student_id + exact winnerPlace position, never by certificate_status flag
      const unissued = filteredWinners.filter(
        (s) => !certificates.some((c) => c.student_id === s.id && c.position === s.winnerPlace)
      )
      if (unissued.length === 0) {
        alert('All winners have already been issued certificates!')
        return
      }
      if (!confirm(`Issue winner certificates in the database for all ${unissued.length} unissued winners?`)) return

      setLoadingBulk(true)
      try {
        for (const student of unissued) {
          const certNumber = `CERT-WIN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          const { error: certErr } = await supabase.from(TABLES.CERTIFICATES).insert({
            student_id: student.id,
            event_id: student.event_id,
            certificate_number: certNumber,
            position: student.winnerPlace,  // '1st Place' or '2nd Place'
          })
          if (certErr) throw certErr
          // Do NOT set certificate_status='issued' here — that flag is for participation only
          // Winners' issued status is determined by the certificates table row
        }
        alert(`Successfully issued ${unissued.length} winner certificate(s) in the database!`)
      } catch (err) {
        alert('Bulk issue failed: ' + err.message)
      } finally {
        setLoadingBulk(false)
      }
    }
  }

  // Get current active template URL in popup uploader
  const getEditingTemplateUrl = () => {
    if (editingTemplate === 'participation') return participationUrl
    if (editingTemplate === 'winner1') return winner1Url
    if (editingTemplate === 'winner2') return winner2Url
    return ''
  }

  return (
    <div className="certificates-page">
      <h2>Certificate Templates & Issuance</h2>

      {/* Templates Section Card */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h3>Upload & Configure Templates</h3>
        <p className="muted" style={{ marginBottom: '15px' }}>
          Upload PDF templates containing blank lines (e.g. <code>________</code>). Click <strong>"Configure Layout"</strong> to drag and drop text fields to autofill details over the template.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 15 }}>
          {/* Participation Certificate */}
          <div className="stat" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', padding: 20, borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>1. Participation Certificate</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                {participationUrl ? (
                  <span className="success" style={{ fontWeight: 'bold' }}>✓ PDF Template Active</span>
                ) : (
                  <span className="muted">No PDF template uploaded</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setEditingTemplate('participation')} 
                  className="btn btn-sm btn-primary"
                >
                  Configure Layout
                </button>
                {participationUrl && (
                  <button onClick={() => handleRemovePdf('participation')} className="btn btn-sm btn-danger">
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Winner Certificate (1st) */}
          <div className="stat" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', padding: 20, borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>2. Winner Certificate (1st Place)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                {winner1Url ? (
                  <span className="success" style={{ fontWeight: 'bold' }}>✓ PDF Template Active</span>
                ) : (
                  <span className="muted">No PDF template uploaded</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setEditingTemplate('winner1')} 
                  className="btn btn-sm btn-primary"
                >
                  Configure Layout
                </button>
                {winner1Url && (
                  <button onClick={() => handleRemovePdf('winner1')} className="btn btn-sm btn-danger">
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Winner Certificate (2nd) */}
          <div className="stat" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', padding: 20, borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>3. Winner Certificate (2nd Place)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                {winner2Url ? (
                  <span className="success" style={{ fontWeight: 'bold' }}>✓ PDF Template Active</span>
                ) : (
                  <span className="muted">No PDF template uploaded</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setEditingTemplate('winner2')} 
                  className="btn btn-sm btn-primary"
                >
                  Configure Layout
                </button>
                {winner2Url && (
                  <button onClick={() => handleRemovePdf('winner2')} className="btn btn-sm btn-danger">
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Drag & Drop Configuration Popup Modal */}
      {editingTemplate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 12, 0.9)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div className="card" style={{
            maxWidth: '1100px',
            width: '100%',
            padding: '30px',
            background: 'var(--bg-glass-card, #0f121d)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'Syne, sans-serif' }}>
                Configure Layout — {editingTemplate === 'participation' ? 'Participation Certificate' : editingTemplate === 'winner1' ? '1st Place Certificate' : '2nd Place Certificate'}
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingTemplate(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.8rem', cursor: 'pointer', opacity: 0.8 }}
              >
                ×
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="responsive-grid-sidebar">
              {/* Left Column: Canvas Preview */}
              <div>
                {/* 2.1 PDF Upload Panel */}
                <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '0.95rem' }}>1. Upload Template PDF File</h4>
                  {getEditingTemplateUrl() ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="success" style={{ fontSize: '0.9rem' }}>✓ PDF Template Active</span>
                      <a href={getEditingTemplateUrl()} target="_blank" rel="noreferrer" className="btn btn-sm">View File</a>
                    </div>
                  ) : (
                    <div>
                      <p className="muted" style={{ margin: '0 0 10px 0', fontSize: '0.85rem' }}>Upload certificate base template PDF with blank lines.</p>
                      <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={(e) => handleUploadPdf(e, editingTemplate)}
                        disabled={uploadingTemplate}
                      />
                      {uploadingTemplate && <p className="muted">Uploading template file...</p>}
                    </div>
                  )}
                </div>

                {/* 2.2 Drag & Drop Workspace */}
                <div 
                  style={{
                    width: '680px',
                    height: '480px',
                    border: '2px dashed #3a3f50',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.01)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 4px 30px rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}
                >
                  <div
                    ref={canvasRef}
                    style={{
                      width: `${pageDimensions.width}px`,
                      height: `${pageDimensions.height}px`,
                      position: 'relative',
                      background: pdfUrl ? '#ffffff' : 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      boxShadow: pdfUrl ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
                      transition: 'width 0.3s ease, height 0.3s ease'
                    }}
                  >
                    {/* Background Canvas where PDF page is drawn */}
                    {pdfUrl && (
                      <canvas
                        id="pdf-render-canvas"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          zIndex: 1,
                          pointerEvents: 'none',
                          borderRadius: '8px'
                        }}
                      />
                    )}

                    {/* Draggable tags overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 2
                      }}
                    >
                      {modalLayout && Object.keys(modalLayout).map((key) => {
                        const item = modalLayout[key]
                        if (!item || item.enabled === false) return null
                        
                        let label = key.toUpperCase().replace('_', ' ')
                        let color = '#f9c20a' // yellow
                        if (key === 'student_name') color = '#00e5ff' // cyan
                        if (key === 'place') color = '#ff1744' // red

                        // Calculate scale factor and screen font size to match PDF scaling
                        const scale = pageDimensions.width / pdfPageSize.width
                        const screenFontSize = (item.fontSize || 18) * scale

                        return (
                          <div
                            key={key}
                            onMouseDown={(e) => handleDragStart(e, key)}
                            style={{
                              position: 'absolute',
                              left: `${item.x}%`,
                              top: `${item.y}%`,
                              transform: 'translate(-50%, -100%)', // Center horizontally and align baseline vertically
                              padding: '2px 6px',
                              background: 'rgba(15, 18, 29, 0.75)',
                              border: `1.5px dashed ${color}`,
                              color: color,
                              borderRadius: '4px',
                              cursor: 'move',
                              fontSize: `${screenFontSize}px`,
                              fontWeight: 'bold',
                              userSelect: 'none',
                              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                              whiteSpace: 'nowrap',
                              zIndex: 10,
                              lineHeight: 1.0
                            }}
                          >
                            {label} ({Math.round(item.x)}%, {Math.round(item.y)}%)
                          </div>
                        )
                      })}
                    </div>

                    {!pdfUrl && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(255,255,255,0.06)', pointerEvents: 'none', fontSize: '1.1rem', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
                        Certificate Preview Canvas
                      </div>
                    )}

                    {renderingPdf && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(12, 14, 18, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: '8px' }}>
                        <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>Rendering template preview...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Properties panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="card" style={{ padding: '20px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '6px' }}>Element Properties</h4>
                  <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '15px', lineHeight: '1.4' }}>
                    Drag tags on the canvas, or enter exact values below.<br />
                    <strong>X/Y are % of page width/height.</strong> Text is center-anchored at the X position.
                  </p>
                  {modalLayout && Object.keys(modalLayout).map((key) => {
                    const item = modalLayout[key]
                    if (!item) return null
                    const labelColors = { student_name: '#00e5ff', college_name: '#f9c20a', event_name: '#a78bfa', place: '#ff1744' }
                    const color = labelColors[key] || '#f9c20a'
                    return (
                      <div key={key} style={{ marginBottom: '18px', borderLeft: `3px solid ${color}`, paddingLeft: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {key.replace(/_/g, ' ')}
                          </div>
                          
                          {/* 2. Select Text checkbox to show/hide */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={item.enabled !== false}
                              onChange={(e) => {
                                setModalLayout(prev => ({ ...prev, [key]: { ...prev[key], enabled: e.target.checked } }))
                              }}
                              style={{ width: '14px', height: '14px' }}
                            />
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Show</span>
                          </label>
                        </div>

                        {item.enabled !== false && (
                          <>
                            {/* X and Y row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                              <label className="field" style={{ margin: 0 }}>
                                <span style={{ fontSize: '0.72rem' }}>X Position (%)</span>
                                <input
                                  type="number"
                                  min="0" max="100" step="0.5"
                                  value={Math.round(item.x * 10) / 10}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                                    setModalLayout(prev => ({ ...prev, [key]: { ...prev[key], x: val } }))
                                  }}
                                  style={{ padding: '6px 8px', width: '100%', fontSize: '0.85rem' }}
                                />
                              </label>
                              <label className="field" style={{ margin: 0 }}>
                                <span style={{ fontSize: '0.72rem' }}>Y Position (%)</span>
                                <input
                                  type="number"
                                  min="0" max="100" step="0.5"
                                  value={Math.round(item.y * 10) / 10}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                                    setModalLayout(prev => ({ ...prev, [key]: { ...prev[key], y: val } }))
                                  }}
                                  style={{ padding: '6px 8px', width: '100%', fontSize: '0.85rem' }}
                                />
                              </label>
                            </div>

                            {/* Font size & font family row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                              <label className="field" style={{ margin: 0 }}>
                                <span style={{ fontSize: '0.72rem' }}>Font Size (pt)</span>
                                <input
                                  type="number"
                                  min="8" max="72" step="1"
                                  value={item.fontSize || 18}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 18
                                    setModalLayout(prev => ({ ...prev, [key]: { ...prev[key], fontSize: val } }))
                                  }}
                                  style={{ padding: '6px 8px', width: '100%', fontSize: '0.85rem' }}
                                />
                              </label>
                              {/* 1. Select Font dropdown menu */}
                              <label className="field" style={{ margin: 0 }}>
                                <span style={{ fontSize: '0.72rem' }}>Select Font</span>
                                <select
                                  value={item.font || 'Helvetica-Bold'}
                                  onChange={(e) => {
                                    setModalLayout(prev => ({ ...prev, [key]: { ...prev[key], font: e.target.value } }))
                                  }}
                                  style={{ padding: '6px 8px', width: '100%', fontSize: '0.85rem', height: '31px', borderRadius: '4px' }}
                                >
                                  <option value="Helvetica">Helvetica</option>
                                  <option value="Helvetica-Bold">Helvetica Bold</option>
                                  <option value="Times-Roman">Times Roman</option>
                                  <option value="Times-Bold">Times Bold</option>
                                  <option value="Courier">Courier</option>
                                  <option value="Courier-Bold">Courier Bold</option>
                                </select>
                              </label>
                            </div>

                            {/* 3. Font color row */}
                            <label className="field" style={{ margin: 0 }}>
                              <span style={{ fontSize: '0.72rem', display: 'block', marginBottom: '4px' }}>Font Color</span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="color"
                                  value={item.color || '#000000'}
                                  onChange={(e) => {
                                    setModalLayout(prev => ({ ...prev, [key]: { ...prev[key], color: e.target.value } }))
                                  }}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    width: '30px',
                                    height: '30px',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                />
                                <input
                                  type="text"
                                  value={item.color || '#000000'}
                                  onChange={(e) => {
                                    setModalLayout(prev => ({ ...prev, [key]: { ...prev[key], color: e.target.value } }))
                                  }}
                                  style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100px' }}
                                />
                              </div>
                            </label>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setEditingTemplate(null)} 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveLayout} 
                    className="btn btn-primary" 
                    style={{ flex: 1 }}
                  >
                    Save & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Container */}
      <div className="crud-header" style={{ marginBottom: 15 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${activeTab === 'participation' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('participation'); setSearchQuery(''); }}
          >
            Participants ({filteredParticipation.length})
          </button>
          <button
            className={`btn ${activeTab === 'winner' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('winner'); setSearchQuery(''); }}
          >
            Winners ({winnerRows.length})
          </button>
        </div>

        {/* Unified Bulk Issue Button + Search */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={issueAll}
            disabled={loadingBulk}
          >
            {loadingBulk ? 'Issuing…' : activeTab === 'participation' ? 'Issue All Participants' : 'Issue All Winners'}
          </button>
          
          <input
            className="input"
            placeholder="Search student, event, or college…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 260 }}
          />
        </div>
      </div>

      {studentsLoading ? (
        <p className="muted">Loading students data…</p>
      ) : activeTab === 'participation' ? (
        <>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>College</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedParticipation.map((s) => {
                  const isIssued = s.certificate_status === 'issued' || certificates.some(
                    (c) => c.student_id === s.id && c.position === 'Participation'
                  )
                  return (
                    <tr key={s.id}>
                      <td>{s.student_name}</td>
                      <td>{getCollegeName(s.college_id)}</td>
                      <td>{getEventName(s.event_id)}</td>
                      <td>
                        <span className={isIssued ? 'success' : 'muted'}>
                          {isIssued ? '✓ Issued' : 'Not Issued'}
                        </span>
                      </td>
                      <td>
                        {isIssued ? (
                          <button
                            onClick={() => {
                              const cert = certificates.find(c => c.student_id === s.id && c.position === 'Participation')
                              if (cert) downloadSingle(cert)
                            }}
                            className="link"
                            disabled={!participationUrl}
                          >
                            Download PDF
                          </button>
                        ) : (
                          <button
                            onClick={() => issueParticipation(s)}
                            className="link btn-primary-link"
                            disabled={!participationUrl}
                          >
                            Issue PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {paginatedParticipation.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted" style={{ textAlign: 'center' }}>
                      No eligible students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalParticipationPages > 1 && (
            <div className="pagination" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setParticipationPage(1)}
                disabled={participationPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                First
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setParticipationPage((prev) => Math.max(prev - 1, 1))}
                disabled={participationPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Prev
              </button>
              <span className="muted" style={{ fontSize: '0.85rem', margin: '0 8px' }}>
                Page <strong>{participationPage}</strong> of {totalParticipationPages} ({filteredParticipation.length} items)
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setParticipationPage((prev) => Math.min(prev + 1, totalParticipationPages))}
                disabled={participationPage === totalParticipationPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Next
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setParticipationPage(totalParticipationPages)}
                disabled={participationPage === totalParticipationPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Last
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>College</th>
                  <th>Event</th>
                  <th>Winner Place</th>
                  <th>Cert Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWinners.map((s, idx) => {
                  const isIssued = certificates.some(
                    (c) => c.student_id === s.id && c.position === s.winnerPlace
                  )
                  const hasTemplates = winner1Url && winner2Url
                  return (
                    <tr key={`${s.id}-${s.winnerPlace}-${idx}`}>
                      <td><strong>{s.student_name}</strong></td>
                      <td>{s.winnerCollegeName}</td>
                      <td>{s.winnerEventName}</td>
                      <td>
                        <span className={`badge badge-${s.winnerPlace === '1st Place' ? 'approved' : 'pending'}`}>
                          {s.winnerPlace}
                        </span>
                      </td>
                      <td>
                        <span className={isIssued ? 'success' : 'muted'}>
                          {isIssued ? '✓ Issued' : 'Not Issued'}
                        </span>
                      </td>
                      <td>
                        {isIssued ? (
                          <button
                            onClick={() => {
                              const cert = certificates.find(c => c.student_id === s.id && c.position === s.winnerPlace)
                              if (cert) downloadSingle(cert)
                            }}
                            className="link"
                            disabled={!hasTemplates}
                          >
                            Download PDF
                          </button>
                        ) : (
                          <button
                            onClick={() => issueWinner(s)}
                            className="link btn-primary-link"
                            disabled={!hasTemplates}
                          >
                            Issue PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {paginatedWinners.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: 'center' }}>
                      No winners assigned yet. Assign winners in the Winners page first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalWinnersPages > 1 && (
            <div className="pagination" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setWinnersPage(1)}
                disabled={winnersPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                First
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setWinnersPage((prev) => Math.max(prev - 1, 1))}
                disabled={winnersPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Prev
              </button>
              <span className="muted" style={{ fontSize: '0.85rem', margin: '0 8px' }}>
                Page <strong>{winnersPage}</strong> of {totalWinnersPages} ({filteredWinners.length} items)
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setWinnersPage((prev) => Math.min(prev + 1, totalWinnersPages))}
                disabled={winnersPage === totalWinnersPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Next
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setWinnersPage(totalWinnersPages)}
                disabled={winnersPage === totalWinnersPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Last
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

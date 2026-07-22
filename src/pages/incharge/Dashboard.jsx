import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'
import { exportToExcel } from '../../utils/excelExport'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Trophy, Users, FileText, Award, User, Search, Download, ShieldCheck, LogOut, X, Info, FileSpreadsheet } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { loadLogoWithOpacity, addWatermarkToAllPages } from '../../utils/pdfBackground'

export default function InchargeDashboard({ tab = 'lots' }) {
  const { settings } = useSettings()
  const logoUrl = settings?.event_logo_url
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  const [incharge, setIncharge] = useState(null)
  const [event, setEvent] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // 1. Fetch Incharge Profile and Event assignment
  useEffect(() => {
    async function loadInchargeProfile() {
      if (!profile?.ref_id) {
        setLoadingProfile(false)
        return
      }

      try {
        const { data: inchRow, error: inchError } = await supabase
          .from(TABLES.INCHARGES)
          .select('*')
          .eq('id', profile.ref_id)
          .single()

        if (inchError) throw inchError
        setIncharge(inchRow)

        const { data: eventRow, error: eventError } = await supabase
          .from(TABLES.EVENTS)
          .select('*')
          .eq('staff_incharge', inchRow.id)
          .maybeSingle()

        if (!eventError && eventRow) {
          setEvent(eventRow)
        }
      } catch (err) {
        console.error('Error loading incharge profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    loadInchargeProfile()
  }, [profile])

  // 2. Fetch all required tables
  const { data: students, loading: studentsLoading } = useTable(
    TABLES.STUDENTS,
    event?.id ? [['event_id', 'eq', event.id]] : []
  )
  const { data: colleges, loading: collegesLoading } = useTable(TABLES.COLLEGES)
  const { data: venues, loading: venuesLoading } = useTable(TABLES.VENUES)
  const { data: lots, loading: lotsLoading } = useTable(TABLES.LOTS)
  const { data: winners, loading: winnersLoading } = useTable(TABLES.WINNERS)
  const { data: registrations, loading: registrationsLoading } = useTable(TABLES.REGISTRATIONS)

  // 3. States for results editing & view controls
  const [localPrelims, setLocalPrelims] = useState([])
  const [mainsWinners, setMainsWinners] = useState({ first_place: '-', second_place: '-' })
  const [savingPrelims, setSavingPrelims] = useState(false)
  const [savingMains, setSavingMains] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSubTab, setActiveSubTab] = useState('prelims') // 'prelims' or 'mains'
  const [selectedStudent, setSelectedStudent] = useState(null) // Modal state for student profile
  const [showEventModal, setShowEventModal] = useState(false) // Modal state for event rules/details

  // Sync winners record
  const eventWinnerRecord = useMemo(() => {
    if (!winners || !event) return null
    return winners.find((w) => w.event_id === event.id)
  }, [winners, event])

  useEffect(() => {
    if (eventWinnerRecord) {
      setLocalPrelims(eventWinnerRecord.prelim_winners || [])
      setMainsWinners({
        first_place: eventWinnerRecord.first_place || '-',
        second_place: eventWinnerRecord.second_place || '-',
      })
    }
  }, [eventWinnerRecord])

  const loading =
    loadingProfile ||
    studentsLoading ||
    collegesLoading ||
    venuesLoading ||
    lotsLoading ||
    winnersLoading ||
    registrationsLoading

  // Determine whether event has prelims
  const hasPrelims = useMemo(() => {
    return !!(event?.prelims_venue || event?.preliminary)
  }, [event])

  // Automatically focus mains subtab if no prelims exist
  useEffect(() => {
    if (!hasPrelims) {
      setActiveSubTab('mains')
    }
  }, [hasPrelims])

  // 4. Resolve registered lots for the incharge's event
  const allowedLots = useMemo(() => {
    if (!event || !registrations || !lots || !colleges) return []

    // Registrations for this event
    const eventRegs = registrations.filter(
      (r) => r.event_id === event.id && r.status !== REGISTRATION_STATUS.REJECTED
    )
    const registeredCollegeIds = eventRegs.map((r) => r.college_id)

    // Normalize registered college names
    const registeredCollegeNames = colleges
      .filter((c) => registeredCollegeIds.includes(c.id))
      .map((c) => {
        const combined = c.department ? `${c.college} (${c.department})` : c.college
        return combined.toLowerCase().trim()
      })
      .filter(Boolean)

    // Assigned active lots
    const activeLots = lots.filter(
      (l) => l.is_assigned && l.assigned_college && l.assigned_college !== '-'
    )

    // Filter lots
    return activeLots.filter((l) => {
      const assigned = (l.assigned_college || '').toLowerCase().trim()
      return assigned !== '-' && registeredCollegeNames.includes(assigned)
    })
  }, [event, registrations, lots, colleges])

  const getCollegeName = (id) => colleges.find((c) => c.id === id)?.college || 'Loading…'
  const getCollegeLot = (collegeId) => {
    if (!collegeId || !colleges) return '—'
    const col = colleges.find((c) => c.id === collegeId)
    if (!col) return '—'
    const colName = col.department ? `${col.college} (${col.department})` : col.college
    const match = lots.find(
      (l) => l.is_assigned && (l.assigned_college || '').toLowerCase().trim() === colName.toLowerCase().trim()
    )
    return match ? match.lot_name : '—'
  }

  // Count candidates per lot
  const getLotParticipantCount = (lotName) => {
    if (!students || !colleges) return 0
    return students.filter((s) => {
      const col = colleges.find((c) => c.id === s.college_id)
      if (!col) return false
      const colLabel = col.department ? `${col.college} (${col.department})` : col.college
      return colLabel.toLowerCase().trim() === lotName.toLowerCase().trim()
    }).length
  }

  // 5. Save handlers
  const handleCheckboxToggle = (lotName) => {
    setLocalPrelims((prev) =>
      prev.includes(lotName) ? prev.filter((x) => x !== lotName) : [...prev, lotName]
    )
  }

  const handleMainsChange = (field, val) => {
    const updated = { ...mainsWinners, [field]: val }

    // Validation: 1st and 2nd place cannot belong to the same college
    if (updated.first_place !== '-' && updated.second_place !== '-') {
      const firstLot = allowedLots.find((l) => l.lot_name === updated.first_place)
      const secondLot = allowedLots.find((l) => l.lot_name === updated.second_place)

      const firstCollege = firstLot ? (firstLot.assigned_college || '').toLowerCase().trim() : ''
      const secondCollege = secondLot ? (secondLot.assigned_college || '').toLowerCase().trim() : ''

      if (firstCollege !== '' && secondCollege !== '' && firstCollege === secondCollege) {
        alert('Validation conflict: 1st and 2nd place winners cannot be from the same college!')
        if (field === 'first_place') {
          updated.second_place = '-'
        } else {
          updated.first_place = '-'
        }
      }
    }
    setMainsWinners(updated)
  }

  const handleSavePrelims = async () => {
    if (!event) return
    setSavingPrelims(true)
    try {
      const payload = {
        event_id: event.id,
        prelim_winners: localPrelims,
        prelims_published: true,
      }
      const { error } = await supabase
        .from(TABLES.WINNERS)
        .upsert(payload, { onConflict: 'event_id' })

      if (error) throw error
      alert('Prelims qualifiers saved successfully!')
    } catch (err) {
      alert('Failed to save prelims qualifiers: ' + err.message)
    } finally {
      setSavingPrelims(false)
    }
  }

  const handleSaveMainsWinners = async () => {
    if (!event) return
    setSavingMains(true)
    try {
      const payload = {
        event_id: event.id,
        first_place: mainsWinners.first_place,
        second_place: mainsWinners.second_place,
        mains_published: true,
      }
      const { error } = await supabase
        .from(TABLES.WINNERS)
        .upsert(payload, { onConflict: 'event_id' })

      if (error) throw error
      alert('Main winners saved successfully!')
    } catch (err) {
      alert('Failed to save main winners: ' + err.message)
    } finally {
      setSavingMains(false)
    }
  }

  // 6. Student list filtering
  const filteredStudents = useMemo(() => {
    if (!students) return []
    const q = searchQuery.toLowerCase().trim()
    return students.filter((s) => {
      const lotName = getCollegeLot(s.college_id)
      return (
        s.student_name.toLowerCase().includes(q) ||
        (s.roll_no || '').toLowerCase().includes(q) ||
        `lot ${lotName}`.toLowerCase().includes(q)
      )
    })
  }, [students, searchQuery, colleges, lots])

  // 7. EXPORT LOGIC FOR LOTS
  const getLotsExportData = () => {
    return allowedLots.map((l) => ({
      'Lot Name': l.lot_name,
      'Candidate Count': getLotParticipantCount(l.assigned_college)
    }))
  }

  const handleExportLotsExcel = () => {
    const data = getLotsExportData()
    if (data.length === 0) {
      alert('No lots data to export.')
      return
    }
    exportToExcel(data, `allocated_lots_${event.event_name.toLowerCase().replace(/\s+/g, '_')}`)
  }

  const handleExportLotsPdf = async () => {
    const data = getLotsExportData()
    if (data.length === 0) {
      alert('No lots data to export.')
      return
    }
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait'
    })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`Strata 2K26 — Allocated Lots for ${event.event_name.toUpperCase()}`, 40, 45)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60)

    const lotRows = data.map((row) => [
      'Lot ' + row['Lot Name'],
      String(row['Candidate Count'])
    ])

    doc.autoTable({
      startY: 80,
      head: [['Lot Name', 'Candidate Count']],
      body: lotRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 229, 255], textColor: [0, 0, 0] },
      styles: { fontSize: 9 }
    })
    const watermark = await loadLogoWithOpacity(logoUrl, 0.05)
    addWatermarkToAllPages(doc, watermark, 0.5)
    doc.save(`allocated_lots_${event.event_name.toLowerCase().replace(/\s+/g, '_')}.pdf`)
  }

  // 8. EXPORT LOGIC FOR STUDENTS
  const getStudentsExportData = () => {
    return filteredStudents.map((s) => ({
      'Name': s.student_name,
      'Roll No': s.roll_no || '—',
      'Gender': s.gender || '—',
      'Department': s.department || '—',
      'Year': s.year || '—',
      'Lot': getCollegeLot(s.college_id),
      'Food Preference': s.food_type || 'Veg'
    }))
  }

  const handleExportStudentsExcel = () => {
    const data = getStudentsExportData()
    if (data.length === 0) {
      alert('No candidates data to export.')
      return
    }
    exportToExcel(data, `candidates_${event.event_name.toLowerCase().replace(/\s+/g, '_')}`)
  }

  const handleExportStudentsPdf = async () => {
    const data = getStudentsExportData()
    if (data.length === 0) {
      alert('No candidates data to export.')
      return
    }
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'landscape'
    })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`Strata 2K26 — Candidates List for ${event.event_name.toUpperCase()}`, 40, 45)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60)

    const studentRows = data.map((row) => [
      row['Name'],
      row['Roll No'],
      row['Gender'],
      row['Department'],
      row['Year'],
      'Lot ' + row['Lot'],
      row['Food Preference']
    ])

    doc.autoTable({
      startY: 80,
      head: [['Candidate Name', 'Roll Number', 'Gender', 'Department', 'Year', 'Assigned Lot', 'Food Choice']],
      body: studentRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 229, 255], textColor: [0, 0, 0] },
      styles: { fontSize: 8.5 }
    })
    const watermark = await loadLogoWithOpacity(logoUrl, 0.05)
    addWatermarkToAllPages(doc, watermark, 0.5)
    doc.save(`candidates_${event.event_name.toLowerCase().replace(/\s+/g, '_')}.pdf`)
  }

  const handleExportWinnersPdf = async () => {
    if (!event) return
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait'
    })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(26, 29, 35)
    doc.text(`STRATA 2K26 — Contest Results`, 40, 50)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 110, 120)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 70)

    doc.setDrawColor(0, 229, 255)
    doc.line(40, 80, 555, 80)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(26, 29, 35)
    doc.text(`Event: ${event.event_name.toUpperCase()}`, 40, 110)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Category: ${event.category || '—'}`, 40, 130)

    let currentY = 165

    if (hasPrelims) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(`Preliminary Qualifiers`, 40, currentY)
      currentY += 15

      const prelimRows = localPrelims.map((lotName) => [
        'Lot ' + lotName
      ])

      if (prelimRows.length > 0) {
        doc.autoTable({
          startY: currentY,
          margin: { left: 40, right: 40 },
          head: [['Qualified Lot Name']],
          body: prelimRows,
          theme: 'grid',
          headStyles: { fillColor: [12, 14, 18], fontSize: 10 },
          styles: { fontSize: 9 }
        })
        currentY = doc.lastAutoTable.finalY + 25
      } else {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10)
        doc.text('No preliminary qualifiers recorded.', 40, currentY)
        currentY += 25
      }
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`Final Winners (Mains)`, 40, currentY)
    currentY += 15

    const firstLotName = mainsWinners.first_place
    const secondLotName = mainsWinners.second_place

    const mainsRows = [
      ['First Place (1st)', firstLotName !== '-' ? `Lot ${firstLotName}` : '—'],
      ['Second Place (2nd)', secondLotName !== '-' ? `Lot ${secondLotName}` : '—']
    ]

    doc.autoTable({
      startY: currentY,
      margin: { left: 40, right: 40 },
      head: [['Prize Rank', 'Lot Detail']],
      body: mainsRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 229, 255], textColor: [0, 0, 0], fontSize: 10 },
      styles: { fontSize: 9 }
    })

    const watermark = await loadLogoWithOpacity(logoUrl, 0.05)
    addWatermarkToAllPages(doc, watermark, 0.5)

    doc.save(`winners_${event.event_name.toLowerCase().replace(/\s+/g, '_')}.pdf`)
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return <p className="muted" style={{ padding: '24px' }}>Loading coordinator portal…</p>
  }

  if (!event) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <h3>Staff Incharge Portal</h3>
        <p className="muted">Hello, {profile?.name || 'Incharge'}.</p>
        <div className="error" style={{ display: 'inline-block', marginTop: 15, padding: '10px 20px' }}>
          You have not been assigned to supervise any event yet. Please contact the administrator.
        </div>
      </div>
    )
  }

  const prelimsVenue = event ? (venues.find((v) => v.id === event.prelims_venue)?.venue_name || 'N/A') : 'N/A'
  const mainsVenue = event ? (venues.find((v) => v.id === event.mains_venue)?.venue_name || 'N/A') : 'N/A'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header (No inner tab bar, switches via bottom nav / sidebar URL mapping) */}
      <div className="crud-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div>
          <h2>Staff Portal</h2>
          <p className="muted">
            Assigned Arena: <strong style={{ color: 'var(--accent)' }}>{event.event_name}</strong>
          </p>
        </div>
      </div>

      {/* Tab Panels */}
      
      {/* ── TAB 1: ALLOCATED LOTS ── */}
      {tab === 'lots' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="incharge-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>Lots Allocated for {event.event_name}</h3>
            {allowedLots.length > 0 && (
              <div className="incharge-export-btn-group" style={{ display: 'flex', gap: '10px' }}>
                <button className="btn" onClick={handleExportLotsExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <FileSpreadsheet size={14} />
                  Excel
                </button>
                <button className="btn btn-primary" onClick={handleExportLotsPdf} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <Download size={14} />
                  PDF
                </button>
              </div>
            )}
          </div>
          
          {allowedLots.length === 0 ? (
            <p className="muted" style={{ fontStyle: 'italic', padding: '16px' }}>No colleges registered for this event yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {allowedLots.map((l) => {
                const count = getLotParticipantCount(l.assigned_college)
                return (
                  <div
                    key={l.id}
                    className="card"
                    style={{
                      padding: '20px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(0, 229, 255, 0.08)',
                      border: '1px solid rgba(0, 229, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                      fontWeight: 'bold',
                      fontSize: '1.1rem'
                    }}>
                      {l.lot_name.replace('Lot', '')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                        Lot {l.lot_name}
                      </strong>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>
                        Candidates: <strong style={{ color: 'var(--accent)' }}>{count}</strong>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: STUDENTS GRID ── */}
      {tab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="incharge-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>Event Candidates ({filteredStudents.length})</h3>
            <div className="incharge-actions-container" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="incharge-search-wrapper" style={{ position: 'relative', width: '200px' }}>
                <input
                  className="input"
                  placeholder="Search students…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>
              {filteredStudents.length > 0 && (
                <div className="incharge-export-btn-group" style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn" onClick={handleExportStudentsExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <FileSpreadsheet size={14} />
                    Excel
                  </button>
                  <button className="btn btn-primary" onClick={handleExportStudentsPdf} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <Download size={14} />
                    PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <p className="muted" style={{ fontStyle: 'italic', padding: '16px' }}>No candidates found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {filteredStudents.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className="card"
                  style={{
                    padding: '16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>{s.student_name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>
                    Lot {getCollegeLot(s.college_id)}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>Roll: {s.roll_no || '—'}</span>
                    <span className={`badge badge-${s.food_type === 'Non-Veg' ? 'pending' : 'approved'}`} style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                      {s.food_type || 'Veg'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Student Profile Detail Modal Popup */}
          {selectedStudent && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}>
              <div
                className="card"
                style={{
                  width: '100%',
                  maxWidth: '460px',
                  padding: '24px',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '20px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <button
                  onClick={() => setSelectedStudent(null)}
                  style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>

                <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', color: 'var(--accent)' }}>Candidate Profile</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Full Name</span>
                    <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selectedStudent.student_name}</strong>
                  </div>

                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Assigned Lot</span>
                    <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--accent)' }}>Lot {getCollegeLot(selectedStudent.college_id)}</strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <div>
                      <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Roll Number</span>
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>{selectedStudent.roll_no || '—'}</strong>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Gender</span>
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>{selectedStudent.gender || '—'}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <div>
                      <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Department</span>
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>{selectedStudent.department || '—'}</strong>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Year</span>
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>{selectedStudent.year || '—'}</strong>
                    </div>
                  </div>

                  <div>
                    <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Food Preference</span>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                      <span className={`badge badge-${selectedStudent.food_type === 'Non-Veg' ? 'pending' : 'approved'}`} style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '2px 8px', marginTop: '4px', display: 'inline-block' }}>
                        {selectedStudent.food_type || 'Veg'}
                      </span>
                    </strong>
                  </div>
                </div>

                <button className="btn" onClick={() => setSelectedStudent(null)} style={{ alignSelf: 'flex-end', marginTop: '8px' }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: ASSIGN WINNERS ── */}
      {tab === 'winners' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="incharge-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>Results for {event.event_name}</h3>
            <button className="btn btn-primary" onClick={handleExportWinnersPdf} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Download size={14} />
              Export Winners PDF
            </button>
          </div>

          {/* Sub-tab navigation: Only display if event has prelims round configured */}
          {hasPrelims ? (
            <>
              <div style={{ display: 'flex', background: 'var(--surface-raised)', padding: '4px', borderRadius: '10px', width: 'fit-content', gap: '4px' }}>
                <button
                  onClick={() => setActiveSubTab('prelims')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: activeSubTab === 'prelims' ? 'var(--accent)' : 'none',
                    color: activeSubTab === 'prelims' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ⚡ Prelims Winners
                </button>
                <button
                  onClick={() => setActiveSubTab('mains')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: activeSubTab === 'mains' ? 'var(--accent)' : 'none',
                    color: activeSubTab === 'mains' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🏆 Final Winners (Mains)
                </button>
              </div>

              {activeSubTab === 'prelims' ? (
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>Qualify Prelims Winners</h3>
                  <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
                    Check the lots that qualified in preliminary rounds for the final event.
                  </p>

                  {allowedLots.length === 0 ? (
                    <p className="muted" style={{ fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>No lots registered yet.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                      {allowedLots.map((l) => {
                        const isChecked = localPrelims.includes(l.lot_name)
                        return (
                          <div
                            key={l.id}
                            onClick={() => handleCheckboxToggle(l.lot_name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '14px',
                              border: isChecked ? '1px solid var(--accent)' : '1px solid var(--border)',
                              borderRadius: '12px',
                              background: isChecked ? 'rgba(0, 229, 255, 0.03)' : 'var(--surface)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              style={{ pointerEvents: 'none', width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ fontSize: '0.95rem' }}>Lot {l.lot_name}</strong>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <button
                    onClick={handleSavePrelims}
                    className="btn btn-primary"
                    disabled={savingPrelims}
                    style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ShieldCheck size={18} />
                    {savingPrelims ? 'Saving...' : 'Save Prelims Winners'}
                  </button>
                </div>
              ) : (
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>Assign Final Mains Winners</h3>
                  <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
                    Select the final 1st and 2nd place winner lots for the event.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                    <label className="field">
                      <span>🥇 First Place (Lot Name)</span>
                      <select
                        value={mainsWinners.first_place}
                        onChange={(e) => handleMainsChange('first_place', e.target.value)}
                        style={{ width: '100%', marginTop: '6px' }}
                      >
                        <option value="-">Select...</option>
                        {allowedLots.map((l) => (
                          <option key={l.id} value={l.lot_name}>
                            Lot {l.lot_name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>🥈 Second Place (Lot Name)</span>
                      <select
                        value={mainsWinners.second_place}
                        onChange={(e) => handleMainsChange('second_place', e.target.value)}
                        style={{ width: '100%', marginTop: '6px' }}
                      >
                        <option value="-">Select...</option>
                        {allowedLots.map((l) => (
                          <option key={l.id} value={l.lot_name}>
                            Lot {l.lot_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button
                    onClick={handleSaveMainsWinners}
                    className="btn btn-primary"
                    disabled={savingMains}
                    style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ShieldCheck size={18} />
                    {savingMains ? 'Saving...' : 'Save Final Winners'}
                  </button>
                </div>
              )}
            </>
          ) : (
            // No prelims exists: bypass subtabs and display Final Winners directly
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>Assign Winners</h3>
              <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
                Select the final 1st and 2nd place winner lots for {event.event_name}.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <label className="field">
                  <span>🥇 First Place (Lot Name)</span>
                  <select
                    value={mainsWinners.first_place}
                    onChange={(e) => handleMainsChange('first_place', e.target.value)}
                    style={{ width: '100%', marginTop: '6px' }}
                  >
                    <option value="-">Select...</option>
                    {allowedLots.map((l) => (
                      <option key={l.id} value={l.lot_name}>
                        Lot {l.lot_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>🥈 Second Place (Lot Name)</span>
                  <select
                    value={mainsWinners.second_place}
                    onChange={(e) => handleMainsChange('second_place', e.target.value)}
                    style={{ width: '100%', marginTop: '6px' }}
                  >
                    <option value="-">Select...</option>
                    {allowedLots.map((l) => (
                      <option key={l.id} value={l.lot_name}>
                        Lot {l.lot_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                onClick={handleSaveMainsWinners}
                className="btn btn-primary"
                disabled={savingMains}
                style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ShieldCheck size={18} />
                {savingMains ? 'Saving...' : 'Save Winners'}
              </button>
            </div>
          )}

        </div>
      )}

      {/* ── TAB 4: PROFILE & EVENT DETAILS MODAL ── */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          
          {/* User profile card */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--surface-raised)', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', color: 'var(--accent)' }}>Staff Account</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), #7c4dff)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {incharge.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>{incharge.name}</strong>
                <span className="muted" style={{ fontSize: '0.85rem' }}>{incharge.email || 'No email configured'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Supervising Role</span>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Event coordinator</strong>
              </div>
              <div>
                <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Assigned Event</span>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{event.event_name}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              {/* Event Rules Popup Trigger Button */}
              <button
                onClick={() => setShowEventModal(true)}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Info size={16} />
                📖 Event Rules & Details
              </button>

              <button
                onClick={handleSignOut}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.03)'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.03)'}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>

          {/* Event Details Popup Modal */}
          {showEventModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}>
              <div
                className="card"
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  padding: '24px',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '20px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  maxHeight: '85vh',
                  overflowY: 'auto'
                }}
              >
                <button
                  onClick={() => setShowEventModal(false)}
                  style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>

                <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', color: 'var(--accent)' }}>
                  {event.event_name} Details
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>Prelims Venue</span>
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>
                      {event.prelims_venue ? prelimsVenue : 'No prelims'}
                    </strong>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>Mains Venue</span>
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>{mainsVenue}</strong>
                  </div>
                </div>

                <div>
                  <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Description</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    {event.description || 'No description provided.'}
                  </p>
                </div>

                {event.rules && (
                  <div>
                    <span className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Rules & Guidelines</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                      {event.rules}
                    </p>
                  </div>
                )}

                <button className="btn" onClick={() => setShowEventModal(false)} style={{ alignSelf: 'flex-end', marginTop: '8px' }}>
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}

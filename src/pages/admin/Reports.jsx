import { useState, useEffect, useMemo, useRef } from 'react'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { exportToExcel } from '../../utils/excelExport'
import { supabase } from '../../supabase/client'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const REPORT_TYPES = [
  { key: 'students', label: 'Students' },
  { key: 'lots', label: 'Lots' },
  { key: 'teams', label: 'Teams' },
  { key: TABLES.COLLEGES, label: 'Colleges' },
  { key: TABLES.STUDENT_LEADERS, label: 'Student Leaders' },
  { key: TABLES.PAYMENTS, label: 'Payments' },
  { key: TABLES.CERTIFICATES, label: 'Certificates' },
]

export default function Reports() {
  const [active, setActive] = useState(REPORT_TYPES[0].key)
  const [search, setSearch] = useState('')

  // 2nd Filter Mode state: 'all' | 'individual' | 'many'
  const [eventMode, setEventMode] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedEvents, setSelectedEvents] = useState(new Set())
  const [isManyDropdownOpen, setIsManyDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch all necessary tables reactively
  const { data: events, loading: eventsLoading } = useTable(TABLES.EVENTS)
  const { data: students, loading: studentsLoading } = useTable(TABLES.STUDENTS)
  const { data: colleges, loading: collegesLoading } = useTable(TABLES.COLLEGES)
  const { data: lots, loading: lotsLoading } = useTable(TABLES.LOTS)
  const { data: registrations, loading: regsLoading } = useTable(TABLES.REGISTRATIONS)
  const { data: studentLeaders, loading: leadersLoading } = useTable(TABLES.STUDENT_LEADERS)
  const { data: payments, loading: paymentsLoading } = useTable(TABLES.PAYMENTS)
  const { data: certificates, loading: certsLoading } = useTable(TABLES.CERTIFICATES)

  const loading =
    eventsLoading ||
    studentsLoading ||
    collegesLoading ||
    lotsLoading ||
    regsLoading ||
    leadersLoading ||
    paymentsLoading ||
    certsLoading

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Close multi-select dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsManyDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset filter selections and page on report type change
  useEffect(() => {
    setCurrentPage(1)
    setSearch('')
  }, [active])

  // Select default individual event once events load
  useEffect(() => {
    if (events.length && !selectedEvent) {
      setSelectedEvent(events[0].id)
    }
  }, [events, selectedEvent])

  // Determine active event IDs based on 2nd filter mode
  const activeEventIds = useMemo(() => {
    if (eventMode === 'all') {
      return new Set(events.map((e) => e.id))
    }
    if (eventMode === 'individual') {
      return selectedEvent ? new Set([selectedEvent]) : new Set()
    }
    if (eventMode === 'many') {
      return selectedEvents
    }
    return new Set()
  }, [eventMode, events, selectedEvent, selectedEvents])

  // Helper mappings
  const collegeName = (id) => {
    const c = colleges.find((col) => col.id === id)
    if (!c) return '—'
    return c.department ? `${c.college} (${c.department})` : c.college
  }
  const eventName = (id) => events.find((e) => e.id === id)?.event_name || '—'
  const leaderName = (id) => studentLeaders.find((l) => l.id === id)?.name || '—'
  const studentName = (id) => students.find((s) => s.id === id)?.student_name || '—'
  const collegeLot = (collegeId, regId) => {
    const reg = registrations.find((r) => r.id === regId)
    if (reg?.lot_id) {
      return lots.find((l) => l.id === reg.lot_id)?.lot_name || '—'
    }
    const cName = collegeName(collegeId)
    return lots.find((l) => l.assigned_college?.toLowerCase().trim() === cName.toLowerCase().trim())?.lot_name || '—'
  }

  // Build rows dynamically based on the active report type
  const reportRows = useMemo(() => {
    if (active === 'students') {
      return students
        .filter((s) => activeEventIds.has(s.event_id))
        .map((s) => ({
          'Event Name': eventName(s.event_id),
          'Student Name': s.student_name,
          'Gender': s.gender || '—',
          'Department': s.department || '—',
          'Year': s.year || '—',
          'College': collegeName(s.college_id),
          'Lot Name': collegeLot(s.college_id, s.registration_id),
        }))
    }

    if (active === 'lots') {
      // Find lots participating in the active events
      const activeRegs = registrations.filter(
        (r) => activeEventIds.has(r.event_id) && r.status !== 'rejected'
      )
      
      // Get unique lots associated with these registrations
      const activeLotsMap = new Map()
      activeRegs.forEach((r) => {
        const cName = collegeName(r.college_id)
        const lName = collegeLot(r.college_id, r.id)
        if (lName && lName !== '—') {
          const key = `${r.event_id}-${lName}`
          activeLotsMap.set(key, {
            'Event Name': eventName(r.event_id),
            'Lot Name': lName,
            'Assigned College': cName,
            'Registration Status': r.status,
          })
        }
      })
      return Array.from(activeLotsMap.values())
    }

    if (active === 'teams') {
      return registrations
        .filter((r) => activeEventIds.has(r.event_id))
        .map((r) => ({
          'Event Name': eventName(r.event_id),
          'College': collegeName(r.college_id),
          'Student Leader': leaderName(r.leader_id),
          'Lot Name': collegeLot(r.college_id, r.id),
          'Status': r.status,
          'Receipt No': r.receipt_no || '—',
        }))
    }

    if (active === TABLES.COLLEGES) {
      return colleges.map((c) => ({
        'College Name': c.college,
        'Department': c.department || '—',
        'Phone': c.phone || '—',
        'Email': c.email || '—',
        'Address': c.address || '—',
        'Status': c.status,
      }))
    }

    if (active === TABLES.STUDENT_LEADERS) {
      return studentLeaders.map((sl) => ({
        'Leader Name': sl.name,
        'Phone': sl.phone || '—',
        'Email': sl.email,
        'Department': sl.department || '—',
        'College': collegeName(sl.college_id),
        'Status': sl.status,
      }))
    }

    if (active === TABLES.PAYMENTS) {
      return payments.map((p) => {
        const reg = registrations.find((r) => r.id === p.registration_id)
        return {
          'College': collegeName(reg?.college_id),
          'Amount': `Rs. ${p.amount}`,
          'Payment Mode': p.payment_mode || '—',
          'Receipt No': p.receipt_no || '—',
          'Payment Date': p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—',
        }
      })
    }

    if (active === TABLES.CERTIFICATES) {
      return certificates.map((cert) => ({
        'Student Name': studentName(cert.student_id),
        'Event': eventName(cert.event_id),
        'Certificate Number': cert.certificate_number,
        'Position': cert.position || 'Participant',
        'Generated Date': cert.generated_date ? new Date(cert.generated_date).toLocaleDateString() : '—',
      }))
    }

    return []
  }, [active, students, registrations, colleges, lots, studentLeaders, payments, certificates, activeEventIds])

  // Apply general search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return reportRows
    const q = search.toLowerCase()
    return reportRows.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    )
  }, [reportRows, search])

  const columns = useMemo(() => {
    if (!filtered[0]) return []
    const allKeys = Object.keys(filtered[0])
    return allKeys.filter((key) => {
      // Return true if at least one row has a non-empty, non-placeholder value
      return filtered.some((row) => {
        const val = row[key]
        return val !== null && val !== undefined && val !== '' && val !== '—' && val !== '-'
      })
    })
  }, [filtered])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [filtered, totalPages, currentPage])

  const paginatedData = useMemo(() => {
    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filtered, currentPage])

  // PDF Export
  function handleDownloadPdf() {
    if (filtered.length === 0) {
      alert('No data to export.')
      return
    }

    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: columns.length > 5 ? 'landscape' : 'portrait',
    })

    const title = `${active.charAt(0).toUpperCase() + active.slice(1)} Report`
    let subtitle = ''
    if (['students', 'lots', 'teams'].includes(active)) {
      if (eventMode === 'all') subtitle = 'Filtered by: All Events'
      else if (eventMode === 'individual') {
        const ev = events.find((e) => e.id === selectedEvent)
        subtitle = `Filtered by Event: ${ev?.event_name || '—'}`
      } else {
        subtitle = `Filtered by: ${selectedEvents.size} Selected Events`
      }
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(`Strata 2K26 — ${title.toUpperCase()}`, 40, 45)

    if (subtitle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(subtitle, 40, 62)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, subtitle ? 75 : 62)

    doc.autoTable({
      startY: subtitle ? 95 : 80,
      head: [columns],
      body: filtered.map((row) => columns.map((col) => String(row[col] ?? '—'))),
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6] },
      styles: { fontSize: 8.5 },
    })

    doc.save(`strata_${active}_report.pdf`)
  }

  function handleExportExcel() {
    const dataToExport = filtered.map((row) => {
      const newRow = {}
      columns.forEach((col) => {
        newRow[col] = row[col]
      })
      return newRow
    })
    exportToExcel(dataToExport, `${active}_report`)
  }

  // Toggle selection for Multi-Event checklist
  function toggleEventSelection(id) {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const isEventFilteredReport = ['students', 'lots', 'teams'].includes(active)

  return (
    <div>
      <h2>Reports</h2>

      {/* Main Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          background: 'var(--surface, #1a1d23)',
          borderRadius: '10px',
          border: '1px solid var(--border, #2a2d35)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          {/* 1st Dropdown: Category Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Report Category
            </label>
            <select
              value={active}
              onChange={(e) => setActive(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.9rem', minWidth: '180px', borderRadius: '6px' }}
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2nd Filter: Event Filtering (Only visible for students, lots, teams) */}
          {isEventFilteredReport && (
            <>
              {/* Event Filter Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Event Filter Mode
                </label>
                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'individual', label: 'Individual' },
                    { value: 'many', label: 'Many' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setEventMode(mode.value)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        border: 'none',
                        background: eventMode === mode.value ? 'var(--accent, #f9c20a)' : 'transparent',
                        color: eventMode === mode.value ? '#0c0e12' : 'var(--text-secondary)',
                        fontWeight: eventMode === mode.value ? 'bold' : 'normal',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Selection trigger / dropdown */}
              {eventMode === 'individual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Select Event
                  </label>
                  <select
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '0.9rem', minWidth: '220px', borderRadius: '6px' }}
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.event_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {eventMode === 'many' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }} ref={dropdownRef}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Select Events
                  </label>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setIsManyDropdownOpen(!isManyDropdownOpen)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.9rem',
                      minWidth: '220px',
                      textAlign: 'left',
                      justifyContent: 'space-between',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '6px',
                    }}
                  >
                    <span>
                      {selectedEvents.size === 0
                        ? 'Select Events...'
                        : `${selectedEvents.size} event${selectedEvents.size > 1 ? 's' : ''} selected`}
                    </span>
                    <span>{isManyDropdownOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Custom Checkbox Dropdown Menu */}
                  {isManyDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        marginTop: '6px',
                        background: 'var(--surface-overlay, #1f232b)',
                        border: '1px solid var(--border, #2a2d35)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        padding: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                        <button
                          type="button"
                          className="link"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => setSelectedEvents(new Set(events.map((e) => e.id)))}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          className="link danger"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => setSelectedEvents(new Set())}
                        >
                          Clear
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {events.map((ev) => (
                          <label
                            key={ev.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              color: selectedEvents.has(ev.id) ? 'var(--accent, #f9c20a)' : 'var(--text-primary)',
                              background: selectedEvents.has(ev.id) ? 'rgba(249, 194, 10, 0.08)' : 'transparent',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedEvents.has(ev.id)}
                              onChange={() => toggleEventSelection(ev.id)}
                              style={{ accentColor: 'var(--accent, #f9c20a)' }}
                            />
                            {ev.event_name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Search Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: 'auto' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Search Records
            </label>
            <input
              className="input"
              placeholder="Search in fields…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: '200px', borderRadius: '6px' }}
            />
          </div>
        </div>

        {/* Action Buttons: Print, Export Excel, Download PDF */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <button className="btn" onClick={() => window.print()}>
            🖨️ Print View
          </button>
          <button className="btn" onClick={handleExportExcel}>
            📊 Export Excel
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPdf}>
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Main Data Display */}
      {loading ? (
        <p className="muted">Loading records...</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((c) => (
                      <td key={c}>
                        {c === 'Lot Name' && row[c] !== '—' ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'rgba(249, 194, 10, 0.12)',
                              color: 'var(--accent, #f9c20a)',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                            }}
                          >
                            {row[c]}
                          </span>
                        ) : (
                          String(row[c] ?? '')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={columns.length || 1} className="muted" style={{ textAlign: 'center', padding: '24px' }}>
                      {eventMode === 'many' && selectedEvents.size === 0
                        ? 'Please select one or more events to view reports.'
                        : 'No matching records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                First
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Prev
              </button>
              <span className="muted" style={{ fontSize: '0.85rem', margin: '0 8px' }}>
                Page <strong>{currentPage}</strong> of {totalPages} ({filtered.length} items)
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Next
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
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

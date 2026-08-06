import { useState, useMemo, useEffect } from 'react'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Download, Search, Filter, FileSpreadsheet } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { loadLogoWithOpacity, addWatermarkToAllPages } from '../../utils/pdfBackground'
import { exportToExcel } from '../../utils/excelExport'

export default function Registrations() {
  const { settings } = useSettings()
  const logoUrl = settings?.event_logo_url

  const { data: dataRegs, loading: loadingRegs } = useTable(TABLES.REGISTRATIONS)
  const registrations = useMemo(() => dataRegs || [], [dataRegs])
  const { data: colleges } = useTable(TABLES.COLLEGES) || { data: [] }
  const { data: events } = useTable(TABLES.EVENTS) || { data: [] }
  const { data: lots } = useTable(TABLES.LOTS) || { data: [] }
  const { data: studentLeaders } = useTable(TABLES.STUDENT_LEADERS) || { data: [] }
  const { data: students } = useTable(TABLES.STUDENTS) || { data: [] }

  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedCollegeId, setSelectedCollegeId] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const [selectedReg, setSelectedReg] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const itemsPerPage = 10

  const collegeName = (id) => {
    const c = (colleges || []).find((col) => col.id === id)
    if (!c) return id
    return c.department ? `${c.college} (${c.department})` : c.college
  }

  const eventName = (id) => (events || []).find((e) => e.id === id)?.event_name || id

  const leaderName = (id) => (studentLeaders || []).find((l) => l.id === id)?.name || '—'

  // Registered Colleges List for Filter Dropdown
  const registeredColleges = useMemo(() => {
    if (!colleges) return []
    const regSet = new Set(registrations.map((r) => r.college_id).filter(Boolean))
    return colleges.filter((c) => regSet.has(c.id))
  }, [colleges, registrations])

  // Filtered registrations (respects search, college filter, event filter, status filter)
  const filteredRegs = useMemo(() => {
    return registrations.filter((reg) => {
      const matchCollege = selectedCollegeId ? reg.college_id === selectedCollegeId : true
      const matchEvent = selectedEventId ? reg.event_id === selectedEventId : true
      const matchStatus = selectedStatus ? reg.status === selectedStatus : true

      const q = search.toLowerCase().trim()
      const matchSearch = !q ? true : (
        collegeName(reg.college_id).toLowerCase().includes(q) ||
        eventName(reg.event_id).toLowerCase().includes(q) ||
        (reg.status || '').toLowerCase().includes(q) ||
        leaderName(reg.leader_id).toLowerCase().includes(q)
      )

      return matchCollege && matchEvent && matchStatus && matchSearch
    })
  }, [registrations, selectedCollegeId, selectedEventId, selectedStatus, search, colleges, events, studentLeaders])

  const totalPages = Math.ceil(filteredRegs.length / itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [filteredRegs, totalPages, currentPage])

  const paginatedRegs = useMemo(() => {
    return filteredRegs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filteredRegs, currentPage])

  function openViewModal(reg) {
    setSelectedReg(reg)
    setShowDetailModal(true)
  }

  // Export PDF (Exports ONLY the filtered registrations!)
  const handleExportPdf = async () => {
    if (filteredRegs.length === 0) return alert('No registration records match the current filter.')

    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
    const imgData = logoUrl ? await loadLogoWithOpacity(logoUrl, 0.15) : null

    // Document Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('Strata 2K26 — Event Registrations Report', 40, 45)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)

    let filterLabel = 'Filter: All Registrations'
    if (selectedCollegeId) filterLabel += ` | College: ${collegeName(selectedCollegeId)}`
    if (selectedEventId) filterLabel += ` | Event: ${eventName(selectedEventId)}`
    if (selectedStatus) filterLabel += ` | Status: ${selectedStatus.toUpperCase()}`
    if (search) filterLabel += ` | Search: "${search}"`

    doc.text(filterLabel, 40, 60)
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records Exported: ${filteredRegs.length}`, 40, 72)

    const tableRows = filteredRegs.map((reg, idx) => {
      const cName = collegeName(reg.college_id)
      const collegeLot = (lots || []).find((l) => l.id === reg.lot_id || l.assigned_college === cName)
      return [
        String(idx + 1),
        cName,
        eventName(reg.event_id),
        leaderName(reg.leader_id),
        (reg.status || '').toUpperCase(),
        collegeLot ? collegeLot.lot_name : 'Not Assigned',
        `Veg: ${reg.veg_count || 0} / Non-Veg: ${reg.nonveg_count || 0}`
      ]
    })

    doc.autoTable({
      startY: 85,
      head: [['S.No.', 'College Name', 'Event Name', 'Student Leader', 'Status', 'Lot Name', 'Food Preferences']],
      body: tableRows,
      margin: { left: 40, right: 40 },
      theme: 'grid',
      headStyles: { fillColor: [0, 229, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 5 }
    })

    if (imgData) {
      addWatermarkToAllPages(doc, imgData)
    }

    doc.save(`Strata_Registrations_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // Export Excel (Exports ONLY filtered registrations)
  const handleExportExcel = () => {
    if (filteredRegs.length === 0) return alert('No registration records match the current filter.')

    const excelData = filteredRegs.map((reg) => {
      const cName = collegeName(reg.college_id)
      const collegeLot = (lots || []).find((l) => l.id === reg.lot_id || l.assigned_college === cName)
      return {
        'College Name': cName,
        'Event Name': eventName(reg.event_id),
        'Student Leader': leaderName(reg.leader_id),
        'Status': reg.status,
        'Assigned Lot': collegeLot ? collegeLot.lot_name : 'Not Assigned',
        'Veg Count': reg.veg_count || 0,
        'Non-Veg Count': reg.nonveg_count || 0,
        'Registration Date': reg.created_at ? new Date(reg.created_at).toLocaleString() : '—'
      }
    })

    exportToExcel(excelData, `registrations_${new Date().toISOString().slice(0, 10)}`)
  }

  const loading = loadingRegs

  if (loading) return <p className="muted">Loading registrations…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Registrations Overview</h2>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Read-only overview of all event registrations submitted by student leaders.
          </p>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExportPdf}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Download size={15} /> Export PDF ({filteredRegs.length})
          </button>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>
          <Filter size={16} /> Filters:
        </div>

        {/* College Filter */}
        <select
          className="input"
          value={selectedCollegeId}
          onChange={(e) => {
            setSelectedCollegeId(e.target.value)
            setCurrentPage(1)
          }}
          style={{ padding: '8px 12px', fontSize: '0.85rem', minWidth: '180px' }}
        >
          <option value="">All Colleges</option>
          {(registeredColleges || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.department ? `${c.college} (${c.department})` : c.college}
            </option>
          ))}
        </select>

        {/* Event Filter */}
        <select
          className="input"
          value={selectedEventId}
          onChange={(e) => {
            setSelectedEventId(e.target.value)
            setCurrentPage(1)
          }}
          style={{ padding: '8px 12px', fontSize: '0.85rem', minWidth: '160px' }}
        >
          <option value="">All Events</option>
          {(events || []).map((e) => (
            <option key={e.id} value={e.id}>{e.event_name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          className="input"
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value)
            setCurrentPage(1)
          }}
          style={{ padding: '8px 12px', fontSize: '0.85rem', minWidth: '140px' }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="lot_assigned">Lot Assigned</option>
          <option value="paid">Paid</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Search Input */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search college, leader, event..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
          />
        </div>

        {/* Reset Filters button */}
        {(selectedCollegeId || selectedEventId || selectedStatus || search) && (
          <button
            className="btn btn-sm"
            onClick={() => {
              setSelectedCollegeId('')
              setSelectedEventId('')
              setSelectedStatus('')
              setSearch('')
              setCurrentPage(1)
            }}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Event</th>
              <th>Status</th>
              <th>Assigned Lot</th>
              <th style={{ width: '100px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRegs.map((reg) => {
              const cName = collegeName(reg.college_id)
              const collegeLot = (lots || []).find((l) => l.id === reg.lot_id || l.assigned_college === cName)
              return (
                <tr key={reg.id}>
                  <td><strong style={{ color: 'var(--text-primary)' }}>{cName}</strong></td>
                  <td>{eventName(reg.event_id)}</td>
                  <td><span className={`badge badge-${reg.status}`}>{reg.status}</span></td>
                  <td>
                    {collegeLot ? (
                      <strong>{collegeLot.lot_name}</strong>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.85rem' }}>No lot assigned</span>
                    )}
                  </td>
                  <td>
                    <button className="link" onClick={() => openViewModal(reg)}>
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
            {paginatedRegs.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '30px' }}>
                  No registrations match the selected filter parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
            Page <strong>{currentPage}</strong> of {totalPages} ({filteredRegs.length} items)
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

      {/* Registration Details Pop-up Modal */}
      {showDetailModal && selectedReg && (
        <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', width: '100%' }}>
            <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid var(--border)', paddingBottom: '12px', color: 'var(--text-primary)' }}>
              Registration Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">College:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{collegeName(selectedReg.college_id)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Event Name:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{eventName(selectedReg.event_id)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Status:</span>
                <span className={`badge badge-${selectedReg.status}`}>{selectedReg.status}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Assigned Lot:</span>
                <strong>
                  {(lots || []).find((l) => l.id === selectedReg.lot_id || l.assigned_college === collegeName(selectedReg.college_id))?.lot_name || 'Not Assigned'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Student Leader:</span>
                <strong>{leaderName(selectedReg.leader_id)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Food Preference Count:</span>
                <span>🥗 Veg: <strong>{selectedReg.veg_count || 0}</strong> · 🍗 Non-Veg: <strong>{selectedReg.nonveg_count || 0}</strong></span>
              </div>

              {selectedReg.created_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <span className="muted">Registration Date:</span>
                  <span>{new Date(selectedReg.created_at).toLocaleString()}</span>
                </div>
              )}

              {/* Registered Participants list for this event/college */}
              <div style={{ marginTop: '10px' }}>
                {(() => {
                  const regStudents = (students || []).filter(
                    (s) =>
                      s.registration_id === selectedReg.id ||
                      (s.college_id === selectedReg.college_id &&
                        (s.event_id === selectedReg.event_id || (Array.isArray(s.event_ids) && s.event_ids.includes(selectedReg.event_id))))
                  )
                  return (
                    <>
                      <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>
                        Registered Team Members ({regStudents.length}):
                      </strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {regStudents.map((s) => (
                          <div key={s.id} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>• <strong>{s.student_name}</strong> {s.roll_no ? `(${s.roll_no})` : ''}</span>
                            <span className="muted">{s.department || '-'}</span>
                          </div>
                        ))}
                        {regStudents.length === 0 && (
                          <span className="muted" style={{ fontSize: '0.85rem' }}>No individual student participant records linked.</span>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-primary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

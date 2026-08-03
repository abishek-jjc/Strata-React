import { useState, useMemo, useEffect } from 'react'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'

export default function Registrations() {
  const { data: dataRegs, loading: loadingRegs } = useTable(TABLES.REGISTRATIONS)
  const registrations = useMemo(() => dataRegs || [], [dataRegs])
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: lots } = useTable(TABLES.LOTS)
  const { data: studentLeaders } = useTable(TABLES.STUDENT_LEADERS)
  const { data: students } = useTable(TABLES.STUDENTS)

  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedReg, setSelectedReg] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const itemsPerPage = 10

  const collegeName = (id) => {
    const c = colleges.find((col) => col.id === id)
    if (!c) return id
    return c.department ? `${c.college} (${c.department})` : c.college
  }

  const eventName = (id) => events.find((e) => e.id === id)?.event_name || id

  const leaderName = (id) => studentLeaders.find((l) => l.id === id)?.name || '—'

  // Filtered registrations
  const filteredRegs = useMemo(() => {
    if (!search.trim()) return registrations
    const q = search.toLowerCase()
    return registrations.filter((reg) => {
      const cName = collegeName(reg.college_id).toLowerCase()
      const eName = eventName(reg.event_id).toLowerCase()
      const status = (reg.status || '').toLowerCase()
      return cName.includes(q) || eName.includes(q) || status.includes(q)
    })
  }, [registrations, search, colleges, events])

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

  const loading = loadingRegs

  if (loading) return <p className="muted">Loading registrations…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Registrations Overview</h2>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Read-only overview of all event registrations submitted by student leaders.
          </p>
        </div>

        <input
          type="text"
          className="input"
          placeholder="Search college, event, or status..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setCurrentPage(1)
          }}
          style={{ width: '280px', maxWidth: '100%' }}
        />
      </div>

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
              const collegeLot = lots.find((l) => l.assigned_college === cName)
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
                  No registrations found.
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
                  {lots.find((l) => l.id === selectedReg.lot_id || l.assigned_college === collegeName(selectedReg.college_id))?.lot_name || 'Not Assigned'}
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
                <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Registered Team Members ({students.filter((s) => s.registration_id === selectedReg.id || (s.college_id === selectedReg.college_id && s.event_id === selectedReg.event_id)).length}):
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {students
                    .filter((s) => s.registration_id === selectedReg.id || (s.college_id === selectedReg.college_id && s.event_id === selectedReg.event_id))
                    .map((s) => (
                      <div key={s.id} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>• <strong>{s.student_name}</strong> {s.roll_no ? `(${s.roll_no})` : ''}</span>
                        <span className="muted">{s.department || '-'}</span>
                      </div>
                    ))}
                  {students.filter((s) => s.registration_id === selectedReg.id || (s.college_id === selectedReg.college_id && s.event_id === selectedReg.event_id)).length === 0 && (
                    <span className="muted" style={{ fontSize: '0.85rem' }}>No individual student participant records linked.</span>
                  )}
                </div>
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

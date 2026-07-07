import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'

export default function Registrations() {
  const { data: dataRegs, loading } = useTable(TABLES.REGISTRATIONS)
  const registrations = useMemo(() => dataRegs || [], [dataRegs])
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: lots } = useTable(TABLES.LOTS)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const totalPages = Math.ceil(registrations.length / itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [registrations, totalPages, currentPage])

  const paginatedRegs = useMemo(() => {
    return registrations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [registrations, currentPage])

  // Edit / Delete and custom alert states
  const [editingReg, setEditingReg] = useState(null)
  const [editStatus, setEditStatus] = useState('')
  const [editLotId, setEditLotId] = useState('')
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
  })

  const collegeName = (id) => colleges.find((c) => c.id === id)?.college || id
  const eventName = (id) => events.find((e) => e.id === id)?.event_name || id

  const showAlert = (title, message, type = 'info', onConfirm = null) => {
    setAlertState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
    })
  }

  async function assignLot(reg) {
    const cName = collegeName(reg.college_id)
    
    // Check if college already has a lot assigned
    let lot = lots.find((l) => l.assigned_college.toLowerCase().trim() === cName.toLowerCase().trim())
    
    if (!lot) {
      // Find the first unallocated lot
      lot = lots.find((l) => !l.is_assigned)
      if (!lot) {
        showAlert('No Unallocated Lots', 'All lots are currently assigned.', 'info')
        return
      }
      
      // Assign lot to this college
      const { error: lotErr } = await supabase
        .from(TABLES.LOTS)
        .update({ is_assigned: true, assigned_college: cName })
        .eq('id', lot.id)

      if (lotErr) {
        showAlert('Error', 'Failed to allocate lot: ' + lotErr.message, 'info')
        return
      }
    }

    // Update status to lot_assigned
    const { error: regErr } = await supabase
      .from(TABLES.REGISTRATIONS)
      .update({ status: REGISTRATION_STATUS.LOT_ASSIGNED })
      .eq('id', reg.id)

    if (regErr) {
      showAlert('Error', 'Failed to update registration status: ' + regErr.message, 'info')
    }
  }

  async function approve(reg) {
    await supabase
      .from(TABLES.REGISTRATIONS)
      .update({ status: REGISTRATION_STATUS.APPROVED })
      .eq('id', reg.id)
  }

  async function reject(reg) {
    showAlert(
      'Confirm Rejection',
      `Are you sure you want to reject the registration for "${collegeName(reg.college_id)}"?`,
      'danger',
      async () => {
        await supabase
          .from(TABLES.REGISTRATIONS)
          .update({ status: REGISTRATION_STATUS.REJECTED })
          .eq('id', reg.id)
      }
    )
  }

  function openEdit(reg) {
    setEditingReg(reg)
    setEditStatus(reg.status)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    const { error } = await supabase
      .from(TABLES.REGISTRATIONS)
      .update({ status: editStatus })
      .eq('id', editingReg.id)

    if (error) {
      showAlert('Update Failed', 'Error updating registration: ' + error.message, 'info')
    } else {
      setEditingReg(null)
    }
  }

  async function deleteRegistration(reg) {
    showAlert(
      'Confirm Delete Registration',
      `Are you sure you want to delete the registration for "${collegeName(reg.college_id)}" - "${eventName(reg.event_id)}"? This will also delete all associated participant records.`,
      'danger',
      async () => {
        const { error } = await supabase.from(TABLES.REGISTRATIONS).delete().eq('id', reg.id)
        if (error) {
          showAlert('Delete Failed', 'Failed to delete registration: ' + error.message, 'info')
        }
      }
    )
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div>
      <h2>Registrations</h2>
      <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Event</th>
              <th>Status</th>
              <th>Lot</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRegs.map((reg) => {
              const cName = collegeName(reg.college_id)
              const collegeLot = lots.find((l) => l.assigned_college === cName)
              return (
                <tr key={reg.id}>
                  <td>{cName}</td>
                  <td>{eventName(reg.event_id)}</td>
                  <td><span className={`badge badge-${reg.status}`}>{reg.status}</span></td>
                  <td>
                    {collegeLot ? (
                      <strong>{collegeLot.lot_name}</strong>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.85rem' }}>No lot assigned</span>
                    )}
                  </td>
                  <td className="row-actions">
                    {reg.status === REGISTRATION_STATUS.PENDING && (
                      <button className="link" onClick={() => assignLot(reg)}>Assign lot</button>
                    )}
                    {reg.status === REGISTRATION_STATUS.PAID && (
                      <button className="link" onClick={() => approve(reg)}>Approve</button>
                    )}
                    <button className="link" onClick={() => openEdit(reg)}>Edit</button>
                    <button className="link danger" onClick={() => deleteRegistration(reg)}>Delete</button>
                  </td>
                </tr>
              )
            })}
            {paginatedRegs.length === 0 && (
              <tr><td colSpan={5} className="muted">No registrations yet.</td></tr>
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
            Page <strong>{currentPage}</strong> of {totalPages} ({registrations.length} items)
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

      {/* Edit Registration Modal Form */}
      {editingReg && (
        <div className="modal-backdrop" onClick={() => setEditingReg(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveEdit}>
            <h3>Edit Registration</h3>
            
            <label className="field">
              <span>Status</span>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="lot_assigned">Lot Assigned</option>
                <option value="paid">Paid</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setEditingReg(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Alert/Confirmation Modal */}
      {alertState.isOpen && (
        <div className="modal-backdrop" onClick={() => setAlertState({ ...alertState, isOpen: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', color: alertState.type === 'danger' ? 'var(--danger)' : 'var(--text-primary)' }}>
              {alertState.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: '15px 0' }}>
              {alertState.message}
            </p>
            <div className="modal-actions">
              {alertState.onConfirm ? (
                <>
                  <button type="button" className="btn" onClick={() => setAlertState({ ...alertState, isOpen: false })}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ backgroundColor: alertState.type === 'danger' ? 'var(--danger)' : 'var(--accent)', borderColor: alertState.type === 'danger' ? 'var(--danger)' : 'var(--accent)', color: alertState.type === 'danger' ? '#fff' : '#0c0e12' }}
                    onClick={() => {
                      alertState.onConfirm()
                      setAlertState({ ...alertState, isOpen: false })
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setAlertState({ ...alertState, isOpen: false })}>
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



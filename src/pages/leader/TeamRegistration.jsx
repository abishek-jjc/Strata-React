import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { hasDuplicateNamesWithinTeam } from '../../utils/validators'
import { useSettings } from '../../context/SettingsContext'

const emptyParticipant = () => ({ 
  studentName: '', 
  rollNo: '', 
  food: '-', 
  gender: 'Male', 
  department: '-', 
  year: 'I Year' 
})

export default function TeamRegistration() {
  const { profile } = useAuth()

  const { data: events, loading: eventsLoading } = useTable(TABLES.EVENTS, [['status', 'eq', 'active']])
  const { data: registrations, loading: regsLoading } = useTable(TABLES.REGISTRATIONS, [['leader_id', 'eq', profile?.ref_id]])
  const { data: allStudents, loading: studentsLoading } = useTable(TABLES.STUDENTS, [['leader_id', 'eq', profile?.ref_id]])

  const [activeEventId, setActiveEventId] = useState('')

  // Registration form state
  const [regParticipants, setRegParticipants] = useState([])
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit participant modal state
  const [editingStudent, setEditingStudent] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const { settings } = useSettings()
  const isEventStarted = settings.event_started === 'true'
  const whatsappLink = settings.whatsapp_group_link || ''

  const loading = eventsLoading || regsLoading || studentsLoading

  // Set first event as default active once loaded
  useEffect(() => {
    if (!activeEventId && events.length > 0) {
      setActiveEventId(events[0].id)
    }
  }, [events])

  // ---- Derived data ----
  const registeredEventIds = registrations.map(r => r.event_id)

  const activeEvent = events.find(e => e.id === activeEventId)
  const activeRegistration = registrations.find(r => r.event_id === activeEventId)
  const isRegistered = !!activeRegistration

  // Students for the active event
  const eventStudents = useMemo(() => {
    return [...allStudents]
      .filter(s => s.event_id === activeEventId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [allStudents, activeEventId])

  // Team size for form
  const teamSize = activeEvent?.team_size || 0

  // Reset form when active event changes
  useEffect(() => {
    setRegError('')
    setRegSuccess('')
    if (!teamSize || isRegistered) {
      setRegParticipants([])
      return
    }
    setRegParticipants(Array.from({ length: teamSize }, emptyParticipant))
  }, [activeEventId, teamSize, isRegistered])

  // Helper to check for schedule conflict across active registrations
  function checkScheduleConflict(rollNo, targetEventId, excludeStudentId = null) {
    const pRollNoNormalized = rollNo.trim().toLowerCase()
    
    // Find all existing matching registered students for this leader's college
    const existingMatches = allStudents.filter(s => 
      s.id !== excludeStudentId && 
      s.roll_no?.trim().toLowerCase() === pRollNoNormalized
    )

    if (existingMatches.length === 0) return null

    const targetEvent = events.find(e => e.id === targetEventId)
    if (!targetEvent) return null

    for (const match of existingMatches) {
      const otherEvent = events.find(e => e.id === match.event_id)
      if (otherEvent) {
        // Compare prelims and mains times
        const conflictPrelims = targetEvent.preliminary && otherEvent.preliminary && targetEvent.preliminary === otherEvent.preliminary
        const conflictMains = targetEvent.mains && otherEvent.mains && targetEvent.mains === otherEvent.mains
        
        if (conflictPrelims || conflictMains) {
          return otherEvent.event_name
        }
      }
    }

    return null
  }

  function updateParticipant(index, field, value) {
    const next = [...regParticipants]
    next[index] = { ...next[index], [field]: value }
    setRegParticipants(next)
  }

  // ---- Register team ----
  async function handleSubmit(e) {
    e.preventDefault()
    setRegError('')
    setRegSuccess('')

    if (isEventStarted) {
      return setRegError('Registrations are locked because the event has started.')
    }

    if (!activeEventId) return setRegError('Select an event.')
    if (!profile?.ref_id || !profile?.college_id) {
      return setRegError('Your leader profile is missing a college assignment — contact the admin.')
    }

    const names = regParticipants.map(p => p.studentName.trim())
    if (names.some(n => !n)) return setRegError('Every participant needs a name.')
    if (names.some(n => n.length < 3)) return setRegError('Every participant name must contain at least 3 characters.')
    if (regParticipants.some(p => !p.rollNo?.trim())) return setRegError('Every participant needs a roll number.')
    if (regParticipants.length !== teamSize) return setRegError(`This event requires exactly ${teamSize} participant(s).`)
    if (hasDuplicateNamesWithinTeam(names)) return setRegError('Two participants in this team have the same name.')
    
    // 1. Verify roll number uniqueness within this submission
    const rollNos = regParticipants.map(p => p.rollNo.trim().toLowerCase())
    if (rollNos.some((r, idx) => rollNos.indexOf(r) !== idx)) {
      return setRegError('Two participants in this team have the same roll number.')
    }

    // 2. Verify roll number uniqueness & schedule conflicts against existing college students
    for (const p of regParticipants) {
      // Check if roll number is already registered in the exact same event
      const alreadyInEvent = allStudents.some(s => 
        s.event_id === activeEventId && 
        s.roll_no?.trim().toLowerCase() === p.rollNo.trim().toLowerCase()
      )
      if (alreadyInEvent) {
        return setRegError(`Participant with roll number "${p.rollNo}" is already registered in this event.`)
      }

      // Check schedule conflict
      const conflictingEventName = checkScheduleConflict(p.rollNo, activeEventId)
      if (conflictingEventName) {
        return setRegError(`Schedule conflict! Roll number "${p.rollNo}" is registered in "${conflictingEventName}" at the same time.`)
      }
    }

    setSubmitting(true)
    try {
      const { data: regId, error: rpcError } = await supabase.rpc('register_team', {
        p_college_id: profile.college_id,
        p_leader_id: profile.ref_id,
        p_event_id: activeEventId,
        p_participants: regParticipants.map(p => ({
          studentName: p.studentName.trim(),
          rollNo: p.rollNo.trim(),
          gender: p.gender || 'Male',
          department: p.department || '-',
          year: p.year || 'I Year',
          food: p.food || '-',
          foodType: p.food || '-'
        })),
      })
      if (rpcError) throw rpcError

      const vegCount = regParticipants.filter(p => p.food === 'Veg').length
      const nonVegCount = regParticipants.filter(p => p.food === 'Non-Veg').length
      const { error: countError } = await supabase.rpc('update_registration_food_count', {
        p_registration_id: regId,
        p_veg_count: vegCount,
        p_nonveg_count: nonVegCount,
      })
      if (countError) throw countError

      setRegSuccess('Team registered successfully! Waiting for admin review.')
      setRegParticipants([])
    } catch (err) {
      setRegError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Edit participant ----
  function openEdit(student) {
    setEditingStudent({ ...student })
    setEditError('')
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setEditError('')

    if (isEventStarted) {
      return setEditError('Participant updates are locked because the event has started.')
    }

    if (!editingStudent.student_name || editingStudent.student_name.trim().length < 3) {
      return setEditError('Student name must be at least 3 characters.')
    }
    if (!editingStudent.roll_no || !editingStudent.roll_no.trim()) {
      return setEditError('Roll number is required.')
    }

    // 1. Verify roll number uniqueness within the active event students list
    const otherInEvent = allStudents.some(s => 
      s.id !== editingStudent.id && 
      s.event_id === activeEventId && 
      s.roll_no?.trim().toLowerCase() === editingStudent.roll_no.trim().toLowerCase()
    )
    if (otherInEvent) {
      return setEditError('Another student in this team has the same roll number.')
    }

    // 2. Verify schedule conflict for the new/updated roll number
    const conflictingEventName = checkScheduleConflict(editingStudent.roll_no, activeEventId, editingStudent.id)
    if (conflictingEventName) {
      return setEditError(`Schedule conflict! Roll number "${editingStudent.roll_no}" is registered in "${conflictingEventName}" at the same time.`)
    }

    setEditSaving(true)
    const { error: updateError } = await supabase
      .from(TABLES.STUDENTS)
      .update({
        student_name: editingStudent.student_name.trim(),
        roll_no: editingStudent.roll_no.trim(),
        food_type: editingStudent.food_type || 'Veg',
      })
      .eq('id', editingStudent.id)
    setEditSaving(false)

    if (updateError) {
      setEditError(updateError.message)
    } else {
      setEditingStudent(null)
    }
  }

  if (loading) return <p className="muted">Loading registrations...</p>

  const selectStyle = {
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    width: '100%',
    padding: '8px 10px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ marginBottom: '4px' }}>Registration & Teams</h2>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Select an event below to register or manage your team participants.
        </p>
      </div>

      {/* ── Event Selection Dropdown ── */}
      <div style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
        <select
          id="event-select"
          value={activeEventId}
          onChange={(e) => setActiveEventId(e.target.value)}
          className="input"
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: '0.95rem',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 600,
            outline: 'none',
            paddingRight: '36px',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
          }}
        >
          {events.map((ev) => {
            const reg = registrations.find(r => r.event_id === ev.id)
            const regText = reg ? ` (Registered: ${reg.status})` : ' (Not Registered)'
            return (
              <option key={ev.id} value={ev.id}>
                {ev.event_name}{regText}
              </option>
            )
          })}
        </select>
        <div style={{
          position: 'absolute',
          right: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
        }}>
          ▼
        </div>
      </div>

      {!activeEvent ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          No active events found.
        </div>
      ) : (
        <div>
          {/* Event info header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(0, 229, 255, 0.04)',
            border: '1px solid rgba(0, 229, 255, 0.12)',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{activeEvent.event_name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '3px' }}>
                {activeEvent.category} · Team size: <strong style={{ color: 'var(--text-primary)' }}>{activeEvent.team_size}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {isRegistered ? (
                <>
                  <span style={{
                    padding: '4px 14px',
                    borderRadius: '20px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}>
                    ✓ Registered · {activeRegistration?.status}
                  </span>
                  <Link
                    to="/leader/payment"
                    className="btn btn-primary"
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    Make Payment
                  </Link>
                </>
              ) : (
                <span style={{
                  padding: '4px 14px',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem'
                }}>
                  Not Registered
                </span>
              )}
            </div>
          </div>

          {/* ── If registered: show participant cards ── */}
          {isRegistered && (
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Registered Team Members
              </h3>
              {eventStudents.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '30px 20px',
                  color: 'var(--text-secondary)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                }}>
                  No participants found for this event.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '18px',
                }}>
                  {eventStudents.map((s, idx) => (
                    <div
                      key={s.id}
                      className="card"
                      style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                            Participant #{idx + 1}
                          </div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>{s.student_name}</h4>
                        </div>
                        <span className={`badge badge-${s.certificate_status === 'Issued' ? 'approved' : 'pending'}`}>
                          {s.certificate_status || 'Pending'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '2px' }}>Roll No.</div>
                          <strong style={{ color: '#fff' }}>{s.roll_no || '—'}</strong>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '2px' }}>Food Choice</div>
                          <span className={`badge badge-${s.food_type === 'Non-Veg' ? 'pending' : 'approved'}`} style={{ fontSize: '0.75rem', padding: '1px 8px', display: 'inline-block' }}>
                            {s.food_type || 'Veg'}
                          </span>
                        </div>
                      </div>

                      {!isEventStarted && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button className="btn" onClick={() => openEdit(s)} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                            ✏️ Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── If not registered: show registration form or locked message ── */}
          {!isRegistered && (
            <div>
              {isEventStarted ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-secondary)',
                  background: 'rgba(239, 68, 68, 0.04)',
                  border: '1px dashed rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  lineHeight: '1.6',
                  maxWidth: '500px',
                  margin: '20px auto'
                }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🔒</span>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--danger)' }}>Registrations Locked</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    The event has started. New registrations are now locked. Please contact the admin desk if you need assistance.
                  </p>
                </div>
              ) : (
                <>
                  <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Register Team — {activeEvent.event_name}
                  </h3>

                  <form onSubmit={handleSubmit}>
                    {regParticipants.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '18px',
                        marginBottom: '20px'
                      }}>
                        {regParticipants.map((p, i) => (
                          <div
                            key={i}
                            className="card"
                            style={{
                              padding: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '16px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                              <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '1rem', fontWeight: 700 }}>
                                Participant #{i + 1}
                              </h4>
                            </div>

                            <label className="field">
                              <span>Name <span style={{ color: '#ef4444' }}>*</span></span>
                              <input value={p.studentName} onChange={e => updateParticipant(i, 'studentName', e.target.value)} placeholder="Full name" required minLength={3} />
                            </label>

                            <label className="field">
                              <span>Roll Number <span style={{ color: '#ef4444' }}>*</span></span>
                              <input value={p.rollNo || ''} onChange={e => updateParticipant(i, 'rollNo', e.target.value)} placeholder="Roll number" required />
                            </label>

                            <label className="field">
                              <span>Food Choice</span>
                              <select value={p.food || '-'} onChange={e => updateParticipant(i, 'food', e.target.value)} style={selectStyle}>
                                <option value="-">—</option>
                                <option value="Veg">Veg</option>
                                <option value="Non-Veg">Non-Veg</option>
                              </select>
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px', marginBottom: '20px' }}>
                        No participant slots available for this event.
                      </div>
                    )}

                    {regError && <p className="error">{regError}</p>}

                    {regSuccess && (
                      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '16px 20px', margin: '12px 0' }}>
                        <p className="success" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>{regSuccess}</p>
                        {whatsappLink && (
                          <div style={{ marginTop: '10px' }}>
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem', textDecoration: 'none', background: '#22c55e', borderColor: '#22c55e' }}>
                              Join WhatsApp Group
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {regParticipants.length > 0 && (
                      <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '8px' }}>
                        {submitting ? 'Submitting…' : `Submit Registration (${teamSize} participant${teamSize !== 1 ? 's' : ''})`}
                      </button>
                    )}
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Edit Participant Modal ── */}
      {editingStudent && (
        <div className="modal-backdrop" onClick={() => setEditingStudent(null)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleSaveEdit}>
            <h3>Edit Participant</h3>

            <label className="field">
              <span>Student Name</span>
              <input type="text" required value={editingStudent.student_name}
                onChange={e => setEditingStudent({ ...editingStudent, student_name: e.target.value })} />
            </label>

            <label className="field">
              <span>Roll Number</span>
              <input type="text" required value={editingStudent.roll_no || ''}
                onChange={e => setEditingStudent({ ...editingStudent, roll_no: e.target.value })} />
            </label>

            <label className="field">
              <span>Food Choice</span>
              <select value={editingStudent.food_type || 'Veg'} required
                onChange={e => setEditingStudent({ ...editingStudent, food_type: e.target.value })}>
                <option value="Veg">Veg</option>
                <option value="Non-Veg">Non-Veg</option>
              </select>
            </label>

            {editError && <p className="error">{editError}</p>}

            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setEditingStudent(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

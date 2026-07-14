import { useState, useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { supabase } from '../../supabase/client'

export default function StudentList() {
  const { profile } = useAuth()
  const { data: students, loading: studentsLoading } = useTable(TABLES.STUDENTS, [
    ['leader_id', 'eq', profile?.ref_id],
  ])
  const { data: events, loading: eventsLoading } = useTable(TABLES.EVENTS)
  
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const timeDiff = new Date(a.created_at) - new Date(b.created_at)
      if (timeDiff !== 0) return timeDiff
      return a.id.localeCompare(b.id)
    })
  }, [students])
  
  const [editingStudent, setEditingStudent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loading = studentsLoading || eventsLoading

  const getEventName = (eventId) => {
    const ev = events.find((e) => e.id === eventId)
    return ev ? ev.event_name : 'Unknown Event'
  }

  function openEdit(student) {
    setEditingStudent({ ...student })
    setError('')
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setError('')

    if (!editingStudent.student_name || editingStudent.student_name.trim().length < 3) {
      return setError('Student name must contain at least 3 characters.')
    }
    if (!editingStudent.gender) {
      return setError('Please select a gender.')
    }
    if (!editingStudent.department || !editingStudent.department.trim()) {
      return setError('Please enter a department.')
    }
    if (!editingStudent.year) {
      return setError('Please select a year.')
    }

    setSaving(true)

    const { error: updateError } = await supabase
      .from(TABLES.STUDENTS)
      .update({
        student_name: editingStudent.student_name,
        roll_no: editingStudent.roll_no || '',
        food_type: editingStudent.food_type || 'Veg',
        gender: editingStudent.gender,
        department: editingStudent.department.trim(),
        year: editingStudent.year
      })
      .eq('id', editingStudent.id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setEditingStudent(null)
    }
  }

  if (loading) return <p className="muted">Loading participants...</p>

  return (
    <div>
      <h2>Your Participants</h2>
      {sortedStudents.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: '12px',
          marginTop: '20px'
        }}>
          No participants registered yet.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          {sortedStudents.map((s) => (
            <div 
              key={s.id}
              className="card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                gap: '16px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {s.student_name}
                  </h4>
                  <span className={`badge badge-${s.certificate_status === 'Issued' ? 'approved' : 'pending'}`}>
                    {s.certificate_status || 'Pending'}
                  </span>
                </div>
 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Roll Number:</span>{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{s.roll_no || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Event:</span>{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{getEventName(s.event_id)}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '4px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>Gender</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{s.gender || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>Department</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{s.department || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>Year</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{s.year || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>Food Choice</span>
                      <span className={`badge badge-${s.food_type === 'Non-Veg' ? 'pending' : 'approved'}`} style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '1px 8px', marginTop: '2px', display: 'inline-block' }}>
                        {s.food_type || 'Veg'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
 
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => openEdit(s)} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
                  ✏️ Edit Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="modal-backdrop" onClick={() => setEditingStudent(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveEdit}>
            <h3>Edit Participant Profile</h3>
            
            <label className="field">
              <span>Student Name</span>
              <input
                type="text"
                required
                value={editingStudent.student_name}
                onChange={(e) => setEditingStudent({ ...editingStudent, student_name: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Roll Number</span>
              <input
                type="text"
                required
                value={editingStudent.roll_no || ''}
                onChange={(e) => setEditingStudent({ ...editingStudent, roll_no: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Food Choice</span>
              <select
                value={editingStudent.food_type || 'Veg'}
                onChange={(e) => setEditingStudent({ ...editingStudent, food_type: e.target.value })}
                required
              >
                <option value="Veg">Veg</option>
                <option value="Non-Veg">Non-Veg</option>
              </select>
            </label>

            <label className="field">
              <span>Gender</span>
              <select
                required
                value={editingStudent.gender || ''}
                onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
              >
                <option value="">Select gender…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>

            <label className="field">
              <span>Department</span>
              <input
                type="text"
                required
                value={editingStudent.department || ''}
                onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Year</span>
              <select
                required
                value={editingStudent.year || ''}
                onChange={(e) => setEditingStudent({ ...editingStudent, year: e.target.value })}
              >
                <option value="">Select year…</option>
                <option value="I Year">I Year</option>
                <option value="II Year">II Year</option>
                <option value="III Year">III Year</option>
                <option value="I PG">I PG</option>
                <option value="II PG">II PG</option>
              </select>
            </label>

            <label className="field">
              <span>Event</span>
              <input
                type="text"
                disabled
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', opacity: 0.8 }}
                value={getEventName(editingStudent.event_id)}
              />
            </label>

            {error && <p className="error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setEditingStudent(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

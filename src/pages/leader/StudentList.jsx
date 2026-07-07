import { useState } from 'react'
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
    setSaving(true)

    const { error: updateError } = await supabase
      .from(TABLES.STUDENTS)
      .update({
        student_name: editingStudent.student_name,
        gender: editingStudent.gender,
        department: '',
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
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Gender</th>
            <th>Event</th>
            <th>Class</th>
            <th>Certificate Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.student_name}</td>
              <td>{s.gender}</td>
              <td>{getEventName(s.event_id)}</td>
              <td>{s.year}</td>
              <td>
                <span className={`badge badge-${s.certificate_status === 'Issued' ? 'approved' : 'pending'}`}>
                  {s.certificate_status || 'Pending'}
                </span>
              </td>
              <td>
                <button className="link" onClick={() => openEdit(s)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '20px' }}>No participants registered yet.</td></tr>
          )}
        </tbody>
      </table>

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
              <span>Gender</span>
              <select
                value={editingStudent.gender}
                onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
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

            <label className="field">
              <span>Class</span>
              <input
                type="text"
                required
                placeholder="e.g. III BCA"
                value={editingStudent.year}
                onChange={(e) => setEditingStudent({ ...editingStudent, year: e.target.value })}
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

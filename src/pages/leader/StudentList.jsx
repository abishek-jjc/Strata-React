import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { supabase } from '../../supabase/client'

export default function StudentList() {
  const { profile } = useAuth()
  const { data: students, loading } = useTable(TABLES.STUDENTS, [
    ['leader_id', 'eq', profile?.ref_id],
  ])
  
  const [editingStudent, setEditingStudent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
        department: editingStudent.department,
        year: editingStudent.year
      })
      .eq('id', editingStudent.id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setEditingStudent(null)
      window.location.reload()
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
            <th>Department</th>
            <th>Year</th>
            <th>Certificate Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.student_name}</td>
              <td>{s.gender}</td>
              <td>{s.department}</td>
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
              <span>Department</span>
              <input
                type="text"
                required
                value={editingStudent.department}
                onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Class / Year</span>
              <input
                type="text"
                required
                placeholder="e.g. III BCA / II MSc CS"
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

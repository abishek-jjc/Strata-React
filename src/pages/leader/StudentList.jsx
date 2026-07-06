import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'

export default function StudentList() {
  const { profile } = useAuth()
  const { data: students, loading } = useTable(TABLES.STUDENTS, [
    ['leader_id', 'eq', profile?.ref_id],
  ])

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div>
      <h2>Your participants</h2>
      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Gender</th><th>Department</th><th>Year</th><th>Certificate</th></tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.student_name}</td>
              <td>{s.gender}</td>
              <td>{s.department}</td>
              <td>{s.year}</td>
              <td>{s.certificate_status}</td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr><td colSpan={5} className="muted">No participants registered yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

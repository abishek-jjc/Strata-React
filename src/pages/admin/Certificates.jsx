import { useState } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'

export default function Certificates() {
  const { data: students } = useTable(TABLES.STUDENTS)
  const { data: registrations } = useTable(TABLES.REGISTRATIONS)
  const { data: events } = useTable(TABLES.EVENTS)
  const [position, setPosition] = useState({})

  // Only students whose registration has been fully approved are
  // eligible — mirrors the report's "certificates unlock after
  // approval" rule.
  const approvedRegIds = new Set(
    registrations.filter((r) => r.status === REGISTRATION_STATUS.APPROVED).map((r) => r.id)
  )
  const eligible = students.filter((s) => approvedRegIds.has(s.registration_id))

  async function issue(student) {
    const pos = position[student.id]
    if (!pos) return
    const certNumber = `CERT-${Date.now()}`
    await supabase.from(TABLES.CERTIFICATES).insert({
      student_id: student.id,
      event_id: student.event_id,
      certificate_number: certNumber,
      position: pos,
    })
    await supabase
      .from(TABLES.STUDENTS)
      .update({ certificate_status: 'issued' })
      .eq('id', student.id)
  }

  const eventName = (id) => events.find((e) => e.id === id)?.event_name || id

  return (
    <div>
      <h2>Certificates</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Event</th>
            <th>Certificate status</th>
            <th>Position</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {eligible.map((s) => (
            <tr key={s.id}>
              <td>{s.student_name}</td>
              <td>{eventName(s.event_id)}</td>
              <td>{s.certificate_status || 'not issued'}</td>
              <td>
                <input
                  className="input"
                  placeholder="e.g. 1st"
                  value={position[s.id] || ''}
                  onChange={(e) => setPosition({ ...position, [s.id]: e.target.value })}
                  style={{ width: 80 }}
                />
              </td>
              <td>
                <button
                  className="link"
                  disabled={s.certificate_status === 'issued'}
                  onClick={() => issue(s)}
                >
                  Issue
                </button>
              </td>
            </tr>
          ))}
          {eligible.length === 0 && (
            <tr><td colSpan={5} className="muted">No approved students yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

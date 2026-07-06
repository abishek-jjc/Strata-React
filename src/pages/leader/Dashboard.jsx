import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'

export default function Dashboard() {
  const { profile } = useAuth()
  const { data: registrations } = useTable(TABLES.REGISTRATIONS, [
    ['leader_id', 'eq', profile?.ref_id],
  ])

  return (
    <div>
      <h2>Welcome, {profile?.name}</h2>
      <p className="muted">Your registrations</p>
      <table className="data-table">
        <thead><tr><th>Event</th><th>Status</th></tr></thead>
        <tbody>
          {registrations.map((r) => (
            <tr key={r.id}>
              <td>{r.event_id}</td>
              <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
            </tr>
          ))}
          {registrations.length === 0 && (
            <tr><td colSpan={2} className="muted">No registrations yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

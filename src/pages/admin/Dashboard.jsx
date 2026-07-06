import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'

export default function Dashboard() {
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: registrations } = useTable(TABLES.REGISTRATIONS)
  const { data: certificates } = useTable(TABLES.CERTIFICATES)
  const { data: payments } = useTable(TABLES.PAYMENTS)

  const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  const stats = [
    ['Events', events.length],
    ['Colleges', colleges.length],
    ['Registrations', registrations.length],
    ['Certificates issued', certificates.length],
    ['Total collected', `Rs. ${totalCollected}`],
  ]

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="stats-grid">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}>
            <div className="stat-num">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

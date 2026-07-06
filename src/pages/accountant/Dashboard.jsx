import { useTable } from '../../hooks/useTable'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'

export default function Dashboard() {
  const { data: payments } = useTable(TABLES.PAYMENTS)
  const { data: pending } = useTable(TABLES.REGISTRATIONS, [
    ['status', 'eq', REGISTRATION_STATUS.LOT_ASSIGNED],
  ])
  const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="stats-grid">
        <div className="stat"><div className="stat-num">{payments.length}</div><div className="stat-label">Payments collected</div></div>
        <div className="stat"><div className="stat-num">Rs. {total}</div><div className="stat-label">Total collected</div></div>
        <div className="stat"><div className="stat-num">{pending.length}</div><div className="stat-label">Awaiting payment</div></div>
      </div>
    </div>
  )
}

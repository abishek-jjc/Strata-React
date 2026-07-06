import { useState } from 'react'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { exportToExcel } from '../../utils/excelExport'

export default function PaymentHistory() {
  const { data: payments, loading } = useTable(TABLES.PAYMENTS)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? payments.filter((p) => p.receipt_no?.toLowerCase().includes(search.toLowerCase()))
    : payments

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div>
      <h2>Payment history</h2>
      <div className="crud-actions" style={{ marginBottom: 16 }}>
        <input className="input" placeholder="Search receipt no…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn" onClick={() => exportToExcel(filtered, 'payments')}>Export Excel</button>
      </div>
      <table className="data-table">
        <thead><tr><th>Receipt</th><th>Amount</th><th>Mode</th></tr></thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id}>
              <td>{p.receipt_no}</td>
              <td>Rs. {p.amount}</td>
              <td>{p.payment_mode}</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={3} className="muted">No payments.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

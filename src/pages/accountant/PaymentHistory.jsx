import { useState } from 'react'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { exportToExcel } from '../../utils/excelExport'

export default function PaymentHistory() {
  const { data: payments, loading } = useTable(TABLES.PAYMENTS)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? payments.filter((p) => 
        p.receipt_no?.toLowerCase().includes(search.toLowerCase()) || 
        p.collected_by?.toLowerCase().includes(search.toLowerCase())
      )
    : payments

  const totalCollected = filtered.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div>
      <h2>Payment history</h2>
      
      {/* Total Box */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
        <h3 style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>Total Amount Collected</h3>
        <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent, #f9c20a)' }}>
          Rs. {totalCollected.toLocaleString()}
        </p>
        <p className="muted" style={{ margin: '5px 0 0 0', fontSize: '0.85rem' }}>
          Based on {filtered.length} payment(s) shown below
        </p>
      </div>

      <div className="crud-actions" style={{ marginBottom: 16 }}>
        <input className="input" placeholder="Search receipt or desk name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn" onClick={() => exportToExcel(filtered, 'payments')}>Export Excel</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Receipt</th>
            <th>Amount</th>
            <th>Mode</th>
            <th>Collected By</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id}>
              <td>{p.receipt_no}</td>
              <td style={{ fontWeight: 'bold' }}>Rs. {p.amount}</td>
              <td>{p.payment_mode}</td>
              <td>{p.collected_by || 'Unknown'}</td>
              <td>{new Date(p.paid_at || p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={5} className="muted">No payments found.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

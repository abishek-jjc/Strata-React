import { useState } from 'react'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { exportToExcel } from '../../utils/excelExport'

const REPORTS = [
  { key: TABLES.EVENTS, label: 'Events' },
  { key: TABLES.COLLEGES, label: 'Colleges' },
  { key: TABLES.STUDENTS, label: 'Students' },
  { key: TABLES.STUDENT_LEADERS, label: 'Student leaders' },
  { key: TABLES.PAYMENTS, label: 'Payments' },
  { key: TABLES.CERTIFICATES, label: 'Certificates' },
  { key: TABLES.LOTS, label: 'Lots' },
]

export default function Reports() {
  const [active, setActive] = useState(REPORTS[0].key)
  const [search, setSearch] = useState('')
  const { data, loading } = useTable(active)

  const columns = data[0] ? Object.keys(data[0]).filter((k) => k !== 'id') : []
  const filtered = search.trim()
    ? data.filter((row) =>
        columns.some((c) => String(row[c] ?? '').toLowerCase().includes(search.toLowerCase()))
      )
    : data

  return (
    <div>
      <h2>Reports</h2>
      <div className="crud-actions" style={{ marginBottom: 16 }}>
        <select value={active} onChange={(e) => setActive(e.target.value)}>
          {REPORTS.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn" onClick={() => window.print()}>Print</button>
        <button className="btn" onClick={() => exportToExcel(filtered, active)}>Export Excel</button>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => <td key={c}>{String(row[c] ?? '')}</td>)}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={columns.length || 1} className="muted">No records.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

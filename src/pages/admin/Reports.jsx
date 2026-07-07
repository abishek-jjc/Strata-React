import { useState, useEffect, useMemo } from 'react'
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

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Reset page when active table or search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [active, search])

  const columns = data[0] ? Object.keys(data[0]).filter((k) => k !== 'id') : []
  const filtered = search.trim()
    ? data.filter((row) =>
        columns.some((c) => String(row[c] ?? '').toLowerCase().includes(search.toLowerCase()))
      )
    : data

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [filtered, totalPages, currentPage])

  const paginatedData = useMemo(() => {
    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filtered, currentPage])

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
        <>
          <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
            <table className="data-table">
              <thead>
                <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => <td key={c}>{String(row[c] ?? '')}</td>)}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr><td colSpan={columns.length || 1} className="muted">No records.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                First
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Prev
              </button>
              <span className="muted" style={{ fontSize: '0.85rem', margin: '0 8px' }}>
                Page <strong>{currentPage}</strong> of {totalPages} ({filtered.length} items)
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Next
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Last
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

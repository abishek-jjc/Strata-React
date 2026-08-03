import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

export default function PaymentPolls() {
  const { data: accountants, loading: accountantsLoading } = useTable(TABLES.ACCOUNTANTS)
  const { data: logs, loading: logsLoading } = useTable(TABLES.PAYMENT_LOGS)
  const { data: settings, loading: settingsLoading } = useTable(TABLES.SETTINGS)
  const { data: colleges, loading: collegesLoading } = useTable(TABLES.COLLEGES)

  // Accountant Dropdown & Search Filter
  const [selectedAccountant, setSelectedAccountant] = useState('all')
  const [logSearch, setLogSearch] = useState('')
  const [showDefaultAmountNote, setShowDefaultAmountNote] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const loading = accountantsLoading || logsLoading || settingsLoading || collegesLoading

  // Default fee from DB settings or default 236
  const feePerStudent = useMemo(() => {
    if (!settings) return '236'
    const match = settings.find((s) => s.key_name === 'fee_per_student')
    return match ? match.value : '236'
  }, [settings])

  // All time total collected across all logs
  const totalAmountClearedAllTime = useMemo(() => {
    if (!logs) return 0
    return logs.reduce((sum, log) => sum + Number(log.amount || 0), 0)
  }, [logs])

  // Filtered logs by Accountant Name & Search Query
  const filteredLogs = useMemo(() => {
    let list = logs || []

    if (selectedAccountant !== 'all') {
      list = list.filter((log) => {
        const accountantName = log.accountant_name || log.poll_name || ''
        return accountantName.toLowerCase().includes(selectedAccountant.toLowerCase())
      })
    }

    if (logSearch.trim()) {
      const q = logSearch.toLowerCase()
      list = list.filter(
        (log) =>
          log.college_name.toLowerCase().includes(q) ||
          (log.accountant_name || log.poll_name || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [logs, selectedAccountant, logSearch])

  // Filtered total for the selected accountant / filter
  const filteredTotal = useMemo(() => {
    return filteredLogs.reduce((sum, log) => sum + Number(log.amount || 0), 0)
  }, [filteredLogs])

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [filteredLogs, totalPages, currentPage])

  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filteredLogs, currentPage])

  if (loading) return <p className="muted">Loading payment audit logs and accountants...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Top Header & Default Amount Action */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <h2>Payment Audit & Clearance Logs</h2>
          <p className="muted" style={{ margin: 0 }}>
            Track payment clearances logged by accountants and monitor total revenue collected.
          </p>
        </div>

        {/* Set Default Amount Button */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowDefaultAmountNote(!showDefaultAmountNote)}
          style={{ padding: '10px 18px', fontSize: '0.9rem' }}
        >
          {showDefaultAmountNote ? 'Hide Default Amount' : 'Set Default Amount'}
        </button>
      </div>

      {/* Default Amount Info Display (No edit buttons allowed here) */}
      {showDefaultAmountNote && (
        <div
          className="card"
          style={{
            padding: '20px',
            background: 'rgba(0, 229, 255, 0.05)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '15px' }}>
            <div>
              <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>
                CURRENT DEFAULT ENTRY FEE
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent)', marginTop: '4px' }}>
                Rs. {feePerStudent} / student
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                (as you are a admin make edit in default amount in db)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Totals Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '20px', borderTop: '4px solid var(--accent)' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>All-Time Total Collected</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
            Rs. {totalAmountClearedAllTime.toLocaleString()}
          </p>
          <p className="muted" style={{ margin: '5px 0 0 0', fontSize: '0.8rem' }}>
            Across all {logs.length} payment clearance entry(ies)
          </p>
        </div>

        {(selectedAccountant !== 'all' || logSearch.trim()) && (
          <div className="card" style={{ padding: '20px', borderTop: '4px solid #10b981' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Filtered Accountant Total</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
              Rs. {filteredTotal.toLocaleString()}
            </p>
            <p className="muted" style={{ margin: '5px 0 0 0', fontSize: '0.8rem' }}>
              For {filteredLogs.length} matching clearance(s)
            </p>
          </div>
        )}
      </div>

      {/* Filters: Accountant Dropdown & Search Bar */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Accountant Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Accountant:</span>
          <select
            className="input"
            value={selectedAccountant}
            onChange={(e) => {
              setSelectedAccountant(e.target.value)
              setCurrentPage(1)
            }}
            style={{ width: '220px' }}
          >
            <option value="all">All Accountants</option>
            {accountants.map((acc) => (
              <option key={acc.id} value={acc.name}>
                {acc.name} ({acc.email})
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div style={{ maxWidth: '300px', width: '100%' }}>
          <input
            className="input"
            placeholder="Search by college or accountant..."
            value={logSearch}
            onChange={(e) => {
              setLogSearch(e.target.value)
              setCurrentPage(1)
            }}
            style={{ width: '100%' }}
          />
        </div>

      </div>

      {/* Audit Logs Table */}
      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Accountant Name</th>
              <th>College Cleared</th>
              <th>Amount Cleared</th>
              <th>Students Cleared</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => {
              const amt = Number(log.amount || 0)
              const accountantName = log.accountant_name || log.poll_name || 'Accountant Desk'
              return (
                <tr key={log.id}>
                  <td><strong>{accountantName}</strong></td>
                  <td>
                    <span className="badge badge-approved" style={{ fontSize: '0.85rem' }}>
                      ✓ {log.college_name}
                    </span>
                  </td>
                  <td>
                    <strong>Rs. {amt.toLocaleString()}</strong>
                  </td>
                  <td>{log.students_count || '-'} student(s)</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              )
            })}
            {paginatedLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '30px' }}>
                  No payment clearance logs found for the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            First
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Prev
          </button>
          <span className="muted" style={{ fontSize: '0.85rem', margin: '0 8px' }}>
            Page <strong>{currentPage}</strong> of {totalPages} ({filteredLogs.length} items)
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Next
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Last
          </button>
        </div>
      )}

    </div>
  )
}

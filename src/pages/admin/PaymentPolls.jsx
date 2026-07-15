import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

export default function PaymentPolls() {
  const { data: polls, loading: pollsLoading } = useTable(TABLES.PAYMENT_POLLS)
  const { data: logs, loading: logsLoading } = useTable(TABLES.PAYMENT_LOGS)
  const { data: settings, loading: settingsLoading } = useTable(TABLES.SETTINGS)
  const { data: colleges, loading: collegesLoading } = useTable(TABLES.COLLEGES)
  const { data: students, loading: studentsLoading } = useTable(TABLES.STUDENTS)

  const [pollName, setPollName] = useState('')
  const [pollKey, setPollKey] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  // Fee state
  const [feePerStudent, setFeePerStudent] = useState('100')
  const [savingFee, setSavingFee] = useState(false)
  const [feeSuccess, setFeeSuccess] = useState(false)

  // Logs Search & Totals State
  const [logSearch, setLogSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const loading = pollsLoading || logsLoading || settingsLoading || collegesLoading || studentsLoading

  // Calculate amount cleared for a college
  const getAmountCleared = (collegeName) => {
    if (!colleges || !students) return 0
    const col = colleges.find((c) => {
      const cName = c.department ? `${c.college} (${c.department})` : c.college
      return cName.toLowerCase() === collegeName.toLowerCase()
    })
    if (!col) return 0
    const studentCount = students.filter((s) => s.college_id === col.id).length
    return studentCount * Number(feePerStudent)
  }

  // All time total
  const totalAmountClearedAllTime = useMemo(() => {
    if (!logs) return 0
    return logs.reduce((sum, log) => sum + Number(log.amount || 0), 0)
  }, [logs])

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const list = logs || []
    if (!logSearch.trim()) return list
    const q = logSearch.toLowerCase()
    return list.filter(
      (log) =>
        log.college_name.toLowerCase().includes(q) ||
        (log.poll_name || '').toLowerCase().includes(q)
    )
  }, [logs, logSearch])

  // Filtered total
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

  // Initialize fee from settings
  useEffect(() => {
    if (settings) {
      const match = settings.find((s) => s.key_name === 'fee_per_student')
      if (match) setFeePerStudent(match.value)
    }
  }, [settings])

  async function handleSaveFee(e) {
    e.preventDefault()
    setSavingFee(true)
    setFeeSuccess(false)
    try {
      const { error } = await supabase
        .from(TABLES.SETTINGS)
        .upsert({ key_name: 'fee_per_student', value: String(Number(feePerStudent)) })
      if (error) throw error
      setFeeSuccess(true)
      setTimeout(() => setFeeSuccess(false), 2000)
    } catch (err) {
      alert('Failed to save fee: ' + err.message)
    } finally {
      setSavingFee(false)
    }
  }

  // Generate a random 6-character key (excluding ambiguous chars like I, O, 1, 0)
  function handleGenerateKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let res = ''
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPollKey(res)
  }

  async function handleAddPoll(e) {
    e.preventDefault()
    if (!pollKey) {
      return setError('Please generate a poll key first.')
    }
    setError('')
    setAdding(true)
    try {
      const { error: err } = await supabase.from(TABLES.PAYMENT_POLLS).insert({
        poll_name: pollName.trim(),
        poll_key: pollKey,
      })
      if (err) throw err
      setPollName('')
      setPollKey('')
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDeletePoll(id) {
    if (!confirm('Are you sure you want to delete this payment poll desk? Keys for this desk will instantly expire.')) return
    try {
      const { error } = await supabase.from(TABLES.PAYMENT_POLLS).delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      alert('Failed to delete poll: ' + err.message)
    }
  }

  if (loading) return <p className="muted">Loading payment desks and audit logs...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* Top: Manage active payment polls */}
      <div>
        <h2>Payment Poll Desks</h2>
        <p className="muted" style={{ marginBottom: '20px' }}>
          Create secure, temporary access keycodes for operator desks at spot registration counters.
        </p>

        <div className="responsive-grid-sidebar">
          
          {/* Active Polls Table */}
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Active Operator Desks</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Desk Name</th>
                    <th>Keycode</th>
                    <th>Created At</th>
                    <th style={{ width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {polls.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.poll_name}</strong></td>
                      <td>
                        <code style={{ fontSize: '1rem', color: 'var(--accent)', fontWeight: 'bold' }}>{p.poll_key}</code>
                      </td>
                      <td>{new Date(p.created_at).toLocaleString()}</td>
                      <td>
                        <button className="link link-danger" onClick={() => handleDeletePoll(p.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {polls.length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                        No active payment poll desks created.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Poll Form & Config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <form className="card" onSubmit={handleAddPoll} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '5px' }}>Create Desk Key</h3>
              
              <label className="field">
                <span>Desk Name</span>
                <input
                  className="input"
                  placeholder="e.g. Spot Counter 1"
                  value={pollName}
                  onChange={(e) => setPollName(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>Access Keycode</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    className="input"
                    style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}
                    placeholder="Click Generate"
                    value={pollKey}
                    readOnly
                    required
                  />
                  <button type="button" className="btn" onClick={handleGenerateKey}>
                    Generate
                  </button>
                </div>
              </label>

              {error && <p className="error" style={{ margin: 0 }}>{error}</p>}

              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? 'Creating…' : 'Activate Desk Key'}
              </button>
            </form>

            <form className="card" onSubmit={handleSaveFee} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '5px' }}>Fee Configuration</h3>
              
              <label className="field">
                <span>Fee Per Student (Rs.)</span>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 100"
                  value={feePerStudent}
                  onChange={(e) => setFeePerStudent(e.target.value)}
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary" disabled={savingFee}>
                {savingFee ? 'Saving…' : 'Save Config'}
              </button>

              {feeSuccess && (
                <p style={{ color: 'var(--success)', fontSize: '0.85rem', margin: 0, fontWeight: 'bold' }}>
                  ✓ Configuration saved
                </p>
              )}
            </form>
          </div>

        </div>
      </div>

      {/* Bottom: Payment Logs Audit View */}
      <div>
        <h2>Payment Clearance Logs</h2>
        <p className="muted" style={{ marginBottom: '20px' }}>
          Realtime audit of colleges marked paid, showing which operator desk issued the clearance.
        </p>

        {/* Totals Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' }}>
          <div className="card" style={{ padding: '20px', borderTop: '4px solid var(--accent)' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Full Payment Received</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
              Rs. {totalAmountClearedAllTime.toLocaleString()}
            </p>
            <p className="muted" style={{ margin: '5px 0 0 0', fontSize: '0.8rem' }}>
              Across all {logs.length} logged clearance(s)
            </p>
          </div>

          {logSearch.trim() && (
            <div className="card" style={{ padding: '20px', borderTop: '4px solid var(--g-primary)' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Filtered Calculation</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--g-primary)' }}>
                Rs. {filteredTotal.toLocaleString()}
              </p>
              <p className="muted" style={{ margin: '5px 0 0 0', fontSize: '0.8rem' }}>
                For {filteredLogs.length} matching clearance(s)
              </p>
            </div>
          )}
        </div>

        {/* Filter Input */}
        <div style={{ marginBottom: '20px', maxWidth: '360px' }}>
          <input
            className="input"
            placeholder="Search by college or desk name…"
            value={logSearch}
            onChange={(e) => {
              setLogSearch(e.target.value)
              setCurrentPage(1)
            }}
            style={{ width: '100%' }}
          />
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Operator Desk</th>
                <th>College Cleared</th>
                <th>Amount Cleared</th>
                <th>Clearing Desk Name</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => {
                const amt = Number(log.amount || 0)
                const studentsClearedCount = log.students_count ? ` (${log.students_count} student${log.students_count > 1 ? 's' : ''})` : ''
                return (
                  <tr key={log.id}>
                    <td><strong>{log.poll_name}</strong></td>
                    <td>
                      <span className="badge badge-approved" style={{ fontSize: '0.85rem' }}>✓ {log.college_name}{studentsClearedCount}</span>
                    </td>
                    <td>
                      <strong>Rs. {amt.toLocaleString()}</strong>
                    </td>
                    <td className="muted">{log.poll_name || 'Desk deleted'}</td>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                )
              })}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                    No payment clearance logs found.
                  </td>
                </tr>
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
              Page <strong>{currentPage}</strong> of {totalPages} ({filteredLogs.length} items)
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
      </div>

    </div>
  )
}

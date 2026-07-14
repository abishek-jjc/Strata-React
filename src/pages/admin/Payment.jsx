import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import { useSettings } from '../../context/SettingsContext'
import '../../styles/guest.css'

export default function Payment() {
  const { settings } = useSettings()
  const logoUrl = settings.event_logo_url
  const [colleges, setColleges] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [lots, setLots] = useState([])
  const [students, setStudents] = useState([])
  const [paymentLogs, setPaymentLogs] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [refreshCount, setRefreshCount] = useState(0)

  // Poll authentication state
  const [enteredKey, setEnteredKey] = useState('')
  const [authError, setAuthError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [activePoll, setActivePoll] = useState(() => {
    const saved = sessionStorage.getItem('active_payment_poll')
    return saved ? JSON.parse(saved) : null
  })

  // Table search & edit states
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search])
  const [editingCollege, setEditingCollege] = useState(null)
  const [editPaid, setEditPaid] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load database data only after poll login
  useEffect(() => {
    if (!activePoll) return

    async function loadData() {
      setLoadingData(true)
      try {
        const { data: cols } = await supabase.from(TABLES.COLLEGES).select('*')
        if (cols) setColleges(cols)

        const { data: regs } = await supabase.from(TABLES.REGISTRATIONS).select('*')
        if (regs) setRegistrations(regs)

        const { data: lts } = await supabase.from(TABLES.LOTS).select('*')
        if (lts) setLots(lts)

        const { data: stds } = await supabase.from(TABLES.STUDENTS).select('*')
        if (stds) setStudents(stds)

        const { data: logs } = await supabase
          .from(TABLES.PAYMENT_LOGS)
          .select('*')
          .order('created_at', { ascending: false })
        if (logs) setPaymentLogs(logs)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [activePoll, refreshCount])

  const feeBase = 200
  const gstRate = 0.18
  const feePerStudent = feeBase * (1 + gstRate) // 236

  // Login handler
  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    setVerifying(true)
    const normalizedKey = enteredKey.trim().toUpperCase()
    try {
      const { data, error } = await supabase
        .rpc('verify_payment_desk_key', { p_keycode: normalizedKey })

      if (error) throw error

      if (!data) {
        setAuthError('Invalid payment poll key.')
      } else {
        const sessionPayload = {
          id: data.id,
          poll_name: data.poll_name,
          poll_key: normalizedKey
        }
        sessionStorage.setItem('active_payment_poll', JSON.stringify(sessionPayload))
        setActivePoll(sessionPayload)
      }
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  // Logout handler
  function handleLogout() {
    sessionStorage.removeItem('active_payment_poll')
    setActivePoll(null)
    setEnteredKey('')
  }

  // Identify colleges that have at least one registration in the database
  const registeredCollegeIds = new Set(registrations.map((r) => r.college_id))
  const registeredColleges = colleges.filter((c) => registeredCollegeIds.has(c.id))

  // Filter based on search query
  const filteredColleges = registeredColleges.filter((c) => {
    const cName = c.department ? `${c.college} (${c.department})` : c.college
    return cName.toLowerCase().includes(search.toLowerCase())
  })

  const totalPages = Math.ceil(filteredColleges.length / itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [filteredColleges, totalPages, currentPage])

  const paginatedColleges = useMemo(() => {
    return filteredColleges.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filteredColleges, currentPage])

  function openEdit(college) {
    setEditingCollege(college)
    setEditPaid(!!college.is_paid)
  }

  async function handleUpdateStatus(markPaid) {
    setSaving(true)
    try {
      // Clear payment and write trace log securely in a single transaction RPC
      const { error: rpcError } = await supabase.rpc('clear_college_payment_with_key', {
        p_college_id: editingCollege.id,
        p_keycode: activePoll.poll_key,
        p_is_paid: markPaid
      })

      if (rpcError) throw rpcError

      setRefreshCount(prev => prev + 1)
      setEditingCollege(null)
    } catch (err) {
      alert('Failed to update payment status: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Render Login Panel
  if (!activePoll) {
    return (
      <div className="guest-portal-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', paddingTop: 0 }}>
        <div className="guest-ambient-bg">
          <div className="guest-glow-orb guest-orb-1" />
          <div className="guest-glow-orb guest-orb-2" />
          <div className="guest-glow-orb guest-orb-3" />
        </div>
        <div className="guest-mesh-grid" />

        <form className="login-glass-card" onSubmit={handleLogin} style={{ position: 'relative', zIndex: 10 }}>
          <div className="login-card-accent" />
          
          {logoUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '15px' }}>
              <img 
                src={logoUrl} 
                alt="Logo" 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  objectFit: 'contain', 
                  marginBottom: '10px',
                  filter: 'drop-shadow(0 0 10px rgba(0, 229, 255, 0.4))'
                }} 
              />
              <div className="login-brand" style={{ margin: 0 }}>
                <span className="login-brand-logo">STRATA</span>
                <span className="login-brand-year">2K26</span>
              </div>
            </div>
          ) : (
            <div className="login-brand">
              <span className="login-brand-logo">STRATA</span>
              <span className="login-brand-year">2K26</span>
            </div>
          )}
          <p className="login-subtitle">Payment Desk Portal</p>

          <div className="login-hint-box">
            <span>💳</span>
            <span>Enter the 6-character poll key allocated by admin to access the payment desk.</span>
          </div>

          <label className="field">
            <span>Poll Key</span>
            <input
              className="input"
              type="text"
              placeholder="e.g. AX72B9"
              value={enteredKey}
              onChange={(e) => setEnteredKey(e.target.value.substring(0, 6))}
              maxLength={6}
              style={{ letterSpacing: '4px', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center' }}
              required
            />
          </label>

          {authError && <p className="error" style={{ margin: 0, textAlign: 'center' }}>{authError}</p>}

          <button type="submit" className="login-cta-btn" disabled={verifying}>
            {verifying ? 'Verifying…' : 'Enter Desk Portal'}
          </button>

          <p style={{ textAlign: 'center', margin: 0, fontSize: '12px', color: 'var(--g-text-muted)' }}>
            ANJAC Sivakasi · Dept. of Computer Science
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="guest-portal-wrapper" style={{ minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="guest-ambient-bg">
        <div className="guest-glow-orb guest-orb-1" />
        <div className="guest-glow-orb guest-orb-2" />
        <div className="guest-glow-orb guest-orb-3" />
      </div>
      <div className="guest-mesh-grid" />

      <div style={{ position: 'relative', zIndex: 10, padding: '0 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {logoUrl && <img src={logoUrl} alt="Logo" style={{ width: '45px', height: '45px', objectFit: 'contain' }} />}
            <div>
              <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-primary)' }}>Payment Desk Portal</h2>
              <span className="badge badge-approved" style={{ marginTop: '4px', display: 'inline-block' }}>Active Poll: {activePoll.poll_name}</span>
            </div>
          </div>
          <button className="btn" onClick={handleLogout}>
            Exit Desk
          </button>
        </div>

        {loadingData ? (
          <p className="muted">Loading payment status...</p>
        ) : (
          <>
            <div style={{ marginBottom: '20px', maxWidth: '300px' }}>
              <input
                className="input"
                placeholder="Search college name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>College Name</th>
                    <th>Lot Name</th>
                    <th>Total Students</th>
                    <th>Paid For</th>
                    <th>New (Unpaid)</th>
                    <th>Pending Amount</th>
                    <th>Status</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedColleges.map((c) => {
                    const cName = c.department ? `${c.college} (${c.department})` : c.college
                    const collegeLot = lots.find((l) => l.assigned_college === cName)
                    const studentCount = students.filter((s) => s.college_id === c.id).length
                    const paidCount = c.paid_student_count || 0
                    const unpaidCount = Math.max(0, studentCount - paidCount)
                    const pendingAmount = unpaidCount * feePerStudent
                    const statusIsPaid = studentCount > 0 && unpaidCount === 0

                    return (
                      <tr key={c.id}>
                        <td><strong>{cName}</strong></td>
                        <td>{collegeLot ? <strong>{collegeLot.lot_name}</strong> : <span className="muted">—</span>}</td>
                        <td>{studentCount} student(s)</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{paidCount} paid</td>
                        <td style={{ color: unpaidCount > 0 ? '#ef4444' : 'var(--text-secondary)', fontWeight: unpaidCount > 0 ? 600 : 400 }}>{unpaidCount} unpaid</td>
                        <td>
                          {unpaidCount > 0 ? (
                            <strong style={{ color: '#ef4444' }}>Rs. {pendingAmount}</strong>
                          ) : (
                            <span style={{ color: '#10b981' }}>Rs. 0</span>
                          )}
                        </td>
                        <td>
                          {studentCount === 0 ? (
                            <span className="badge badge-pending">No Students</span>
                          ) : (
                            <span className={`badge badge-${statusIsPaid ? 'approved' : 'pending'}`}>
                              {statusIsPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          )}
                        </td>
                        <td>
                          <button className="link" onClick={() => openEdit(c)}>
                            Edit Status
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {paginatedColleges.length === 0 && (
                    <tr>
                      <td colSpan={8} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                        {search ? 'No matching colleges found.' : 'No registered colleges found yet.'}
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
                  Page <strong>{currentPage}</strong> of {totalPages} ({filteredColleges.length} items)
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

        {/* Edit Payment Status Modal */}
        {editingCollege && (() => {
          const studentCount = students.filter((s) => s.college_id === editingCollege.id).length;
          const paidCount = editingCollege.paid_student_count || 0;
          const unpaidCount = Math.max(0, studentCount - paidCount);
          const pendingAmount = unpaidCount * feePerStudent;

          return (
            <div className="modal-backdrop" onClick={() => setEditingCollege(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>Update Payment Status</h3>
                <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
                  College: <strong>{editingCollege.department ? `${editingCollege.college} (${editingCollege.department})` : editingCollege.college}</strong>
                </p>

                {/* Status details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Total Students:</span>
                    <strong>{studentCount} student(s)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Already Paid For:</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{paidCount} student(s)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <span className="muted">Unpaid (Remaining):</span>
                    <span style={{ color: unpaidCount > 0 ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600 }}>{unpaidCount} student(s)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Net Balance to Collect:</span>
                    <strong style={{ color: unpaidCount > 0 ? '#ef4444' : '#10b981', fontSize: '1.05rem' }}>Rs. {pendingAmount}</strong>
                  </div>
                </div>

                {/* Actions row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={unpaidCount === 0 || saving}
                    onClick={() => handleUpdateStatus(true)}
                    style={{ width: '100%', padding: '12px', background: unpaidCount === 0 ? 'rgba(255,255,255,0.05)' : 'var(--accent)', color: unpaidCount === 0 ? 'var(--text-muted)' : '#000' }}
                  >
                    {saving ? 'Processing...' : unpaidCount === 0 ? 'All Registered Students Paid' : `Clear Balance (Collect Rs. ${pendingAmount})`}
                  </button>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={saving}
                      onClick={() => {
                        if (confirm('Are you sure you want to reset all payment records for this institution? This resets their paid count to 0.')) {
                          handleUpdateStatus(false);
                        }
                      }}
                      style={{ flex: 1, padding: '10px' }}
                    >
                      Reset & Mark Unpaid
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditingCollege(null)}
                      style={{ flex: 1, padding: '10px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Payment logs audit history */}
        <div className="card" style={{ marginTop: '35px', padding: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Payment Logs Audit Trail</h3>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '18px' }}>
            Realtime logs of all clearance entries completed at the payment desk.
          </p>

          <div className="table-responsive" style={{ maxHeight: '280px' }}>
            <table className="data-table" style={{ fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Institution</th>
                  <th>Students Paid</th>
                  <th>Amount Collected</th>
                  <th>Active Poll / Operator</th>
                </tr>
              </thead>
              <tbody>
                {paymentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="muted">{new Date(log.created_at).toLocaleString()}</td>
                    <td><strong>{log.college_name}</strong></td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>+{log.students_count || 0} student(s)</td>
                    <td><strong style={{ color: '#10b981' }}>Rs. {log.amount || 0}</strong></td>
                    <td><span className="badge badge-approved">{log.poll_name}</span></td>
                  </tr>
                ))}
                {paymentLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '15px' }}>
                      No payment logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

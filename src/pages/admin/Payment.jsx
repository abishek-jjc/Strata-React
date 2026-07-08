import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import '../../styles/guest.css'

export default function Payment() {
  const [colleges, setColleges] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [lots, setLots] = useState([])
  const [students, setStudents] = useState([])
  const [settings, setSettings] = useState([])
  const [loadingData, setLoadingData] = useState(true)

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

        const { data: sets } = await supabase.from(TABLES.SETTINGS).select('*')
        if (sets) setSettings(sets)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [activePoll])

  const feeBase = 200
  const gstRate = 0.18
  const feePerStudent = feeBase * (1 + gstRate) // 236

  // Login handler
  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    setVerifying(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.PAYMENT_POLLS)
        .select('*')
        .eq('poll_key', enteredKey.trim().toUpperCase())
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setAuthError('Invalid payment poll key.')
      } else {
        sessionStorage.setItem('active_payment_poll', JSON.stringify(data))
        setActivePoll(data)
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
  const filteredColleges = registeredColleges.filter((c) =>
    c.college.toLowerCase().includes(search.toLowerCase())
  )

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

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      // 1. Update college status to paid
      const { error: updateError } = await supabase
        .from(TABLES.COLLEGES)
        .update({ is_paid: editPaid })
        .eq('id', editingCollege.id)

      if (updateError) throw updateError

      // 2. Insert trace log in payment_logs if marked as paid
      if (editPaid) {
        const { error: logError } = await supabase.from(TABLES.PAYMENT_LOGS).insert({
          poll_id: activePoll.id,
          poll_name: activePoll.poll_name,
          college_name: editingCollege.college,
        })
        if (logError) throw logError
      }

      // Update local state without full reload
      setColleges((prev) =>
        prev.map((c) => (c.id === editingCollege.id ? { ...c, is_paid: editPaid } : c))
      )
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
          <div className="login-brand">
            <span className="login-brand-logo">STRATA</span>
            <span className="login-brand-year">2K26</span>
          </div>
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
    <div style={{ padding: '30px 40px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Payment Desk Portal</h2>
          <span className="badge badge-approved">Active Poll: {activePoll.poll_name}</span>
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

          <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>College Name</th>
                  <th>Lot Name</th>
                  <th>Registered Students</th>
                  <th>Amount Payable</th>
                  <th>Payment Status</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedColleges.map((c) => {
                  const collegeLot = lots.find((l) => l.assigned_college === c.college)
                  const studentCount = students.filter((s) => s.college_id === c.id).length
                  const payableAmount = studentCount * feePerStudent
                  return (
                    <tr key={c.id}>
                      <td><strong>{c.college}</strong></td>
                      <td>{collegeLot ? <strong>{collegeLot.lot_name}</strong> : <span className="muted">—</span>}</td>
                      <td>{studentCount} student(s)</td>
                      <td><strong>Rs. {payableAmount}</strong> <span className="muted" style={{ fontSize: '0.8rem' }}>(Rs. {feePerStudent}/std)</span></td>
                      <td>
                        <span className={`badge badge-${c.is_paid ? 'approved' : 'pending'}`}>
                          {c.is_paid ? 'Paid' : 'Unpaid'}
                        </span>
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
                    <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
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
      {editingCollege && (
        <div className="modal-backdrop" onClick={() => setEditingCollege(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h3>Update Payment Status</h3>
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              College: <strong>{editingCollege.college}</strong>
            </p>

            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <input
                type="checkbox"
                checked={editPaid}
                onChange={(e) => setEditPaid(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.95rem', userSelect: 'none', cursor: 'pointer' }}>Mark College Registration as Paid</span>
            </label>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn" onClick={() => setEditingCollege(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'
import { useAuth } from '../../auth/AuthContext'

export default function AccountantEdit() {
  const { profile } = useAuth()
  const { data: colleges, loading: loadingColleges, reload: reloadColleges } = useTable(TABLES.COLLEGES)
  const { data: registrations, loading: loadingRegs } = useTable(TABLES.REGISTRATIONS)
  const { data: students, loading: loadingStudents } = useTable(TABLES.STUDENTS)
  const { data: settings } = useTable(TABLES.SETTINGS)

  const [selectedCollege, setSelectedCollege] = useState(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [authenticatedCollege, setAuthenticatedCollege] = useState(null)

  // Edit states
  const [searchQuery, setSearchQuery] = useState('')
  const [isPaidChecked, setIsPaidChecked] = useState(false)
  const [paidCountInput, setPaidCountInput] = useState(0)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const loading = loadingColleges || loadingRegs || loadingStudents

  const feeBase = 200
  const gstRate = 0.18
  const defaultFee = Math.round(feeBase * (1 + gstRate))

  const feePerStudent = useMemo(() => {
    if (!settings) return defaultFee
    const settingFee = settings.find((s) => s.key_name === 'fee_per_student')?.value
    return settingFee ? Number(settingFee) : defaultFee
  }, [settings, defaultFee])

  // Partially paid and unpaid colleges only
  const editableColleges = useMemo(() => {
    if (!registrations || !colleges) return []

    const registeredIds = new Set(registrations.map((r) => r.college_id).filter(Boolean))

    return colleges
      .filter((c) => registeredIds.has(c.id))
      .map((c) => {
        const colStudents = students.filter((s) => s.college_id === c.id)
        const studentCount = colStudents.length
        const paidCount = c.paid_student_count ?? (c.is_paid ? studentCount : 0)
        const isFullyPaid = studentCount > 0 && paidCount >= studentCount

        const displayName = c.department ? `${c.college} (${c.department})` : c.college

        return {
          ...c,
          displayName,
          studentCount,
          paidCount,
          isFullyPaid,
          payableAmount: studentCount * feePerStudent,
          pendingAmount: Math.max(0, (studentCount - paidCount) * feePerStudent),
        }
      })
      .filter((c) => !c.isFullyPaid) // Filter to partially paid & unpaid colleges only
  }, [colleges, registrations, students, feePerStudent])

  // Search filter for editable colleges
  const filteredColleges = useMemo(() => {
    if (!searchQuery.trim()) return editableColleges
    const q = searchQuery.toLowerCase().trim()
    return editableColleges.filter((c) => {
      const colName = (c.college || '').toLowerCase()
      const deptName = (c.department || '').toLowerCase()
      const dispName = (c.displayName || '').toLowerCase()
      return colName.includes(q) || deptName.includes(q) || dispName.includes(q)
    })
  }, [editableColleges, searchQuery])

  // Open password modal when clicking Edit
  function handleOpenEditModal(college) {
    setSelectedCollege(college)
    setPasswordInput('')
    setPasswordError('')
    setPasswordModalOpen(true)
  }

  // Password Verification Handler
  async function handleVerifyPassword(e) {
    e.preventDefault()
    setPasswordError('')
    setVerifyingPassword(true)

    try {
      if (!profile?.ref_id) {
        throw new Error('Accountant profile missing. Please log in again.')
      }

      // Check password in accountants table
      const { data: accountantRow, error } = await supabase
        .from(TABLES.ACCOUNTANTS)
        .select('password')
        .eq('id', profile.ref_id)
        .maybeSingle()

      if (error) throw error

      const storedPassword = accountantRow?.password || '123456'

      if (passwordInput.trim() !== storedPassword.trim()) {
        setPasswordError('Incorrect accountant password. Please try again.')
        setVerifyingPassword(false)
        return
      }

      // Password confirmed -> open edit interface
      setPasswordModalOpen(false)
      setAuthenticatedCollege(selectedCollege)
      setIsPaidChecked(!!selectedCollege.is_paid)
      setPaidCountInput(selectedCollege.studentCount)
      setSuccessMsg('')
      setErrorMsg('')
    } catch (err) {
      setPasswordError(err.message || 'Failed to verify password.')
    } finally {
      setVerifyingPassword(false)
    }
  }

  // Save College Payment Status
  async function handleSavePayment() {
    if (!authenticatedCollege) return
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const colId = authenticatedCollege.id
      const newPaidCount = isPaidChecked
        ? authenticatedCollege.studentCount
        : Number(paidCountInput) || 0
      const markPaid = isPaidChecked || (newPaidCount >= authenticatedCollege.studentCount && authenticatedCollege.studentCount > 0)

      // Update college status in database (both is_paid and paid_student_count)
      const { data: updatedCollege, error: updateError } = await supabase
        .from(TABLES.COLLEGES)
        .update({
          is_paid: markPaid,
          paid_student_count: newPaidCount,
        })
        .eq('id', colId)
        .select()

      if (updateError) throw updateError

      if (!updatedCollege || updatedCollege.length === 0) {
        console.warn('College update returned 0 affected rows. Ensure database RLS allows UPDATE on colleges table.')
      }

      // Audit Log Entry
      const calculatedAmount = newPaidCount * feePerStudent

      const { error: logError } = await supabase.from(TABLES.PAYMENT_LOGS).insert({
        poll_name: profile?.name ? `Accountant: ${profile.name}` : 'Accountant Desk',
        college_name: authenticatedCollege.displayName,
        amount: calculatedAmount,
        students_count: newPaidCount,
        accountant_id: profile?.ref_id || null,
        accountant_name: profile?.name || null,
      })

      if (logError) throw logError

      setSuccessMsg(`✓ Successfully updated payment status for ${authenticatedCollege.displayName}.`)
      if (reloadColleges) reloadColleges()

      setTimeout(() => {
        setAuthenticatedCollege(null)
        setSelectedCollege(null)
      }, 1500)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save payment status.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="card" style={{ padding: '30px', textAlign: 'center' }}>Loading editable colleges...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Edit Payment Details</h2>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            List of partially paid and unpaid colleges requiring payment updates.
          </p>
        </div>
        <div style={{ minWidth: '260px', maxWidth: '340px', width: '100%' }}>
          <input
            type="text"
            className="input"
            placeholder="Search college or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* College List */}
      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>College Name</th>
              <th>Department</th>
              <th>Total Students</th>
              <th>Paid Students</th>
              <th>Pending Amount</th>
              <th style={{ width: '120px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredColleges.map((col) => (
              <tr key={col.id}>
                <td>
                  <strong style={{ color: 'var(--text-primary)' }}>{col.displayName}</strong>
                </td>
                <td>{col.department || '-'}</td>
                <td>{col.studentCount} student(s)</td>
                <td>{col.paidCount} paid</td>
                <td>
                  <strong style={{ color: '#ef4444' }}>
                    Rs. {col.pendingAmount.toLocaleString()}
                  </strong>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleOpenEditModal(col)}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  >
                    Edit Payment
                  </button>
                </td>
              </tr>
            ))}

            {filteredColleges.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '30px' }}>
                  {searchQuery.trim()
                    ? `No colleges found matching "${searchQuery}".`
                    : '✓ All registered colleges are fully paid! No pending college payments to edit.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Password Authorization Modal */}
      {passwordModalOpen && selectedCollege && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <form
            onSubmit={handleVerifyPassword}
            className="card"
            style={{ maxWidth: '440px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>
              Confirm Accountant Password
            </h3>

            {/* Warning Message Box */}
            <div
              style={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.88rem',
                color: '#f59e0b',
                lineHeight: '1.5',
              }}
            >
              <strong>⚠️ Warning Notice:</strong> If payment has updated in your module, you are only responsible for the payment you edited.
            </div>

            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Editing payment status for <strong>{selectedCollege.displayName}</strong>. Please enter your accountant password to proceed.
            </p>

            <label className="field">
              <span>Accountant Password</span>
              <input
                type="password"
                className="input"
                placeholder="Enter your password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                autoFocus
              />
            </label>

            {passwordError && (
              <p className="error" style={{ margin: 0, fontSize: '0.85rem' }}>
                {passwordError}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setPasswordModalOpen(false)}
                disabled={verifyingPassword}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={verifyingPassword}>
                {verifyingPassword ? 'Verifying...' : 'Confirm & Edit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Form Modal */}
      {authenticatedCollege && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{ maxWidth: '480px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
              Update Payment: {authenticatedCollege.displayName}
            </h3>

            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>Total Participants: <strong>{authenticatedCollege.studentCount} student(s)</strong></div>
              <div>Rate per Student: <strong>Rs. {feePerStudent}</strong></div>
              <div>Total Payable: <strong>Rs. {authenticatedCollege.payableAmount.toLocaleString()}</strong></div>
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '4px 0' }} />

            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPaidChecked}
                onChange={(e) => {
                  setIsPaidChecked(e.target.checked)
                  if (e.target.checked) {
                    setPaidCountInput(authenticatedCollege.studentCount)
                  }
                }}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Mark as FULLY PAID</span>
            </label>

            {!isPaidChecked && (
              <label className="field">
                <span>Or Enter Paid Student Count</span>
                <input
                  type="number"
                  className="input"
                  min="0"
                  max={authenticatedCollege.studentCount}
                  value={paidCountInput}
                  onChange={(e) => setPaidCountInput(e.target.value)}
                />
              </label>
            )}

            {successMsg && <p style={{ color: '#10b981', margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{successMsg}</p>}
            {errorMsg && <p className="error" style={{ margin: 0, fontSize: '0.85rem' }}>{errorMsg}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setAuthenticatedCollege(null)}
                disabled={saving}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSavePayment}
                disabled={saving}
              >
                {saving ? 'Saving Status...' : 'Save Payment Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

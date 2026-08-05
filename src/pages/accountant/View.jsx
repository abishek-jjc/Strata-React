import { useState, useMemo } from 'react'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

import { getUniqueStudents } from '../../utils/studentUtils'

export default function AccountantView() {
  const { data: colleges, loading: loadingColleges } = useTable(TABLES.COLLEGES)
  const { data: registrations, loading: loadingRegs } = useTable(TABLES.REGISTRATIONS)
  const { data: lots, loading: loadingLots } = useTable(TABLES.LOTS)
  const { data: dbStudents, loading: loadingStudents } = useTable(TABLES.STUDENTS)
  const { data: settings } = useTable(TABLES.SETTINGS)

  const students = useMemo(() => {
    return getUniqueStudents(dbStudents)
  }, [dbStudents])

  const [filter, setFilter] = useState('all') // 'all' | 'paid' | 'unpaid' | 'partially_paid'
  const [search, setSearch] = useState('')

  const loading = loadingColleges || loadingRegs || loadingLots || loadingStudents

  const feeBase = 200
  const gstRate = 0.18
  const defaultFee = Math.round(feeBase * (1 + gstRate)) // 236

  const feePerStudent = useMemo(() => {
    if (!settings) return defaultFee
    const settingFee = settings.find((s) => s.key_name === 'fee_per_student')?.value
    return settingFee ? Number(settingFee) : defaultFee
  }, [settings, defaultFee])

  // Process registered colleges with department & assigned lot
  const collegeItems = useMemo(() => {
    if (!registrations || !colleges) return []

    // Map college_id to lot_name from registrations
    const collegeLotMap = {}
    registrations.forEach((reg) => {
      if (reg.college_id && reg.lot_id) {
        const lotObj = lots.find((l) => l.id === reg.lot_id)
        if (lotObj) {
          collegeLotMap[reg.college_id] = lotObj.lot_name
        }
      }
    })

    const registeredIds = new Set(registrations.map((r) => r.college_id).filter(Boolean))

    return colleges
      .filter((c) => registeredIds.has(c.id))
      .map((c) => {
        const colStudents = students.filter((s) => s.college_id === c.id)
        const studentCount = colStudents.length
        const paidCount = c.paid_student_count ?? (c.is_paid ? studentCount : 0)

        let statusKey = 'unpaid'
        let statusLabel = 'Unpaid'
        let statusBadgeClass = 'badge-pending'

        if (studentCount > 0 && paidCount >= studentCount) {
          statusKey = 'paid'
          statusLabel = 'Fully Paid'
          statusBadgeClass = 'badge-approved'
        } else if (paidCount > 0 && paidCount < studentCount) {
          statusKey = 'partially_paid'
          statusLabel = `Partially Paid (${paidCount}/${studentCount})`
          statusBadgeClass = 'badge-active'
        }

        return {
          ...c,
          displayName: c.college,
          department: c.department || '-',
          assignedLot: collegeLotMap[c.id] || 'Not Assigned',
          studentCount,
          paidCount,
          payableAmount: studentCount * feePerStudent,
          paidAmount: Math.min(paidCount, studentCount) * feePerStudent,
          statusKey,
          statusLabel,
          statusBadgeClass,
        }
      })
  }, [colleges, registrations, lots, students, feePerStudent])

  // Filtered colleges list
  const filteredColleges = useMemo(() => {
    return collegeItems.filter((item) => {
      const matchesFilter = filter === 'all' || item.statusKey === filter
      const matchesSearch =
        search === '' ||
        item.displayName.toLowerCase().includes(search.toLowerCase()) ||
        item.department.toLowerCase().includes(search.toLowerCase()) ||
        item.assignedLot.toLowerCase().includes(search.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [collegeItems, filter, search])

  if (loading) {
    return <div className="card" style={{ padding: '30px', textAlign: 'center' }}>Loading college payment details...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ margin: 0 }}>Registered Colleges & Payment View</h2>
        <p className="muted" style={{ margin: '4px 0 0 0' }}>
          Registered colleges with assigned departments, lot numbers, and payment clearance status.
        </p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              ['all', `All (${collegeItems.length})`],
              ['paid', `Paid (${collegeItems.filter((c) => c.statusKey === 'paid').length})`],
              ['partially_paid', `Partially Paid (${collegeItems.filter((c) => c.statusKey === 'partially_paid').length})`],
              ['unpaid', `Unpaid (${collegeItems.filter((c) => c.statusKey === 'unpaid').length})`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn ${filter === key ? 'btn-primary' : ''}`}
                onClick={() => setFilter(key)}
                style={{ fontSize: '0.85rem', padding: '8px 14px' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <input
            type="text"
            className="input"
            placeholder="Search college, department, or lot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '280px', maxWidth: '100%' }}
          />

        </div>
      </div>

      {/* Data Table */}
      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>College Name</th>
              <th>Department</th>
              <th>Assigned Lot</th>
              <th>Participants</th>
              <th>Amount (Paid / Payable)</th>
              <th>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredColleges.map((col) => (
              <tr key={col.id}>
                <td>
                  <strong style={{ color: 'var(--text-primary)' }}>{col.displayName}</strong>
                </td>
                <td>{col.department}</td>
                <td>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    {col.assignedLot}
                  </span>
                </td>
                <td>{col.studentCount} student(s)</td>
                <td>
                  <strong>Rs. {col.paidAmount.toLocaleString()}</strong> / <span className="muted">Rs. {col.payableAmount.toLocaleString()}</span>
                </td>
                <td>
                  <span className={`badge ${col.statusBadgeClass}`}>
                    {col.statusLabel}
                  </span>
                </td>
              </tr>
            ))}

            {filteredColleges.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '30px' }}>
                  No colleges match the selected filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

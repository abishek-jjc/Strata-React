import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

export default function AccountantDashboard() {
  const { data: colleges, loading: loadingColleges } = useTable(TABLES.COLLEGES)
  const { data: students, loading: loadingStudents } = useTable(TABLES.STUDENTS)
  const { data: registrations, loading: loadingRegs } = useTable(TABLES.REGISTRATIONS)
  const { data: settings } = useTable(TABLES.SETTINGS)

  const loading = loadingColleges || loadingStudents || loadingRegs

  const feeBase = 200
  const gstRate = 0.18
  const defaultFee = Math.round(feeBase * (1 + gstRate)) // 236

  const feePerStudent = useMemo(() => {
    if (!settings) return defaultFee
    const settingFee = settings.find((s) => s.key_name === 'fee_per_student')?.value
    return settingFee ? Number(settingFee) : defaultFee
  }, [settings, defaultFee])

  // Identify registered colleges only
  const registeredCollegeIds = useMemo(() => {
    return new Set(registrations.map((r) => r.college_id).filter(Boolean))
  }, [registrations])

  const registeredColleges = useMemo(() => {
    return colleges.filter((c) => registeredCollegeIds.has(c.id))
  }, [colleges, registeredCollegeIds])

  // Process stats
  const stats = useMemo(() => {
    let totalCollectable = 0
    let totalCollected = 0
    let fullyPaidList = []
    let partiallyPaidList = []
    let unpaidList = []

    registeredColleges.forEach((c) => {
      const colStudents = students.filter((s) => s.college_id === c.id)
      const count = colStudents.length
      const collegeCollectable = count * feePerStudent
      totalCollectable += collegeCollectable

      const paidCount = c.paid_student_count ?? (c.is_paid ? count : 0)
      const collegeCollected = Math.min(paidCount, count) * feePerStudent
      totalCollected += collegeCollected

      const name = c.department ? `${c.college} (${c.department})` : c.college

      if (count > 0 && paidCount >= count) {
        fullyPaidList.push({ ...c, displayName: name, studentCount: count, paidCount })
      } else if (paidCount > 0 && paidCount < count) {
        partiallyPaidList.push({ ...c, displayName: name, studentCount: count, paidCount })
      } else {
        unpaidList.push({ ...c, displayName: name, studentCount: count, paidCount: 0 })
      }
    })

    const totalRemaining = Math.max(0, totalCollectable - totalCollected)

    return {
      totalCollectable,
      totalCollected,
      totalRemaining,
      fullyPaidList,
      partiallyPaidList,
      unpaidList,
    }
  }, [registeredColleges, students, feePerStudent])

  if (loading) {
    return <div className="card" style={{ padding: '30px', textAlign: 'center' }}>Loading dashboard summary...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ margin: 0 }}>Accountant Dashboard</h2>
        <p className="muted" style={{ margin: '4px 0 0 0' }}>
          Overview of total fees collectable, collected revenue, and college payment statuses.
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', borderTop: '4px solid var(--accent)' }}>
          <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>TOTAL COLLECTABLE</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '8px 0 4px 0', color: 'var(--accent)' }}>
            Rs. {stats.totalCollectable.toLocaleString()}
          </div>
          <span className="muted" style={{ fontSize: '0.8rem' }}>For all registered students</span>
        </div>

        <div className="card" style={{ padding: '20px', borderTop: '4px solid #10b981' }}>
          <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>COLLECTED AMOUNT</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '8px 0 4px 0', color: '#10b981' }}>
            Rs. {stats.totalCollected.toLocaleString()}
          </div>
          <span className="muted" style={{ fontSize: '0.8rem' }}>Total payments received</span>
        </div>

        <div className="card" style={{ padding: '20px', borderTop: '4px solid #ef4444' }}>
          <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>REMAINING TO COLLECT</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '8px 0 4px 0', color: '#ef4444' }}>
            Rs. {stats.totalRemaining.toLocaleString()}
          </div>
          <span className="muted" style={{ fontSize: '0.8rem' }}>Outstanding payment balance</span>
        </div>
      </div>

      {/* College Breakdown Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Fully Paid Colleges */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#10b981' }}>
              ✓ Fully Paid Colleges ({stats.fullyPaidList.length})
            </h3>
          </div>
          {stats.fullyPaidList.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>No fully paid colleges yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {stats.fullyPaidList.map((c) => (
                <div key={c.id} style={{ padding: '10px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.displayName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '2px' }}>
                    {c.studentCount} student(s) · Paid Rs. {(c.studentCount * feePerStudent).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Partially Paid Colleges */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f59e0b' }}>
              ⏳ Partially Paid Colleges ({stats.partiallyPaidList.length})
            </h3>
          </div>
          {stats.partiallyPaidList.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>No partially paid colleges.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {stats.partiallyPaidList.map((c) => (
                <div key={c.id} style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.displayName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '2px' }}>
                    Paid {c.paidCount} of {c.studentCount} student(s) · Remaining: Rs. {((c.studentCount - c.paidCount) * feePerStudent).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unpaid Colleges */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ef4444' }}>
              ❌ Unpaid Colleges ({stats.unpaidList.length})
            </h3>
          </div>
          {stats.unpaidList.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>No unpaid registered colleges.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {stats.unpaidList.map((c) => (
                <div key={c.id} style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.displayName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '2px' }}>
                    {c.studentCount} student(s) · Pending Rs. {(c.studentCount * feePerStudent).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

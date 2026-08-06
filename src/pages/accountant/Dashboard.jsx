import { useMemo } from 'react'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { getUniqueStudents } from '../../utils/studentUtils'
import { Users, UserCheck, ClipboardList, GraduationCap, Building2, Wallet, CheckCircle2, Clock, Utensils, User } from 'lucide-react'

export default function AccountantDashboard() {
  const { data: events } = useTable(TABLES.EVENTS) || { data: [] }
  const { data: colleges, loading: loadingColleges } = useTable(TABLES.COLLEGES) || { data: [] }
  const { data: registrations, loading: loadingRegs } = useTable(TABLES.REGISTRATIONS) || { data: [] }
  const { data: rawStudents, loading: loadingStudents } = useTable(TABLES.STUDENTS) || { data: [] }
  const { data: studentLeaders } = useTable(TABLES.STUDENT_LEADERS) || { data: [] }
  const { data: paymentLogs } = useTable(TABLES.PAYMENT_LOGS) || { data: [] }
  const { data: settingsData } = useTable(TABLES.SETTINGS) || { data: [] }

  const loading = loadingColleges || loadingStudents || loadingRegs

  const feeBase = 200
  const gstRate = 0.18
  const defaultFee = Math.round(feeBase * (1 + gstRate)) // 236

  const feePerStudent = useMemo(() => {
    if (!settingsData) return defaultFee
    const settingFee = (settingsData || []).find((s) => s.key_name === 'fee_per_student')?.value
    return settingFee ? Number(settingFee) : defaultFee
  }, [settingsData, defaultFee])

  // Unique Headcount Students
  const uniqueStudents = useMemo(() => {
    return getUniqueStudents(rawStudents || [])
  }, [rawStudents])

  // 1. Total Participants (Unique Headcount)
  const totalParticipants = uniqueStudents.length

  // 2. Total Participants with Duplicate (Sum of all event participations across all students)
  const totalParticipantsRaw = useMemo(() => {
    return (uniqueStudents || []).reduce((sum, s) => {
      const evCount = Array.isArray(s.event_ids) && s.event_ids.length > 0
        ? s.event_ids.length
        : s.event_id ? 1 : 0
      return sum + evCount
    }, 0)
  }, [uniqueStudents])

  // 3. Total Events Registrations
  const totalRegistrations = (registrations || []).length

  // 4. Total Student Leaders
  const totalStudentLeaders = (studentLeaders || []).length

  // 5. Total Colleges Registered (Only colleges that actually have registered teams/participants)
  const registeredCollegesCount = useMemo(() => {
    const regSet = new Set([
      ...(registrations || []).map((r) => r.college_id),
      ...(uniqueStudents || []).map((s) => s.college_id)
    ].filter(Boolean))
    return regSet.size
  }, [registrations, uniqueStudents])

  // 6. Total Amt Collectable
  const totalAmountCollectable = totalParticipants * feePerStudent

  // 7. Recved Amt
  const amountCollected = useMemo(() => {
    if (paymentLogs && paymentLogs.length > 0) {
      return paymentLogs.reduce((sum, log) => sum + Number(log.amount || 0), 0)
    }
    return (colleges || []).reduce((sum, c) => {
      const pCount = c.paid_student_count ?? (c.is_paid ? 1 : 0)
      return sum + pCount * feePerStudent
    }, 0)
  }, [paymentLogs, colleges, feePerStudent])

  // 8. Pending Amt
  const pendingAmount = Math.max(0, totalAmountCollectable - amountCollected)

  // 9. Veg / Non-Veg Count
  const vegCount = useMemo(() => {
    const fromStudents = uniqueStudents.filter((s) => s.food_type === 'Veg').length
    if (fromStudents > 0) return fromStudents
    return (registrations || []).reduce((sum, r) => sum + Number(r.veg_count || 0), 0)
  }, [uniqueStudents, registrations])

  const nonVegCount = useMemo(() => {
    const fromStudents = uniqueStudents.filter((s) => s.food_type === 'Non-Veg').length
    if (fromStudents > 0) return fromStudents
    return (registrations || []).reduce((sum, r) => sum + Number(r.nonveg_count || 0), 0)
  }, [uniqueStudents, registrations])

  // 10. Male / Female Count
  const maleCount = useMemo(() => {
    return uniqueStudents.filter((s) => (s.gender || '').toLowerCase() === 'male').length
  }, [uniqueStudents])

  const femaleCount = useMemo(() => {
    return uniqueStudents.filter((s) => (s.gender || '').toLowerCase() === 'female').length
  }, [uniqueStudents])

  const otherGenderCount = useMemo(() => {
    return uniqueStudents.filter((s) => {
      const g = (s.gender || '').toLowerCase()
      return g !== 'male' && g !== 'female' && g !== ''
    }).length
  }, [uniqueStudents])

  // Process college payment breakdown stats
  const collegePaymentStats = useMemo(() => {
    const registeredCollegeIds = new Set((registrations || []).map((r) => r.college_id).filter(Boolean))
    const registeredCols = (colleges || []).filter((c) => registeredCollegeIds.has(c.id))

    let fullyPaidList = []
    let partiallyPaidList = []
    let unpaidList = []

    registeredCols.forEach((c) => {
      const colStudents = uniqueStudents.filter((s) => s.college_id === c.id)
      const count = colStudents.length
      const paidCount = c.paid_student_count ?? (c.is_paid ? count : 0)
      const name = c.department ? `${c.college} (${c.department})` : c.college

      if (count > 0 && paidCount >= count) {
        fullyPaidList.push({ ...c, displayName: name, studentCount: count, paidCount })
      } else if (paidCount > 0 && paidCount < count) {
        partiallyPaidList.push({ ...c, displayName: name, studentCount: count, paidCount })
      } else if (count > 0) {
        unpaidList.push({ ...c, displayName: name, studentCount: count, paidCount: 0 })
      }
    })

    return { fullyPaidList, partiallyPaidList, unpaidList }
  }, [registrations, colleges, uniqueStudents])

  // Stat Cards Configuration (Identical to Admin Dashboard)
  const statsList = [
    {
      title: 'Total Participants',
      value: totalParticipants.toLocaleString(),
      subtext: 'Unique physical headcount',
      icon: <Users size={22} />,
      color: '#00e5ff',
      bgColor: 'rgba(0, 229, 255, 0.1)',
    },
    {
      title: 'Total Participants with Duplicate',
      value: totalParticipantsRaw.toLocaleString(),
      subtext: 'Raw total entries across all events',
      icon: <UserCheck size={22} />,
      color: '#a78bfa',
      bgColor: 'rgba(167, 139, 250, 0.1)',
    },
    {
      title: 'Total Events Registrations',
      value: totalRegistrations.toLocaleString(),
      subtext: 'Event team registration entries',
      icon: <ClipboardList size={22} />,
      color: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.1)',
    },
    {
      title: 'Total Student Leaders',
      value: totalStudentLeaders.toLocaleString(),
      subtext: 'Registered college student leaders',
      icon: <GraduationCap size={22} />,
      color: '#f472b6',
      bgColor: 'rgba(244, 114, 182, 0.1)',
    },
    {
      title: 'Total Colleges Registered',
      value: registeredCollegesCount.toLocaleString(),
      subtext: `Out of ${colleges.length} total colleges`,
      icon: <Building2 size={22} />,
      color: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.1)',
    },
    {
      title: 'Total Amt Collectable',
      value: `₹${totalAmountCollectable.toLocaleString()}`,
      subtext: `@ ₹${feePerStudent} per unique student`,
      icon: <Wallet size={22} />,
      color: '#60a5fa',
      bgColor: 'rgba(96, 165, 250, 0.1)',
    },
    {
      title: 'Recved Amt',
      value: `₹${amountCollected.toLocaleString()}`,
      subtext: 'Total verified payment received',
      icon: <CheckCircle2 size={22} />,
      color: '#34d399',
      bgColor: 'rgba(52, 211, 153, 0.1)',
    },
    {
      title: 'Pending Amt',
      value: `₹${pendingAmount.toLocaleString()}`,
      subtext: 'Outstanding balance expected',
      icon: <Clock size={22} />,
      color: '#f87171',
      bgColor: 'rgba(248, 113, 113, 0.1)',
    },
    {
      title: 'Veg / Non-Veg Count',
      value: (
        <span style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#34d399' }}>🥗 {vegCount} Veg</span>
          <span style={{ color: '#f87171' }}>🍗 {nonVegCount} Non-Veg</span>
        </span>
      ),
      subtext: 'Dietary preference tally',
      icon: <Utensils size={22} />,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
    },
    {
      title: 'Male / Female Count',
      value: (
        <span style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#60a5fa' }}>👨 {maleCount} Male</span>
          <span style={{ color: '#f472b6' }}>👩 {femaleCount} Female</span>
          {otherGenderCount > 0 && <span style={{ color: '#a78bfa' }}>👤 {otherGenderCount} Other</span>}
        </span>
      ),
      subtext: 'Gender distribution breakdown',
      icon: <User size={22} />,
      color: '#c084fc',
      bgColor: 'rgba(192, 132, 252, 0.1)',
    },
  ]

  if (loading) {
    return <div className="card" style={{ padding: '30px', textAlign: 'center' }}>Loading dashboard summary...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>Accountant Dashboard</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
          Real-time metrics, event registration statistics, payment summaries, and college payment status breakdown.
        </p>
      </div>

      {/* 10 Dashboard Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {statsList.map((st) => (
          <div
            key={st.title}
            className="card"
            style={{
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', color: 'var(--text-secondary)' }}>
                  {st.title}
                </span>
              </div>
              <div
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: st.bgColor,
                  color: st.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {st.icon}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.7rem', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {st.value}
              </div>
              <span className="muted" style={{ fontSize: '0.78rem', marginTop: '6px', display: 'block' }}>
                {st.subtext}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* College Breakdown Status Cards (Accountant Specific) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Fully Paid Colleges */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#10b981' }}>
              ✓ Fully Paid Colleges ({collegePaymentStats.fullyPaidList.length})
            </h3>
          </div>
          {collegePaymentStats.fullyPaidList.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>No fully paid colleges yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {collegePaymentStats.fullyPaidList.map((c) => (
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
              ⏳ Partially Paid Colleges ({collegePaymentStats.partiallyPaidList.length})
            </h3>
          </div>
          {collegePaymentStats.partiallyPaidList.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>No partially paid colleges.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {collegePaymentStats.partiallyPaidList.map((c) => (
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
              ❌ Unpaid Colleges ({collegePaymentStats.unpaidList.length})
            </h3>
          </div>
          {collegePaymentStats.unpaidList.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>No unpaid registered colleges.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {collegePaymentStats.unpaidList.map((c) => (
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

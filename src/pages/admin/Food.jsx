import { useMemo } from 'react'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

export default function Food() {
  const { data: dbRegistrations, loading: regLoading } = useTable(TABLES.REGISTRATIONS)
  const { data: students, loading: studLoading } = useTable(TABLES.STUDENTS)
  const { data: colleges, loading: colLoading } = useTable(TABLES.COLLEGES)

  const loading = regLoading || studLoading || colLoading

  const regStatusMap = useMemo(() => {
    const map = {}
    dbRegistrations?.forEach(r => {
      map[r.id] = r.status
    })
    return map
  }, [dbRegistrations])

  const activeStudents = useMemo(() => {
    return (students || []).filter(s => regStatusMap[s.registration_id] !== REGISTRATION_STATUS.REJECTED)
  }, [students, regStatusMap])

  // Aggregate totals across all unique students per college (ignoring REJECTED registrations)
  const stats = useMemo(() => {
    let veg = 0
    let nonveg = 0
    let total = 0

    const collegeStats = {}

    activeStudents.forEach(s => {
      const collegeId = s.college_id
      if (!collegeId) return

      if (!collegeStats[collegeId]) {
        collegeStats[collegeId] = {
          collegeId,
          uniqueStudents: {}
        }
      }

      const cleanName = s.student_name.trim().toLowerCase()
      const existing = collegeStats[collegeId].uniqueStudents[cleanName]
      
      // Keep unique students. If we have duplicate student names, prioritize Non-Veg if either is Non-Veg
      if (!existing || (s.food_type === 'Non-Veg' && existing.food_type !== 'Non-Veg')) {
        collegeStats[collegeId].uniqueStudents[cleanName] = s
      }
    })

    const list = Object.values(collegeStats).map(cStat => {
      let cVeg = 0
      let cNonVeg = 0
      
      Object.values(cStat.uniqueStudents).forEach(s => {
        if (s.food_type === 'Non-Veg') {
          cNonVeg++
        } else {
          cVeg++
        }
      })

      veg += cVeg
      nonveg += cNonVeg
      total += (cVeg + cNonVeg)

      const col = colleges?.find(c => c.id === cStat.collegeId)
      return {
        collegeId: cStat.collegeId,
        collegeName: col ? col.college : 'Unknown College',
        department: col ? (col.department || '—') : '—',
        veg: cVeg,
        nonveg: cNonVeg,
        total: cVeg + cNonVeg
      }
    }).sort((a, b) => a.collegeName.localeCompare(b.collegeName) || a.department.localeCompare(b.department))

    return { veg, nonveg, total, list }
  }, [activeStudents, colleges])

  if (loading) {
    return <p className="muted">Loading food metrics...</p>
  }

  return (
    <div>
      <h2>Food Module</h2>
      <p className="muted" style={{ marginBottom: '24px' }}>
        Total lunch requirements across all participating colleges.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card" style={{ padding: '24px', textAlign: 'center', borderTop: '4px solid #34d399' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-muted)' }}>Vegetarian</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#34d399' }}>
            {stats.veg}
          </p>
        </div>
        <div className="card" style={{ padding: '24px', textAlign: 'center', borderTop: '4px solid #ef4444' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-muted)' }}>Non-Vegetarian</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444' }}>
            {stats.nonveg}
          </p>
        </div>
        <div className="card" style={{ padding: '24px', textAlign: 'center', borderTop: '4px solid var(--accent)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-muted)' }}>Total Meals</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
            {stats.veg + stats.nonveg}
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--accent)' }}>College Breakdown</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>College</th>
                <th>Department</th>
                <th style={{ textAlign: 'center' }}>Veg</th>
                <th style={{ textAlign: 'center' }}>Non-Veg</th>
                <th style={{ textAlign: 'center' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.list.map(col => (
                <tr key={col.collegeId}>
                  <td>{col.collegeName}</td>
                  <td>{col.department}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#34d399' }}>{col.veg}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{col.nonveg}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{col.total}</td>
                </tr>
              ))}
              {stats.list.length === 0 && (
                <tr>
                  <td colSpan="5" className="muted" style={{ textAlign: 'center' }}>No food requirements registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

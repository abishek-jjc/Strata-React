import { useMemo } from 'react'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

export default function Food() {
  const { data: dbRegistrations, loading: regLoading } = useTable(TABLES.REGISTRATIONS)
  const { data: colleges, loading: colLoading } = useTable(TABLES.COLLEGES)

  const loading = regLoading || colLoading

  const registrations = useMemo(() => dbRegistrations || [], [dbRegistrations])

  // Aggregate totals across all valid registrations (ignoring REJECTED)
  const stats = useMemo(() => {
    let veg = 0
    let nonveg = 0
    let total = 0

    const collegeStats = {}

    registrations.forEach(reg => {
      if (reg.status === REGISTRATION_STATUS.REJECTED) return

      const v = reg.veg_count || 0
      const nv = reg.nonveg_count || 0
      const collegeId = reg.college_id

      if (!collegeStats[collegeId]) {
        collegeStats[collegeId] = {
          collegeId,
          veg: v,
          nonveg: nv,
          total: v + nv,
        }
        veg += v
        nonveg += nv
        total += (v + nv)
      } else {
        // If the food counts are updated identically across events, we just take the max to be safe
        const current = collegeStats[collegeId]
        if (v > current.veg) {
          veg += (v - current.veg)
          current.veg = v
        }
        if (nv > current.nonveg) {
          nonveg += (nv - current.nonveg)
          current.nonveg = nv
        }
        current.total = current.veg + current.nonveg
      }
    })

    const list = Object.values(collegeStats).map(s => {
      const col = colleges?.find(c => c.id === s.collegeId)
      return {
        ...s,
        collegeName: col?.college || 'Unknown College'
      }
    }).sort((a, b) => a.collegeName.localeCompare(b.collegeName))

    return { veg, nonveg, total, list }
  }, [registrations, colleges])

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
                <th style={{ textAlign: 'center' }}>Veg</th>
                <th style={{ textAlign: 'center' }}>Non-Veg</th>
                <th style={{ textAlign: 'center' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.list.map(col => (
                <tr key={col.collegeId}>
                  <td>{col.collegeName}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#34d399' }}>{col.veg}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{col.nonveg}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{col.total}</td>
                </tr>
              ))}
              {stats.list.length === 0 && (
                <tr>
                  <td colSpan="4" className="muted" style={{ textAlign: 'center' }}>No food requirements registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

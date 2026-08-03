import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'
import { Utensils, Download, Search, PieChart, Layers } from 'lucide-react'

function normalizeGender(g) {
  if (!g) return 'Other'
  const trimmed = String(g).trim().toLowerCase()
  if (trimmed === 'male' || trimmed === 'm') return 'Male'
  if (trimmed === 'female' || trimmed === 'f') return 'Female'
  return 'Other'
}

export default function Food() {
  const { data: dbRegistrations, loading: regLoading } = useTable(TABLES.REGISTRATIONS)
  const { data: students, loading: studLoading } = useTable(TABLES.STUDENTS)
  const { data: colleges, loading: colLoading } = useTable(TABLES.COLLEGES)

  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('detailed') // 'detailed' | 'compact'

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

    const vegByGender = { Male: 0, Female: 0, Other: 0 }
    const nonvegByGender = { Male: 0, Female: 0, Other: 0 }
    const totalByGender = { Male: 0, Female: 0, Other: 0 }

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
      const cVegGender = { Male: 0, Female: 0, Other: 0 }
      const cNonVegGender = { Male: 0, Female: 0, Other: 0 }

      Object.values(cStat.uniqueStudents).forEach(s => {
        const g = normalizeGender(s.gender)
        if (s.food_type === 'Non-Veg') {
          cNonVeg++
          cNonVegGender[g] = (cNonVegGender[g] || 0) + 1
          nonvegByGender[g] = (nonvegByGender[g] || 0) + 1
        } else {
          cVeg++
          cVegGender[g] = (cVegGender[g] || 0) + 1
          vegByGender[g] = (vegByGender[g] || 0) + 1
        }
        totalByGender[g] = (totalByGender[g] || 0) + 1
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
        vegGender: cVegGender,
        nonveg: cNonVeg,
        nonvegGender: cNonVegGender,
        total: cVeg + cNonVeg,
        totalGender: {
          Male: cVegGender.Male + cNonVegGender.Male,
          Female: cVegGender.Female + cNonVegGender.Female,
          Other: cVegGender.Other + cNonVegGender.Other
        }
      }
    }).sort((a, b) => a.collegeName.localeCompare(b.collegeName) || a.department.localeCompare(b.department))

    const hasOther = vegByGender.Other > 0 || nonvegByGender.Other > 0

    return { veg, nonveg, total, vegByGender, nonvegByGender, totalByGender, list, hasOther }
  }, [activeStudents, colleges])

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return stats.list
    const term = searchTerm.toLowerCase()
    return stats.list.filter(
      item =>
        item.collegeName.toLowerCase().includes(term) ||
        item.department.toLowerCase().includes(term)
    )
  }, [stats.list, searchTerm])

  const exportToExcel = () => {
    const exportData = stats.list.map(col => {
      const row = {
        'College Name': col.collegeName,
        'Department': col.department,
        'Veg (Male)': col.vegGender.Male,
        'Veg (Female)': col.vegGender.Female,
      }
      if (stats.hasOther) row['Veg (Other)'] = col.vegGender.Other
      row['Veg Total'] = col.veg

      row['Non-Veg (Male)'] = col.nonvegGender.Male
      row['Non-Veg (Female)'] = col.nonvegGender.Female
      if (stats.hasOther) row['Non-Veg (Other)'] = col.nonvegGender.Other
      row['Non-Veg Total'] = col.nonveg

      row['Total (Male)'] = col.totalGender.Male
      row['Total (Female)'] = col.totalGender.Female
      if (stats.hasOther) row['Total (Other)'] = col.totalGender.Other
      row['Grand Total'] = col.total

      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Food Distribution')
    XLSX.writeFile(workbook, `Food_Distribution_Genderwise_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (loading) {
    return <p className="muted">Loading food metrics...</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <h2>
          <Utensils style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent)' }} size={26} />
          Food Module
        </h2>
        <button 
          className="btn btn-secondary" 
          onClick={exportToExcel}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <Download size={16} /> Export Excel
        </button>
      </div>

      <p className="muted" style={{ marginBottom: '24px' }}>
        Gender-wise vegetarian and non-vegetarian lunch requirements across all participating colleges.
      </p>

      {/* Overview Cards with Gender Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {/* Vegetarian Card */}
        <div className="card" style={{ padding: '20px', borderTop: '4px solid #34d399' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)' }}>Vegetarian</h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
              VEG
            </span>
          </div>
          <p style={{ margin: '10px 0 12px 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#34d399', lineHeight: 1 }}>
            {stats.veg}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
            <span style={{ color: '#60a5fa' }}>👨 Male: <strong>{stats.vegByGender.Male}</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ color: '#f472b6' }}>👩 Female: <strong>{stats.vegByGender.Female}</strong></span>
            {stats.hasOther && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span style={{ color: '#fbbf24' }}>🧑 Other: <strong>{stats.vegByGender.Other}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Non-Vegetarian Card */}
        <div className="card" style={{ padding: '20px', borderTop: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)' }}>Non-Vegetarian</h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              NON-VEG
            </span>
          </div>
          <p style={{ margin: '10px 0 12px 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', lineHeight: 1 }}>
            {stats.nonveg}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
            <span style={{ color: '#60a5fa' }}>👨 Male: <strong>{stats.nonvegByGender.Male}</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ color: '#f472b6' }}>👩 Female: <strong>{stats.nonvegByGender.Female}</strong></span>
            {stats.hasOther && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span style={{ color: '#fbbf24' }}>🧑 Other: <strong>{stats.nonvegByGender.Other}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Total Meals Card */}
        <div className="card" style={{ padding: '20px', borderTop: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)' }}>Total Meals</h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent)' }}>
              TOTAL
            </span>
          </div>
          <p style={{ margin: '10px 0 12px 0', fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent)', lineHeight: 1 }}>
            {stats.total}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
            <span style={{ color: '#60a5fa' }}>👨 Male: <strong>{stats.totalByGender.Male}</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ color: '#f472b6' }}>👩 Female: <strong>{stats.totalByGender.Female}</strong></span>
            {stats.hasOther && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span style={{ color: '#fbbf24' }}>🧑 Other: <strong>{stats.totalByGender.Other}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gender Summary Matrix Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
            <PieChart size={18} /> Gender-Wise Food Summary Matrix
          </h3>
        </div>
        <div className="table-responsive">
          <table className="data-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>Gender Category</th>
                <th style={{ textAlign: 'center', color: '#34d399' }}>Vegetarian</th>
                <th style={{ textAlign: 'center', color: '#ef4444' }}>Non-Vegetarian</th>
                <th style={{ textAlign: 'center', color: 'var(--accent)' }}>Total Meals</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong style={{ color: '#60a5fa' }}>👨 Male Candidates</strong></td>
                <td style={{ textAlign: 'center', fontWeight: '600' }}>{stats.vegByGender.Male}</td>
                <td style={{ textAlign: 'center', fontWeight: '600' }}>{stats.nonvegByGender.Male}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.totalByGender.Male}</td>
              </tr>
              <tr>
                <td><strong style={{ color: '#f472b6' }}>👩 Female Candidates</strong></td>
                <td style={{ textAlign: 'center', fontWeight: '600' }}>{stats.vegByGender.Female}</td>
                <td style={{ textAlign: 'center', fontWeight: '600' }}>{stats.nonvegByGender.Female}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.totalByGender.Female}</td>
              </tr>
              {stats.hasOther && (
                <tr>
                  <td><strong style={{ color: '#fbbf24' }}>🧑 Other / Unspecified</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>{stats.vegByGender.Other}</td>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>{stats.nonvegByGender.Other}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.totalByGender.Other}</td>
                </tr>
              )}
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <td><strong>Total Overall</strong></td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#34d399' }}>{stats.veg}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{stats.nonveg}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* College Breakdown Table Section */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--accent)' }}>College & Department Breakdown</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search college..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px 6px 32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                  background: 'var(--bg-input, rgba(0,0,0,0.2))',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                onClick={() => setViewMode('detailed')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: viewMode === 'detailed' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'detailed' ? '#fff' : 'var(--text-muted)',
                  fontWeight: viewMode === 'detailed' ? 'bold' : 'normal'
                }}
              >
                Gender Columns
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: viewMode === 'compact' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'compact' ? '#fff' : 'var(--text-muted)',
                  fontWeight: viewMode === 'compact' ? 'bold' : 'normal'
                }}
              >
                Compact
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            {viewMode === 'detailed' ? (
              <thead>
                <tr>
                  <th rowSpan="2" style={{ verticalAlign: 'middle' }}>College</th>
                  <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Department</th>
                  <th colSpan={stats.hasOther ? 4 : 3} style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#34d399' }}>
                    Vegetarian
                  </th>
                  <th colSpan={stats.hasOther ? 4 : 3} style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ef4444' }}>
                    Non-Vegetarian
                  </th>
                  <th colSpan={stats.hasOther ? 4 : 3} style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent)' }}>
                    Total Meals
                  </th>
                </tr>
                <tr>
                  {/* Veg Subheaders */}
                  <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#60a5fa' }}>Male</th>
                  <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#f472b6' }}>Female</th>
                  {stats.hasOther && <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#fbbf24' }}>Other</th>}
                  <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#34d399', fontWeight: 'bold' }}>Total</th>

                  {/* Non-Veg Subheaders */}
                  <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#60a5fa' }}>Male</th>
                  <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#f472b6' }}>Female</th>
                  {stats.hasOther && <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#fbbf24' }}>Other</th>}
                  <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#ef4444', fontWeight: 'bold' }}>Total</th>

                  {/* Total Subheaders */}
                  <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#60a5fa' }}>Male</th>
                  <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#f472b6' }}>Female</th>
                  {stats.hasOther && <th style={{ textAlign: 'center', fontSize: '0.78rem', color: '#fbbf24' }}>Other</th>}
                  <th style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 'bold' }}>Total</th>
                </tr>
              </thead>
            ) : (
              <thead>
                <tr>
                  <th>College</th>
                  <th>Department</th>
                  <th style={{ textAlign: 'center', color: '#34d399' }}>Veg (M / F)</th>
                  <th style={{ textAlign: 'center', color: '#ef4444' }}>Non-Veg (M / F)</th>
                  <th style={{ textAlign: 'center', color: 'var(--accent)' }}>Total (M / F)</th>
                </tr>
              </thead>
            )}

            <tbody>
              {viewMode === 'detailed' ? (
                filteredList.map(col => (
                  <tr key={col.collegeId}>
                    <td><strong>{col.collegeName}</strong></td>
                    <td>{col.department}</td>

                    {/* Veg Breakdown */}
                    <td style={{ textAlign: 'center', color: col.vegGender.Male ? '#60a5fa' : 'var(--text-muted)' }}>{col.vegGender.Male || 0}</td>
                    <td style={{ textAlign: 'center', color: col.vegGender.Female ? '#f472b6' : 'var(--text-muted)' }}>{col.vegGender.Female || 0}</td>
                    {stats.hasOther && <td style={{ textAlign: 'center', color: col.vegGender.Other ? '#fbbf24' : 'var(--text-muted)' }}>{col.vegGender.Other || 0}</td>}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#34d399' }}>{col.veg}</td>

                    {/* Non-Veg Breakdown */}
                    <td style={{ textAlign: 'center', color: col.nonvegGender.Male ? '#60a5fa' : 'var(--text-muted)' }}>{col.nonvegGender.Male || 0}</td>
                    <td style={{ textAlign: 'center', color: col.nonvegGender.Female ? '#f472b6' : 'var(--text-muted)' }}>{col.nonvegGender.Female || 0}</td>
                    {stats.hasOther && <td style={{ textAlign: 'center', color: col.nonvegGender.Other ? '#fbbf24' : 'var(--text-muted)' }}>{col.nonvegGender.Other || 0}</td>}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{col.nonveg}</td>

                    {/* Total Breakdown */}
                    <td style={{ textAlign: 'center', color: col.totalGender.Male ? '#60a5fa' : 'var(--text-muted)' }}>{col.totalGender.Male || 0}</td>
                    <td style={{ textAlign: 'center', color: col.totalGender.Female ? '#f472b6' : 'var(--text-muted)' }}>{col.totalGender.Female || 0}</td>
                    {stats.hasOther && <td style={{ textAlign: 'center', color: col.totalGender.Other ? '#fbbf24' : 'var(--text-muted)' }}>{col.totalGender.Other || 0}</td>}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>{col.total}</td>
                  </tr>
                ))
              ) : (
                filteredList.map(col => (
                  <tr key={col.collegeId}>
                    <td><strong>{col.collegeName}</strong></td>
                    <td>{col.department}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#34d399', fontSize: '1rem' }}>{col.veg}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span style={{ color: '#60a5fa' }}>M: {col.vegGender.Male}</span> | <span style={{ color: '#f472b6' }}>F: {col.vegGender.Female}</span>
                        {col.vegGender.Other > 0 ? ` | O: ${col.vegGender.Other}` : ''}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '1rem' }}>{col.nonveg}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span style={{ color: '#60a5fa' }}>M: {col.nonvegGender.Male}</span> | <span style={{ color: '#f472b6' }}>F: {col.nonvegGender.Female}</span>
                        {col.nonvegGender.Other > 0 ? ` | O: ${col.nonvegGender.Other}` : ''}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '1rem' }}>{col.total}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span style={{ color: '#60a5fa' }}>M: {col.totalGender.Male}</span> | <span style={{ color: '#f472b6' }}>F: {col.totalGender.Female}</span>
                        {col.totalGender.Other > 0 ? ` | O: ${col.totalGender.Other}` : ''}
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={viewMode === 'detailed' ? (stats.hasOther ? 14 : 11) : 5} className="muted" style={{ textAlign: 'center', padding: '24px' }}>
                    {searchTerm ? 'No matching colleges found.' : 'No food requirements registered yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


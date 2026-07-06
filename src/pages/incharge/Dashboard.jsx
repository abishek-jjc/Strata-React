import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { exportToExcel } from '../../utils/excelExport'

export default function Dashboard() {
  const { profile } = useAuth()
  const [incharge, setIncharge] = useState(null)
  const [event, setEvent] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [winnerPlaces, setWinnerPlaces] = useState({})
  const [saving, setSaving] = useState({})
  const [search, setSearch] = useState('')

  // Fetch colleges so we can map student.college_id to name
  const { data: colleges } = useTable(TABLES.COLLEGES)

  useEffect(() => {
    async function loadInchargeProfile() {
      if (!profile?.ref_id) {
        setLoadingProfile(false)
        return
      }

      try {
        const { data: inchRow, error: inchError } = await supabase
          .from(TABLES.INCHARGES)
          .select('*')
          .eq('id', profile.ref_id)
          .single()

        if (inchError) throw inchError
        setIncharge(inchRow)

        if (inchRow?.event_id) {
          const { data: eventRow, error: eventError } = await supabase
            .from(TABLES.EVENTS)
            .select('*')
            .eq('id', inchRow.event_id)
            .single()

          if (!eventError) {
            setEvent(eventRow)
          }
        }
      } catch (err) {
        console.error('Error loading incharge profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    loadInchargeProfile()
  }, [profile])

  // Fetch students for this incharge's event (if assigned)
  const { data: students, loading: studentsLoading } = useTable(
    TABLES.STUDENTS,
    incharge?.event_id ? [['event_id', 'eq', incharge.event_id]] : []
  )

  // Sync loaded student winner places to local state
  useEffect(() => {
    if (students.length > 0) {
      const places = {}
      students.forEach((s) => {
        places[s.id] = s.winner_place || ''
      })
      setWinnerPlaces(places)
    }
  }, [students])

  async function handleSaveWinner(studentId) {
    const place = winnerPlaces[studentId] || ''
    setSaving((prev) => ({ ...prev, [studentId]: true }))
    try {
      const { error } = await supabase
        .from(TABLES.STUDENTS)
        .update({ winner_place: place })
        .eq('id', studentId)

      if (error) throw error
      alert('Winner position saved successfully!')
    } catch (err) {
      alert(err.message || 'Failed to save winner place.')
    } finally {
      setSaving((prev) => ({ ...prev, [studentId]: false }))
    }
  }

  if (loadingProfile || (incharge?.event_id && studentsLoading)) {
    return <p className="muted">Loading dashboard…</p>
  }

  if (!incharge?.event_id) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <h3>Incharge Portal</h3>
        <p className="muted">Hello, {profile?.name || 'Incharge'}.</p>
        <div className="error" style={{ display: 'inline-block', marginTop: 15, padding: '10px 20px' }}>
          You have not been assigned to supervise any event yet. Please contact the administrator.
        </div>
      </div>
    )
  }

  // Filter students by search query
  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase()
    const nameMatch = s.student_name.toLowerCase().includes(q)
    const emailMatch = (s.email || '').toLowerCase().includes(q)
    const classMatch = (s.year || '').toLowerCase().includes(q)
    const collegeName = colleges.find((c) => c.id === s.college_id)?.college || ''
    const collegeMatch = collegeName.toLowerCase().includes(q)
    return nameMatch || emailMatch || classMatch || collegeMatch
  })

  const getCollegeName = (id) => colleges.find((c) => c.id === id)?.college || 'Loading…'

  return (
    <div>
      <div className="crud-header" style={{ marginBottom: 20 }}>
        <div>
          <h2>Staff Incharge Portal</h2>
          <p className="muted">
            Welcome back, <strong>{incharge.name}</strong> · Event Coordinator
          </p>
        </div>
      </div>

      {/* Event Details Card */}
      {event && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Assigned Event: {event.event_name}</h3>
          <p style={{ margin: '5px 0' }}>{event.description}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginTop: 15 }}>
            <div className="stat" style={{ border: '1px solid var(--border)', background: 'var(--bg-muted)', padding: 10 }}>
              <div className="stat-label">Category</div>
              <div style={{ fontWeight: 'bold', marginTop: 5 }}>{event.category || 'N/A'}</div>
            </div>
            <div className="stat" style={{ border: '1px solid var(--border)', background: 'var(--bg-muted)', padding: 10 }}>
              <div className="stat-label">Mains Date & Venue</div>
              <div style={{ fontWeight: 'bold', marginTop: 5 }}>
                {event.mains_date || 'N/A'} · {event.mains_venue || 'N/A'}
              </div>
            </div>
            <div className="stat" style={{ border: '1px solid var(--border)', background: 'var(--bg-muted)', padding: 10 }}>
              <div className="stat-label">Team Constraints</div>
              <div style={{ fontWeight: 'bold', marginTop: 5 }}>
                Size: {event.team_size || 'N/A'} ({event.minimum_participants}–{event.maximum_participants} members)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Table */}
      <div className="crud-header">
        <h3>Participants Registered ({filteredStudents.length})</h3>
        <div className="crud-actions">
          <input
            className="input"
            placeholder="Search participants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
          />
          <button className="btn" onClick={() => exportToExcel(filteredStudents, `participants_${event?.event_name}`)}>
            Export Excel
          </button>
        </div>
      </div>

      <table className="data-table" style={{ marginTop: 15 }}>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Class (Year)</th>
            <th>Email</th>
            <th>College</th>
            <th>Winner Position</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((s) => (
            <tr key={s.id}>
              <td>{s.student_name}</td>
              <td>{s.year || '—'}</td>
              <td>{s.email || '—'}</td>
              <td>{getCollegeName(s.college_id)}</td>
              <td>
                <select
                  value={winnerPlaces[s.id] || ''}
                  onChange={(e) => setWinnerPlaces({ ...winnerPlaces, [s.id]: e.target.value })}
                  className="input"
                  style={{ width: 140, padding: '3px 8px' }}
                >
                  <option value="">None</option>
                  <option value="1st Place">1st Place</option>
                  <option value="2nd Place">2nd Place</option>
                  <option value="3rd Place">3rd Place</option>
                </select>
              </td>
              <td>
                <button
                  onClick={() => handleSaveWinner(s.id)}
                  disabled={saving[s.id]}
                  className="link"
                  style={{ fontWeight: 'bold' }}
                >
                  {saving[s.id] ? 'Saving…' : 'Save'}
                </button>
              </td>
            </tr>
          ))}
          {filteredStudents.length === 0 && (
            <tr>
              <td colSpan={6} className="muted" style={{ textAlign: 'center' }}>
                No students registered for this event yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'

export default function Dashboard() {
  const { profile } = useAuth()
  const { data: registrations, loading: regsLoading } = useTable(TABLES.REGISTRATIONS, [
    ['leader_id', 'eq', profile?.ref_id],
  ])
  const { data: events, loading: eventsLoading } = useTable(TABLES.EVENTS)
  const { data: colleges, loading: collegesLoading } = useTable(TABLES.COLLEGES)
  const { data: lots, loading: lotsLoading } = useTable(TABLES.LOTS)
  const { data: venues, loading: venuesLoading } = useTable(TABLES.VENUES)

  const loading = regsLoading || eventsLoading || collegesLoading || lotsLoading || venuesLoading

  // Find college and lot assigned to this leader
  const myCollege = colleges.find((c) => c.id === profile?.college_id)
  const myCollegeName = myCollege?.college || myCollege?.college_name || ''
  const myCollegeDept = myCollege?.department || ''
  const displayCollege = myCollegeDept ? `${myCollegeName} (${myCollegeDept})` : myCollegeName
  const collegeLot = lots.find((l) => l.assigned_college === displayCollege)

  if (loading) return <p className="muted">Loading dashboard...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h2>Welcome, {profile?.name}</h2>
        <p className="muted">Student Leader Coordinator</p>
      </div>

      {/* Lot Status Card */}
      <div className="card" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Your College Lot Number</h3>
        {collegeLot ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>{collegeLot.lot_name}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 8px', borderRadius: '4px' }}>
              ✓ Allocated to {displayCollege}
            </span>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', margin: '10px 0 0 0', fontSize: '0.95rem' }}>
            Waiting for admin to allocate lot. Lots are assigned automatically after successful registration verification.
          </p>
        )}
      </div>

      {/* Registrations List */}
      <div>
        <h3 style={{ marginBottom: '15px' }}>Registered Contests</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Category</th>
                <th>Prelims Venue</th>
                <th>Prelims Time</th>
                <th>Mains Venue</th>
                <th>Mains Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const event = events.find((e) => e.id === r.event_id)
                const prelimsVenue = event ? (venues.find((v) => v.id === event.prelims_venue)?.venue_name || 'TBD') : 'TBD'
                const mainsVenue = event ? (venues.find((v) => v.id === event.mains_venue)?.venue_name || 'TBD') : 'TBD'
                return (
                  <tr key={r.id}>
                    <td>
                      <strong>{event?.event_name || r.event_id}</strong>
                    </td>
                    <td>{event?.category || '—'}</td>
                    <td>{prelimsVenue}</td>
                    <td>{event?.preliminary || '—'}</td>
                    <td>{mainsVenue}</td>
                    <td>{event?.mains || '—'}</td>
                    <td>
                      <span className={`badge badge-${r.status}`}>{r.status}</span>
                    </td>
                  </tr>
                )
              })}
              {registrations.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: '30px' }}>
                    No contest registrations found yet.
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

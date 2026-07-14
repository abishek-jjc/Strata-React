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
          <p style={{ color: 'var(--text-muted)', margin: '10px 0 0 0', fontSize: '0.95rem', lineHeight: '1.6' }}>
            🎟️ Your lot will be <strong style={{ color: 'var(--text-primary)' }}>automatically assigned</strong> once your college registers at least one participant in a <strong style={{ color: 'var(--accent)' }}>technical event</strong>. Head to <em>Registration & Teams</em> to get started.
          </p>
        )}
      </div>

      {/* Registrations List */}
      <div>
        <h3 style={{ marginBottom: '20px', fontFamily: 'Syne, sans-serif', color: 'var(--accent)' }}>Registered Contests</h3>
        {registrations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-secondary)',
            background: 'var(--surface-raised)',
            border: '1px dashed var(--border-strong)',
            borderRadius: '12px',
          }}>
            No contest registrations found yet.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {registrations.map((r) => {
              const event = events.find((e) => e.id === r.event_id)
              const prelimsVenue = event ? (venues.find((v) => v.id === event.prelims_venue)?.venue_name || 'TBD') : 'TBD'
              const mainsVenue = event ? (venues.find((v) => v.id === event.mains_venue)?.venue_name || 'TBD') : 'TBD'
              return (
                <div 
                  key={r.id} 
                  className="card"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        {event?.event_name || r.event_id}
                      </h4>
                      <span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status}</span>
                    </div>
                    
                    {event?.category && (
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        background: 'rgba(var(--accent-rgb), 0.1)',
                        color: 'var(--accent)',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginBottom: '16px'
                      }}>
                        {event.category}
                      </span>
                    )}
 
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                      <div style={{ borderLeft: '3px solid var(--border-strong)', paddingLeft: '10px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Preliminaries</div>
                        <div>📍 <strong style={{ color: 'var(--text-primary)' }}>{prelimsVenue}</strong></div>
                        <div className="muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>🕒 {event?.preliminary || '—'}</div>
                      </div>
                      
                      <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '10px' }}>
                        <div style={{ color: 'var(--accent)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Mains</div>
                        <div>📍 <strong style={{ color: 'var(--text-primary)' }}>{mainsVenue}</strong></div>
                        <div className="muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>🕒 {event?.mains || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

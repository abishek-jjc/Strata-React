import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import BackButton from '../../components/common/BackButton'

export default function EventRules() {
  const [events, setEvents] = useState([])
  const [venues, setVenues] = useState([])
  const [incharges, setIncharges] = useState([])
  const [activeEventId, setActiveEventId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const [eventsRes, venuesRes, inchargesRes] = await Promise.all([
        supabase
          .from(TABLES.EVENTS)
          .select('*')
          .eq('status', 'active')
          .order('event_name', { ascending: true }),
        supabase
          .from(TABLES.VENUES)
          .select('*'),
        supabase
          .from(TABLES.INCHARGES)
          .select('*')
      ])
      if (eventsRes.data) {
        setEvents(eventsRes.data)
        if (eventsRes.data.length > 0) setActiveEventId(eventsRes.data[0].id)
      }
      if (venuesRes.data) {
        setVenues(venuesRes.data)
      }
      if (inchargesRes.data) {
        setIncharges(inchargesRes.data)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const getVenueName = (venueId) => {
    if (!venueId) return '—'
    const venue = venues.find(v => v.id === venueId)
    return venue ? venue.venue_name : '—'
  }

  const activeEvent = events.find(e => e.id === activeEventId)
  const staffInchargeObj = activeEvent ? incharges.find(i => i.id === activeEvent.staff_incharge) : null
  const staffName = staffInchargeObj ? staffInchargeObj.name : 'TBD'
  const staffEmail = staffInchargeObj ? staffInchargeObj.email : null

  if (loading) return <p className="muted">Loading events...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BackButton />
        <div>
          <h2 style={{ margin: 0 }}>Event Rules</h2>
          <p className="muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            View rules, guidelines, staff-in-charge, and venue details for each event.
          </p>
        </div>
      </div>

      {/* Horizontal event scroller */}
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          No active events available.
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '10px',
            paddingTop: '4px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.15) transparent',
          }}>
            {events.map(ev => {
              const isActive = ev.id === activeEventId
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setActiveEventId(ev.id)}
                  style={{
                    flexShrink: 0,
                    padding: '10px 20px',
                    borderRadius: '24px',
                    border: isActive
                      ? '2px solid var(--accent)'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: isActive
                      ? 'rgba(0, 229, 255, 0.12)'
                      : 'rgba(255,255,255,0.03)',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 400,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ev.event_name}
                </button>
              )
            })}
          </div>

          {/* Event Detail Panel */}
          {activeEvent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header */}
              <div className="card" style={{
                padding: '28px',
                background: 'rgba(0, 229, 255, 0.04)',
                border: '1px solid rgba(0, 229, 255, 0.14)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {activeEvent.event_name}
                    </div>
                    {activeEvent.category && (
                      <span style={{
                        display: 'inline-block', padding: '3px 12px',
                        background: 'rgba(0,229,255,0.1)', color: 'var(--accent)',
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600
                      }}>
                        {activeEvent.category}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Team Size</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>
                      {activeEvent.team_size}
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}>
                {/* Timing */}
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.08em' }}>
                    🕒 Schedule
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                    {activeEvent.preliminary && (
                      <div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '2px' }}>Preliminaries</div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeEvent.preliminary}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '2px' }}>Mains / Finals</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeEvent.mains || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Venue */}
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.08em' }}>
                    📍 Venues
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                    {activeEvent.prelims_venue && (
                      <div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '2px' }}>Prelims Venue</div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{getVenueName(activeEvent.prelims_venue)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '2px' }}>Mains Venue</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{getVenueName(activeEvent.mains_venue)}</div>
                    </div>
                  </div>
                </div>

                {/* Staff In-Charge */}
                {activeEvent.staff_incharge && (
                  <div className="card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.08em' }}>
                      👤 Staff In-Charge
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>{staffName}</div>
                    {staffEmail && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>{staffEmail}</div>
                    )}
                  </div>
                )}

                {/* Prize */}
                {(activeEvent.first_prize || activeEvent.second_prize) && (
                  <div className="card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.08em' }}>
                      🏆 Prizes
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                      {activeEvent.first_prize && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>1st Prize</span>
                          <div style={{ color: '#ffd700', fontWeight: 700 }}>{activeEvent.first_prize}</div>
                        </div>
                      )}
                      {activeEvent.second_prize && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>2nd Prize</span>
                          <div style={{ color: '#c0c0c0', fontWeight: 700 }}>{activeEvent.second_prize}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Rules & Guidelines */}
              {activeEvent.rules && (
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '16px', letterSpacing: '0.08em' }}>
                    📋 Rules & Guidelines
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                    {activeEvent.rules}
                  </div>
                </div>
              )}

              {/* Description */}
              {activeEvent.description && (
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.08em' }}>
                    ℹ️ About This Event
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.7', margin: 0 }}>
                    {activeEvent.description}
                  </p>
                </div>
              )}

              {/* Fallback if minimal data */}
              {!activeEvent.rules && !activeEvent.description && !activeEvent.staff_incharge && (
                <div style={{
                  textAlign: 'center', padding: '30px',
                  color: 'var(--text-secondary)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: '12px'
                }}>
                  No additional details have been added for this event yet.
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

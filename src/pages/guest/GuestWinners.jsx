import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'
import { 
  Code2, 
  Brain, 
  Recycle, 
  Trophy,
  QrCode,
  Lightbulb,
  Bug,
  Film
} from 'lucide-react'

const EVENT_ICONS = {
  'logic hunt': QrCode,
  'mind spark': Brain,
  'code detox': Recycle,
  'tech premier league': Trophy,
  'idea forge': Lightbulb,
  'code sprint': Code2,
  'syntax wars': Bug,
  'frame fusion': Film
}

const getEventIcon = (name) => {
  if (!name) return null
  const normalized = name.toLowerCase().trim()
  const IconComponent = EVENT_ICONS[normalized] || Trophy
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      filter: 'drop-shadow(0 0 25px rgba(0, 242, 254, 0.45))' 
    }}>
      <IconComponent size={140} strokeWidth={1.2} style={{ color: 'var(--g-secondary)' }} />
    </div>
  )
}

export default function GuestWinners() {
  const [events, setEvents] = useState([])
  const [lots, setLots] = useState([])
  const [colleges, setColleges] = useState([])
  const [winners, setWinners] = useState([])
  const [venues, setVenues] = useState([])
  const [incharges, setIncharges] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    async function loadData() {
      const [eventsRes, lotsRes, collegesRes, winnersRes, venuesRes, inchargesRes] = await Promise.all([
        supabase
          .from(TABLES.EVENTS)
          .select('*')
          .eq('status', 'active')
          .order('event_name', { ascending: true }),
        supabase.from(TABLES.LOTS).select('*'),
        supabase.from(TABLES.COLLEGES).select('*'),
        supabase.from(TABLES.WINNERS).select('*'),
        supabase.from(TABLES.VENUES).select('*'),
        supabase.from(TABLES.INCHARGES).select('*'),
      ])

      if (eventsRes.data) setEvents(eventsRes.data)
      if (lotsRes.data) setLots(lotsRes.data)
      if (collegesRes.data) setColleges(collegesRes.data)
      if (winnersRes.data) setWinners(winnersRes.data)
      if (venuesRes.data) setVenues(venuesRes.data)
      if (inchargesRes.data) setIncharges(inchargesRes.data)

      setLoading(false)
    }
    loadData()
  }, [])

  // Resolve college details by lot name
  const resolveCollegeByLot = (lotName) => {
    if (!lotName || lotName === '-') return ''
    const lot = lots.find((l) => l.lot_name && l.lot_name.toLowerCase().trim() === lotName.toLowerCase().trim())
    return lot && lot.assigned_college && lot.assigned_college !== '-' ? lot.assigned_college : ''
  }

  // Calculate overall standings
  const getLeaderboard = () => {
    const assignedLotsMap = new Map()
    lots.forEach(l => {
      if (l.lot_name && l.lot_name !== '-') {
        assignedLotsMap.set(l.lot_name.toLowerCase().trim(), l)
      }
    })

    winners.forEach(w => {
      if (w.mains_published) {
        if (w.first_place && w.first_place !== '-' && !assignedLotsMap.has(w.first_place.toLowerCase().trim())) {
          assignedLotsMap.set(w.first_place.toLowerCase().trim(), {
            lot_name: w.first_place,
            is_assigned: true,
            assigned_college: '-'
          })
        }
        if (w.second_place && w.second_place !== '-' && !assignedLotsMap.has(w.second_place.toLowerCase().trim())) {
          assignedLotsMap.set(w.second_place.toLowerCase().trim(), {
            lot_name: w.second_place,
            is_assigned: true,
            assigned_college: '-'
          })
        }
      }
    })

    return Array.from(assignedLotsMap.values())
      .map((lot) => {
        const lotNameClean = lot.lot_name.toLowerCase().trim()

        // Mains winners point calculation checking mains_published for guests
        const firsts = winners.filter((w) => 
          w.mains_published &&
          w.first_place && 
          w.first_place.toLowerCase().trim() === lotNameClean
        ).length

        const seconds = winners.filter((w) => 
          w.mains_published &&
          w.second_place && 
          w.second_place.toLowerCase().trim() === lotNameClean
        ).length

        const points = firsts * 5 + seconds * 3

        return {
          lot_name: lot.lot_name,
          firsts,
          seconds,
          points,
        }
      })
      .filter((row) => row.points > 0) // Only display lots with recorded points on the leaderboard
      .sort((a, b) => b.points - a.points || a.lot_name.localeCompare(b.lot_name))
  }

  const leaderboard = getLeaderboard()

  const activeEvent = events[activeIndex]
  const prelimsVenue = activeEvent ? (venues.find((v) => v.id === activeEvent.prelims_venue)?.venue_name || 'TBD') : 'TBD'
  const mainsVenue = activeEvent ? (venues.find((v) => v.id === activeEvent.mains_venue)?.venue_name || 'TBD') : 'TBD'
  const staffName = activeEvent ? (incharges.find((i) => i.id === activeEvent.staff_incharge)?.name || 'TBD') : 'TBD'

  return (
    <GuestLayout>
      <section className="guest-section">
        <div className="guest-section-header">
          <span className="guest-section-tag">Hall of Fame</span>
          <h2 className="guest-section-title">Contest Results</h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading results...</p>
        ) : (
          <div className="responsive-grid-sidebar wide-sidebar" style={{ gap: '30px' }}>
            
            {/* Left: Event Details Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h3 style={{ borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '10px', fontFamily: 'Syne, sans-serif' }}>
                Event Arenas
              </h3>

              {/* Event selection dropdown */}
              {events.length > 0 && (
                <div style={{ marginBottom: '4px', maxWidth: '400px' }}>
                  <select
                    value={activeIndex}
                    onChange={(e) => setActiveIndex(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '0.95rem',
                      background: 'var(--g-glass-bg)',
                      border: '1px solid var(--g-glass-border)',
                      borderRadius: '8px',
                      color: 'var(--g-text)',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--g-secondary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--g-glass-border)'}
                  >
                    {events.map((event, idx) => (
                      <option 
                        key={event.id} 
                        value={idx} 
                        style={{ backgroundColor: 'var(--g-bg)', color: 'var(--g-text)' }}
                      >
                        {event.event_name} ({event.category || 'Contest'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                {activeEvent && (() => {
                  const ev = activeEvent
                  const rec = winners.find((w) => w.event_id === ev.id)
                  const hasMains = rec?.mains_published && (rec?.first_place !== '-' || rec?.second_place !== '-')
                  const eventHasPrelims = !!(ev?.prelims_venue || ev?.preliminary)
                  const showPrelims = !hasMains && eventHasPrelims && rec?.prelims_published && rec?.prelim_winners?.length > 0

                  return (
                    <div className="guest-event-details-card guest-glass-panel">
                      
                      {/* Left Column: Event Illustration Icon */}
                      <div className="guest-details-media-container">
                        <div className="guest-details-banner-fallback">
                          {getEventIcon(ev.event_name)}
                        </div>
                      </div>

                      {/* Right Column: Content details & Results */}
                      <div className="guest-details-content-column">
                        <div className="guest-details-title-row">
                          <h2>{ev.event_name}</h2>
                          {ev.category && (
                            <span className="guest-details-category-tag">{ev.category}</span>
                          )}
                        </div>

                        {/* Results block */}
                        {(showPrelims || hasMains) ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                            {/* Prelims Qualifiers */}
                            {showPrelims && (
                              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--g-glass-border)' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--g-accent)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                                  ⚡ Preliminary Qualifiers
                                </span>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {rec.prelim_winners.map((lotName) => (
                                    <li key={lotName} style={{ display: 'flex', gap: '8px', fontSize: '0.85rem' }}>
                                      <span style={{ color: 'var(--g-accent)' }}>✓</span>
                                      <span>
                                        <strong style={{ color: 'var(--g-text)' }}>Lot {lotName}</strong>
                                        {resolveCollegeByLot(lotName) && (
                                          <span className="muted" style={{ display: 'block', fontSize: '0.78rem', color: 'var(--g-text-muted)' }}>
                                            {resolveCollegeByLot(lotName)}
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Mains Winners */}
                            {hasMains && (
                              <div style={{ background: 'rgba(0, 229, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--g-accent)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                                  🏆 Final Winners (Mains)
                                </span>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {rec.first_place !== '-' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '1.4rem' }}>🥇</span>
                                      <div>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--g-text-muted)', display: 'block', textTransform: 'uppercase' }}>1st Place</span>
                                        <strong style={{ color: 'var(--g-text)', fontSize: '0.9rem' }}>Lot {rec.first_place}</strong>
                                        {resolveCollegeByLot(rec.first_place) && (
                                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--g-text-muted)' }}>{resolveCollegeByLot(rec.first_place)}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {rec.second_place !== '-' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '1.4rem' }}>🥈</span>
                                      <div>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--g-text-muted)', display: 'block', textTransform: 'uppercase' }}>2nd Place</span>
                                        <strong style={{ color: 'var(--g-text)', fontSize: '0.9rem' }}>Lot {rec.second_place}</strong>
                                        {resolveCollegeByLot(rec.second_place) && (
                                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--g-text-muted)' }}>{resolveCollegeByLot(rec.second_place)}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px dashed var(--g-glass-border)', textAlign: 'center' }}>
                            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.88rem', margin: 0, fontStyle: 'italic' }}>
                              🏆 Results will be published here once they are announced by organizers. Stay tuned!
                            </p>
                          </div>
                        )}

                      </div>

                    </div>
                  )
                })()}
              </div>

            </div>

            {/* Right: Championship Standings */}
            <div>
              <h3 style={{ borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '10px', fontFamily: 'Syne, sans-serif' }}>
                Leaderboard
              </h3>

              <div className="guest-glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontFamily: 'Syne, sans-serif', color: 'var(--g-text)' }}>
                  Championship Standings
                </h4>
                <p style={{ color: 'var(--g-text-muted)', fontSize: '0.8rem', margin: '0 0 20px 0' }}>
                  Scoring logic: 🥇 1st Place = 5 pts | 🥈 2nd Place = 3 pts
                </p>

                {leaderboard.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {leaderboard.map((row, idx) => (
                      <div
                        key={row.lot_name}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: idx === 0 ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                          border: idx === 0 ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid var(--g-glass-border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: idx === 0 ? 'var(--g-accent)' : 'var(--g-text-muted)', width: '20px' }}>
                            {idx + 1}
                          </span>
                          <div>
                            <strong style={{ fontSize: '0.88rem', color: idx === 0 ? 'var(--g-text)' : 'var(--g-text-muted)' }}>
                              Lot {row.lot_name}
                              {idx === 0 && <span style={{ marginLeft: '6px' }}>👑</span>}
                            </strong>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--g-accent)' }}>
                          {row.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ textAlign: 'center', padding: '20px', fontSize: '0.85rem', color: 'var(--g-text-muted)', border: '1px dashed var(--g-glass-border)', borderRadius: '8px' }}>
                    No points recorded yet. Once event-wise final winners are published, standings will update live.
                  </p>
                )}
              </div>
            </div>

          </div>
        )}
      </section>
    </GuestLayout>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import { Trophy, Award, Search, HelpCircle } from 'lucide-react'

export default function Winners() {
  const [events, setEvents] = useState([])
  const [lots, setLots] = useState([])
  const [colleges, setColleges] = useState([])
  const [winners, setWinners] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showWinnersPage, setShowWinnersPage] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsRes, lotsRes, collegesRes, winnersRes, venuesRes, settingsRes] = await Promise.all([
          supabase
            .from(TABLES.EVENTS)
            .select('*')
            .eq('status', 'active')
            .order('event_name', { ascending: true }),
          supabase.from(TABLES.LOTS).select('*'),
          supabase.from(TABLES.COLLEGES).select('*'),
          supabase.from(TABLES.WINNERS).select('*'),
          supabase.from(TABLES.VENUES).select('*'),
          supabase.from(TABLES.SETTINGS).select('*').eq('key_name', 'show_winners_page').maybeSingle(),
        ])

        if (eventsRes.data) setEvents(eventsRes.data)
        if (lotsRes.data) setLots(lotsRes.data)
        if (collegesRes.data) setColleges(collegesRes.data)
        if (winnersRes.data) setWinners(winnersRes.data)
        if (venuesRes.data) setVenues(venuesRes.data)
        if (settingsRes.data) {
          setShowWinnersPage(settingsRes.data.value === 'true')
        }
      } catch (err) {
        console.error('Failed to load winners data:', err)
      } finally {
        setLoading(false)
      }
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
  const leaderboard = useMemo(() => {
    if (!lots || !winners) return []
    const assignedLotsMap = new Map()
    lots.forEach((l) => {
      if (l.lot_name && l.lot_name !== '-') {
        assignedLotsMap.set(l.lot_name.toLowerCase().trim(), l)
      }
    })

    winners.forEach((w) => {
      if (w.mains_published) {
        if (w.first_place && w.first_place !== '-' && !assignedLotsMap.has(w.first_place.toLowerCase().trim())) {
          assignedLotsMap.set(w.first_place.toLowerCase().trim(), {
            lot_name: w.first_place,
            is_assigned: true,
            assigned_college: '-',
          })
        }
        if (w.second_place && w.second_place !== '-' && !assignedLotsMap.has(w.second_place.toLowerCase().trim())) {
          assignedLotsMap.set(w.second_place.toLowerCase().trim(), {
            lot_name: w.second_place,
            is_assigned: true,
            assigned_college: '-',
          })
        }
      }
    })

    return Array.from(assignedLotsMap.values())
      .map((lot) => {
        const lotNameClean = lot.lot_name.toLowerCase().trim()

        const firsts = winners.filter(
          (w) =>
            w.mains_published &&
            w.first_place &&
            w.first_place.toLowerCase().trim() === lotNameClean
        ).length

        const seconds = winners.filter(
          (w) =>
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
      .filter((row) => row.points > 0)
      .sort((a, b) => b.points - a.points || a.lot_name.localeCompare(b.lot_name))
  }, [lots, winners])

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return events.filter((e) => {
      const rec = winners.find((w) => w.event_id === e.id)
      const matchesSearch = e.event_name.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q)
      
      // Only show events that have published winners or qualifiers
      const hasPublishedResults = rec && (rec.prelims_published || rec.mains_published)
      return matchesSearch && hasPublishedResults
    })
  }, [events, winners, searchQuery])

  if (loading) {
    return <p className="muted" style={{ padding: '24px' }}>Loading contest winners...</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="crud-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div>
          <h2>STRATA Winners Portal</h2>
          <p className="muted">View event results and championship points standings.</p>
        </div>
      </div>

      {!showWinnersPage ? (
        <div
          style={{
            background: 'var(--surface-raised)',
            border: '1px dashed var(--border)',
            borderRadius: '16px',
            padding: '40px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '500px',
            margin: '20px auto'
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>🔒</span>
          <h3 style={{ margin: 0 }}>Results Not Published Yet</h3>
          <p className="muted" style={{ fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
            The winners of STRATA 2K26 have not been officially published by the administrators yet. Please check back later.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          {/* Left Side: Event-wise results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>Event Arenas Winners</h3>
              <div style={{ position: 'relative', width: '200px' }}>
                <input
                  className="input"
                  placeholder="Filter events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', fontSize: '0.85rem' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <p className="muted" style={{ fontStyle: 'italic', textAlign: 'center', padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                No published event winners match your query.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredEvents.map((e) => {
                  const rec = winners.find((w) => w.event_id === e.id)
                  const hasMains = rec?.mains_published && (rec?.first_place !== '-' || rec?.second_place !== '-')
                  const showPrelims = !hasMains && !!(e.prelims_venue || e.preliminary) && rec?.prelims_published && rec?.prelim_winners?.length > 0

                  return (
                    <div
                      key={e.id}
                      className="card"
                      style={{
                        padding: '20px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{e.event_name}</strong>
                        {e.category && (
                          <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--surface-raised)' }}>
                            {e.category}
                          </span>
                        )}
                      </div>

                      {/* Mains Placement */}
                      {hasMains && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0, 229, 255, 0.02)', border: '1px solid rgba(0, 229, 255, 0.1)', padding: '12px', borderRadius: '8px' }}>
                          {rec.first_place !== '-' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.3rem' }}>🥇</span>
                              <div>
                                <span className="muted" style={{ fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>1st Place</span>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>Lot {rec.first_place}</strong>
                                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  {resolveCollegeByLot(rec.first_place)}
                                </span>
                              </div>
                            </div>
                          )}

                          {rec.second_place !== '-' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                              <span style={{ fontSize: '1.3rem' }}>🥈</span>
                              <div>
                                <span className="muted" style={{ fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>2nd Place</span>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>Lot {rec.second_place}</strong>
                                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  {resolveCollegeByLot(rec.second_place)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Prelims Placement */}
                      {showPrelims && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--surface-raised)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            ⚡ Preliminary Qualifiers
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                            {rec.prelim_winners.map((lotName) => (
                              <div key={lotName} style={{ display: 'flex', flexDirection: 'column', padding: '6px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                                <strong style={{ fontSize: '0.82rem' }}>Lot {lotName}</strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {resolveCollegeByLot(lotName) || 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!hasMains && !showPrelims && (
                        <div style={{ background: 'var(--surface-raised)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px dashed var(--border)' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            🏆 Final standings are being evaluated.
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Side: Overall Standings Leaderboard */}
          <div>
            <h3 style={{ marginBottom: '20px', fontFamily: 'Syne, sans-serif' }}>Championship Leaderboard</h3>
            
            <div className="card" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Standings Standings</h4>
              <p className="muted" style={{ fontSize: '0.75rem', margin: '0 0 20px 0' }}>
                Calculation: 🥇 1st Place = 5 pts | 🥈 2nd Place = 3 pts
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
                        background: idx === 0 ? 'rgba(0, 229, 255, 0.08)' : 'var(--surface-raised)',
                        border: idx === 0 ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: idx === 0 ? 'var(--accent)' : 'var(--text-secondary)', width: '20px' }}>
                          {idx + 1}
                        </span>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: idx === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            Lot {row.lot_name}
                            {idx === 0 && <span style={{ marginLeft: '6px' }}>👑</span>}
                          </strong>
                          <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {resolveCollegeByLot(row.lot_name)}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>
                        {row.points} pts
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontStyle: 'italic', textAlign: 'center', padding: '16px', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                  Standings will update automatically as winners are published.
                </p>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  )
}

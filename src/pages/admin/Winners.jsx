import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'
import { generateLeaderboardPdf } from '../../utils/pdfLeaderboard'

export default function Winners() {
  const { data: events, loading: eventsLoading } = useTable(TABLES.EVENTS)
  const { data: lots, loading: lotsLoading } = useTable(TABLES.LOTS)
  const { data: colleges, loading: collegesLoading } = useTable(TABLES.COLLEGES)
  const { data: winners, loading: winnersLoading } = useTable(TABLES.WINNERS)
  const { data: registrations, loading: registrationsLoading } = useTable(TABLES.REGISTRATIONS)

  const [savingId, setSavingId] = useState(null)
  const [successEventId, setSuccessEventId] = useState(null)

  const loading = eventsLoading || lotsLoading || collegesLoading || winnersLoading || registrationsLoading

  // Keep track of the selections locally before committing
  const [selections, setSelections] = useState({})

  // Initialize selections when winners load
  useEffect(() => {
    if (winners) {
      const initial = {}
      winners.forEach((w) => {
        initial[w.event_id] = {
          first_place: w.first_place || '-',
          second_place: w.second_place || '-',
        }
      })
      setSelections(initial)
    }
  }, [winners])

  // Get only assigned lots for the dropdowns
  const activeLots = lots.filter(
    (l) => l.is_assigned && l.assigned_college && l.assigned_college !== '-'
  )

  // Handle auto-saving on dropdown change
  async function handleChange(eventId, field, value) {
    const current = selections[eventId] || { first_place: '-', second_place: '-' }
    let updated = { ...current, [field]: value }

    // Similarly same team cannot be selected for 1st and second prize
    if (field === 'first_place' && value !== '-' && value === current.second_place) {
      updated.second_place = '-'
    } else if (field === 'second_place' && value !== '-' && value === current.first_place) {
      updated.first_place = '-'
    }

    setSelections((prev) => ({
      ...prev,
      [eventId]: updated,
    }))

    setSavingId(eventId)
    setSuccessEventId(null)

    try {
      // Find if record exists in winners
      const existing = winners.find((w) => w.event_id === eventId)

      if (existing) {
        const { error } = await supabase
          .from(TABLES.WINNERS)
          .update(updated)
          .eq('event_id', eventId)
        if (error) throw error
      } else {
        const { error } = await supabase.from(TABLES.WINNERS).insert({
          event_id: eventId,
          ...updated,
        })
        if (error) throw error
      }
      setSuccessEventId(eventId)
      setTimeout(() => setSuccessEventId(null), 1500)
    } catch (err) {
      alert('Failed to save winner: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  // Calculate overall college rankings leaderboard
  // First Place = 5 pts, Second Place = 3 pts
  const leaderboard = colleges
    .map((col) => {
      // Find lot assigned to this college
      const cLot = lots.find((l) => l.assigned_college === col.college)?.lot_name || ''
      
      const firsts = winners.filter((w) => w.first_place === cLot && cLot !== '').length
      const seconds = winners.filter((w) => w.second_place === cLot && cLot !== '').length
      const points = firsts * 5 + seconds * 3

      return {
        college: col.college,
        lot_name: cLot,
        firsts,
        seconds,
        points,
      }
    })
    .sort((a, b) => b.points - a.points || a.college.localeCompare(b.college))

  function handleDownloadPdf() {
    generateLeaderboardPdf(leaderboard)
  }

  if (loading) return <p className="muted">Loading winners manager...</p>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', alignItems: 'start' }}>
      {/* Left Column: Event Winner Assignment */}
      <div>
        <h2>Event Winners Allocation</h2>
        <p className="muted" style={{ marginBottom: '20px' }}>
          Select the winning college lot numbers for each contest arena. Changes will automatically update participant prizes.
        </p>

        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Theme</th>
              <th>Team Size</th>
              <th>First Place Lot</th>
              <th>Second Place Lot</th>
              <th style={{ width: '80px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const sel = selections[ev.id] || { first_place: '-', second_place: '-' }

              // Only show contestants that are registered for this event
              const eventRegs = registrations.filter(
                (r) => r.event_id === ev.id && r.status !== REGISTRATION_STATUS.REJECTED
              )
              const registeredCollegeIds = eventRegs.map((r) => r.college_id)
              const registeredCollegeNames = colleges
                .filter((c) => registeredCollegeIds.includes(c.id))
                .map((c) => c.college.toLowerCase().trim())

              // Filter active lots to only those assigned to these colleges
              const allowedLots = activeLots.filter((l) =>
                registeredCollegeNames.includes(l.assigned_college.toLowerCase().trim())
              )

              // 1st and 2nd place cannot select the same team
              const firstPlaceOptions = allowedLots.filter(
                (l) => l.lot_name !== sel.second_place || sel.second_place === '-'
              )
              const secondPlaceOptions = allowedLots.filter(
                (l) => l.lot_name !== sel.first_place || sel.first_place === '-'
              )

              return (
                <tr key={ev.id}>
                  <td>
                    <strong>{ev.event_name}</strong>
                  </td>
                  <td>{ev.category || '—'}</td>
                  <td>{ev.team_size || 1} members</td>
                  <td>
                    <select
                      value={sel.first_place}
                      onChange={(e) => handleChange(ev.id, 'first_place', e.target.value)}
                      style={{ padding: '5px 8px', fontSize: '0.85rem', width: '180px' }}
                    >
                      <option value="-">—</option>
                      {firstPlaceOptions.map((l) => (
                        <option key={l.id} value={l.lot_name}>
                          {l.lot_name} ({l.assigned_college})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={sel.second_place}
                      onChange={(e) => handleChange(ev.id, 'second_place', e.target.value)}
                      style={{ padding: '5px 8px', fontSize: '0.85rem', width: '180px' }}
                    >
                      <option value="-">—</option>
                      {secondPlaceOptions.map((l) => (
                        <option key={l.id} value={l.lot_name}>
                          {l.lot_name} ({l.assigned_college})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {savingId === ev.id && (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Saving…</span>
                    )}
                    {successEventId === ev.id && (
                      <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ Saved</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                  No active events available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Right Column: Side Leaderboard Card */}
      <div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>College Standings</h3>
            <button className="btn btn-primary" onClick={handleDownloadPdf} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
              Download PDF
            </button>
          </div>

          <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
            Scoring: First Place = 5 points | Second Place = 3 points.
          </p>

          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Rank</th>
                <th>College</th>
                <th style={{ width: '60px' }}>Lot</th>
                <th style={{ width: '65px' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, idx) => (
                <tr key={row.college} style={{ fontWeight: idx === 0 && row.points > 0 ? 'bold' : 'normal' }}>
                  <td>{idx + 1}</td>
                  <td>
                    {row.college}
                    {idx === 0 && row.points > 0 && <span style={{ marginLeft: '6px' }}>👑</span>}
                  </td>
                  <td>{row.lot_name || '—'}</td>
                  <td>{row.points} pts</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                    No points recorded yet.
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

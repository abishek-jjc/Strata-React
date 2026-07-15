import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'
import { generateLeaderboardPdf } from '../../utils/pdfLeaderboard'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function Winners() {
  const { data: events, loading: eventsLoading } = useTable(TABLES.EVENTS)
  const { data: lots, loading: lotsLoading } = useTable(TABLES.LOTS)
  const { data: colleges, loading: collegesLoading } = useTable(TABLES.COLLEGES)
  const { data: winners, loading: winnersLoading } = useTable(TABLES.WINNERS)
  const { data: registrations, loading: registrationsLoading } = useTable(TABLES.REGISTRATIONS)

  const [selectedEventId, setSelectedEventId] = useState('')
  const [activeTab, setActiveTab] = useState('prelims')
  const [localPrelims, setLocalPrelims] = useState([])
  const [prelimWinners, setPrelimWinners] = useState([])
  const [mainsWinners, setMainsWinners] = useState({ first_place: '-', second_place: '-' })
  const [prelimsPublished, setPrelimsPublished] = useState(false)
  const [mainsPublished, setMainsPublished] = useState(false)

  const [savingId, setSavingId] = useState(null)
  const [successEventId, setSuccessEventId] = useState(null)

  const [showWinnersPage, setShowWinnersPage] = useState(false)
  const [updatingToggle, setUpdatingToggle] = useState(false)

  // Load the show_winners_page setting from DB
  useEffect(() => {
    async function loadWinnersSetting() {
      const { data, error } = await supabase
        .from(TABLES.SETTINGS)
        .select('*')
        .eq('key_name', 'show_winners_page')
        .maybeSingle()
      if (data) {
        setShowWinnersPage(data.value === 'true')
      }
    }
    loadWinnersSetting()
  }, [])

  const handleToggleWinnersPage = async (val) => {
    setUpdatingToggle(true)
    try {
      const { error } = await supabase
        .from(TABLES.SETTINGS)
        .upsert({ key_name: 'show_winners_page', value: String(val) })
      if (error) throw error
      setShowWinnersPage(val)
    } catch (err) {
      alert('Failed to update page settings: ' + err.message)
    } finally {
      setUpdatingToggle(false)
    }
  }

  const loading = eventsLoading || lotsLoading || collegesLoading || winnersLoading || registrationsLoading

  // Initialize selected event
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id)
    }
  }, [events, selectedEventId])

  // Sync event selections when selectedEventId or winners load
  useEffect(() => {
    if (selectedEventId && winners) {
      const rec = winners.find((w) => w.event_id === selectedEventId)
      const list = rec?.prelim_winners || []
      setPrelimWinners(list)
      setLocalPrelims(list)
      setMainsWinners({
        first_place: rec?.first_place || '-',
        second_place: rec?.second_place || '-',
      })
      setPrelimsPublished(rec?.prelims_published || false)
      setMainsPublished(rec?.mains_published || false)
    }
  }, [selectedEventId, winners])

  // Get only assigned lots for the dropdowns
  const activeLots = lots.filter(
    (l) => l.is_assigned && l.assigned_college && l.assigned_college !== '-'
  )

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  // Only show contestants that are registered for this event
  const eventRegs = selectedEventId
    ? registrations.filter(
        (r) => r.event_id === selectedEventId && r.status !== REGISTRATION_STATUS.REJECTED
      )
    : []
  const registeredCollegeIds = eventRegs.map((r) => r.college_id)
  const registeredCollegeNames = colleges
    .filter((c) => registeredCollegeIds.includes(c.id))
    .map((c) => {
      const combined = c.department ? `${c.college} (${c.department})` : c.college
      return combined.toLowerCase().trim()
    })
    .filter(Boolean)

  // Filter active lots to only those assigned to these registered colleges
  const allowedLots = activeLots.filter((l) => {
    const assigned = (l.assigned_college || '').toLowerCase().trim()
    return assigned !== '-' && registeredCollegeNames.includes(assigned)
  })

  // 1st place cannot select a lot from the same college as 2nd place
  const firstSelectedLot = allowedLots.find((l) => l.lot_name === mainsWinners.first_place)
  const secondSelectedLot = allowedLots.find((l) => l.lot_name === mainsWinners.second_place)
  const firstSelectedCollege = firstSelectedLot ? (firstSelectedLot.assigned_college || '').toLowerCase().trim() : ''
  const secondSelectedCollege = secondSelectedLot ? (secondSelectedLot.assigned_college || '').toLowerCase().trim() : ''

  // Filter the final winners selection options to ONLY include the saved preliminary qualifiers
  const mainsLotOptions = allowedLots.filter((l) => prelimWinners.includes(l.lot_name))

  const firstPlaceOptions = mainsLotOptions.filter((l) => {
    const assigned = (l.assigned_college || '').toLowerCase().trim()
    return mainsWinners.second_place === '-' || assigned !== secondSelectedCollege
  })

  const secondPlaceOptions = mainsLotOptions.filter((l) => {
    const assigned = (l.assigned_college || '').toLowerCase().trim()
    return mainsWinners.first_place === '-' || assigned !== firstSelectedCollege
  })

  function handleCheckboxToggle(lotName) {
    setLocalPrelims((prev) =>
      prev.includes(lotName) ? prev.filter((x) => x !== lotName) : [...prev, lotName]
    )
  }

  async function handleSavePrelimsList() {
    setSavingId(selectedEventId)
    setSuccessEventId(null)
    try {
      const rec = winners.find((w) => w.event_id === selectedEventId)
      if (rec) {
        const { error } = await supabase
          .from(TABLES.WINNERS)
          .update({ prelim_winners: localPrelims })
          .eq('event_id', selectedEventId)
        if (error) throw error
      } else {
        const { error } = await supabase.from(TABLES.WINNERS).insert({
          event_id: selectedEventId,
          prelim_winners: localPrelims,
          first_place: '-',
          second_place: '-',
          prelims_published: false,
          mains_published: false,
        })
        if (error) throw error
      }
      setPrelimWinners(localPrelims)
      setSuccessEventId(selectedEventId)
      setTimeout(() => setSuccessEventId(null), 1500)
    } catch (err) {
      alert('Failed to save prelim qualifiers: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  async function handleTogglePublish(type) {
    const isPrelims = type === 'prelims'
    const rec = winners.find((w) => w.event_id === selectedEventId)
    const nextVal = isPrelims ? !prelimsPublished : !mainsPublished

    setSavingId(selectedEventId)
    try {
      if (rec) {
        const { error } = await supabase
          .from(TABLES.WINNERS)
          .update(isPrelims ? { prelims_published: nextVal } : { mains_published: nextVal })
          .eq('event_id', selectedEventId)
        if (error) throw error
        if (isPrelims) setPrelimsPublished(nextVal)
        else setMainsPublished(nextVal)
      } else {
        const payload = {
          event_id: selectedEventId,
          prelim_winners: localPrelims,
          first_place: '-',
          second_place: '-',
          prelims_published: isPrelims ? nextVal : false,
          mains_published: isPrelims ? false : nextVal,
        }
        const { error } = await supabase.from(TABLES.WINNERS).insert(payload)
        if (error) throw error
        if (isPrelims) setPrelimsPublished(nextVal)
        else setMainsPublished(nextVal)
      }
    } catch (err) {
      alert('Failed to update publishing status: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  async function handleMainsChange(field, value) {
    const rec = winners.find((w) => w.event_id === selectedEventId)
    const current = rec
      ? {
          first_place: rec.first_place || '-',
          second_place: rec.second_place || '-',
        }
      : { first_place: '-', second_place: '-' }

    let updated = { ...current, [field]: value }

    // Same college cannot be selected for both 1st and 2nd place
    if (updated.first_place !== '-' && updated.second_place !== '-') {
      const firstLotObj = activeLots.find((l) => l.lot_name === updated.first_place)
      const secondLotObj = activeLots.find((l) => l.lot_name === updated.second_place)

      const firstCollege = firstLotObj ? (firstLotObj.assigned_college || '').toLowerCase().trim() : ''
      const secondCollege = secondLotObj ? (secondLotObj.assigned_college || '').toLowerCase().trim() : ''

      if (firstCollege !== '' && secondCollege !== '' && firstCollege === secondCollege) {
        if (field === 'first_place') {
          updated.second_place = '-'
        } else {
          updated.first_place = '-'
        }
      }
    }

    setMainsWinners(updated)
    setSavingId(selectedEventId)
    setSuccessEventId(null)

    try {
      if (rec) {
        const { error } = await supabase
          .from(TABLES.WINNERS)
          .update(updated)
          .eq('event_id', selectedEventId)
        if (error) throw error
      } else {
        const { error } = await supabase.from(TABLES.WINNERS).insert({
          event_id: selectedEventId,
          prelim_winners: [],
          prelims_published: false,
          mains_published: false,
          ...updated,
        })
        if (error) throw error
      }
      setSuccessEventId(selectedEventId)
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
      const cName = col.department ? `${col.college} (${col.department})` : col.college
      const cNameClean = cName.toLowerCase().trim()
      const lotObj = lots.find((l) => (l.assigned_college || '').toLowerCase().trim() === cNameClean)
      const cLot = lotObj?.lot_name || ''
      const cLotClean = cLot.toLowerCase().trim()

      const firsts = winners.filter((w) => 
        w.first_place && 
        w.first_place.toLowerCase().trim() === cLotClean && 
        cLotClean !== '' &&
        cLotClean !== '-' &&
        w.first_place !== '-'
      ).length

      const seconds = winners.filter((w) => 
        w.second_place && 
        w.second_place.toLowerCase().trim() === cLotClean && 
        cLotClean !== '' &&
        cLotClean !== '-' &&
        w.second_place !== '-'
      ).length

      const points = firsts * 5 + seconds * 3

      return {
        college: cName,
        lot_name: cLot,
        firsts,
        seconds,
        points,
      }
    })
    .sort((a, b) => b.points - a.points || a.college.localeCompare(b.college))

  function handleDownloadEventPdf() {
    if (!selectedEvent) return
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(26, 29, 35)
    doc.text(`STRATA 2K26 — Contest Results`, 40, 50)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 110, 120)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, 70)

    doc.setDrawColor(217, 119, 6)
    doc.line(40, 80, 555, 80)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(26, 29, 35)
    doc.text(`Event: ${selectedEvent.event_name.toUpperCase()}`, 40, 110)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Category: ${selectedEvent.category || '—'}`, 40, 130)
    doc.text(`Team Size: ${selectedEvent.team_size || 1} member(s)`, 40, 145)

    let currentY = 175

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`Preliminary Qualifiers`, 40, currentY)
    currentY += 15

    const prelimRows = prelimWinners.map((lotName) => {
      const college = lots.find((l) => l.lot_name === lotName)?.assigned_college || '—'
      return [lotName, college]
    })

    if (prelimRows.length > 0) {
      doc.autoTable({
        startY: currentY,
        margin: { left: 40, right: 40 },
        head: [['Lot Number', 'College Name']],
        body: prelimRows,
        theme: 'grid',
        headStyles: { fillColor: [12, 14, 18], fontSize: 10 },
        styles: { fontSize: 9 },
      })
      currentY = doc.lastAutoTable.finalY + 25
    } else {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.text('No preliminary qualifiers recorded.', 40, currentY)
      currentY += 25
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`Mains Winners`, 40, currentY)
    currentY += 15

    const firstLotName = mainsWinners.first_place
    const firstCollege = firstLotName !== '-'
      ? lots.find((l) => l.lot_name === firstLotName)?.assigned_college || '—'
      : '—'

    const secondLotName = mainsWinners.second_place
    const secondCollege = secondLotName !== '-'
      ? lots.find((l) => l.lot_name === secondLotName)?.assigned_college || '—'
      : '—'

    const mainsRows = [
      ['First Place (1st)', firstLotName !== '-' ? `${firstLotName} (${firstCollege})` : '—'],
      ['Second Place (2nd)', secondLotName !== '-' ? `${secondLotName} (${secondCollege})` : '—'],
    ]

    doc.autoTable({
      startY: currentY,
      margin: { left: 40, right: 40 },
      head: [['Prize Rank', 'College Detail']],
      body: mainsRows,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], fontSize: 10 },
      styles: { fontSize: 9 },
    })

    doc.save(`strata_results_${selectedEvent.event_name.toLowerCase().replace(/\s+/g, '_')}.pdf`)
  }

  function handleDownloadGlobalPdf() {
    const eventWinners = events.map((ev) => {
      const rec = winners.find((w) => w.event_id === ev.id)
      const firstLotName = rec?.first_place || '-'
      const firstCollege = firstLotName !== '-'
        ? lots.find((l) => l.lot_name === firstLotName)?.assigned_college || '—'
        : '—'

      const secondLotName = rec?.second_place || '-'
      const secondCollege = secondLotName !== '-'
        ? lots.find((l) => l.lot_name === secondLotName)?.assigned_college || '—'
        : '—'

      return {
        event_name: ev.event_name,
        first_place: firstLotName !== '-' ? `${firstLotName} (${firstCollege})` : '—',
        second_place: secondLotName !== '-' ? `${secondLotName} (${secondCollege})` : '—',
      }
    })

    const topColleges = leaderboard.slice(0, 5)
    generateLeaderboardPdf(eventWinners, topColleges)
  }

  if (loading) return <p className="muted">Loading winners manager...</p>

  return (
    <div className="responsive-grid-sidebar wide-sidebar">
      {/* Left Column: Event Selection & Configuration */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2>Winners Allocation</h2>
          {selectedEvent && (
            <button className="btn" onClick={handleDownloadEventPdf} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              📄 Export Event PDF
            </button>
          )}
        </div>

        {/* Dropdown: Selected Event */}
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
            Select Active Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', fontSize: '1rem', borderRadius: '6px' }}
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.event_name} ({ev.category || 'No Category'})
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Winners Page Settings */}
        <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Show Winners Page to Public</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Enable this to show the public "Winners" menu tab and standings in the main pages.
            </span>
          </div>
          <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
            <input
              type="checkbox"
              checked={showWinnersPage}
              disabled={updatingToggle}
              onChange={(e) => handleToggleWinnersPage(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: showWinnersPage ? 'var(--accent)' : '#ccc',
                transition: '.4s',
                borderRadius: '34px',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: '""',
                  height: '18px', width: '18px',
                  left: showWinnersPage ? '28px' : '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%',
                }}
              />
            </span>
          </label>
        </div>

        {selectedEvent ? (
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
              <button
                type="button"
                className={`btn ${activeTab === 'prelims' ? 'btn-primary' : ''}`}
                onClick={() => setActiveTab('prelims')}
                style={{
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  borderBottom: activeTab === 'prelims' ? '2px solid var(--accent)' : 'none',
                  padding: '12px 20px',
                  fontSize: '0.9rem',
                }}
              >
                1. Preliminary Qualifiers
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'mains' ? 'btn-primary' : ''}`}
                onClick={() => setActiveTab('mains')}
                style={{
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  borderBottom: activeTab === 'mains' ? '2px solid var(--accent)' : 'none',
                  padding: '12px 20px',
                  fontSize: '0.9rem',
                }}
              >
                2. Final Winners (Mains)
              </button>
            </div>

            {/* TAB CONTENT: PRELIMS */}
            {activeTab === 'prelims' && (
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Configure Prelims Qualifiers</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {savingId === selectedEventId && <span className="muted" style={{ fontSize: '0.8rem' }}>Processing…</span>}
                    {successEventId === selectedEventId && <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ Saved</span>}
                    <button
                      type="button"
                      className={`badge badge-${prelimsPublished ? 'approved' : 'pending'}`}
                      onClick={() => handleTogglePublish('prelims')}
                      style={{ cursor: 'pointer', border: 'none', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      {prelimsPublished ? '📢 Published' : '🚫 Draft (Click to Publish)'}
                    </button>
                  </div>
                </div>

                <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
                  Check the boxes of all the college lot numbers that cleared the preliminary round and advanced to the mains.
                </p>

                {allowedLots.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    {allowedLots.map((l) => (
                      <label
                        key={l.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: localPrelims.includes(l.lot_name) ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                          border: localPrelims.includes(l.lot_name) ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: localPrelims.includes(l.lot_name) ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={localPrelims.includes(l.lot_name)}
                          onChange={() => handleCheckboxToggle(l.lot_name)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                        />
                        <span>
                          <strong>{l.lot_name}</strong>
                          <span className="muted" style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px' }}>
                            {l.assigned_college}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ textAlign: 'center', padding: '20px', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                    No colleges registered for this event yet.
                  </p>
                )}

                {allowedLots.length > 0 && (
                  <button type="button" className="btn btn-primary" onClick={handleSavePrelimsList} disabled={savingId === selectedEventId}>
                    Save Prelims Qualifiers
                  </button>
                )}
              </div>
            )}

            {/* TAB CONTENT: MAINS WINNERS */}
            {activeTab === 'mains' && (
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Select Final Winners</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {savingId === selectedEventId && <span className="muted" style={{ fontSize: '0.8rem' }}>Saving…</span>}
                    {successEventId === selectedEventId && <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ Saved</span>}
                    <button
                      type="button"
                      className={`badge badge-${mainsPublished ? 'approved' : 'pending'}`}
                      onClick={() => handleTogglePublish('mains')}
                      style={{ cursor: 'pointer', border: 'none', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      {mainsPublished ? '📢 Published' : '🚫 Draft (Click to Publish)'}
                    </button>
                  </div>
                </div>

                <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '24px' }}>
                  Choose the first and second place winners. The options are automatically limited to the lots saved as preliminary qualifiers above.
                </p>

                {prelimWinners.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', marginBottom: '24px' }}>
                    <div className="field">
                      <span>First Place (1st Place Winner)</span>
                      <select
                        value={mainsWinners.first_place}
                        onChange={(e) => handleMainsChange('first_place', e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '0.95rem' }}
                      >
                        <option value="-">— Select Qualifier —</option>
                        {firstPlaceOptions.map((l) => (
                          <option key={l.id} value={l.lot_name}>
                            {l.lot_name} ({l.assigned_college})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <span>Second Place (2nd Place Winner)</span>
                      <select
                        value={mainsWinners.second_place}
                        onChange={(e) => handleMainsChange('second_place', e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '0.95rem' }}
                      >
                        <option value="-">— Select Qualifier —</option>
                        {secondPlaceOptions.map((l) => (
                          <option key={l.id} value={l.lot_name}>
                            {l.lot_name} ({l.assigned_college})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>⚠️</span>
                    <strong>No Preliminary Qualifiers Saved Yet</strong>
                    <p className="muted" style={{ fontSize: '0.85rem', margin: '6px 0 0 0' }}>
                      Go to the <strong>1. Preliminary Qualifiers</strong> tab, select the lot numbers that passed prelims, and click save.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="muted">No active events found.</p>
        )}
      </div>

      {/* Right Column: College Standings */}
      <div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Championship Standings</h3>
            <button className="btn btn-primary" onClick={handleDownloadGlobalPdf} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Global PDF
            </button>
          </div>

          <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
            Championship scoring: First Place = 5 points | Second Place = 3 points.
          </p>

          <div className="table-responsive">
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
    </div>
  )
}


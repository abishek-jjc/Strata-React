import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import BackButton from '../../components/common/BackButton'

export default function Participants() {
  const { profile } = useAuth()

  // Query table data for the leader's college
  const { data: students, loading: studentsLoading } = useTable(TABLES.STUDENTS, [
    ['college_id', 'eq', profile?.college_id],
  ])
  const { data: registrations, loading: regsLoading } = useTable(TABLES.REGISTRATIONS, [
    ['college_id', 'eq', profile?.college_id],
  ])
  const { data: events, loading: eventsLoading } = useTable(TABLES.EVENTS, [['status', 'eq', 'active']])
  const { data: winners, loading: winnersLoading } = useTable(TABLES.WINNERS)
  const { data: lots, loading: lotsLoading } = useTable(TABLES.LOTS)
  const { data: colleges, loading: collegesLoading } = useTable(TABLES.COLLEGES, [
    ['id', 'eq', profile?.college_id],
  ])

  const [activeEventId, setActiveEventId] = useState('')

  const loading = studentsLoading || regsLoading || eventsLoading || winnersLoading || lotsLoading || collegesLoading
  const myCollege = colleges[0]

  // Default to first event once loaded
  useEffect(() => {
    if (!activeEventId && events.length > 0) {
      setActiveEventId(events[0].id)
    }
  }, [events, activeEventId])

  // Filter students for active event
  const eventStudents = useMemo(() => {
    return students
      .filter(s => s.event_id === activeEventId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [students, activeEventId])

  const activeEvent = events.find(e => e.id === activeEventId)
  const activeRegistration = registrations.find(r => r.event_id === activeEventId)

  // Status computation logic
  const getStudentStatus = (reg, eventWinners, college, lotsList) => {
    if (reg?.status === 'rejected') {
      return { text: 'Rejected', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
    }

    if (eventWinners && reg?.lot_id) {
      const lot = lotsList.find(l => l.id === reg.lot_id)
      if (lot?.lot_name) {
        if (eventWinners.mains_published) {
          if (eventWinners.first_place === lot.lot_name) {
            return { text: '🏆 1st Winner', bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }
          }
          if (eventWinners.second_place === lot.lot_name) {
            return { text: '🥈 2nd Winner', bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' }
          }
        }
        if (eventWinners.prelims_published && eventWinners.prelim_winners?.includes(lot.lot_name)) {
          return { text: '✨ Prelims Qualified', bg: 'rgba(124, 77, 255, 0.15)', color: '#a855f7' }
        }
      }
    }

    if (reg?.status === 'approved' || reg?.status === 'paid' || college?.is_paid) {
      return { text: 'Paid & Confirmed', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }
    }

    if (reg?.lot_id || reg?.status === 'lot_assigned') {
      const lot = lotsList.find(l => l.id === reg.lot_id)
      return { text: `Lot Assigned: ${lot?.lot_name || '—'}`, bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }
    }

    return { text: 'Pending Review', bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }
  }

  // Get current event status
  const currentStatus = useMemo(() => {
    const eventWinners = winners.find(w => w.event_id === activeEventId)
    return getStudentStatus(activeRegistration, eventWinners, myCollege, lots)
  }, [activeRegistration, winners, activeEventId, myCollege, lots])

  if (loading) return <p className="muted">Loading participants...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BackButton />
        <div>
          <h2 style={{ margin: 0 }}>Event Participants</h2>
          <p className="muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Check the registrations and contest status for your college candidates.
          </p>
        </div>
      </div>

      {/* ── Event Selection Dropdown ── */}
      <div style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
        <select
          id="participants-event-select"
          value={activeEventId}
          onChange={(e) => setActiveEventId(e.target.value)}
          className="input"
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: '0.95rem',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 600,
            outline: 'none',
            paddingRight: '36px',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
          }}
        >
          {events.map((ev) => {
            const hasReg = registrations.some(r => r.event_id === ev.id)
            return (
              <option key={ev.id} value={ev.id}>
                {ev.event_name} {hasReg ? '✓' : ''}
              </option>
            )
          })}
        </select>
        <div style={{
          position: 'absolute',
          right: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
        }}>
          ▼
        </div>
      </div>

      {activeEvent && (
        <div>
          {/* Status Header Panel */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-strong)',
            borderRadius: '16px',
            padding: '16px 24px',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{activeEvent.event_name}</h3>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                Category: {activeEvent.category || '—'} · Size: {activeEvent.team_size || '—'}
              </p>
            </div>
            
            <span style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: currentStatus.bg,
              color: currentStatus.color,
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              border: `1px solid ${currentStatus.color}40`
            }}>
              {currentStatus.text}
            </span>
          </div>

          {/* Participants Card Grid */}
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Registered Candidates</h3>
          
          {eventStudents.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '50px 20px',
              color: 'var(--text-secondary)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: '16px',
            }}>
              No participants registered for this event from your college.
            </div>
          ) : (
            <div className="participants-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))',
              gap: '20px'
            }}>
              {eventStudents.map((s, idx) => (
                <div key={s.id} className="card" style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Participant Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                        Candidate #{idx + 1}
                      </div>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        {s.student_name}
                      </h4>
                    </div>
                    
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: s.food_type === 'Non-Veg' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                      color: s.food_type === 'Non-Veg' ? '#ef4444' : '#10b981',
                      border: s.food_type === 'Non-Veg' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {s.food_type || 'Veg'}
                    </span>
                  </div>

                  {/* Profile Metadata */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    fontSize: '0.85rem',
                    borderTop: '1px solid var(--border-strong)',
                    paddingTop: '12px'
                  }}>
                    <div>
                      <span className="muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Roll No.</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{s.roll_no || '—'}</strong>
                    </div>
                    <div>
                      <span className="muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Gender</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{s.gender || '—'}</strong>
                    </div>
                  </div>

                  {/* Candidate specific prize badge if won */}
                  {s.winning_prize && (
                    <div style={{
                      marginTop: '8px',
                      background: s.winning_prize === 'First Place' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                      border: s.winning_prize === 'First Place' ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(156, 163, 175, 0.3)',
                      color: s.winning_prize === 'First Place' ? '#eab308' : '#9ca3af',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}>
                      <span>{s.winning_prize === 'First Place' ? '🏆' : '🥈'}</span>
                      <span>{s.winning_prize} Winner!</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

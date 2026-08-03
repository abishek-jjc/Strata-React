import { useState, useMemo } from 'react'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { useSettings } from '../../context/SettingsContext'
import { supabase } from '../../supabase/client'

export default function Dashboard() {
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: registrations } = useTable(TABLES.REGISTRATIONS)
  const { data: students } = useTable(TABLES.STUDENTS)
  const { data: studentLeaders } = useTable(TABLES.STUDENT_LEADERS)
  const { data: paymentLogs } = useTable(TABLES.PAYMENT_LOGS)
  const { data: settingsData } = useTable(TABLES.SETTINGS)

  const { settings, reloadSettings } = useSettings()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  const isEventStarted = settings.event_started === 'true'

  const feeBase = 200
  const gstRate = 0.18
  const defaultFee = Math.round(feeBase * (1 + gstRate)) // 236

  const feePerStudent = useMemo(() => {
    if (!settingsData) return defaultFee
    const settingFee = settingsData.find((s) => s.key_name === 'fee_per_student')?.value
    return settingFee ? Number(settingFee) : defaultFee
  }, [settingsData, defaultFee])

  // Calculated Stats
  const totalParticipants = students.length
  const totalRegistrations = registrations.length
  const totalStudentLeaders = studentLeaders.length
  const totalColleges = colleges.length

  const totalAmountCollectable = totalParticipants * feePerStudent

  const amountCollected = useMemo(() => {
    if (paymentLogs && paymentLogs.length > 0) {
      return paymentLogs.reduce((sum, log) => sum + Number(log.amount || 0), 0)
    }
    return colleges.reduce((sum, c) => {
      const pCount = c.paid_student_count ?? (c.is_paid ? 1 : 0)
      return sum + pCount * feePerStudent
    }, 0)
  }, [paymentLogs, colleges, feePerStudent])

  const vegCount = useMemo(() => {
    const fromStudents = students.filter((s) => s.food_type === 'Veg').length
    if (fromStudents > 0) return fromStudents
    return registrations.reduce((sum, r) => sum + Number(r.veg_count || 0), 0)
  }, [students, registrations])

  const nonVegCount = useMemo(() => {
    const fromStudents = students.filter((s) => s.food_type === 'Non-Veg').length
    if (fromStudents > 0) return fromStudents
    return registrations.reduce((sum, r) => sum + Number(r.nonveg_count || 0), 0)
  }, [students, registrations])

  const stats = [
    ['Total Participants', totalParticipants, '👥'],
    ['Total Registration', totalRegistrations, '📋'],
    ['Total Student Leaders', totalStudentLeaders, '🎓'],
    ['Total Colleges', totalColleges, '🏛️'],
    ['Total Amount', `Rs. ${totalAmountCollectable.toLocaleString()}`, '💰'],
    ['Amount Collected', `Rs. ${amountCollected.toLocaleString()}`, '✅'],
    ['Veg Count', vegCount, '🥗'],
    ['Non Veg Count', nonVegCount, '🍗'],
  ]

  async function handleToggleEvent() {
    setUpdating(true)
    setError('')
    try {
      const nextVal = isEventStarted ? 'false' : 'true'
      const { error: upsertError } = await supabase
        .from(TABLES.SETTINGS)
        .upsert([{ key_name: 'event_started', value: nextVal }])

      if (upsertError) throw upsertError
      if (reloadSettings) reloadSettings()
    } catch (err) {
      setError(err.message || 'Failed to update event status.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div>
      <style>{`
        @keyframes pulse-green {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
      `}</style>

      <h2>Admin Dashboard</h2>

      {/* Event Status Control Panel */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '30px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <div style={{ flex: '1 1 400px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>
            Event Operations Control
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
            {isEventStarted
              ? '⚡ The event is currently LIVE. Student leader registration and participant edits are locked (view-only).'
              : '🔴 The event has NOT started. Student leaders can register teams and edit their participants.'}
          </p>
          {error && <p className="error" style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>{error}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: isEventStarted ? '#10b981' : '#ef4444',
                boxShadow: isEventStarted ? '0 0 10px #10b981' : '0 0 10px #ef4444',
                animation: isEventStarted ? 'pulse-green 2s infinite' : 'none',
              }}
            />
            <strong
              style={{
                color: isEventStarted ? '#10b981' : '#ef4444',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {isEventStarted ? 'Live' : 'Stopped'}
            </strong>
          </div>

          <button
            onClick={handleToggleEvent}
            disabled={updating}
            className="btn"
            style={{
              padding: '12px 24px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              borderRadius: '8px',
              border: 'none',
              background: isEventStarted ? 'var(--danger)' : 'var(--success)',
              color: '#fff',
              transition: 'transform 0.2s, opacity 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {updating ? 'Updating...' : isEventStarted ? '🔒 Stop Event' : '⚡ Start Event'}
          </button>
        </div>
      </div>

      {/* 8 Metric Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {stats.map(([label, value, icon]) => (
          <div className="card" key={label} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '1.4rem' }}>{icon}</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

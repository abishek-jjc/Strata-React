import { useState } from 'react'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { useSettings } from '../../context/SettingsContext'
import { supabase } from '../../supabase/client'

export default function Dashboard() {
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: registrations } = useTable(TABLES.REGISTRATIONS)
  const { data: certificates } = useTable(TABLES.CERTIFICATES)
  const { data: payments } = useTable(TABLES.PAYMENTS)

  const { settings, reloadSettings } = useSettings()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  const isEventStarted = settings.event_started === 'true'

  const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  const stats = [
    ['Events', events.length],
    ['Colleges', colleges.length],
    ['Registrations', registrations.length],
    ['Certificates issued', certificates.length],
    ['Total collected', `Rs. ${totalCollected}`],
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

      <h2>Dashboard</h2>

      {/* Event Status Control Panel */}
      <div className="card" style={{ 
        padding: '24px', 
        marginBottom: '30px', 
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{ flex: '1 1 400px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>Event Operations Control</h3>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
            {isEventStarted 
              ? '⚡ The event is currently LIVE. Student leader registration and participant edits are locked (view-only).' 
              : '🔴 The event has NOT started. Student leaders can register teams and edit their participants.'
            }
          </p>
          {error && <p className="error" style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>{error}</p>}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: isEventStarted ? '#10b981' : '#ef4444',
              boxShadow: isEventStarted ? '0 0 10px #10b981' : '0 0 10px #ef4444',
              animation: isEventStarted ? 'pulse-green 2s infinite' : 'none'
            }} />
            <strong style={{ 
              color: isEventStarted ? '#10b981' : '#ef4444', 
              fontSize: '0.9rem', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
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
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {updating ? 'Updating...' : isEventStarted ? '🔒 Stop Event' : '⚡ Start Event'}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}>
            <div className="stat-num">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { hasDuplicateNamesWithinTeam } from '../../utils/validators'

const emptyParticipant = () => ({ studentName: '', rollNo: '' })

export default function TeamRegistration() {
  const { profile } = useAuth()
  const { data: events } = useTable(TABLES.EVENTS, [['status', 'eq', 'active']])
  const { data: registrations } = useTable(TABLES.REGISTRATIONS, [['leader_id', 'eq', profile?.ref_id]])
  const [eventId, setEventId] = useState('')
  const [participants, setParticipants] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [whatsappLink, setWhatsappLink] = useState('')

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from(TABLES.SETTINGS)
        .select('*')
      if (data) {
        const wa = data.find(s => s.key_name === 'whatsapp_group_link')?.value || ''
        setWhatsappLink(wa)
      }
    }
    loadSettings()
  }, [])

  const selectedEvent = events.find((e) => e.id === eventId)
  const teamSize = selectedEvent?.team_size || 0

  const registeredEventIds = registrations.map((r) => r.event_id)
  const availableEvents = events.filter((ev) => !registeredEventIds.includes(ev.id))

  // When event changes, reset participants to exactly team_size empty rows
  useEffect(() => {
    if (!teamSize) {
      setParticipants([])
      return
    }
    setParticipants(Array.from({ length: teamSize }, emptyParticipant))
    setError('')
    setSuccess('')
  }, [eventId, teamSize])

  function updateParticipant(index, field, value) {
    const next = [...participants]
    next[index] = { ...next[index], [field]: value }
    setParticipants(next)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!eventId) return setError('Select an event.')
    if (!profile?.ref_id || !profile?.college_id) {
      return setError('Your leader profile is missing a college assignment — contact the admin.')
    }

    const names = participants.map((p) => p.studentName.trim())
    if (names.some((n) => !n)) return setError('Every participant needs a name.')
    if (names.some((n) => n.length < 3)) {
      return setError('Every participant name must contain at least 3 characters.')
    }
    if (participants.some((p) => !p.rollNo || !p.rollNo.trim())) {
      return setError('Every participant needs a roll number.')
    }

    if (participants.length !== teamSize) {
      return setError(`This event requires exactly ${teamSize} participant(s).`)
    }

    if (hasDuplicateNamesWithinTeam(names)) {
      return setError('Two participants in this team have the same name.')
    }

    setSubmitting(true)
    try {
      const { error: rpcError } = await supabase.rpc('register_team', {
        p_college_id: profile.college_id,
        p_leader_id: profile.ref_id,
        p_event_id: eventId,
        p_participants: participants.map((p) => ({
          studentName: p.studentName.trim(),
          rollNo: p.rollNo.trim(),
        })),
      })

      if (rpcError) throw rpcError

      setSuccess('Team registered successfully! Waiting for admin review.')
      setEventId('')
      setParticipants([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2>Team Registration</h2>
      <form onSubmit={handleSubmit} className="registration-form">

        {/* Event selector */}
        <label className="field" style={{ maxWidth: 480 }}>
          <span>Event</span>
          {availableEvents.length === 0 ? (
            <div style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              marginTop: '5px'
            }}>
              ✓ You have registered for all available events.
            </div>
          ) : (
            <select value={eventId} onChange={(e) => { setEventId(e.target.value) }} required>
              <option value="">Select event…</option>
              {availableEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.event_name}</option>
              ))}
            </select>
          )}
        </label>

        {/* Event info banner */}
        {selectedEvent && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(16,185,129,0.07)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 4,
            maxWidth: 480,
          }}>
            <span style={{ fontSize: 20 }}>📋</span>
            <div>
              <strong style={{ color: '#10b981' }}>{selectedEvent.event_name}</strong>
              <span className="muted" style={{ marginLeft: 12, fontSize: 13 }}>
                Team size: <strong style={{ color: '#fff' }}>{teamSize}</strong> participant{teamSize !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Participant slots — generated from team_size */}
        {participants.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>Name <span style={{ color: '#ef4444' }}>*</span></th>
                    <th>Roll Number <span style={{ color: '#ef4444' }}>*</span></th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'rgba(var(--accent-rgb),0.15)',
                          color: 'var(--accent)',
                          fontWeight: 700,
                          fontSize: 12,
                        }}>{i + 1}</span>
                      </td>
                      <td>
                        <input
                          className="input"
                          value={p.studentName}
                          onChange={(e) => updateParticipant(i, 'studentName', e.target.value)}
                          placeholder={`Participant ${i + 1} name`}
                          required
                          minLength={3}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={p.rollNo || ''}
                          onChange={(e) => updateParticipant(i, 'rollNo', e.target.value)}
                          placeholder={`Participant ${i + 1} roll number`}
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No event selected placeholder */}
        {!selectedEvent && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: 10,
            marginTop: 8,
          }}>
            Select an event above to view the participant slots.
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '10px',
            padding: '16px 20px',
            margin: '15px 0'
          }}>
            <p className="success" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
              {success}
            </p>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
              <span>You must join the WhatsApp Group for further updates:</span>
              {whatsappLink ? (
                <a 
                  href={whatsappLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary"
                  style={{ padding: '6px 16px', fontSize: '0.8rem', textDecoration: 'none', background: '#22c55e', borderColor: '#22c55e' }}
                >
                  Join WhatsApp Group
                </a>
              ) : (
                <span className="muted">(WhatsApp group link not set by admin yet)</span>
              )}
            </div>
          </div>
        )}

        {selectedEvent && (
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !eventId || participants.length === 0}
            style={{ marginTop: 8 }}
          >
            {submitting ? 'Submitting…' : `Submit Registration (${teamSize} participant${teamSize !== 1 ? 's' : ''})`}
          </button>
        )}
      </form>
    </div>
  )
}

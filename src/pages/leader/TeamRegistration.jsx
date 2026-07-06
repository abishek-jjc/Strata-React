import { useState } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { validateParticipantCount, hasDuplicateNamesWithinTeam } from '../../utils/validators'

const emptyParticipant = () => ({ studentName: '', gender: '', department: '', year: '' })

export default function TeamRegistration() {
  const { profile } = useAuth()
  const { data: events } = useTable(TABLES.EVENTS, [['status', 'eq', 'active']])
  const [eventId, setEventId] = useState('')
  const [participants, setParticipants] = useState([emptyParticipant()])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedEvent = events.find((e) => e.id === eventId)

  function updateParticipant(index, field, value) {
    const next = [...participants]
    next[index] = { ...next[index], [field]: value }
    setParticipants(next)
  }

  function addRow() {
    setParticipants([...participants, emptyParticipant()])
  }

  function removeRow(index) {
    setParticipants(participants.filter((_, i) => i !== index))
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

    const countError = validateParticipantCount(
      participants.length,
      selectedEvent.minimum_participants,
      selectedEvent.maximum_participants
    )
    if (countError) return setError(countError)

    if (hasDuplicateNamesWithinTeam(names)) {
      return setError('Two participants in this team have the same name.')
    }

    setSubmitting(true)
    try {
      // The entire flow — min/max check, one-registration-per-
      // college-per-event guarantee, and global participant-name
      // uniqueness — happens inside a single Postgres function
      // (register_team, see supabase/schema.sql). Because Postgres
      // functions run in one transaction and the uniqueness rules are
      // enforced by real UNIQUE constraints, this is race-condition
      // free without any client-side pre-check gymnastics — an actual
      // improvement over the Firestore version.
      const { error: rpcError } = await supabase.rpc('register_team', {
        p_college_id: profile.college_id,
        p_leader_id: profile.ref_id,
        p_event_id: eventId,
        p_participants: participants.map((p) => ({
          studentName: p.studentName.trim(),
          gender: p.gender,
          department: p.department,
          year: p.year,
        })),
      })

      if (rpcError) throw rpcError

      setSuccess('Team registered. Waiting for admin review.')
      setParticipants([emptyParticipant()])
      setEventId('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2>Team registration</h2>
      <form onSubmit={handleSubmit} className="registration-form">
        <label className="field">
          <span>Event</span>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} required>
            <option value="">Select event…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.event_name}</option>
            ))}
          </select>
        </label>

        {selectedEvent && (
          <p className="muted">
            {selectedEvent.minimum_participants}–{selectedEvent.maximum_participants} participants · Rs. {selectedEvent.registration_fee}
          </p>
        )}

        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Gender</th><th>Department</th><th>Year</th><th></th></tr>
          </thead>
          <tbody>
            {participants.map((p, i) => (
              <tr key={i}>
                <td><input className="input" value={p.studentName} onChange={(e) => updateParticipant(i, 'studentName', e.target.value)} required /></td>
                <td>
                  <select value={p.gender} onChange={(e) => updateParticipant(i, 'gender', e.target.value)}>
                    <option value="">—</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </td>
                <td><input className="input" value={p.department} onChange={(e) => updateParticipant(i, 'department', e.target.value)} /></td>
                <td><input className="input" value={p.year} onChange={(e) => updateParticipant(i, 'year', e.target.value)} style={{ width: 60 }} /></td>
                <td>
                  {participants.length > 1 && (
                    <button type="button" className="link danger" onClick={() => removeRow(i)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" className="btn" onClick={addRow}>Add participant</button>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit registration'}
        </button>
      </form>
    </div>
  )
}

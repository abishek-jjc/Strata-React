import { useState } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'

export default function Registrations() {
  const { data: registrations, loading } = useTable(TABLES.REGISTRATIONS)
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: lots } = useTable(TABLES.LOTS)
  const [lotChoice, setLotChoice] = useState({})

  const collegeName = (id) => colleges.find((c) => c.id === id)?.college_name || id
  const eventName = (id) => events.find((e) => e.id === id)?.event_name || id

  async function assignLot(reg) {
    const lot_id = lotChoice[reg.id]
    if (!lot_id) return
    await supabase
      .from(TABLES.REGISTRATIONS)
      .update({ lot_id, status: REGISTRATION_STATUS.LOT_ASSIGNED })
      .eq('id', reg.id)
  }

  async function approve(reg) {
    await supabase
      .from(TABLES.REGISTRATIONS)
      .update({ status: REGISTRATION_STATUS.APPROVED })
      .eq('id', reg.id)
  }

  async function reject(reg) {
    if (!confirm('Reject this registration?')) return
    await supabase
      .from(TABLES.REGISTRATIONS)
      .update({ status: REGISTRATION_STATUS.REJECTED })
      .eq('id', reg.id)
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div>
      <h2>Registrations</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>College</th>
            <th>Event</th>
            <th>Status</th>
            <th>Lot</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg) => (
            <tr key={reg.id}>
              <td>{collegeName(reg.college_id)}</td>
              <td>{eventName(reg.event_id)}</td>
              <td><span className={`badge badge-${reg.status}`}>{reg.status}</span></td>
              <td>
                {reg.status === REGISTRATION_STATUS.PENDING ? (
                  <select
                    value={lotChoice[reg.id] || ''}
                    onChange={(e) => setLotChoice({ ...lotChoice, [reg.id]: e.target.value })}
                  >
                    <option value="">Select lot…</option>
                    {lots.filter((l) => l.event_id === reg.event_id).map((l) => (
                      <option key={l.id} value={l.id}>{l.lot_name}</option>
                    ))}
                  </select>
                ) : (
                  lots.find((l) => l.id === reg.lot_id)?.lot_name || '—'
                )}
              </td>
              <td className="row-actions">
                {reg.status === REGISTRATION_STATUS.PENDING && (
                  <button className="link" onClick={() => assignLot(reg)}>Assign lot</button>
                )}
                {reg.status === REGISTRATION_STATUS.PAID && (
                  <button className="link" onClick={() => approve(reg)}>Approve</button>
                )}
                {reg.status !== REGISTRATION_STATUS.APPROVED && reg.status !== REGISTRATION_STATUS.REJECTED && (
                  <button className="link danger" onClick={() => reject(reg)}>Reject</button>
                )}
              </td>
            </tr>
          ))}
          {registrations.length === 0 && (
            <tr><td colSpan={5} className="muted">No registrations yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

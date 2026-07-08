import { useState } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'
import { generateBillPdf } from '../../utils/pdfBill'
import { useAuth } from '../../auth/AuthContext'

export default function PaymentCollection() {
  const { profile } = useAuth()
  const { data: registrations } = useTable(TABLES.REGISTRATIONS, [
    ['status', 'eq', REGISTRATION_STATUS.LOT_ASSIGNED],
  ])
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: leaders } = useTable(TABLES.STUDENT_LEADERS)
  const [mode, setMode] = useState({})
  const [amounts, setAmounts] = useState({})
  const [busy, setBusy] = useState(null)

  const collegeName = (id) => colleges.find((c) => c.id === id)?.college || id
  const eventInfo = (id) => events.find((e) => e.id === id)
  const leaderName = (id) => leaders.find((l) => l.id === id)?.name || id

  async function collect(reg) {
    const event = eventInfo(reg.event_id)
    const paymentMode = mode[reg.id] || 'Cash'
    const amountCollected = Number(amounts[reg.id]) || 0
    const receiptNo = `RCPT-${Date.now()}`
    const deskName = profile?.name || profile?.role || 'Accountant Desk'
    
    setBusy(reg.id)
    try {
      await supabase.from(TABLES.PAYMENTS).insert({
        registration_id: reg.id,
        college_id: reg.college_id,
        amount: amountCollected,
        payment_mode: paymentMode,
        receipt_no: receiptNo,
        collected_by: deskName
      })
      await supabase
        .from(TABLES.REGISTRATIONS)
        .update({ status: REGISTRATION_STATUS.PAID, receipt_no: receiptNo })
        .eq('id', reg.id)

      generateBillPdf({
        receiptNo,
        collegeName: collegeName(reg.college_id),
        eventName: event.event_name,
        leaderName: leaderName(reg.leader_id),
        amount: amountCollected,
        paymentMode,
        collectedBy: deskName,
        date: new Date().toLocaleDateString(),
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <h2>Payment collection</h2>
      <table className="data-table">
        <thead>
          <tr><th>College</th><th>Event</th><th>Amount (Rs.)</th><th>Mode</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {registrations.map((reg) => (
            <tr key={reg.id}>
              <td>{collegeName(reg.college_id)}</td>
              <td>{eventInfo(reg.event_id)?.event_name}</td>
              <td>
                <input 
                  type="number" 
                  className="input" 
                  style={{ width: '100px', padding: '4px 8px' }}
                  placeholder="0"
                  value={amounts[reg.id] || ''} 
                  onChange={(e) => setAmounts({ ...amounts, [reg.id]: e.target.value })} 
                />
              </td>
              <td>
                <select className="input" style={{ padding: '4px 8px' }} value={mode[reg.id] || 'Cash'} onChange={(e) => setMode({ ...mode, [reg.id]: e.target.value })}>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank transfer</option>
                </select>
              </td>
              <td>
                <button className="link" disabled={busy === reg.id} onClick={() => collect(reg)}>
                  {busy === reg.id ? 'Processing…' : 'Collect & print bill'}
                </button>
              </td>
            </tr>
          ))}
          {registrations.length === 0 && (
            <tr><td colSpan={5} className="muted">Nothing awaiting payment.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

export default function Payment() {
  const { profile } = useAuth()

  const { data: colleges, loading: colLoading } = useTable(TABLES.COLLEGES, [
    ['id', 'eq', profile?.college_id]
  ])
  const { data: students, loading: stdLoading } = useTable(TABLES.STUDENTS, [
    ['leader_id', 'eq', profile?.ref_id]
  ])
  const { data: registrations, loading: regLoading } = useTable(TABLES.REGISTRATIONS, [
    ['leader_id', 'eq', profile?.ref_id]
  ])
  const { data: settings, loading: setLoading } = useTable(TABLES.SETTINGS)
  const { data: logs, loading: logsLoading } = useTable(TABLES.PAYMENT_LOGS)

  const loading = colLoading || stdLoading || regLoading || setLoading || logsLoading
  const myCollege = colleges[0]

  if (loading) return <p className="muted">Loading payment details...</p>

  const paymentQrUrl = settings.find(s => s.key_name === 'payment_qr_url')?.value || ''
  const whatsappLink = settings.find(s => s.key_name === 'whatsapp_group_link')?.value || ''

  // Per person: 200 + 18% GST = Rs. 236
  const feeBase = 200
  const gstRate = 0.18
  const feePerStudent = feeBase * (1 + gstRate) // 236

  const paidCount = myCollege?.paid_student_count || 0
  const unpaidCount = Math.max(0, students.length - paidCount)
  const pendingTotal = unpaidCount * feePerStudent
  const hasRegistrations = registrations.length > 0

  // College is considered paid if there are registered students and no unpaid remaining students
  const isPaid = students.length > 0 && unpaidCount === 0

  const myCollegeName = myCollege?.department ? `${myCollege.college} (${myCollege.department})` : myCollege?.college
  const myLogs = logs.filter(l => l.college_name === myCollegeName)

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Payment Info</h2>

      {!hasRegistrations ? (
        <div className="card" style={{ padding: '30px', textAlign: 'center', border: '1px dashed var(--border)' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '15px' }}>📋</span>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>No Registrations Found</h3>
          <p className="muted" style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
            Please register your team for technical events first. Once registered, your total payable fee will be calculated here and the payment QR code will be revealed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Status banner — driven by colleges.is_paid set by the payment desk */}
          {students.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <span style={{ fontSize: '1.8rem' }}>📋</span>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>
                  No Participants Registered Yet
                </strong>
                <span className="muted" style={{ fontSize: '0.9rem' }}>
                  Register students in events to calculate the payable entry fee.
                </span>
              </div>
            </div>
          ) : isPaid ? (
            <div style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <span style={{ fontSize: '1.8rem', color: '#10b981' }}>✓</span>
              <div>
                <strong style={{ color: '#10b981', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>
                  Payment Fully Confirmed ✅
                </strong>
                <span className="muted" style={{ fontSize: '0.9rem' }}>
                  All {students.length} registered students are paid for. Thank you!
                </span>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <span style={{ fontSize: '1.8rem', color: '#ef4444' }}>⚠️</span>
              <div>
                <strong style={{ color: '#ef4444', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>
                  {paidCount > 0 ? 'Partial Payment Pending' : 'Payment Pending'}
                </strong>
                <span className="muted" style={{ fontSize: '0.9rem' }}>
                  {paidCount > 0 && <span>You previously paid for <strong>{paidCount}</strong> students. <br/></span>}
                  Pending balance of <strong>Rs. {pendingTotal}</strong> is payable for <strong>{unpaidCount}</strong> new student(s). Visit the payment desk at the venue.
                </span>
              </div>
            </div>
          )}

          {/* Fee Breakdown Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--accent)', fontSize: '1.15rem' }}>Fee Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">College:</span>
                <strong>{myCollegeName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Total Registered Students:</span>
                <strong>{students.length} student(s)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Already Paid For:</span>
                <strong style={{ color: '#10b981' }}>{paidCount} student(s)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">New (Unpaid) Students:</span>
                <strong style={{ color: unpaidCount > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{unpaidCount} student(s)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Fee Per Student (200 + 18% GST):</span>
                <span>Rs. {feePerStudent}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Pending Balance:</span>
                <strong style={{ color: isPaid ? '#10b981' : '#ef4444' }}>Rs. {pendingTotal}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span className="muted">Payment Status:</span>
                <span className={`badge badge-${isPaid ? 'approved' : 'pending'}`}>
                  {students.length === 0 ? 'No Students' : isPaid ? '✓ Confirmed by Desk' : paidCount > 0 ? 'Partially Paid' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code Card — only show if not yet paid */}
          {!isPaid && students.length > 0 && (
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--accent)', fontSize: '1.15rem' }}>Scan to Pay</h3>
              <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.6' }}>
                Scan the Google Pay / UPI QR Code below to transfer the pending balance of <strong>Rs. {pendingTotal}</strong>.
              </p>

              {paymentQrUrl ? (
                <div style={{ margin: '0 auto 20px', maxWidth: '280px', background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <img src={paymentQrUrl} alt="Payment QR" style={{ width: '100%', display: 'block' }} />
                </div>
              ) : (
                <div style={{
                  border: '1px dashed var(--border)',
                  padding: '30px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  marginBottom: '20px'
                }}>
                  QR Code not loaded yet by the administrator. Please visit the payment desk at the venue.
                </div>
              )}

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '15px', lineHeight: '1.5' }}>
                  After making the payment, click below to open the WhatsApp Group and share your payment screenshot. Our coordinators will verify and confirm your payment at the desk.
                </p>
                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: '#25D366',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    💬 Share screenshot to WhatsApp Group
                  </a>
                ) : (
                  <span className="muted">(WhatsApp group link not set by admin yet)</span>
                )}
              </div>

              <p className="muted" style={{ fontSize: '0.85rem', marginTop: '20px', lineHeight: '1.5' }}>
                * After payment, present your receipt at the payment desk. The desk operator will confirm your payment status here.
              </p>
            </div>
          )}

          {/* Payment Log History */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: 'var(--accent)', fontSize: '1.15rem' }}>Receipt History</h3>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
              Detailed history of payment transactions cleared at the desk.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.88rem' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Cleared +{log.students_count || 0} student(s)</div>
                    <span className="muted" style={{ fontSize: '0.78rem' }}>{new Date(log.created_at).toLocaleString()} ({log.poll_name})</span>
                  </div>
                  <strong style={{ color: '#10b981' }}>Rs. {log.amount || 0}</strong>
                </div>
              ))}
              {myLogs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No payment receipts recorded yet.
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

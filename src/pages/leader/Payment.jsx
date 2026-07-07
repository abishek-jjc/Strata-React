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

  const loading = colLoading || stdLoading || regLoading || setLoading
  const myCollege = colleges[0]

  if (loading) return <p className="muted">Loading payment details...</p>

  const feePerStudent = Number(settings.find(s => s.key_name === 'fee_per_student')?.value || '100')
  const paymentQrUrl = settings.find(s => s.key_name === 'payment_qr_url')?.value || ''
  const whatsappLink = settings.find(s => s.key_name === 'whatsapp_group_link')?.value || ''
  const totalAmount = students.length * feePerStudent

  const hasRegistrations = registrations.length > 0

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
          
          {/* Status banner */}
          {myCollege?.is_paid ? (
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
                  Payment Confirmed!
                </strong>
                <span className="muted" style={{ fontSize: '0.9rem' }}>
                  Your college registration has been marked as fully paid and approved. Thank you!
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
                  Payment Pending
                </strong>
                <span className="muted" style={{ fontSize: '0.9rem' }}>
                  Your payment has not been received yet. Please scan the QR Code below to make payment of <strong>Rs. {totalAmount}</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Details Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--accent)', fontSize: '1.15rem' }}>Fee Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">College:</span>
                <strong>{myCollege?.college}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Total Registered Students:</span>
                <strong>{students.length} student(s)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="muted">Fee Per Student:</span>
                <span>Rs. {feePerStudent}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontSize: '1.1rem' }}>
                <span className="muted">Total Payable Amount:</span>
                <strong style={{ color: 'var(--accent)' }}>Rs. {totalAmount}</strong>
              </div>
            </div>
          </div>

          {/* QR Code Card if not paid */}
          {!myCollege?.is_paid && (
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--accent)', fontSize: '1.15rem' }}>Scan to Pay</h3>
              <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.6' }}>
                Scan the Google Pay / UPI QR Code below using any payment app (GPay, PhonePe, Paytm) to transfer the amount.
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

              {/* Share to WhatsApp action */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '15px', lineHeight: '1.5' }}>
                  After making the payment, please click the button below to open the WhatsApp Group and send your payment receipt screenshot. Our coordinators will verify the transaction and approve your registration immediately.
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
                * After making the payment, please present the payment screenshot in the WhatsApp group. Verification will be handled by the desk team.
              </p>
            </div>
          )}
          
        </div>
      )}
    </div>
  )
}

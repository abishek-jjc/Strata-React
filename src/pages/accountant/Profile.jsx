import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'

export default function AccountantProfile() {
  const { profile, user, logout } = useAuth()
  const navigate = useNavigate()

  const [accountantDetails, setAccountantDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAccountantDetails() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        let accountRow = null

        if (profile?.ref_id) {
          const { data } = await supabase
            .from(TABLES.ACCOUNTANTS)
            .select('*')
            .eq('id', profile.ref_id)
            .maybeSingle()

          if (data) accountRow = data
        }

        if (!accountRow && user?.email) {
          const { data } = await supabase
            .from(TABLES.ACCOUNTANTS)
            .select('*')
            .eq('email', user.email)
            .maybeSingle()

          if (data) accountRow = data
        }

        setAccountantDetails(accountRow)
      } catch (err) {
        console.error('Error loading accountant profile details:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAccountantDetails()
  }, [user, profile])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const name = accountantDetails?.name || profile?.name || user?.user_metadata?.full_name || 'Accountant Operator'
  const email = accountantDetails?.email || user?.email || '-'
  const status = accountantDetails?.active !== false ? 'Active' : 'Inactive'

  if (loading) {
    return <div className="card" style={{ padding: '30px', textAlign: 'center' }}>Loading accountant profile...</div>
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ margin: 0 }}>Accountant Profile</h2>
        <p className="muted" style={{ margin: '4px 0 0 0' }}>
          Your operator account details and authentication information.
        </p>
      </div>

      <div className="card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #7c4dff)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 'bold',
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>{name}</h3>
            <span className="badge badge-approved" style={{ marginTop: '6px', display: 'inline-block' }}>
              💳 Payment Accountant Operator
            </span>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border)', margin: '10px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <span className="muted">Name:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{name}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <span className="muted">Account Email:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <span className="muted">Role:</span>
            <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-primary)' }}>
              Accountant
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <span className="muted">Account Status:</span>
            <span className={`badge ${status === 'Active' ? 'badge-approved' : 'badge-pending'}`}>
              {status}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn"
          onClick={handleLogout}
          style={{
            marginTop: '10px',
            background: 'rgba(255, 23, 68, 0.08)',
            border: '1px solid rgba(255, 23, 68, 0.25)',
            color: '#ff1744',
            padding: '12px',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

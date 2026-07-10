import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { TABLES } from '../../supabase/tables'

export default function Profile() {
  const { profile, user } = useAuth()
  const [collegeName, setCollegeName] = useState('')
  const [leaderDetails, setLeaderDetails] = useState(null)

  useEffect(() => {
    async function loadDetails() {
      if (!profile?.college_id) return
      const { data: college } = await supabase
        .from(TABLES.COLLEGES)
        .select('college, department')
        .eq('id', profile.college_id)
        .maybeSingle()
      if (college) {
        setCollegeName(college.department ? `${college.college} (${college.department})` : college.college)
      }

      if (profile?.ref_id) {
        const { data: leader } = await supabase
          .from(TABLES.STUDENT_LEADERS)
          .select('name, phone, department, email')
          .eq('id', profile.ref_id)
          .maybeSingle()
        if (leader) setLeaderDetails(leader)
      }
    }
    loadDetails()
  }, [profile])

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ marginBottom: '4px' }}>My Profile</h2>
        <p className="muted" style={{ fontSize: '0.9rem' }}>Your account information as a registered student leader.</p>
      </div>

      {/* Avatar + Name Card */}
      <div className="card" style={{ padding: '28px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{
          width: '64px', height: '64px', minWidth: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), #7c4dff)',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '1.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(0,229,255,0.2)',
        }}>
          {profile?.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>{profile?.name || '—'}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize', marginTop: '2px' }}>
            {profile?.role} · Student Leader Coordinator
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="card" style={{ padding: '28px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--accent)', fontSize: '1rem' }}>Account Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: '14px', columnGap: '12px', alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: '0.85rem' }}>Full Name</span>
          <strong style={{ color: '#fff' }}>{profile?.name || '—'}</strong>

          <span className="muted" style={{ fontSize: '0.85rem' }}>Google Email (Auth)</span>
          <span style={{ wordBreak: 'break-all' }}>{user?.email || leaderDetails?.email || '—'}</span>

          <span className="muted" style={{ fontSize: '0.85rem' }}>Mobile Phone</span>
          <span>{leaderDetails?.phone || '—'}</span>

          <span className="muted" style={{ fontSize: '0.85rem' }}>Department</span>
          <span>{leaderDetails?.department || '—'}</span>

          <span className="muted" style={{ fontSize: '0.85rem' }}>College</span>
          <strong style={{ color: '#fff' }}>{collegeName || 'Loading...'}</strong>

          <span className="muted" style={{ fontSize: '0.85rem' }}>Role</span>
          <span style={{ textTransform: 'capitalize' }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 10px',
              background: 'rgba(0, 229, 255, 0.1)',
              color: 'var(--accent)',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}>
              {profile?.role || '—'}
            </span>
          </span>
        </div>
      </div>

      {/* Auth info note */}
      <div className="card" style={{ padding: '20px', background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>🔐</span>
          <div>
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: '6px' }}>Google Authentication</div>
            <div className="muted" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
              Your account is secured with Google Sign-In. Password management is handled through your Google account at{' '}
              <a href="https://myaccount.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                myaccount.google.com
              </a>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

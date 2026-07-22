import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { TABLES } from '../../supabase/tables'
import BackButton from '../../components/common/BackButton'

export default function Profile() {
  const { profile, user, logout, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [collegeName, setCollegeName] = useState('')
  const [leaderDetails, setLeaderDetails] = useState(null)

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Theme states & sync
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

  useEffect(() => {
    const handleThemeChange = (e) => {
      setTheme(e.detail)
    }
    window.addEventListener('themechange', handleThemeChange)
    return () => window.removeEventListener('themechange', handleThemeChange)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    window.dispatchEvent(new CustomEvent('themechange', { detail: nextTheme }))
  }


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
      if (leader) {
        setLeaderDetails(leader)
        setEditName(leader.name || '')
        setEditPhone(leader.phone || '')
      }
    }
  }

  useEffect(() => {
    loadDetails()
  }, [profile])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setEditError('')

    if (!editName.trim() || editName.trim().length < 3) {
      return setEditError('Name must contain at least 3 characters.')
    }
    if (!editPhone.trim() || editPhone.trim().length < 10) {
      return setEditError('Please enter a valid 10-digit mobile number.')
    }

    setSaving(true)
    try {
      const { error } = await supabase.rpc('update_leader_profile_data', {
        p_name: editName.trim(),
        p_phone: editPhone.trim()
      })
      if (error) throw error

      await refreshProfile()
      await loadDetails()
      setIsEditing(false)
    } catch (err) {
      setEditError(err.message || 'Failed to update profile details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BackButton />
        <div>
          <h2 style={{ margin: 0 }}>My Profile</h2>
          <p className="muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Your account information and settings as a registered student leader.
          </p>
        </div>
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
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{profile?.name || '—'}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize', marginTop: '2px' }}>
            {profile?.role || 'Leader'}
          </div>

        </div>
      </div>

      {/* Account Details */}
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1rem' }}>Account Details</h3>
          <button 
            onClick={() => setIsEditing(true)} 
            className="btn" 
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            ✏️ Edit Profile
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: '14px', columnGap: '12px', alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: '0.85rem' }}>Full Name</span>
          <strong style={{ color: 'var(--text-primary)' }}>{profile?.name || '—'}</strong>

          <span className="muted" style={{ fontSize: '0.85rem' }}>Google Email (Auth)</span>
          <span style={{ wordBreak: 'break-all' }}>{user?.email || leaderDetails?.email || '—'}</span>

          <span className="muted" style={{ fontSize: '0.85rem' }}>Mobile Phone</span>
          <span>{leaderDetails?.phone || '—'}</span>

          <span className="muted" style={{ fontSize: '0.85rem' }}>Department</span>
          <span>{leaderDetails?.department || '—'}</span>

          <span className="muted" style={{ fontSize: '0.85rem' }}>College</span>
          <strong style={{ color: 'var(--text-primary)' }}>{collegeName || 'Loading...'}</strong>

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
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Google Authentication</div>
            <div className="muted" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
              Your account is secured with Google Sign-In. Password management is handled through your Google account at{' '}
              <a href="https://myaccount.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                myaccount.google.com
              </a>.
            </div>
          </div>
        </div>
      </div>

      {/* Theme Settings Card */}
      <div className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>Display Theme</h3>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
            Switch between light and dark visual modes.
          </p>
        </div>
        
        <button
          onClick={toggleTheme}
          className="btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.88rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
        </button>
      </div>

      {/* Logout button */}
      <button 

        onClick={handleLogout} 
        className="btn"
        style={{ 
          width: '100%', 
          justifyContent: 'center', 
          background: 'rgba(255, 23, 68, 0.08)', 
          border: '1px solid rgba(255, 23, 68, 0.25)', 
          color: '#ff1744',
          padding: '14px',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.95rem',
          fontWeight: '600',
          transition: 'all 0.2s',
          marginTop: '10px'
        }}
      >
        <span>Sign Out / Log Out</span>
      </button>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="modal-backdrop" onClick={() => setIsEditing(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveEdit} style={{ maxWidth: '500px', width: '100%' }}>
            <h3>Edit Profile Details</h3>
            
            <label className="field">
              <span>Full Name *</span>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Mobile Phone *</span>
              <input
                type="text"
                required
                placeholder="10-digit mobile number"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </label>

            {editError && <p className="error">{editError}</p>}

            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

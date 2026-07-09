import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { TABLES } from '../../supabase/tables'

export default function Profile() {
  const { profile, user } = useAuth()
  const [collegeName, setCollegeName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCollege() {
      if (!profile?.college_id) return
      const { data } = await supabase
        .from(TABLES.COLLEGES)
        .select('college, department')
        .eq('id', profile.college_id)
        .maybeSingle()
      if (data) {
        setCollegeName(data.department ? `${data.college} - ${data.department}` : data.college)
      }
    }
    loadCollege()
  }, [profile])

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 6) {
      return setError('Password must be at least 6 characters long.')
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.')
    }

    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      })
      if (authError) throw authError
      setMessage('Password updated successfully!')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>My Profile</h2>
      
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--accent)' }}>Account Details</h3>
        <div className="profile-details-grid">
          <span className="muted">Name:</span>
          <strong>{profile?.name || '-'}</strong>
          
          <span className="muted">Email:</span>
          <span>{user?.email || '-'}</span>

          <span className="muted">Role:</span>
          <span style={{ textTransform: 'capitalize' }}>{profile?.role || '-'}</span>

          <span className="muted">College:</span>
          <strong>{collegeName || 'Loading...'}</strong>
        </div>
      </div>

      <form onSubmit={handleUpdatePassword} className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--accent)' }}>Change Password</h3>
        
        <label className="field">
          <span>New Password</span>
          <input
            type="password"
            required
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Confirm New Password</span>
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>

        {error && <p className="error" style={{ margin: '12px 0 0 0' }}>{error}</p>}
        {message && <p className="success" style={{ margin: '12px 0 0 0' }}>{message}</p>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !password}
          style={{ marginTop: '20px', width: '100%' }}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

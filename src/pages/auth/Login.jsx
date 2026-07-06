import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { TABLES } from '../../supabase/tables'
import '../../styles/guest.css'

const REDIRECT = { admin: '/admin', leader: '/leader', accountant: '/accountant', incharge: '/incharge' }

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: signInError } = await login(email, password)
      if (signInError) throw signInError

      const { data: profile } = await supabase
        .from(TABLES.PROFILES)
        .select('role')
        .eq('id', data.user.id)
        .single()

      navigate(REDIRECT[profile?.role] || '/login')
    } catch (err) {
      setError('Incorrect email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="guest-portal-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', paddingTop: 0 }}>
      {/* Ambient orbs — same as home page */}
      <div className="guest-ambient-bg">
        <div className="guest-glow-orb guest-orb-1" />
        <div className="guest-glow-orb guest-orb-2" />
        <div className="guest-glow-orb guest-orb-3" />
      </div>
      <div className="guest-mesh-grid" />

      {/* Login card */}
      <form
        className="login-glass-card"
        onSubmit={handleSubmit}
        style={{ position: 'relative', zIndex: 10 }}
      >
        {/* Top accent line */}
        <div className="login-card-accent" />

        {/* Brand */}
        <div className="login-brand">
          <span className="login-brand-logo">STRATA</span>
          <span className="login-brand-year">2K26</span>
        </div>
        <p className="login-subtitle">State Level Intercollegiate Technical Meet</p>

        {/* Hint */}
        <div className="login-hint-box">
          <span>🎓</span>
          <span>
            <strong>Student Leaders:</strong> Use your registered Email ID and Mobile Number as password.
          </span>
        </div>

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@college.edu" />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </label>

        {error && <p className="error" style={{ margin: 0, textAlign: 'center' }}>{error}</p>}

        <button className="login-cta-btn" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ textAlign: 'center', margin: 0, fontSize: '12px', color: 'var(--g-text-muted)' }}>
          ANJAC Sivakasi · Dept. of Computer Science
        </p>
      </form>
    </div>
  )
}

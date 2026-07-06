import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { TABLES } from '../../supabase/tables'

const REDIRECT = { admin: '/admin', leader: '/leader', accountant: '/accountant' }

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

      // AuthContext resolves role async via onAuthStateChange; read it
      // directly here too so we know where to redirect right away.
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
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Strata</h1>
        <p className="muted">Sign in to continue</p>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import GuestLayout from '../../components/layout/GuestLayout'
import '../../styles/guest.css'

const REDIRECT = { admin: '/admin', leader: '/leader', accountant: '/accountant', incharge: '/incharge' }

export default function Login() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, role, profile, loading: authLoading } = useAuth()

  // Redirect users who are already logged in or reject unauthorized logins
  useEffect(() => {
    async function checkDirectLogin() {
      if (authLoading) return // Wait for AuthProvider to resolve profile state

      if (user) {
        if (!profile || !profile.ref_id) {
          setError(`Google Account (${user.email}) is not recognized. If you are a Student Leader, please register first using your invitation QR code.`)
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        navigate(REDIRECT[role] || '/login')
      }
    }
    checkDirectLogin()
  }, [user, role, profile, authLoading, navigate])

  async function handleGoogleLogin() {
    setError('')
    setLoading(true)
    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/login'
        }
      })
      if (oAuthError) throw oAuthError
    } catch (err) {
      setError(err?.message || 'Failed to initialize Google login.')
      setLoading(false)
    }
  }

  return (
    <GuestLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 180px)', padding: '40px 20px', position: 'relative', zIndex: 10 }}>
        {/* Login card */}
        <div
          className="login-glass-card"
          style={{ position: 'relative', zIndex: 10, padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '440px' }}
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
          <div className="login-hint-box" style={{ marginBottom: '10px' }}>
            <span>🎓</span>
            <span>
              <strong>Authenticating:</strong> Please sign in with your Google Account to proceed.
            </span>
          </div>

          <button
            type="button"
            className="login-cta-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #4285F4, #357AE8)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(66,133,244,0.3)',
              border: 'none',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 'bold',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.35 0-4.337-1.587-5.048-3.719H.924v2.332C2.404 15.96 5.438 18 9 18z" fill="#34A853"/>
              <path d="M3.952 10.699c-.18-.54-.282-1.117-.282-1.699s.102-1.159.282-1.699V4.969H.924C.335 6.147 0 7.481 0 9s.335 2.853.924 4.031l3.028-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.32 0 2.5.454 3.436 1.348l2.578-2.578C13.468 1.096 11.43 0 9 0 5.438 0 2.404 2.04 10.924 4.969l3.028 2.332c.711-2.132 2.698-3.721 5.048-3.721z" fill="#EA4335"/>
            </svg>
            {loading ? 'Redirecting to Google...' : 'Sign in with Google'}
          </button>

          {error && <p className="error" style={{ margin: 0, textAlign: 'center' }}>{error}</p>}

          <p style={{ textAlign: 'center', margin: '10px 0 0 0', fontSize: '12px', color: 'var(--g-text-muted)' }}>
            ANJAC Sivakasi · Dept. of Computer Science
          </p>
        </div>
      </div>
    </GuestLayout>
  )
}

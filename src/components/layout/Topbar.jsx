import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function Topbar() {
  const { profile, role, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="topbar">
      {/* Left section: breadcrumb role */}
      <div className="topbar-left">
        <span className="topbar-logo-mini">STRATA <span>2K26</span></span>
        <span className="topbar-sep">›</span>
        <span className="topbar-role">{role}</span>
      </div>

      {/* Right section: user info + logout */}
      <div className="topbar-right">
        {profile?.name && (
          <div className="topbar-user">
            <div className="topbar-avatar">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <span className="topbar-name">{profile.name}</span>
          </div>
        )}
        <button className="topbar-logout-btn" onClick={handleLogout}>
          <span>Sign out</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  )
}

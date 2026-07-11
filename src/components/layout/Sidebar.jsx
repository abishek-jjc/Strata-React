import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

const NAV = {
  admin: [
    ['/admin', 'Dashboard'],
    ['/admin/events', 'Events'],
    ['/admin/venues', 'Venues'],
    ['/admin/winners', 'Winners'],
    ['/admin/colleges', 'Colleges'],
    ['/admin/payment-polls', 'Payment Polls'],
    ['/admin/leaders', 'Student Leaders'],
    ['/admin/admins', 'Admin Management'],
    ['/admin/accountants', 'Accountants'],
    ['/admin/participants', 'Participants'],
    ['/admin/registrations', 'Registrations'],
    ['/admin/lots', 'Lots'],
    ['/admin/food', 'Food'],
    ['/admin/incharges', 'Incharges'],
    ['/admin/certificates', 'Certificates'],
    ['/admin/reports', 'Reports'],
    ['/admin/rules', 'Common Rules'],
    ['/admin/homepage-leaders', 'Greetings / Leaders'],
    ['/admin/settings', 'Page Settings'],
    ['/payment', 'Payment Desk'],
  ],
  leader: [
    ['/leader', 'Dashboard'],
    ['/leader/register', 'Registration & Teams'],
    ['/leader/rules', 'Event Rules'],
    ['/leader/certificates', 'Certificates'],
    ['/leader/payment', 'Payment'],
    ['/leader/whatsapp', 'WhatsApp Group'],
  ],
  incharge: [
    ['/incharge', 'Dashboard / Winners'],
  ],
  accountant: [
    ['/payment', 'Payment Desk'],
  ],
}

const ROLE_ICON = {
  admin: '⚙️',
  leader: '🎓',
  incharge: '🏆',
  accountant: '💳',
}

export default function Sidebar({ role, isOpen, onClose }) {
  const items = NAV[role] || []
  const navigate = useNavigate()
  const { profile, logout } = useAuth()

  const isLeader = role === 'leader'

  const handleProfileClick = () => {
    if (isLeader) {
      navigate('/leader/profile')
      onClose()
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
    onClose()
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-brand">
        <span className="sidebar-brand-logo">STRATA</span>
        <span className="sidebar-brand-year">2K26</span>
      </div>

      {/* Role badge */}
      <div className="sidebar-role-badge">
        <span className="sidebar-role-icon">{ROLE_ICON[role] || '👤'}</span>
        <span className="sidebar-role-label">{role}</span>
      </div>

      <div className="sidebar-divider" />

      <nav>
        {items.map(([to, label]) => (
          <NavLink 
            key={to} 
            to={to} 
            end 
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={onClose}
          >
            <span className="nav-dot" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-divider" style={{ marginTop: '15px', marginBottom: '15px' }} />

      {/* Sidebar Footer: Profile info & Logout */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '10px' }}>
        {profile?.name && (
          <div 
            onClick={handleProfileClick}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: isLeader ? 'pointer' : 'default', 
              padding: '8px', 
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'all 0.2s'
            }}
            className={isLeader ? 'sidebar-profile-card clickable' : 'sidebar-profile-card'}
          >
            <div className="topbar-avatar" style={{ 
              margin: 0, 
              width: '32px', 
              height: '32px', 
              minWidth: '32px', 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #7c4dff)',
              color: '#fff',
              fontWeight: 'bold'
            }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.name}
              </span>
              {isLeader && (
                <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>
                  View Profile
                </span>
              )}
            </div>
          </div>
        )}
        <button 
          onClick={handleLogout} 
          className="topbar-logout-btn" 
          style={{ 
            width: '100%', 
            justifyContent: 'center', 
            background: 'rgba(255, 23, 68, 0.08)', 
            border: '1px solid rgba(255, 23, 68, 0.25)', 
            color: '#ff1744',
            padding: '10px 12px',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          <span>Sign out</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {/* Bottom glow accent */}
      <div className="sidebar-glow-bottom" />
    </aside>
  )
}

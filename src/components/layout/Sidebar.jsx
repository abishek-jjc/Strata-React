import { NavLink } from 'react-router-dom'

const NAV = {
  admin: [
    ['/admin', 'Dashboard'],
    ['/admin/events', 'Events'],
    ['/admin/venues', 'Venues'],
    ['/admin/winners', 'Winners'],
    ['/admin/colleges', 'Colleges'],
    ['/admin/payment-polls', 'Payment Polls'],
    ['/admin/leaders', 'Student Leaders'],
    ['/admin/participants', 'Participants'],
    ['/admin/registrations', 'Registrations'],
    ['/admin/lots', 'Lots'],
    ['/admin/incharges', 'Incharges'],
    ['/admin/accountants', 'Accountants'],
    ['/admin/certificates', 'Certificates'],
    ['/admin/reports', 'Reports'],
    ['/admin/rules', 'Common Rules'],
    ['/admin/homepage-leaders', 'Greetings / Leaders'],
    ['/admin/settings', 'Page Settings'],
    ['/payment', 'Payment Desk'],
  ],
  leader: [
    ['/leader', 'Dashboard'],
    ['/leader/register', 'Team Registration'],
    ['/leader/students', 'Student List'],
    ['/leader/certificates', 'Certificates'],
  ],
  accountant: [
    ['/accountant', 'Dashboard'],
    ['/accountant/collect', 'Payment Collection'],
    ['/accountant/history', 'Payment History'],
  ],
  incharge: [
    ['/incharge', 'Dashboard / Winners'],
  ],
}

const ROLE_ICON = {
  admin: '⚙️',
  leader: '🎓',
  accountant: '💳',
  incharge: '🏆',
}

export default function Sidebar({ role }) {
  const items = NAV[role] || []
  return (
    <aside className="sidebar">
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
          <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-dot" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom glow accent */}
      <div className="sidebar-glow-bottom" />
    </aside>
  )
}

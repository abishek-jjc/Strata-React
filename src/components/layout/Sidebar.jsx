import { NavLink } from 'react-router-dom'

const NAV = {
  admin: [
    ['/admin', 'Dashboard'],
    ['/admin/events', 'Events'],
    ['/admin/colleges', 'Colleges'],
    ['/admin/leaders', 'Student leaders'],
    ['/admin/registrations', 'Registrations'],
    ['/admin/lots', 'Lots'],
    ['/admin/incharges', 'Incharges'],
    ['/admin/accountants', 'Accountants'],
    ['/admin/certificates', 'Certificates'],
    ['/admin/reports', 'Reports'],
    ['/admin/rules', 'Common Rules'],
    ['/admin/homepage-leaders', 'Greetings / Leaders'],
    ['/admin/settings', 'Page Settings'],
  ],
  leader: [
    ['/leader', 'Dashboard'],
    ['/leader/register', 'Team registration'],
    ['/leader/students', 'Student list'],
    ['/leader/certificates', 'Certificates'],
  ],
  accountant: [
    ['/accountant', 'Dashboard'],
    ['/accountant/collect', 'Payment collection'],
    ['/accountant/history', 'Payment history'],
  ],
}

export default function Sidebar({ role }) {
  const items = NAV[role] || []
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Strata</div>
      <nav>
        {items.map(([to, label]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

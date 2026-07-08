import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../auth/AuthContext'

export default function AppShell({ children }) {
  const { role } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={`app-shell role-${role} ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Ambient background — same as guest home page */}
      <div className="shell-ambient-bg">
        <div className="shell-orb shell-orb-1" />
        <div className="shell-orb shell-orb-2" />
        <div className="shell-orb shell-orb-3" />
      </div>
      <div className="shell-mesh-grid" />

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}

import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../auth/AuthContext'

export default function AppShell({ children }) {
  const { role } = useAuth()
  return (
    <div className={`app-shell role-${role}`}>
      {/* Ambient background — same as guest home page */}
      <div className="shell-ambient-bg">
        <div className="shell-orb shell-orb-1" />
        <div className="shell-orb shell-orb-2" />
        <div className="shell-orb shell-orb-3" />
      </div>
      <div className="shell-mesh-grid" />

      <Sidebar role={role} />
      <div className="app-main">
        <Topbar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}

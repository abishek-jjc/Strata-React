import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../auth/AuthContext'

export default function AppShell({ children }) {
  const { role } = useAuth()
  return (
    <div className="app-shell">
      <Sidebar role={role} />
      <div className="app-main">
        <Topbar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}

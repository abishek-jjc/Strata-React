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
      <span className="topbar-role">{role}</span>
      <span className="topbar-name">{profile?.name || ''}</span>
      <button className="link" onClick={handleLogout}>Sign out</button>
    </header>
  )
}

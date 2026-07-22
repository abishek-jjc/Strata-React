import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import { useAuth } from '../../auth/AuthContext'

export default function AppShell({ children }) {
  const { role } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

  // Manage theme classes on body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme')
    } else {
      document.body.classList.remove('light-theme')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const handleThemeChange = (e) => {
      setTheme(e.detail)
    }
    window.addEventListener('themechange', handleThemeChange)
    return () => window.removeEventListener('themechange', handleThemeChange)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    window.dispatchEvent(new CustomEvent('themechange', { detail: nextTheme }))
  }

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
        <Topbar 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="app-content">{children}</main>
      </div>
      {(role === 'leader' || role === 'incharge') && <BottomNav />}
    </div>
  )
}

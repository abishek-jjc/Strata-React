import { useAuth } from '../../auth/AuthContext'

export default function Topbar({ onToggleSidebar }) {
  const { role } = useAuth()

  return (
    <header className="topbar">
      {/* Left section: toggle button + breadcrumb role */}
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
          style={{ marginRight: '8px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="topbar-logo-mini">STRATA <span>2K26</span></span>
        <span className="topbar-sep">›</span>
        <span className="topbar-role">{role}</span>
      </div>
    </header>
  )
}

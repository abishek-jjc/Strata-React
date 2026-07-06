import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import '../../styles/guest.css'

export default function GuestLayout({ children }) {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Listen to scrolls to add bg to header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Manage theme classes on body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme')
    } else {
      document.body.classList.remove('light-theme')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="guest-portal-wrapper">
      {/* Background ambient orbs & grid */}
      <div className="guest-ambient-bg">
        <div className="guest-glow-orb guest-orb-1" />
        <div className="guest-glow-orb guest-orb-2" />
        <div className="guest-glow-orb guest-orb-3" />
      </div>
      <div className="guest-mesh-grid" />

      {/* Header */}
      <header className={`guest-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="guest-nav-container">
          <Link to="/" className="guest-logo" style={{ textDecoration: 'none' }}>
            STRATA <span>2K26</span>
          </Link>

          <nav>
            <ul className="guest-nav-links" style={mobileOpen ? { display: 'flex', flexDirection: 'column', position: 'absolute', top: '100%', right: 0, width: '200px', background: 'var(--g-bg)', padding: '20px', border: '1px solid var(--g-glass-border)', borderTop: 'none', borderRadius: '0 0 0 12px', gap: '15px', alignItems: 'flex-start' } : {}}>
              <li><NavLink to="/" end onClick={() => setMobileOpen(false)}>Home</NavLink></li>
              <li><NavLink to="/about" onClick={() => setMobileOpen(false)}>About Us</NavLink></li>
              <li><NavLink to="/events" onClick={() => setMobileOpen(false)}>Contests</NavLink></li>
              <li><NavLink to="/rules" onClick={() => setMobileOpen(false)}>Rules</NavLink></li>
              <li><NavLink to="/contact" onClick={() => setMobileOpen(false)}>Contact Us</NavLink></li>
              <li><NavLink to="/invitation" onClick={() => setMobileOpen(false)}>Invitation</NavLink></li>
              <li>
                <button className="guest-nav-cta" onClick={() => { setMobileOpen(false); navigate('/login') }}>
                  Login
                </button>
              </li>
            </ul>
          </nav>

          <button className="guest-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none' }}>
            <span style={{ display: 'block', width: '25px', height: '3px', background: 'var(--g-text)', marginBottom: '5px' }}></span>
            <span style={{ display: 'block', width: '25px', height: '3px', background: 'var(--g-text)', marginBottom: '5px' }}></span>
            <span style={{ display: 'block', width: '25px', height: '3px', background: 'var(--g-text)' }}></span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ position: 'relative', zIndex: 10 }}>
        {children}
      </main>

      {/* Floating Theme Toggler */}
      <button className="guest-theme-toggle" id="themeToggleBtn" onClick={toggleTheme}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Footer */}
      <footer className="guest-footer">
        <div className="guest-footer-logo">STRATA <span>2K26</span></div>
        <p className="guest-footer-text">
          Department of Computer Science<br />
          Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi.<br />
          Established in 1963.
        </p>
        <p className="guest-footer-credits">
          Designed for STRATA 2K26. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import '../../styles/guest.css'
import { Html5Qrcode } from 'html5-qrcode'
import { decryptCollegePayload } from '../../utils/qrCrypto'
import { useSettings } from '../../context/SettingsContext'

export default function GuestLayout({ children, hideHeaderFooter }) {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Scanner state
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState('')
  const [html5QrCode, setHtml5QrCode] = useState(null)

  useEffect(() => {
    if (!showScanner) return

    const qrScanner = new Html5Qrcode("nav-reader")
    setHtml5QrCode(qrScanner)

    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      let ciphertext = decodedText
      if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        try {
          const url = new URL(decodedText)
          ciphertext = url.searchParams.get('payload') || ''
        } catch (e) {
          ciphertext = ''
        }
      }

      const decrypted = decryptCollegePayload(ciphertext)
      if (decrypted && decrypted.college && decrypted.department) {
        setScanError('')
        qrScanner.stop().then(() => {
          qrScanner.clear()
          setShowScanner(false)
          navigate('/register', {
            state: {
              autoDecryptedCollege: decrypted.college,
              autoDecryptedDept: decrypted.department
            }
          })
        }).catch(err => console.error("Failed to stop scanner", err))
      } else {
        setScanError('Invalid QR Code. Decryption failed. Please scan a valid invitation QR.')
      }
    }

    const config = { fps: 10 }
    
    qrScanner.start(
      { facingMode: "environment" },
      config,
      qrCodeSuccessCallback,
      () => {}
    ).catch((err) => {
      console.error("Camera start error:", err)
      let msg = "Failed to start camera scanner. Please ensure camera permissions are granted."
      if (!window.isSecureContext) {
        msg = "Camera access requires a secure connection (HTTPS) or localhost. Please reload the page securely."
      } else if (err && (String(err).includes("NotAllowedError") || String(err).includes("Permission denied"))) {
        msg = "Camera permission was denied. Please grant camera access in your browser settings."
      } else if (err && (String(err).includes("NotFoundError") || String(err).includes("no devices"))) {
        msg = "No camera device found on this system."
      } else if (err && (String(err).includes("supported") || String(err).includes("streaming"))) {
        msg = "Camera streaming is not supported by your browser or environment."
      } else if (err) {
        msg = `Camera scanner error: ${err}`
      }
      setScanError(msg)
    })

    return () => {
      if (qrScanner.isScanning) {
        qrScanner.stop().then(() => {
          qrScanner.clear()
        }).catch(err => console.error("Clean stop error:", err))
      }
    }
  }, [showScanner, navigate])

  const closeScanner = () => {
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop().then(() => {
        html5QrCode.clear()
        setShowScanner(false)
      }).catch(err => {
        console.error("Error stopping scanner:", err)
        setShowScanner(false)
      })
    } else {
      setShowScanner(false)
    }
  }

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
      {!hideHeaderFooter && (
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
                {settings.show_winners_page === 'true' && (
                  <li><NavLink to="/winners" onClick={() => setMobileOpen(false)}>Winners</NavLink></li>
                )}
                <li><NavLink to="/contact" onClick={() => setMobileOpen(false)}>Contact Us</NavLink></li>
                <li>
                  <button 
                    className="guest-nav-cta" 
                    onClick={() => { 
                      setMobileOpen(false); 
                      setScanError('');
                      setShowScanner(true); 
                    }}
                    style={{ marginRight: '10px' }}
                  >
                    Register via QR
                  </button>
                </li>
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
      )}

      {/* Main Content */}
      <main style={{ position: 'relative', zIndex: 10 }}>
        {children}
      </main>

      {/* Floating Theme Toggler */}
      {!hideHeaderFooter && (
        <button className="guest-theme-toggle" id="themeToggleBtn" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      )}

      {/* Footer */}
      {!hideHeaderFooter && (
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
      )}

      {/* QR Scanner Modal Overlay */}
      {showScanner && (
        <div className="guest-success-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="guest-success-card guest-glass-panel" style={{ padding: '40px', maxWidth: '480px', width: '90%', textAlign: 'center', margin: '0 auto' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)', marginBottom: '15px' }}>
              Scan Invitation QR
            </h3>
            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.6' }}>
              Scan the QR code printed on your official STRATA invitation letter to start the registration process.
            </p>

            <div 
              id="nav-reader" 
              style={{ 
                width: '100%', 
                maxWidth: '320px', 
                margin: '0 auto 25px auto', 
                borderRadius: '16px', 
                overflow: 'hidden',
                border: '1px solid var(--g-glass-border)',
                background: 'rgba(0,0,0,0.3)',
                aspectRatio: '1'
              }}
            ></div>

            {scanError && (
              <div style={{ color: 'var(--g-accent)', fontSize: '0.95rem', margin: '15px 0', padding: '10px 15px', borderRadius: '8px', background: 'rgba(255,23,68,0.05)', border: '1px solid rgba(255,23,68,0.2)' }}>
                {scanError}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <button type="button" onClick={closeScanner} className="guest-btn guest-btn-secondary" style={{ padding: '12px 36px', minWidth: '150px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

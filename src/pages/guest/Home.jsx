import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'
import HeartbeatVideoButton from '../../components/common/HeartbeatVideoButton'
import { Html5Qrcode } from 'html5-qrcode'
import { decryptCollegePayload } from '../../utils/qrCrypto'
import { Superscript, Video } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [eventDate, setEventDate] = useState('2026-09-25T09:00:00')
  const [invTitle, setInvTitle] = useState('You Are Cordially Invited')
  const [invTagline, setInvTagline] = useState('STRATA 2K26 — State Level Intercollegiate Technical Meet, ANJAC Sivakasi')
  const [invBody, setInvBody] = useState('')
  const [invPdfUrl, setInvPdfUrl] = useState('')
  const [eventCount, setEventCount] = useState(6)
  const [demoVideoUrl, setDemoVideoUrl] = useState('')

  // Countdown state
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' })

  function handleDownloadInvitation() {
    if (invPdfUrl && invPdfUrl.trim() !== '') {
      window.open(invPdfUrl, '_blank')
    } else {
      alert('Invitation PDF is not available yet.')
    }
  }

  // Scanner state
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState('')
  const [html5QrCode, setHtml5QrCode] = useState(null)

  useEffect(() => {
    if (!showScanner) return

    const qrScanner = new Html5Qrcode("landing-reader")
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
      () => { }
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

  useEffect(() => {
    // Fetch settings and event count
    async function loadData() {
      // Settings
      const { data: settingsData } = await supabase
        .from(TABLES.SETTINGS)
        .select('key_name, value')
      if (settingsData) {
        const settingsMap = {}
        settingsData.forEach(row => {
          settingsMap[row.key_name] = row.value
        })
        if (settingsMap.event_date) setEventDate(settingsMap.event_date)
        if (settingsMap.invitation_title) setInvTitle(settingsMap.invitation_title)
        if (settingsMap.invitation_tagline) setInvTagline(settingsMap.invitation_tagline)
        if (settingsMap.invitation_body) setInvBody(settingsMap.invitation_body)
        if (settingsMap.invitation_pdf_url) setInvPdfUrl(settingsMap.invitation_pdf_url)
        if (settingsMap.demo_video_url) setDemoVideoUrl(settingsMap.demo_video_url)
      }

      // Event Count
      const { count } = await supabase
        .from(TABLES.EVENTS)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
      if (count !== null) setEventCount(count)
    }

    loadData()
  }, [])

  // Timer Tick
  useEffect(() => {
    const target = new Date(eventDate.replace(' ', 'T')).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' })
        return
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({
        days: d < 10 ? '0' + d : String(d),
        hours: h < 10 ? '0' + h : String(h),
        minutes: m < 10 ? '0' + m : String(m),
        seconds: s < 10 ? '0' + s : String(s)
      })
    }

    const interval = setInterval(updateTimer, 1000)
    updateTimer() // initial call

    return () => clearInterval(interval)
  }, [eventDate])

  return (
    <GuestLayout>
      {/* Hero Section */}
      <section className="guest-hero">
        <p className="guest-college-info">Ayya Nadar Janaki Ammal College</p>
        <p className="guest-college-sub" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '0.85rem', maxWidth: '800px', margin: '-10px auto 30px auto', lineHeight: '1.5' }}>
          (Autonomous, Affiliated to Madurai Kamaraj University, Re-accredited 4<sup>th</sup> cycle with ‘A+’ Grade (CGPA of 3.48 out of 4) by NAAC, recognized as College of Excellence and Mentor Institution by UGC, Star College by DBT and Ranked 72<sup>nd</sup> at National Level in NIRF 2025, DST-FIST(2024) supported and ISO 9001:2015 & ISO 21001:2018 Certified Institution), Sivakasi
        </p>
        <h1 className="guest-hero-title">STRATA 2K26</h1>
        <p className="guest-hero-tagline">
          State Level Intercollegiate Technical Meet organized by the <strong>Department of Computer Science</strong>
        </p>

        <HeartbeatVideoButton
          text="Click to Watch Demo Video"
          onClick={function() { navigate('/watch-demo'); }}
        />

        <div className="guest-cta-container">
          <Link to="/login" className="guest-btn guest-btn-primary">
            Login Portal →
          </Link>
          <button
            type="button"
            onClick={() => {
              setScanError('')
              setShowScanner(true)
            }}
            className="guest-btn guest-btn-primary"
            style={{ cursor: 'pointer' }}
          >
            Register via QR →
          </button>
          <Link to="/events" className="guest-btn guest-btn-secondary">
            Explore Contests
          </Link>
        </div>

        {/* Countdown */}
        <div className="guest-countdown">
          <div className="guest-countdown-item">
            <span className="guest-countdown-val">{timeLeft.days}</span>
            <span className="guest-countdown-label">Days</span>
          </div>
          <div className="guest-countdown-item">
            <span className="guest-countdown-val">{timeLeft.hours}</span>
            <span className="guest-countdown-label">Hours</span>
          </div>
          <div className="guest-countdown-item">
            <span className="guest-countdown-val">{timeLeft.minutes}</span>
            <span className="guest-countdown-label">Min</span>
          </div>
          <div className="guest-countdown-item">
            <span className="guest-countdown-val">{timeLeft.seconds}</span>
            <span className="guest-countdown-label">Sec</span>
          </div>
        </div>
      </section>

      {/* Invitation Section */}
      <section className="guest-section" id="invitation" style={{ paddingTop: 0, paddingBottom: '60px' }}>
        <div className="guest-glass-panel guest-invitation-container" style={{ margin: '0 auto' }}>
          <h2 className="guest-inv-title">{invTitle}</h2>
          <p className="guest-inv-tagline">{invTagline}</p>

          <div className="guest-inv-body">
            {invBody.split('\n\n').map((para, i) => (
              <p key={i} style={{ marginBottom: '16px' }}>{para}</p>
            ))}
          </div>

          <div className="guest-inv-footer">
            <div className="guest-inv-issuer">
              <p>Issued by</p>
              <strong>Dept. of Computer Science, ANJAC</strong>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={handleDownloadInvitation}
                style={{
                  padding: '12px 24px',
                  borderRadius: '50px',
                  border: '1px solid var(--g-glass-border)',
                  color: 'var(--g-secondary)',
                  background: 'none',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Download Invitation
              </button>
              <Link to="/login" className="guest-btn guest-btn-primary" style={{ padding: '12px 28px', fontSize: '0.9rem' }}>
                Login Portal →
              </Link>
            </div>
          </div>
        </div>
      </section>

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
              id="landing-reader"
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
    </GuestLayout>
  )
}


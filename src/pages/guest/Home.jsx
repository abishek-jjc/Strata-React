import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function Home() {
  const [eventDate, setEventDate] = useState('2026-09-25T09:00:00')
  const [invTitle, setInvTitle] = useState('You Are Cordially Invited')
  const [invTagline, setInvTagline] = useState('STRATA 2K26 — State Level Intercollegiate Technical Meet, ANJAC Sivakasi')
  const [invBody, setInvBody] = useState('')
  const [eventCount, setEventCount] = useState(6)
  
  // Countdown state
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' })

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
        <p className="guest-college-info">Ayya Nadar Janaki Ammal College (Autonomous)</p>
        <p className="guest-college-sub">Sivakasi · Re-accredited with A++ by NAAC</p>
        <h1 className="guest-hero-title">STRATA 2K26</h1>
        <p className="guest-hero-tagline">
          State Level Intercollegiate Technical Meet organized by the <strong>Department of Computer Science</strong>
        </p>

        <div className="guest-cta-container">
          <Link to="/login" className="guest-btn guest-btn-primary">
            Login Portal →
          </Link>
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
              <Link to="/invitation" style={{ padding: '12px 24px', borderRadius: '50px', border: '1px solid var(--g-glass-border)', color: 'var(--g-secondary)', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
                View Full Invitation
              </Link>
              <Link to="/login" className="guest-btn guest-btn-primary" style={{ padding: '12px 28px', fontSize: '0.9rem' }}>
                Login Portal →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </GuestLayout>
  )
}


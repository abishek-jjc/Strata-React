import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function Home() {
  const [leaders, setLeaders] = useState([])
  const [eventDate, setEventDate] = useState('2026-09-25T09:00:00')
  const [invTitle, setInvTitle] = useState('You Are Cordially Invited')
  const [invTagline, setInvTagline] = useState('STRATA 2K26 — State Level Intercollegiate Technical Meet, ANJAC Sivakasi')
  const [invBody, setInvBody] = useState('')
  const [eventCount, setEventCount] = useState(6)
  
  // Countdown state
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' })

  useEffect(() => {
    // Fetch settings and leaders
    async function loadData() {
      // Leaders
      const { data: leadersData } = await supabase
        .from(TABLES.LEADERS)
        .select('*')
        .order('created_at', { ascending: true })
      if (leadersData) setLeaders(leadersData)

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
          <Link to="/register" className="guest-btn guest-btn-primary">
            Register College Team →
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
      <section className="guest-section" id="invitation" style={{ paddingTop: 0 }}>
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
              <Link to="/register" className="guest-btn guest-btn-primary" style={{ padding: '12px 28px', fontSize: '0.9rem' }}>
                Register Now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="guest-section" id="about">
        <div className="guest-section-header">
          <span className="guest-section-tag">A Legacy of Light</span>
          <h2 className="guest-section-title">The College</h2>
        </div>
        <div className="guest-about-grid">
          <div className="guest-college-highlight guest-glass-panel">
            <h3>ANJAC Sivakasi</h3>
            <div className="guest-highlight-item">
              <div className="guest-highlight-icon">★</div>
              <div className="guest-highlight-text">
                <h4>Estd. 1963</h4>
                <p>Founded by Thiru. P. Ayya Nadar and Thirumathi A. Janaki Ammal to cater to rural education needs.</p>
              </div>
            </div>
            <div className="guest-highlight-item">
              <div className="guest-highlight-icon">★</div>
              <div className="guest-highlight-text">
                <h4>College of Excellence</h4>
                <p>Conferred with the prestigious "College of Excellence" status by the UGC.</p>
              </div>
            </div>
            <div className="guest-highlight-item">
              <div className="guest-highlight-icon">★</div>
              <div className="guest-highlight-text">
                <h4>Sprawling 150+ Acres</h4>
                <p>State-of-the-art campus infrastructure located on the Sivakasi-Srivilliputhur highway.</p>
              </div>
            </div>
          </div>

          <div className="guest-about-content">
            <h3>Academic Eminence</h3>
            <p>
              Ayya Nadar Janaki Ammal College (ANJAC), established in 1963, stands as a beacon of academic excellence in Southern Tamil Nadu. As an autonomous institution affiliated with Madurai Kamaraj University, the college has earned wide repute for its rigorous training, moral values, and research activities.
            </p>
            <p>
              Nurtured by the Janaki Ammal Ayya Nadar Trust and P. Iya Nadar Charitable Trust, the institution has successfully evolved into a multi-disciplinary campus offering diverse UG, PG, and doctoral programs, consistently achieving top scores in NAAC accreditation cycles.
            </p>
            <a href="https://www.anjaconline.org" target="_blank" rel="noopener noreferrer" className="guest-btn guest-btn-secondary">
              Visit College Portal
            </a>
          </div>
        </div>
      </section>

      {/* Leadership Messages */}
      <section className="guest-section" id="leaders">
        <div className="guest-section-header">
          <span className="guest-section-tag">Visionary Guides</span>
          <h2 className="guest-section-title">Our Leaders</h2>
        </div>
        <div className="guest-leaders-grid">
          {leaders.map((leader) => (
            <div className="guest-leader-card guest-glass-panel" key={leader.id}>
              <div className="guest-leader-header">
                <div className="guest-leader-avatar">
                  {leader.name.split(' ')
                    .filter(w => !['dr.', 'mr.', 'ms.'].includes(w.toLowerCase()))
                    .map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="guest-leader-meta">
                  <h3>{leader.name}</h3>
                  <h4>{leader.position}</h4>
                  <p>Ayya Nadar Janaki Ammal College</p>
                </div>
              </div>
              <p className="guest-leader-quote">
                {leader.description}
              </p>
              <span className="guest-leader-badge">
                {leader.position.toLowerCase().includes('principal') ? 'Patron' : 'Convener'}
              </span>
            </div>
          ))}
          {leaders.length === 0 && (
            <p className="muted" style={{ gridColumn: '1/-1', textAlign: 'center' }}>
              No messages loaded yet.
            </p>
          )}
        </div>
      </section>
    </GuestLayout>
  )
}

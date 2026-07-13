import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'
import { useAuth } from '../../auth/AuthContext'
import { 
  Code2, 
  Monitor, 
  HelpCircle, 
  Presentation, 
  Cpu, 
  Briefcase, 
  Trophy,
  QrCode,
  Brain,
  Recycle,
  Lightbulb,
  Bug,
  Film
} from 'lucide-react'

const EVENT_ICONS = {
  'logic hunt': QrCode,
  'mind spark': Brain,
  'code detox': Recycle,
  'tech premier league': Trophy,
  'idea forge': Lightbulb,
  'code sprint': Code2,
  'syntax wars': Bug,
  'frame fusion': Film
}

const getEventIcon = (name) => {
  if (!name) return null
  const normalized = name.toLowerCase().trim()
  const IconComponent = EVENT_ICONS[normalized] || Trophy
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      filter: 'drop-shadow(0 0 25px rgba(0, 242, 254, 0.45))' 
    }}>
      <IconComponent size={140} strokeWidth={1.2} style={{ color: 'var(--g-secondary)' }} />
    </div>
  )
}

export default function GuestEvents() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const [venues, setVenues] = useState([])
  const [incharges, setIncharges] = useState([])

  // Keep a ref to the interval ID so we can clear it dynamically
  const intervalRef = useRef(null)

  useEffect(() => {
    async function loadEvents() {
      const { data: evs } = await supabase
        .from(TABLES.EVENTS)
        .select('*')
        .eq('status', 'active')
        .order('event_name', { ascending: true })
      if (evs) setEvents(evs)

      const { data: vns } = await supabase.from(TABLES.VENUES).select('*')
      if (vns) setVenues(vns)

      const { data: incs } = await supabase.from(TABLES.INCHARGES).select('*')
      if (incs) setIncharges(incs)

      setLoading(false)
    }
    loadEvents()
  }, [])

  // Auto Tab Slideshow effect
  useEffect(() => {
    if (events.length <= 1 || paused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % events.length)
    }, 6000) // Rotate every 6 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [events, paused])

  if (loading) {
    return (
      <GuestLayout>
        <section className="guest-section">
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading contests...</p>
        </section>
      </GuestLayout>
    )
  }

  const activeEvent = events[activeIndex]
  const prelimsVenue = activeEvent ? (venues.find((v) => v.id === activeEvent.prelims_venue)?.venue_name || 'TBD') : 'TBD'
  const mainsVenue = activeEvent ? (venues.find((v) => v.id === activeEvent.mains_venue)?.venue_name || 'TBD') : 'TBD'
  const staffName = activeEvent ? (incharges.find((i) => i.id === activeEvent.staff_incharge)?.name || 'TBD') : 'TBD'

  // getInitials removed in favor of Lucide Icons mapping

  return (
    <GuestLayout>
      <section 
        className="guest-section"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="guest-section-header">
          <span className="guest-section-tag">Choose Your Battle</span>
          <h2 className="guest-section-title">Event Arenas</h2>
        </div>

        {events.length > 0 ? (
          <>
            {/* Tabs */}
            <div className="guest-inner-navbar guest-glass-panel">
              {events.map((event, idx) => (
                <button
                  key={event.id}
                  className={`guest-inner-nav-btn ${idx === activeIndex ? 'active' : ''}`}
                  onClick={() => setActiveIndex(idx)}
                >
                  {event.event_name}
                </button>
              ))}
            </div>

            {/* Event Details Card */}
            {activeEvent && (
              <div className="guest-event-details-card guest-glass-panel">
                
                {/* Left: Event Illustration Icon */}
                <div className="guest-details-media-container">
                  <div className="guest-details-banner-fallback">
                    {getEventIcon(activeEvent.event_name)}
                  </div>
                </div>

                {/* Right: Content details */}
                <div className="guest-details-content-column">
                  <div className="guest-details-title-row">
                    <h2>{activeEvent.event_name}</h2>
                    {activeEvent.category && (
                      <span className="guest-details-category-tag">{activeEvent.category}</span>
                    )}
                  </div>

                  {/* Pills row */}
                  <div className="guest-details-meta-row">
                    {activeEvent.prelims_venue && (
                      <div className="guest-meta-pill">📍 Prelims Venue: <strong>{prelimsVenue}</strong></div>
                    )}
                    {activeEvent.preliminary && (
                      <div className="guest-meta-pill">🕒 Prelims Time: <strong>{activeEvent.preliminary}</strong></div>
                    )}
                    <div className="guest-meta-pill">📍 Mains Venue: <strong>{mainsVenue}</strong></div>
                    {activeEvent.mains && (
                      <div className="guest-meta-pill">🕒 Mains Time: <strong>{activeEvent.mains}</strong></div>
                    )}
                    <div className="guest-meta-pill">👥 Team Size: <strong>{activeEvent.team_size || 1} members</strong></div>
                    <div className="guest-meta-pill">👤 Staff in-charge: <strong>{staffName}</strong></div>
                  </div>

                  {/* Description Section */}
                  <div className="guest-details-section">
                    <h4>Description</h4>
                    <p>{activeEvent.description || 'No description set. Refer to event coordinators.'}</p>
                  </div>

                  {/* Rules list */}
                  <div className="guest-details-section">
                    <h4>Guidelines & Rules</h4>
                    {activeEvent.rules ? (
                      <ul className="guest-rules-list-tabbed">
                        {activeEvent.rules.split('\n').filter(r => r.trim() !== '').map((rule, idx) => (
                          <li key={idx}>
                            <span className="guest-rule-checkmark">✓</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: 'var(--g-text-muted)' }}>Follow standard intercollegiate meet guidelines.</p>
                    )}
                  </div>

                  <div className="guest-btn-cta-row">
                    <button 
                      className="guest-btn guest-btn-primary" 
                      onClick={() => navigate(role === 'leader' ? '/leader/register' : '/register', { state: { preselectedEventId: activeEvent.id } })}
                    >
                      Register For This Event
                    </button>
                    <Link to="/rules" className="guest-btn guest-btn-secondary">
                      Review Common Rules
                    </Link>
                  </div>

                </div>

              </div>
            )}
          </>
        ) : (
          <div className="guest-glass-panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--g-text-muted)' }}>
            <h3>No contests added yet. Please check back later.</h3>
          </div>
        )}
      </section>
    </GuestLayout>
  )
}

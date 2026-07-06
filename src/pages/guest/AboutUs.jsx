import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function AboutUs() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from(TABLES.LEADERS)
        .select('*')
        .order('created_at', { ascending: true })
      if (data) setLeaders(data)
      setLoading(false)
    }
    loadData()
  }, [])

  return (
    <GuestLayout>
      {/* About Section */}
      <section className="guest-section" style={{ paddingTop: '40px' }}>
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
      <section className="guest-section" style={{ paddingBottom: '40px' }}>
        <div className="guest-section-header">
          <span className="guest-section-tag">Visionary Guides</span>
          <h2 className="guest-section-title">Our Leaders</h2>
        </div>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading leader messages...</p>
        ) : (
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
        )}
      </section>
    </GuestLayout>
  )
}

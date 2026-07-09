import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function AboutUs() {
  const [aboutUsText, setAboutUsText] = useState('')
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      // Fetch about_us setting
      const { data: settingData } = await supabase
        .from(TABLES.SETTINGS)
        .select('key_name, value')
        .eq('key_name', 'about_us')
        .maybeSingle()
      if (settingData) {
        setAboutUsText(settingData.value)
      }

      // Fetch leaders
      const { data: leadersData } = await supabase
        .from(TABLES.LEADERS)
        .select('*')
        .order('created_at', { ascending: true })
      if (leadersData) {
        setLeaders(leadersData)
      }

      setLoading(false)
    }
    loadData()
  }, [])

  return (
    <GuestLayout>
      {/* About Us Paragraph Section */}
      <section className="guest-section" style={{ paddingTop: '40px', paddingBottom: '30px' }}>
        <div className="guest-section-header">
          <span className="guest-section-tag">STRATA 2K26</span>
          <h2 className="guest-section-title">About Us</h2>
        </div>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading...</p>
        ) : (
          <div className="guest-glass-panel" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 30px' }}>
            <p style={{ fontSize: '1.15rem', lineHeight: '1.9', color: 'var(--g-text)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {aboutUsText || 'No about information configured yet.'}
            </p>
          </div>
        )}
      </section>

      {/* Leadership Messages Section */}
      <section className="guest-section" style={{ paddingTop: 0, paddingBottom: '60px' }}>
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
                  <div className="guest-leader-avatar" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {leader.image_url ? (
                      <img 
                        src={leader.image_url} 
                        alt={leader.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      leader.name.split(' ')
                        .filter(w => !['dr.', 'mr.', 'ms.'].includes(w.toLowerCase()))
                        .map(w => w[0]).join('').substring(0, 2).toUpperCase()
                    )}
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
                  {leader.position.toLowerCase().includes('principal') ? 'Patron' : 'Head of the Dept.'}
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

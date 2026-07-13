import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function AboutUs() {
  const [collegeInfo, setCollegeInfo] = useState({ title: '', description: '', logo: '', url: '' })
  const [deptInfo, setDeptInfo] = useState({ title: '', description: '', logo: '', url: '' })
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, leadersRes] = await Promise.all([
          supabase.from(TABLES.SETTINGS).select('*'),
          supabase.from(TABLES.LEADERS).select('*').order('created_at', { ascending: true })
        ])

        if (settingsRes.data) {
          const settingsMap = {}
          settingsRes.data.forEach(row => {
            settingsMap[row.key_name] = row.value
          })
          setCollegeInfo({
            title: settingsMap.about_college_title || 'Ayya Nadar Janaki Ammal College',
            description: settingsMap.about_college_description || '',
            logo: settingsMap.about_college_logo_url || '',
            url: settingsMap.about_college_url || ''
          })
          setDeptInfo({
            title: settingsMap.about_dept_title || 'Department of Computer Science',
            description: settingsMap.about_dept_description || '',
            logo: settingsMap.about_dept_logo_url || '',
            url: settingsMap.about_dept_url || ''
          })
        }

        if (leadersRes.data) {
          setLeaders(leadersRes.data)
        }
      } catch (err) {
        console.error('Failed to load About Us data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <GuestLayout>
      {/* College & Department Details Section */}
      <section className="guest-section" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
        <div className="guest-section-header">
          <span className="guest-section-tag">STRATA 2K26</span>
          <h2 className="guest-section-title">About Us</h2>
        </div>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading details...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1100px', margin: '0 auto', padding: '0 15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
              
              {/* College Card */}
              <div className="guest-glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                    {collegeInfo.logo ? (
                      <img src={collegeInfo.logo} alt="College Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '2.5rem' }}>🏫</span>
                    )}
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)' }}>
                      {collegeInfo.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--g-text-muted)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {collegeInfo.description || 'No college details configured yet.'}
                  </p>
                </div>
                {collegeInfo.url && (
                  <a 
                    href={collegeInfo.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="guest-btn guest-btn-secondary" 
                    style={{ alignSelf: 'flex-start', marginTop: '10px', textDecoration: 'none', padding: '10px 24px', fontSize: '0.9rem' }}
                  >
                    Visit College Website →
                  </a>
                )}
              </div>

              {/* Department Card */}
              <div className="guest-glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                    {deptInfo.logo ? (
                      <img src={deptInfo.logo} alt="Department Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '2.5rem' }}>💻</span>
                    )}
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)' }}>
                      {deptInfo.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--g-text-muted)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {deptInfo.description || 'No department details configured yet.'}
                  </p>
                </div>
                {deptInfo.url && (
                  <a 
                    href={deptInfo.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="guest-btn guest-btn-secondary" 
                    style={{ alignSelf: 'flex-start', marginTop: '10px', textDecoration: 'none', padding: '10px 24px', fontSize: '0.9rem' }}
                  >
                    Visit Department Website →
                  </a>
                )}
              </div>

            </div>
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
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
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
                {leader.description && (
                  <p className="guest-leader-quote">
                    {leader.description}
                  </p>
                )}
                <span className="guest-leader-badge">
                  {(() => {
                    const pos = leader.position.toLowerCase()
                    if (pos.includes('correspondent')) return 'Correspondent'
                    if (pos.includes('principal')) return 'Patron'
                    if (pos.includes('head of department') || pos.includes('hod')) return 'Head of the Dept.'
                    if (pos.includes('convener')) return 'Convener'
                    return leader.position
                  })()}
                </span>
              </div>
            ))}
            {leaders.length === 0 && (
              <p className="muted" style={{ gridColumn: '1/-1', textAlign: 'center' }}>
                No visionary leaders loaded yet.
              </p>
            )}
          </div>
        )}
      </section>
    </GuestLayout>
  )
}

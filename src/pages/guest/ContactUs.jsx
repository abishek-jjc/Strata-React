import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function ContactUs() {
  const [contactEmail, setContactEmail] = useState('cs@anjaconline.org')
  const [contactPhone, setContactPhone] = useState('+91 98765 43210')
  const [contactAddress, setContactAddress] = useState('Department of Computer Science, Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi - Srivilliputhur Road, Sivakasi - 626 124, Tamil Nadu, India.')
  const [contactExtra, setContactExtra] = useState('Venue Coordinator: Dr. V. Venkatesh Babu (HOD, CS Dept.)')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      // Fetch Settings
      const { data: settings } = await supabase
        .from(TABLES.SETTINGS)
        .select('*')
      if (settings) {
        settings.forEach((row) => {
          if (row.key_name === 'contact_email' && row.value) setContactEmail(row.value)
          if (row.key_name === 'contact_phone' && row.value) setContactPhone(row.value)
          if (row.key_name === 'contact_address' && row.value) setContactAddress(row.value)
          if (row.key_name === 'contact_extra' && row.value) setContactExtra(row.value)
        })
      }
      setLoading(false)
    }
    loadData()
  }, [])

  return (
    <GuestLayout>
      <section className="guest-section" style={{ paddingTop: '40px', minHeight: '65vh', paddingBottom: '60px' }}>
        <div className="guest-section-header">
          <span className="guest-section-tag">Reach Out to Us</span>
          <h2 className="guest-section-title">Contact Directory</h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading contact list...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1000px', margin: '0 auto' }}>

            {/* Dynamic General Contacts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div className="guest-glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--g-secondary)' }}>Email Address</h4>
                <p style={{ margin: '4px 0', color: 'var(--g-text)', fontSize: '1.05rem', fontWeight: '500' }}>
                  <a href={`mailto:${contactEmail}`} style={{ color: 'var(--g-text)', textDecoration: 'none' }}>{contactEmail}</a>
                </p>
                <p style={{ margin: '8px 0 0 0', color: 'var(--g-text-muted)', fontSize: '0.85rem' }}>
                  Send us your inquiries anytime!
                </p>
              </div>

              <div className="guest-glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--g-secondary)' }}>Mobile Helpline</h4>
                <p style={{ margin: '4px 0', color: 'var(--g-text)', fontSize: '1.05rem', fontWeight: '500' }}>
                  <a href={`tel:${contactPhone}`} style={{ color: 'var(--g-text)', textDecoration: 'none' }}>{contactPhone}</a>
                </p>
                <p style={{ margin: '8px 0 0 0', color: 'var(--g-text-muted)', fontSize: '0.85rem' }}>
                  Call/WhatsApp for urgent issues.
                </p>
              </div>

              {contactExtra && (
                <div className="guest-glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--g-secondary)' }}>Convener</h4>
                  <p style={{ margin: '4px 0', color: 'var(--g-text)', fontSize: '1rem', fontWeight: '500', lineHeight: '1.4' }}>
                    {contactExtra}
                  </p>
                </div>
              )}
            </div>

            {/* General Location Info */}
            <div className="guest-glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: 'var(--g-text)' }}>Venue Details</h3>
              <p style={{ margin: '6px 0', color: 'var(--g-text-muted)', lineHeight: '1.6', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                {contactAddress}
              </p>
            </div>

          </div>
        )}
      </section>
    </GuestLayout>
  )
}

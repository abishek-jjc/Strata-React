import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function ContactUs() {
  const [admins, setAdmins] = useState([])
  const [incharges, setIncharges] = useState([])
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

      // Fetch admin accounts
      const { data: adminData } = await supabase
        .from(TABLES.ADMINS || 'admins')
        .select('*')
      if (adminData) setAdmins(adminData)

      // Fetch event staff incharge coordinates
      const { data: inchargeData } = await supabase
        .from(TABLES.INCHARGES || 'incharges')
        .select('*')
      if (inchargeData) setIncharges(inchargeData)

      setLoading(false)
    }
    loadData()
  }, [])

  return (
    <GuestLayout>
      <section className="guest-section" style={{ paddingTop: '40px', minHeight: '60vh' }}>
        <div className="guest-section-header">
          <span className="guest-section-tag">Reach Out to Us</span>
          <h2 className="guest-section-title">Contact Directory</h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading contact list...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
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
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--g-secondary)' }}>Coordinator</h4>
                  <p style={{ margin: '4px 0', color: 'var(--g-text)', fontSize: '1rem', fontWeight: '500', lineHeight: '1.4' }}>
                    {contactExtra}
                  </p>
                </div>
              )}
            </div>

            {/* Administrators / Conveners */}
            <div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--g-secondary)', marginBottom: '20px', borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '8px' }}>
                Event Coordinators & Admins
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {admins.map((admin) => (
                  <div className="guest-glass-panel" key={admin.id} style={{ padding: '24px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--g-text)' }}>{admin.name}</h4>
                    <p style={{ margin: '4px 0', color: 'var(--g-text-muted)', fontSize: '0.9rem' }}>
                      <strong>Email:</strong> <a href={`mailto:${admin.email}`} style={{ color: 'var(--g-secondary)', textDecoration: 'none' }}>{admin.email}</a>
                    </p>
                    <p style={{ margin: '4px 0', color: 'var(--g-text-muted)', fontSize: '0.9rem' }}>
                      <strong>Role:</strong> Administrator
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff Incharges */}
            {incharges.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--g-secondary)', marginBottom: '20px', borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '8px' }}>
                  Staff In-charges (Contests)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {incharges.map((inch) => (
                    <div className="guest-glass-panel" key={inch.id} style={{ padding: '24px' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--g-text)' }}>{inch.name}</h4>
                      {inch.department && (
                        <p style={{ margin: '4px 0', color: 'var(--g-text-muted)', fontSize: '0.9rem' }}>
                          <strong>Department:</strong> {inch.department}
                        </p>
                      )}
                      {inch.phone && (
                        <p style={{ margin: '4px 0', color: 'var(--g-text-muted)', fontSize: '0.9rem' }}>
                          <strong>Mobile No:</strong> <a href={`tel:${inch.phone}`} style={{ color: 'var(--g-secondary)', textDecoration: 'none' }}>{inch.phone}</a>
                        </p>
                      )}
                      {inch.email && (
                        <p style={{ margin: '4px 0', color: 'var(--g-text-muted)', fontSize: '0.9rem' }}>
                          <strong>Email:</strong> <a href={`mailto:${inch.email}`} style={{ color: 'var(--g-secondary)', textDecoration: 'none' }}>{inch.email}</a>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Location Info */}
            <div className="guest-glass-panel" style={{ padding: '30px', marginTop: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: 'var(--g-text)' }}>Venue Details</h3>
              <p style={{ margin: '6px 0', color: 'var(--g-text-muted)', lineHeight: '1.6' }}>
                {contactAddress}
              </p>
            </div>

          </div>
        )}
      </section>
    </GuestLayout>
  )
}


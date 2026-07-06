import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function GuestInvitation() {
  const [invTitle, setInvTitle] = useState('You Are Cordially Invited')
  const [invTagline, setInvTagline] = useState('STRATA 2K26 — State Level Intercollegiate Technical Meet, ANJAC Sivakasi')
  const [invBody, setInvBody] = useState('')
  const [invPdfUrl, setInvPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [pdfWarning, setPdfWarning] = useState('')

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from(TABLES.SETTINGS)
        .select('key_name, value')
        .in('key_name', ['invitation_title', 'invitation_tagline', 'invitation_body', 'invitation_pdf_url'])
      if (data) {
        data.forEach(row => {
          if (row.key_name === 'invitation_title') setInvTitle(row.value)
          if (row.key_name === 'invitation_tagline') setInvTagline(row.value)
          if (row.key_name === 'invitation_body') setInvBody(row.value)
          if (row.key_name === 'invitation_pdf_url') setInvPdfUrl(row.value)
        })
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  function handleDownloadPdf() {
    if (invPdfUrl && invPdfUrl.trim() !== '') {
      window.open(invPdfUrl, '_blank')
    } else {
      setPdfWarning('Invitation Not Available Now')
      setTimeout(() => setPdfWarning(''), 4000)
    }
  }

  return (
    <GuestLayout>
      <section className="guest-section">
        <div className="guest-section-header">
          <span className="guest-section-tag">Official Invitation</span>
          <h2 className="guest-section-title">Invitation Letter</h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading invitation...</p>
        ) : (
          <div className="guest-glass-panel guest-invitation-container" style={{ padding: '60px 50px' }}>
            <h2 className="guest-inv-title" style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
              {invTitle}
            </h2>
            <p className="guest-inv-tagline" style={{ fontSize: '1.1rem', marginBottom: '40px' }}>
              {invTagline}
            </p>

            <div className="guest-inv-body" style={{ fontSize: '1.1rem', lineHeight: '1.9' }}>
              {invBody.split('\n\n').map((para, i) => (
                <p key={i} style={{ marginBottom: '20px' }}>{para}</p>
              ))}
            </div>

            <div className="guest-inv-footer" style={{ marginTop: '50px' }}>
              <div className="guest-inv-issuer">
                <p>Issued by</p>
                <strong>Department of Computer Science</strong>
                <p style={{ fontSize: '0.85rem' }}>Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <button 
                  onClick={handleDownloadPdf}
                  className="guest-btn guest-btn-primary"
                  style={{ padding: '12px 28px', fontSize: '0.9rem' }}
                >
                  Download PDF
                </button>
                {pdfWarning && (
                  <p className="error" style={{ fontSize: '13px', margin: 0, fontWeight: '500', color: 'var(--g-accent)' }}>
                    {pdfWarning}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </GuestLayout>
  )
}

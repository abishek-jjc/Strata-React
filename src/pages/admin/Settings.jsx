import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import CrudManager from '../../components/common/CrudManager'

const leaderFields = [
  { name: 'name', label: 'Leader Name', type: 'text', required: true },
  { name: 'position', label: 'Position (e.g. Principal / HOD)', type: 'text', required: true },
  { name: 'description', label: 'Greeting Message / Description', type: 'textarea' },
  { name: 'image_url', label: 'Leader Image', type: 'image' },
]

const ruleFields = [
  { name: 'title', label: 'Rule Title (e.g. Eligibility)', type: 'text', required: true },
  { name: 'points', label: 'Guidelines / Bullet Points (one per line)', type: 'textarea', required: true },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('event-details')

  // Event details
  const [eventDate, setEventDate] = useState('')
  const [eventLogoUrl, setEventLogoUrl] = useState('')
  const [paymentImageUrl, setPaymentImageUrl] = useState('')
  const [upiId, setUpiId] = useState('')
  
  // Invitation
  const [invTitle, setInvTitle] = useState('')
  const [invTagline, setInvTagline] = useState('')
  const [invBody, setInvBody] = useState('')
  const [invPdfUrl, setInvPdfUrl] = useState('')
  const [whatsappLink, setWhatsappLink] = useState('')

  // Contact us
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [contactExtra, setContactExtra] = useState('')

  // About us
  const [aboutCollegeTitle, setAboutCollegeTitle] = useState('')
  const [aboutCollegeDesc, setAboutCollegeDesc] = useState('')
  const [aboutCollegeLogo, setAboutCollegeLogo] = useState('')
  const [aboutCollegeUrl, setAboutCollegeUrl] = useState('')
  
  const [aboutDeptTitle, setAboutDeptTitle] = useState('')
  const [aboutDeptDesc, setAboutDeptDesc] = useState('')
  const [aboutDeptLogo, setAboutDeptLogo] = useState('')
  const [aboutDeptUrl, setAboutDeptUrl] = useState('')

  // Loading / Uploading states
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingPayment, setUploadingPayment] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [uploadingCollegeLogo, setUploadingCollegeLogo] = useState(false)
  const [uploadingDeptLogo, setUploadingDeptLogo] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Sync tab selection with query parameter ?tab=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && ['event-details', 'invitation', 'contact-us', 'about-us', 'rules'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [])

  const handleTabChange = (tabName) => {
    setActiveTab(tabName)
    setError('')
    setMessage('')
    const newUrl = `${window.location.pathname}?tab=${tabName}`
    window.history.pushState({ path: newUrl }, '', newUrl)
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error: fetchError } = await supabase
          .from(TABLES.SETTINGS)
          .select('*')
        if (fetchError) throw fetchError

        if (data) {
          data.forEach((row) => {
            if (row.key_name === 'event_date') setEventDate(row.value)
            if (row.key_name === 'event_logo_url') setEventLogoUrl(row.value)
            if (row.key_name === 'payment_image_url') setPaymentImageUrl(row.value)
            if (row.key_name === 'payment_qr_url' && !paymentImageUrl) {
              // Fallback if payment_image_url is not set but payment_qr_url is
              setPaymentImageUrl(row.value)
            }
            if (row.key_name === 'upi_id') setUpiId(row.value)
            if (row.key_name === 'invitation_title') setInvTitle(row.value)
            if (row.key_name === 'invitation_tagline') setInvTagline(row.value)
            if (row.key_name === 'invitation_body') setInvBody(row.value)
            if (row.key_name === 'invitation_pdf_url') setInvPdfUrl(row.value)
            if (row.key_name === 'whatsapp_group_link') setWhatsappLink(row.value)
            if (row.key_name === 'contact_email') setContactEmail(row.value)
            if (row.key_name === 'contact_phone') setContactPhone(row.value)
            if (row.key_name === 'contact_address') setContactAddress(row.value)
            if (row.key_name === 'contact_extra') setContactExtra(row.value)
            
            if (row.key_name === 'about_college_title') setAboutCollegeTitle(row.value)
            if (row.key_name === 'about_college_description') setAboutCollegeDesc(row.value)
            if (row.key_name === 'about_college_logo_url') setAboutCollegeLogo(row.value)
            if (row.key_name === 'about_college_url') setAboutCollegeUrl(row.value)
            
            if (row.key_name === 'about_dept_title') setAboutDeptTitle(row.value)
            if (row.key_name === 'about_dept_description') setAboutDeptDesc(row.value)
            if (row.key_name === 'about_dept_logo_url') setAboutDeptLogo(row.value)
            if (row.key_name === 'about_dept_url') setAboutDeptUrl(row.value)
          })
        }
      } catch (err) {
        setError('Failed to load settings.')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // File Upload Helper
  async function handleFileUpload(e, targetKey, setUrlState, setUploadingState, acceptType = 'image') {
    const file = e.target.files?.[0]
    if (!file) return

    if (acceptType === 'pdf' && file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.')
      return
    }
    if (acceptType === 'image' && !file.type.startsWith('image/')) {
      setError('Only image files are allowed.')
      return
    }

    setError('')
    setMessage('')
    setUploadingState(true)

    try {
      const extension = file.name.split('.').pop()
      const fileName = `${targetKey}_${Date.now()}.${extension}`
      const { data, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName)

      // Save setting immediately
      const upsertRows = [{ key_name: targetKey, value: publicUrl }]
      if (targetKey === 'payment_image_url') {
        // Keep in sync with legacy key payment_qr_url
        upsertRows.push({ key_name: 'payment_qr_url', value: publicUrl })
      }

      const { error: upsertError } = await supabase.from(TABLES.SETTINGS).upsert(upsertRows)
      if (upsertError) throw upsertError

      setUrlState(publicUrl)
      setMessage(`${targetKey.replaceAll('_', ' ')} uploaded successfully!`)
    } catch (err) {
      setError(err.message || 'Failed to upload file.')
    } finally {
      setUploadingState(false)
    }
  }

  // Remove File Helper
  async function handleFileRemove(targetKey, setUrlState) {
    setError('')
    setMessage('')
    try {
      const upsertRows = [{ key_name: targetKey, value: '' }]
      if (targetKey === 'payment_image_url') {
        upsertRows.push({ key_name: 'payment_qr_url', value: '' })
      }

      const { error: upsertError } = await supabase.from(TABLES.SETTINGS).upsert(upsertRows)
      if (upsertError) throw upsertError

      setUrlState('')
      setMessage(`${targetKey.replaceAll('_', ' ')} removed successfully.`)
    } catch (err) {
      setError(err.message || 'Failed to remove file setting.')
    }
  }

  // Save Handlers for text fields
  async function handleSaveEvent(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const { error: err } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: 'event_date', value: eventDate },
        { key_name: 'upi_id', value: upiId }
      ])
      if (err) throw err
      setMessage('Event date saved successfully!')
    } catch (err) {
      setError(err.message || 'Failed to save event details.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveInvitation(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const { error: err } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: 'invitation_title', value: invTitle },
        { key_name: 'invitation_tagline', value: invTagline },
        { key_name: 'invitation_body', value: invBody },
        { key_name: 'whatsapp_group_link', value: whatsappLink }
      ])
      if (err) throw err
      setMessage('Invitation details saved successfully!')
    } catch (err) {
      setError(err.message || 'Failed to save invitation.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveContact(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const { error: err } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: 'contact_email', value: contactEmail },
        { key_name: 'contact_phone', value: contactPhone },
        { key_name: 'contact_address', value: contactAddress },
        { key_name: 'contact_extra', value: contactExtra }
      ])
      if (err) throw err
      setMessage('Contact settings saved successfully!')
    } catch (err) {
      setError(err.message || 'Failed to save contact settings.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveAboutUs(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const { error: err } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: 'about_college_title', value: aboutCollegeTitle },
        { key_name: 'about_college_description', value: aboutCollegeDesc },
        { key_name: 'about_college_url', value: aboutCollegeUrl },
        { key_name: 'about_dept_title', value: aboutDeptTitle },
        { key_name: 'about_dept_description', value: aboutDeptDesc },
        { key_name: 'about_dept_url', value: aboutDeptUrl }
      ])
      if (err) throw err
      setMessage('About Us details saved successfully!')
    } catch (err) {
      setError(err.message || 'Failed to save About Us settings.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="muted">Loading settings...</p>

  return (
    <div style={{ width: '100%' }}>
      {/* Dynamic Tab Styles */}
      <style>{`
        .settings-layout {
          display: flex;
          gap: 30px;
          margin-top: 20px;
        }
        @media (max-width: 900px) {
          .settings-layout {
            flex-direction: column;
          }
        }
        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 240px;
          min-width: 240px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          align-self: flex-start;
        }
        @media (max-width: 900px) {
          .settings-nav {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
            white-space: nowrap;
          }
        }
        .settings-nav-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.95rem;
          text-align: left;
          transition: all 0.2s ease;
        }
        .settings-nav-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
        }
        .settings-nav-btn.active {
          background: rgba(0, 229, 255, 0.08);
          border: 1px solid rgba(0, 229, 255, 0.2);
          color: var(--accent);
          font-weight: 600;
        }
        .settings-pane {
          flex-grow: 1;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
          min-height: 400px;
        }
        .section-separator {
          border-top: 1px solid var(--border);
          margin: 30px 0;
          padding-top: 30px;
        }
        .file-upload-box {
          border: 2px dashed var(--border);
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          background: rgba(255,255,255,0.01);
          transition: border-color 0.2s;
        }
        .file-upload-box:hover {
          border-color: var(--accent);
        }
      `}</style>

      <h2>Page Settings</h2>
      <p className="muted" style={{ marginBottom: '24px' }}>
        Configure general settings, countdowns, images, contact details, about descriptions, leaders, and rules.
      </p>

      {error && <p className="error" style={{ marginBottom: '15px' }}>{error}</p>}
      {message && <p className="success" style={{ marginBottom: '15px' }}>{message}</p>}

      <div className="settings-layout">
        {/* Left Side Tab Navigation */}
        <nav className="settings-nav">
          <button 
            type="button" 
            className={`settings-nav-btn ${activeTab === 'event-details' ? 'active' : ''}`}
            onClick={() => handleTabChange('event-details')}
          >
            📅 Event Details
          </button>
          <button 
            type="button" 
            className={`settings-nav-btn ${activeTab === 'invitation' ? 'active' : ''}`}
            onClick={() => handleTabChange('invitation')}
          >
            ✉️ Invitation
          </button>
          <button 
            type="button" 
            className={`settings-nav-btn ${activeTab === 'contact-us' ? 'active' : ''}`}
            onClick={() => handleTabChange('contact-us')}
          >
            📞 Contact Us
          </button>
          <button 
            type="button" 
            className={`settings-nav-btn ${activeTab === 'about-us' ? 'active' : ''}`}
            onClick={() => handleTabChange('about-us')}
          >
            🏢 About Us & Leaders
          </button>
          <button 
            type="button" 
            className={`settings-nav-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => handleTabChange('rules')}
          >
            📜 Common Rules
          </button>
        </nav>

        {/* Right Side Content Pane */}
        <div className="settings-pane">
          {/* TAB 1: Event Details */}
          {activeTab === 'event-details' && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>Event Details & Media</h3>
              <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label className="field">
                  <span>Event Countdown Target Date & Time (YYYY-MM-DD HH:MM:SS)</span>
                  <input
                    type="text"
                    placeholder="e.g. 2026-09-25 09:00:00"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </label>

                <div className="field">
                  <span>Event Logo Image</span>
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: '2px', marginBottom: '8px' }}>
                    Used as the dynamic browser favicon and title graphic.
                  </p>
                  {eventLogoUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <img src={eventLogoUrl} alt="Event Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }} />
                      <button 
                        type="button" 
                        onClick={() => handleFileRemove('event_logo_url', setEventLogoUrl)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#e11d48', border: 'none', color: '#fff', cursor: 'pointer' }}
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <div className="file-upload-box">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'event_logo_url', setEventLogoUrl, setUploadingLogo)}
                        disabled={uploadingLogo}
                        style={{ display: 'block', margin: '0 auto 10px' }}
                      />
                      <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
                        {uploadingLogo ? 'Uploading logo image...' : 'PNG, JPG, SVG formats accepted.'}
                      </p>
                    </div>
                  )}
                </div>

                <label className="field">
                  <span>Payment UPI ID (for dynamic QR generation)</span>
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: '2px', marginBottom: '8px' }}>
                    Enter the merchant or organization UPI ID (e.g., payee@upi). A dynamic payment QR code with the exact amount due will be generated for student leaders.
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. payee@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </label>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
                  {submitting ? 'Saving date...' : 'Save Countdown Date'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Invitation */}
          {activeTab === 'invitation' && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>Invitation Setup</h3>
              <form onSubmit={handleSaveInvitation} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label className="field">
                  <span>Invitation Title</span>
                  <input
                    type="text"
                    value={invTitle}
                    onChange={(e) => setInvTitle(e.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>Invitation Tagline</span>
                  <input
                    type="text"
                    value={invTagline}
                    onChange={(e) => setInvTagline(e.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>Invitation Body text</span>
                  <textarea
                    rows={8}
                    value={invBody}
                    onChange={(e) => setInvBody(e.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>WhatsApp Group Invite Link</span>
                  <input
                    type="text"
                    placeholder="e.g. https://chat.whatsapp.com/..."
                    value={whatsappLink}
                    onChange={(e) => setWhatsappLink(e.target.value)}
                  />
                </label>

                <div className="field">
                  <span>Invitation PDF Document</span>
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: '2px', marginBottom: '8px' }}>
                    Available for download by guests on the landing portal.
                  </p>
                  {invPdfUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <a href={invPdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                        📄 View Current PDF
                      </a>
                      <button 
                        type="button" 
                        onClick={() => handleFileRemove('invitation_pdf_url', setInvPdfUrl)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#e11d48', border: 'none', color: '#fff', cursor: 'pointer' }}
                      >
                        Remove PDF
                      </button>
                    </div>
                  ) : (
                    <div className="file-upload-box">
                      <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={(e) => handleFileUpload(e, 'invitation_pdf_url', setInvPdfUrl, setUploadingPdf, 'pdf')}
                        disabled={uploadingPdf}
                        style={{ display: 'block', margin: '0 auto 10px' }}
                      />
                      <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
                        {uploadingPdf ? 'Uploading PDF invitation...' : 'PDF files only.'}
                      </p>
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
                  {submitting ? 'Saving invitation...' : 'Save Invitation Text'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Contact Us */}
          {activeTab === 'contact-us' && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>Contact Us Page Setup</h3>
              <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label className="field">
                  <span>Contact Email Address</span>
                  <input
                    type="email"
                    placeholder="e.g. cs@anjaconline.org"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>Contact Mobile Number</span>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>Contact Address</span>
                  <textarea
                    rows={3}
                    placeholder="e.g. Department of Computer Science, ANJAC, Sivakasi"
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>Extra Coordinator Details (e.g. HOD / Venue In-charge)</span>
                  <input
                    type="text"
                    placeholder="e.g. Venue Coordinator: Dr. V. Venkatesh Babu (HOD, CS Dept.)"
                    value={contactExtra}
                    onChange={(e) => setContactExtra(e.target.value)}
                  />
                </label>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
                  {submitting ? 'Saving contact...' : 'Save Contact Settings'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: About Us */}
          {activeTab === 'about-us' && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>About Institution & Department</h3>
              <form onSubmit={handleSaveAboutUs} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* College Info Block */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '20px', borderRadius: '10px' }}>
                  <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '15px' }}>About College</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <label className="field">
                      <span>College Title</span>
                      <input
                        type="text"
                        value={aboutCollegeTitle}
                        onChange={(e) => setAboutCollegeTitle(e.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>College Description</span>
                      <textarea
                        rows={4}
                        value={aboutCollegeDesc}
                        onChange={(e) => setAboutCollegeDesc(e.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>College URL</span>
                      <input
                        type="text"
                        value={aboutCollegeUrl}
                        onChange={(e) => setAboutCollegeUrl(e.target.value)}
                      />
                    </label>

                    <div className="field">
                      <span>College Logo</span>
                      {aboutCollegeLogo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '5px' }}>
                          <img src={aboutCollegeLogo} alt="College Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                          <button 
                            type="button" 
                            onClick={() => handleFileRemove('about_college_logo_url', setAboutCollegeLogo)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#e11d48', border: 'none', color: '#fff', cursor: 'pointer' }}
                          >
                            Remove Logo
                          </button>
                        </div>
                      ) : (
                        <div className="file-upload-box" style={{ marginTop: '5px' }}>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'about_college_logo_url', setAboutCollegeLogo, setUploadingCollegeLogo)}
                            disabled={uploadingCollegeLogo}
                            style={{ display: 'block', margin: '0 auto 10px' }}
                          />
                          <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
                            {uploadingCollegeLogo ? 'Uploading college logo...' : 'Images only.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Department Info Block */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '20px', borderRadius: '10px' }}>
                  <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '15px' }}>About Department</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <label className="field">
                      <span>Department Title</span>
                      <input
                        type="text"
                        value={aboutDeptTitle}
                        onChange={(e) => setAboutDeptTitle(e.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>Department Description</span>
                      <textarea
                        rows={4}
                        value={aboutDeptDesc}
                        onChange={(e) => setAboutDeptDesc(e.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>Department URL</span>
                      <input
                        type="text"
                        value={aboutDeptUrl}
                        onChange={(e) => setAboutDeptUrl(e.target.value)}
                      />
                    </label>

                    <div className="field">
                      <span>Department Logo</span>
                      {aboutDeptLogo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '5px' }}>
                          <img src={aboutDeptLogo} alt="Department Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                          <button 
                            type="button" 
                            onClick={() => handleFileRemove('about_dept_logo_url', setAboutDeptLogo)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#e11d48', border: 'none', color: '#fff', cursor: 'pointer' }}
                          >
                            Remove Logo
                          </button>
                        </div>
                      ) : (
                        <div className="file-upload-box" style={{ marginTop: '5px' }}>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'about_dept_logo_url', setAboutDeptLogo, setUploadingDeptLogo)}
                            disabled={uploadingDeptLogo}
                            style={{ display: 'block', margin: '0 auto 10px' }}
                          />
                          <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
                            {uploadingDeptLogo ? 'Uploading department logo...' : 'Images only.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
                  {submitting ? 'Saving text...' : 'Save College & Dept Text'}
                </button>
              </form>

              {/* Leadership Messages Table Integration */}
              <div className="section-separator">
                <CrudManager
                  title="Greetings & Visionary Leaders"
                  table={TABLES.LEADERS}
                  fields={leaderFields}
                  columns={['image_url', 'name', 'position', 'created_at']}
                />
              </div>
            </div>
          )}

          {/* TAB 5: Rules */}
          {activeTab === 'rules' && (
            <div>
              <CrudManager
                title="Common Rules & Guidelines"
                table={TABLES.RULES}
                fields={ruleFields}
                columns={['title', 'created_at']}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'

export default function Settings() {
  const [eventDate, setEventDate] = useState('')
  const [invTitle, setInvTitle] = useState('')
  const [invTagline, setInvTagline] = useState('')
  const [invBody, setInvBody] = useState('')
  const [invPdfUrl, setInvPdfUrl] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [contactExtra, setContactExtra] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
            if (row.key_name === 'invitation_title') setInvTitle(row.value)
            if (row.key_name === 'invitation_tagline') setInvTagline(row.value)
            if (row.key_name === 'invitation_body') setInvBody(row.value)
            if (row.key_name === 'invitation_pdf_url') setInvPdfUrl(row.value)
            if (row.key_name === 'contact_email') setContactEmail(row.value)
            if (row.key_name === 'contact_phone') setContactPhone(row.value)
            if (row.key_name === 'contact_address') setContactAddress(row.value)
            if (row.key_name === 'contact_extra') setContactExtra(row.value)
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

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      const { error: upsertError } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: 'event_date', value: eventDate },
        { key_name: 'invitation_title', value: invTitle },
        { key_name: 'invitation_tagline', value: invTagline },
        { key_name: 'invitation_body', value: invBody },
        { key_name: 'contact_email', value: contactEmail },
        { key_name: 'contact_phone', value: contactPhone },
        { key_name: 'contact_address', value: contactAddress },
        { key_name: 'contact_extra', value: contactExtra },
      ])

      if (upsertError) throw upsertError
      setMessage('Settings updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update settings.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.')
      return
    }

    setError('')
    setMessage('')
    setUploadingPdf(true)

    try {
      const fileName = `invitation_${Date.now()}.pdf`
      const { data, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName)

      // Save setting immediately
      const { error: upsertError } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: 'invitation_pdf_url', value: publicUrl }
      ])
      if (upsertError) throw upsertError

      setInvPdfUrl(publicUrl)
      setMessage('PDF invitation uploaded and saved successfully!')
    } catch (err) {
      setError(err.message || 'Failed to upload PDF file.')
    } finally {
      setUploadingPdf(false)
    }
  }

  async function handleRemovePdf() {
    setError('')
    setMessage('')
    try {
      const { error: upsertError } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: 'invitation_pdf_url', value: '' }
      ])
      if (upsertError) throw upsertError

      setInvPdfUrl('')
      setMessage('PDF invitation removed successfully.')
    } catch (err) {
      setError(err.message || 'Failed to remove PDF setting.')
    }
  }

  if (loading) return <p className="muted">Loading settings...</p>

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2>Page Settings</h2>
      <p className="muted" style={{ marginBottom: '24px' }}>
        Configure the countdown date and invitation details shown on the guest landing page.
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

        <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span>Invitation PDF File</span>
          {invPdfUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '8px' }}>
              <a href={invPdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                📄 View Loaded PDF
              </a>
              <button 
                type="button" 
                onClick={handleRemovePdf}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#e11d48', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                Remove PDF
              </button>
            </div>
          ) : (
            <div style={{ border: '2px dashed var(--border)', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handlePdfUpload}
                disabled={uploadingPdf}
                style={{ display: 'block', margin: '0 auto 10px' }}
              />
              <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
                {uploadingPdf ? 'Uploading PDF file...' : 'Only PDF format is accepted.'}
              </p>
            </div>
          )}
        </div>

        <h3 style={{ fontSize: '1.2rem', color: 'var(--accent)', marginTop: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          Contact Us Page Settings
        </h3>

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

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
          {submitting ? 'Saving changes...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}

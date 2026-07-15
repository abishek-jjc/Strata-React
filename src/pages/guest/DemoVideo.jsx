import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

// Helper to convert watch YouTube URLs to embed URLs
function getYouTubeEmbedUrl(url) {
  if (!url) return null
  if (url.includes('youtube.com/embed/')) return url
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  
  if (match && match[2].length === 12) { // Allow slightly different ID lengths just in case
    return `https://www.youtube.com/embed/${match[2]}`
  } else if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`
  }
  return null
}

// Helper to convert Google Drive view links to embed preview links
function getGoogleDriveEmbedUrl(url) {
  if (!url) return null
  if (url.includes('drive.google.com/file/d/')) {
    // Strip trailing query parameters and replace /view with /preview
    return url.split('?')[0].replace(/\/view$/, '') + '/preview'
  }
  return null
}

export default function DemoVideo() {
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadVideoSetting() {
      try {
        const { data } = await supabase
          .from(TABLES.SETTINGS)
          .select('*')
          .eq('key_name', 'demo_video_url')
          .maybeSingle()

        if (data && data.value) {
          setVideoUrl(data.value.trim())
        } else {
          // Fallback to default Google Drive video if no setting exists
          setVideoUrl('https://drive.google.com/file/d/1-d93aMC5PH5yswF-q0zDnMwAYjCa9KnS/view?usp=sharing')
        }
      } catch (err) {
        console.error('Error fetching demo video url:', err)
        // Fallback
        setVideoUrl('https://drive.google.com/file/d/1-d93aMC5PH5yswF-q0zDnMwAYjCa9KnS/view?usp=sharing')
      } finally {
        setLoading(false)
      }
    }
    loadVideoSetting()
  }, [])

  const ytEmbed = getYouTubeEmbedUrl(videoUrl)
  const gdEmbed = getGoogleDriveEmbedUrl(videoUrl)

  return (
    <GuestLayout>
      <section className="guest-section" style={{ paddingTop: '40px', minHeight: '70vh', paddingBottom: '60px' }}>
        <div className="guest-section-header">
          <span className="guest-section-tag">Video Guide</span>
          <h2 className="guest-section-title">Strata Demo Video</h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)', paddingTop: '40px' }}>Loading video details...</p>
        ) : (
          <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '25px', alignItems: 'center' }}>
            <p style={{ color: 'var(--g-text-secondary)', textAlign: 'center', fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
              Watch this walkthrough video to understand the registrations, lots system, payment verification, and how to configure your team profile.
            </p>

            <div className="guest-glass-panel" style={{ 
              width: '100%', 
              padding: '16px', 
              boxSizing: 'border-box',
              background: 'rgba(255, 255, 255, 0.015)' 
            }}>
              {ytEmbed ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
                  <iframe
                    src={ytEmbed}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Strata Demo Video Playback"
                  />
                </div>
              ) : gdEmbed ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
                  <iframe
                    src={gdEmbed}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="autoplay"
                    allowFullScreen
                    title="Strata Demo Video Playback"
                  />
                </div>
              ) : videoUrl ? (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <video 
                    src={videoUrl} 
                    controls 
                    style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid var(--g-glass-border)', maxHeight: '450px' }} 
                  />
                  <div style={{ marginTop: '15px' }}>
                    <a 
                      href={videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="guest-btn guest-btn-secondary"
                      style={{ display: 'inline-block' }}
                    >
                      🔗 Open Video in New Tab
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--g-text-muted)' }}>
                  📺 No demo video configured by the administrators yet.
                </div>
              )}
            </div>

            <div style={{ marginTop: '10px' }}>
              <Link to="/" className="guest-btn guest-btn-secondary">
                ← Back to Home
              </Link>
            </div>
          </div>
        )}
      </section>
    </GuestLayout>
  )
}

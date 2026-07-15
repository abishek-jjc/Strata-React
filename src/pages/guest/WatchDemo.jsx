import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext'
import GuestLayout from '../../components/layout/GuestLayout'
import { ArrowLeft, Video } from 'lucide-react'

export default function WatchDemo() {
  const navigate = useNavigate()
  const { settings, loading } = useSettings()
  const demoVideoUrl = settings.demo_video_url

  if (loading) {
    return (
      <GuestLayout>
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="muted" style={{ fontSize: '1.2rem' }}>Loading settings...</p>
        </div>
      </GuestLayout>
    )
  }

  const isDirect = isDirectVideo(demoVideoUrl)
  const embedUrl = getEmbedUrl(demoVideoUrl)

  return (
    <GuestLayout>
      <div className="guest-hero" style={{ minHeight: 'calc(100vh - 100px)', padding: '100px 5% 60px 5%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Back Button */}
        <div style={{ alignSelf: 'flex-start', maxWidth: '1000px', width: '100%', margin: '0 auto 20px auto' }}>
          <button
            onClick={() => navigate('/')}
            className="guest-btn guest-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 20px', borderRadius: '50px' }}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>

        {/* Video Container Card */}
        {!demoVideoUrl ? (
          <div className="guest-glass-panel" style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '40px 24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '20px', borderRadius: '50%', color: 'var(--g-secondary)', marginBottom: '10px' }}>
              <Video size={48} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontFamily: 'Syne, sans-serif', color: '#fff' }}>
              Demo Video Coming Soon
            </h2>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--g-text-muted)', lineHeight: '1.6', maxWidth: '400px' }}>
              The official demo video for STRATA 2K26 has not been configured yet. Please check back later once the organizers have uploaded it!
            </p>
            <button
              onClick={() => navigate('/')}
              className="guest-btn guest-btn-primary"
              style={{ padding: '12px 30px', borderRadius: '50px', cursor: 'pointer', marginTop: '10px' }}
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="guest-glass-panel" style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--g-secondary)' }}>
                <Video size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'Syne, sans-serif', color: '#fff', textAlign: 'left' }}>
                  STRATA 2K26 Demo Video
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--g-text-muted)', textAlign: 'left' }}>
                  Watch the official demo/walkthrough video.
                </p>
              </div>
            </div>

            {/* Aspect Ratio Video Player wrapper */}
            <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '12px', background: '#080710', border: '1px solid var(--g-glass-border)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
              {isDirect ? (
                <video
                  src={demoVideoUrl}
                  autoPlay
                  muted
                  controls
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title="STRATA 2K26 Demo Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{ width: '100%', height: '100%' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', padding: '10px 0 5px 0' }}>
              <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
                💡 *Tip: If the video does not autoplay or is muted, please interact with the player controls.*
              </p>
              <a 
                href={demoVideoUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: 'var(--g-secondary)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: '500' }}
              >
                Open in external window ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </GuestLayout>
  )
}

function getEmbedUrl(url) {
  if (!url) return '';
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = url.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&rel=0`;
  }
  if (url.includes('drive.google.com')) {
    const driveRegex = /\/file\/d\/([^\/\?]+)/;
    const driveMatch = url.match(driveRegex);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview?autoplay=1`;
    }
    try {
      const parsedUrl = new URL(url);
      const driveIdParam = parsedUrl.searchParams.get('id');
      if (driveIdParam) {
        return `https://drive.google.com/file/d/${driveIdParam}/preview?autoplay=1`;
      }
    } catch (e) {}
  }
  const vimeoRegex = /vimeo\.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1`;
  }
  return url;
}

function isDirectVideo(url) {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.ogg') || lowerUrl.includes('.mp4?') || lowerUrl.includes('.webm?') || lowerUrl.includes('.ogg?');
}

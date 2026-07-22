import { Link } from 'react-router-dom'
import { ShieldAlert, MessageCircle, Award, User, ChevronRight, MessageSquare } from 'lucide-react'
import BackButton from '../../components/common/BackButton'

export default function More() {
  const links = [
    {
      to: '/leader/rules',
      title: 'Event Rules',
      desc: 'View general guidelines, formatting, and event rules.',
      icon: <ShieldAlert size={24} style={{ color: 'var(--accent)' }} />,
    },
    {
      to: '/leader/whatsapp',
      title: 'WhatsApp Community',
      desc: 'Join the official group chat for coordinator announcements.',
      icon: <MessageCircle size={24} style={{ color: '#25D366' }} />,
    },
    {
      to: '/leader/certificates',
      title: 'Certificates',
      desc: 'Download participation and merit award certificates.',
      icon: <Award size={24} style={{ color: '#eab308' }} />,
    },
    {
      to: '/leader/feedback',
      title: 'Feedback',
      desc: 'Submit suggestions, comments, or queries for event organizers.',
      icon: <MessageSquare size={24} style={{ color: '#ec4899' }} />,
    },
    {
      to: '/leader/profile',
      title: 'My Profile Settings',
      desc: 'View assigned college details, edit contact info, or sign out.',
      icon: <User size={24} style={{ color: '#3b82f6' }} />,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BackButton />
        <div>
          <h2 style={{ margin: 0 }}>More Menu</h2>
          <p className="muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Quick links to rules, communications, profile settings, and certificates.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--surface-raised)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-strong)'
              }}>
                {link.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {link.title}
                </span>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {link.desc}
                </span>
              </div>
            </div>
            
            <ChevronRight size={20} className="muted" style={{ marginLeft: '12px' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

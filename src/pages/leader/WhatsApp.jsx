import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import BackButton from '../../components/common/BackButton'

export default function WhatsApp() {
  const { data: settings, loading } = useTable(TABLES.SETTINGS)

  if (loading) return <p className="muted">Loading...</p>

  const whatsappLink = settings.find(s => s.key_name === 'whatsapp_group_link')?.value || ''

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BackButton />
        <div>
          <h2 style={{ margin: 0 }}>WhatsApp Community</h2>
        </div>
      </div>
      
      <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#25D366',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '36px',
          color: '#fff'
        }}>
          💬
        </div>
        
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Join the Official Event Group</h3>
        
        <p className="muted" style={{ lineHeight: '1.6', marginBottom: '25px', fontSize: '0.95rem' }}>
          Connect with coordinators, receive immediate updates, and send your payment receipts for rapid verification. Stay in the loop with all technical and non-technical announcements during the event.
        </p>

        {whatsappLink ? (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{
              background: '#25D366',
              color: '#fff',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '30px',
              fontWeight: 'bold',
              textDecoration: 'none',
              display: 'inline-block',
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.6)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 211, 102, 0.4)'
            }}
          >
            Join WhatsApp Group
          </a>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '15px',
            borderRadius: '8px',
            color: 'var(--text-secondary)'
          }}>
            The WhatsApp group link hasn't been set by the administration yet.
          </div>
        )}
      </div>
    </div>
  )
}

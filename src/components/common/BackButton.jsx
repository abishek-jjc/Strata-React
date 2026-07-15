import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ to }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (to) {
      navigate(to)
    } else {
      // Navigate back in history if possible, else go to leader dashboard
      if (window.history.state && window.history.length > 1) {
        navigate(-1)
      } else {
        navigate('/leader')
      }
    }
  }

  return (
    <button
      onClick={handleBack}
      className="back-button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-strong)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginRight: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        outline: 'none',
      }}
      title="Go Back"
    >
      <ArrowLeft size={18} strokeWidth={2.5} />
    </button>
  )
}

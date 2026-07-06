import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ allow, children }) {
  const { user, role, loading } = useAuth()

  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (allow && !allow.includes(role)) return <Navigate to="/login" replace />

  return children
}

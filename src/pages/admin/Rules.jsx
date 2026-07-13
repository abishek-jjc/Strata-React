import { Navigate } from 'react-router-dom'

export default function Rules() {
  return <Navigate to="/admin/settings?tab=rules" replace />
}

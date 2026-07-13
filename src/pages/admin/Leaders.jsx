import { Navigate } from 'react-router-dom'

export default function Leaders() {
  return <Navigate to="/admin/settings?tab=about-us" replace />
}

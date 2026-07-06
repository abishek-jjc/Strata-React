import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import AppShell from './components/layout/AppShell'

import Login from './pages/auth/Login'

import AdminDashboard from './pages/admin/Dashboard'
import Events from './pages/admin/Events'
import Colleges from './pages/admin/Colleges'
import StudentLeaders from './pages/admin/StudentLeaders'
import Registrations from './pages/admin/Registrations'
import Lots from './pages/admin/Lots'
import Incharges from './pages/admin/Incharges'
import Accountants from './pages/admin/Accountants'
import Certificates from './pages/admin/Certificates'
import Reports from './pages/admin/Reports'

import LeaderDashboard from './pages/leader/Dashboard'
import TeamRegistration from './pages/leader/TeamRegistration'
import StudentList from './pages/leader/StudentList'
import CertificateDownload from './pages/leader/CertificateDownload'

import AccountantDashboard from './pages/accountant/Dashboard'
import PaymentCollection from './pages/accountant/PaymentCollection'
import PaymentHistory from './pages/accountant/PaymentHistory'

function withShell(element) {
  return <AppShell>{element}</AppShell>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allow={['admin']}>{withShell(<AdminDashboard />)}</ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute allow={['admin']}>{withShell(<Events />)}</ProtectedRoute>} />
          <Route path="/admin/colleges" element={<ProtectedRoute allow={['admin']}>{withShell(<Colleges />)}</ProtectedRoute>} />
          <Route path="/admin/leaders" element={<ProtectedRoute allow={['admin']}>{withShell(<StudentLeaders />)}</ProtectedRoute>} />
          <Route path="/admin/registrations" element={<ProtectedRoute allow={['admin']}>{withShell(<Registrations />)}</ProtectedRoute>} />
          <Route path="/admin/lots" element={<ProtectedRoute allow={['admin']}>{withShell(<Lots />)}</ProtectedRoute>} />
          <Route path="/admin/incharges" element={<ProtectedRoute allow={['admin']}>{withShell(<Incharges />)}</ProtectedRoute>} />
          <Route path="/admin/accountants" element={<ProtectedRoute allow={['admin']}>{withShell(<Accountants />)}</ProtectedRoute>} />
          <Route path="/admin/certificates" element={<ProtectedRoute allow={['admin']}>{withShell(<Certificates />)}</ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allow={['admin']}>{withShell(<Reports />)}</ProtectedRoute>} />

          {/* Student leader */}
          <Route path="/leader" element={<ProtectedRoute allow={['leader']}>{withShell(<LeaderDashboard />)}</ProtectedRoute>} />
          <Route path="/leader/register" element={<ProtectedRoute allow={['leader']}>{withShell(<TeamRegistration />)}</ProtectedRoute>} />
          <Route path="/leader/students" element={<ProtectedRoute allow={['leader']}>{withShell(<StudentList />)}</ProtectedRoute>} />
          <Route path="/leader/certificates" element={<ProtectedRoute allow={['leader']}>{withShell(<CertificateDownload />)}</ProtectedRoute>} />

          {/* Accountant */}
          <Route path="/accountant" element={<ProtectedRoute allow={['accountant']}>{withShell(<AccountantDashboard />)}</ProtectedRoute>} />
          <Route path="/accountant/collect" element={<ProtectedRoute allow={['accountant']}>{withShell(<PaymentCollection />)}</ProtectedRoute>} />
          <Route path="/accountant/history" element={<ProtectedRoute allow={['accountant']}>{withShell(<PaymentHistory />)}</ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

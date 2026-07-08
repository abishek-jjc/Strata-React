import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import AppShell from './components/layout/AppShell'

// Auth & Guest Portal
import Login from './pages/auth/Login'
import Home from './pages/guest/Home'
import AboutUs from './pages/guest/AboutUs'
import ContactUs from './pages/guest/ContactUs'
import GuestEvents from './pages/guest/GuestEvents'
import GuestRules from './pages/guest/GuestRules'
import GuestInvitation from './pages/guest/GuestInvitation'
import GuestRegister from './pages/guest/GuestRegister'


// Admin Portal
import AdminDashboard from './pages/admin/Dashboard'
import Events from './pages/admin/Events'
import Colleges from './pages/admin/Colleges'
import StudentLeaders from './pages/admin/StudentLeaders'
import Admins from './pages/admin/Admins'
import Registrations from './pages/admin/Registrations'
import Lots from './pages/admin/Lots'
import Food from './pages/admin/Food'
import Incharges from './pages/admin/Incharges'
import Certificates from './pages/admin/Certificates'
import Reports from './pages/admin/Reports'
import AdminRules from './pages/admin/Rules'
import AdminLeaders from './pages/admin/Leaders'
import AdminSettings from './pages/admin/Settings'
import Participants from './pages/admin/Participants'
import Venues from './pages/admin/Venues'
import Winners from './pages/admin/Winners'
import Payment from './pages/admin/Payment'
import PaymentPolls from './pages/admin/PaymentPolls'

// Incharge Portal
import InchargeDashboard from './pages/incharge/Dashboard'

// Student Leader Portal
import LeaderDashboard from './pages/leader/Dashboard'
import TeamRegistration from './pages/leader/TeamRegistration'
import StudentList from './pages/leader/StudentList'
import CertificateDownload from './pages/leader/CertificateDownload'
import LeaderProfile from './pages/leader/Profile'
import LeaderPayment from './pages/leader/Payment'
import LeaderWhatsApp from './pages/leader/WhatsApp'

// Accountant Portal
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
          {/* Guest Portal */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/events" element={<GuestEvents />} />
          <Route path="/rules" element={<GuestRules />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/invitation" element={<GuestInvitation />} />
          <Route path="/register" element={<GuestRegister />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/payment" element={<Payment />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allow={['admin']}>{withShell(<AdminDashboard />)}</ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute allow={['admin']}>{withShell(<Events />)}</ProtectedRoute>} />
          <Route path="/admin/venues" element={<ProtectedRoute allow={['admin']}>{withShell(<Venues />)}</ProtectedRoute>} />
          <Route path="/admin/winners" element={<ProtectedRoute allow={['admin']}>{withShell(<Winners />)}</ProtectedRoute>} />
          <Route path="/admin/colleges" element={<ProtectedRoute allow={['admin']}>{withShell(<Colleges />)}</ProtectedRoute>} />
          <Route path="/admin/payment-polls" element={<ProtectedRoute allow={['admin']}>{withShell(<PaymentPolls />)}</ProtectedRoute>} />
          <Route path="/admin/leaders" element={<ProtectedRoute allow={['admin']}>{withShell(<StudentLeaders />)}</ProtectedRoute>} />
          <Route path="/admin/admins" element={<ProtectedRoute allow={['admin']}>{withShell(<Admins />)}</ProtectedRoute>} />
          <Route path="/admin/participants" element={<ProtectedRoute allow={['admin']}>{withShell(<Participants />)}</ProtectedRoute>} />
          <Route path="/admin/registrations" element={<ProtectedRoute allow={['admin']}>{withShell(<Registrations />)}</ProtectedRoute>} />
          <Route path="/admin/lots" element={<ProtectedRoute allow={['admin']}>{withShell(<Lots />)}</ProtectedRoute>} />
          <Route path="/admin/food" element={<ProtectedRoute allow={['admin']}>{withShell(<Food />)}</ProtectedRoute>} />
          <Route path="/admin/incharges" element={<ProtectedRoute allow={['admin']}>{withShell(<Incharges />)}</ProtectedRoute>} />
          <Route path="/admin/certificates" element={<ProtectedRoute allow={['admin']}>{withShell(<Certificates />)}</ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allow={['admin']}>{withShell(<Reports />)}</ProtectedRoute>} />
          <Route path="/admin/rules" element={<ProtectedRoute allow={['admin']}>{withShell(<AdminRules />)}</ProtectedRoute>} />
          <Route path="/admin/homepage-leaders" element={<ProtectedRoute allow={['admin']}>{withShell(<AdminLeaders />)}</ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allow={['admin']}>{withShell(<AdminSettings />)}</ProtectedRoute>} />

          {/* Student leader */}
          <Route path="/leader" element={<ProtectedRoute allow={['leader']}>{withShell(<LeaderDashboard />)}</ProtectedRoute>} />
          <Route path="/leader/register" element={<ProtectedRoute allow={['leader']}>{withShell(<TeamRegistration />)}</ProtectedRoute>} />
          <Route path="/leader/students" element={<ProtectedRoute allow={['leader']}>{withShell(<StudentList />)}</ProtectedRoute>} />
          <Route path="/leader/certificates" element={<ProtectedRoute allow={['leader']}>{withShell(<CertificateDownload />)}</ProtectedRoute>} />
          <Route path="/leader/profile" element={<ProtectedRoute allow={['leader']}>{withShell(<LeaderProfile />)}</ProtectedRoute>} />
          <Route path="/leader/payment" element={<ProtectedRoute allow={['leader']}>{withShell(<LeaderPayment />)}</ProtectedRoute>} />
          <Route path="/leader/whatsapp" element={<ProtectedRoute allow={['leader']}>{withShell(<LeaderWhatsApp />)}</ProtectedRoute>} />

          {/* Incharge */}
          <Route path="/incharge" element={<ProtectedRoute allow={['incharge']}>{withShell(<InchargeDashboard />)}</ProtectedRoute>} />

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

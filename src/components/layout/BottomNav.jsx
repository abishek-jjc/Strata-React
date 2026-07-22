import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Users, CreditCard, MoreHorizontal, Trophy, FileText, Award, User } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

export default function BottomNav() {
  const { role } = useAuth()

  if (role === 'incharge') {
    return (
      <div className="mobile-bottom-nav">
        <NavLink 
          to="/incharge" 
          end 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Trophy size={20} />
          <span>Lots</span>
        </NavLink>

        <NavLink 
          to="/incharge/students" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Students</span>
        </NavLink>

        <NavLink 
          to="/incharge/winners" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Award size={20} />
          <span>Winners</span>
        </NavLink>

        <NavLink 
          to="/incharge/profile" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <User size={20} />
          <span>Profile</span>
        </NavLink>
      </div>
    )
  }

  return (
    <div className="mobile-bottom-nav">
      <NavLink 
        to="/leader" 
        end 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </NavLink>

      <NavLink 
        to="/leader/register" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <ClipboardList size={20} />
        <span>Register</span>
      </NavLink>

      <NavLink 
        to="/leader/winners" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <Trophy size={20} />
        <span>Winners</span>
      </NavLink>

      <NavLink 
        to="/leader/payment" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <CreditCard size={20} />
        <span>Payment</span>
      </NavLink>

      <NavLink 
        to="/leader/more" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <MoreHorizontal size={20} />
        <span>More</span>
      </NavLink>
    </div>
  )
}

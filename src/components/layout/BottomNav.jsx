import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Users, CreditCard, MoreHorizontal } from 'lucide-react'

export default function BottomNav() {
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
        to="/leader/participants" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <Users size={20} />
        <span>Participants</span>
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

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  LayoutDashboard, 
  CalendarPlus, 
  Clock, 
  User, 
  ShieldCheck, 
  CalendarCheck2, 
  Users, 
  LogOut, 
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, isAdmin, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showToast('You have been logged out safely.', 'info');
    navigate('/login');
  };

  const closeMobile = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {mobileOpen && (
        <div 
          onClick={closeMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 49,
            display: 'block'
          }}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-badge">
            <Calendar size={22} />
          </div>
          <div className="brand-text">
            <h2>SmartAppoint</h2>
            <span>Enterprise SaaS</span>
          </div>
          {setMobileOpen && (
            <button 
              className="modal-close-btn" 
              onClick={closeMobile}
              style={{ marginLeft: 'auto', display: mobileOpen ? 'flex' : 'none' }}
            >
              <X size={18} color="#94a3b8" />
            </button>
          )}
        </div>

        <div className="sidebar-nav">
          {/* USER SECTION */}
          <div className="nav-section-title">Patient / Client Services</div>

          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <LayoutDashboard size={18} />
            <span>User Dashboard</span>
          </NavLink>

          <NavLink 
            to="/book" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <CalendarPlus size={18} />
            <span>Book Appointment</span>
          </NavLink>

          <NavLink 
            to="/my-appointments" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <Clock size={18} />
            <span>My Appointments</span>
          </NavLink>

          {/* ADMIN SECTION */}
          {isAdmin && (
            <>
              <div className="nav-section-title" style={{ marginTop: '14px' }}>
                Admin Operations
              </div>

              <NavLink 
                to="/admin/dashboard" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <ShieldCheck size={18} />
                <span>Admin Dashboard</span>
              </NavLink>

              <NavLink 
                to="/admin/slots" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <CalendarCheck2 size={18} />
                <span>Manage Slots</span>
              </NavLink>

              <NavLink 
                to="/admin/bookings" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <Calendar size={18} />
                <span>Manage Bookings</span>
              </NavLink>

              <NavLink 
                to="/admin/users" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <Users size={18} />
                <span>Registered Users</span>
              </NavLink>
            </>
          )}

          {/* ACCOUNT SECTION */}
          <div className="nav-section-title" style={{ marginTop: '14px' }}>
            Account & Settings
          </div>

          <NavLink 
            to="/profile" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <User size={18} />
            <span>Profile & Security</span>
          </NavLink>
        </div>

        {/* FOOTER USER BADGE */}
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <span className={`user-role-tag ${user?.role}`}>
                {user?.role}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="btn btn-secondary btn-icon"
              title="Logout"
              style={{ background: 'transparent', border: 'none', color: '#94a3b8' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

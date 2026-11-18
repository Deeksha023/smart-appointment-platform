import React from 'react';
import { Menu, Bell, Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

export const Navbar = ({ onOpenMobile }) => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  // Determine current page title
  const getPageMeta = (pathname) => {
    switch (pathname) {
      case '/dashboard':
        return { title: 'User Dashboard', desc: 'Real-time overview of your appointments and activity' };
      case '/book':
        return { title: 'Book an Appointment', desc: 'Select an available slot and reserve your consultation' };
      case '/my-appointments':
        return { title: 'My Appointments', desc: 'Manage, track, or cancel your booked sessions' };
      case '/admin/dashboard':
        return { title: 'Administrator Dashboard', desc: 'System statistics, booking trends, and platform metrics' };
      case '/admin/slots':
        return { title: 'Manage Appointment Slots', desc: 'Create, schedule, and edit appointment capacity' };
      case '/admin/bookings':
        return { title: 'Manage All Bookings', desc: 'Inspect, confirm, or modify user reservations' };
      case '/admin/users':
        return { title: 'User Directory', desc: 'Overview of all registered platform accounts' };
      case '/profile':
        return { title: 'Profile & Security', desc: 'Update contact info and change account password' };
      default:
        if (pathname.startsWith('/appointments/')) {
          return { title: 'Appointment Details', desc: 'Detailed booking receipt and status log' };
        }
        return { title: 'Smart Appointment Platform', desc: 'Enterprise Booking System' };
    }
  };

  const { title, desc } = getPageMeta(location.pathname);
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button 
          className="mobile-menu-btn" 
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
        >
          <Menu size={24} />
        </button>
        <div className="page-title-wrap">
          <h1>{title}</h1>
          <p>{desc}</p>
        </div>
      </div>

      <div className="top-nav-actions">
        <div style={{ 
          fontSize: '0.82rem', 
          color: 'var(--text-muted)', 
          background: '#f1f5f9', 
          padding: '6px 12px', 
          borderRadius: 'var(--radius-full)', 
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span>📅</span> {todayStr}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px',
          background: isAdmin ? '#eef2ff' : '#eff6ff',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: isAdmin ? '#4338ca' : '#1d4ed8'
        }}>
          {isAdmin ? <Shield size={14} /> : <User size={14} />}
          <span>{user?.name}</span>
        </div>
      </div>
    </header>
  );
};

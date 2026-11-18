import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CalendarPlus, 
  ArrowUpRight, 
  AlertCircle,
  Eye,
  CalendarCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const UserDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getUserStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load user dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <Clock size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px' }} />
        <p>Loading your dashboard statistics...</p>
      </div>
    );
  }

  const metrics = stats?.metrics || { total: 0, upcoming: 0, completed: 0, cancelled: 0 };
  const nextAppt = stats?.next_upcoming;
  const recent = stats?.recent_activity || [];

  return (
    <div>
      {/* WELCOME BANNER */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          marginBottom: '28px',
          boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)'
        }}
      >
        <div>
          <span style={{ 
            fontSize: '0.78rem', 
            background: 'rgba(255, 255, 255, 0.2)', 
            padding: '4px 10px', 
            borderRadius: 'var(--radius-full)', 
            textTransform: 'uppercase', 
            fontWeight: 600,
            letterSpacing: '0.05em'
          }}>
            Welcome Back
          </span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 8 }}>
            Hello, {user?.name}!
          </h2>
          <p style={{ opacity: 0.85, fontSize: '0.92rem', maxWidth: '520px', marginTop: 4 }}>
            Manage your schedule, book new consultations, and track real-time appointment confirmations here.
          </p>
        </div>

        <Link to="/book" className="btn" style={{ background: 'white', color: '#1e3a8a', fontWeight: 700 }}>
          <CalendarPlus size={18} />
          Book New Appointment
        </Link>
      </div>

      {/* METRICS CARDS */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap blue">
            <Calendar size={24} />
          </div>
          <div className="metric-data">
            <h3>{metrics.total}</h3>
            <p>Total Bookings</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap green">
            <Clock size={24} />
          </div>
          <div className="metric-data">
            <h3>{metrics.upcoming}</h3>
            <p>Upcoming Sessions</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap purple">
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-data">
            <h3>{metrics.completed}</h3>
            <p>Completed Visits</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap red">
            <XCircle size={24} />
          </div>
          <div className="metric-data">
            <h3>{metrics.cancelled}</h3>
            <p>Cancelled Sessions</p>
          </div>
        </div>
      </div>

      {/* NEXT UPCOMING APPOINTMENT SPOTLIGHT */}
      {nextAppt && (
        <div 
          className="card" 
          style={{ 
            marginBottom: '28px', 
            borderLeft: '5px solid var(--primary)', 
            backgroundColor: '#ffffff' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div 
                style={{ 
                  width: 50, 
                  height: 50, 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--primary-light)', 
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CalendarCheck size={26} />
              </div>
              <div>
                <span className="status-badge confirmed">Confirmed & Upcoming</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                  {nextAppt.slot_title}
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                  📅 <strong>{nextAppt.slot_date}</strong> at <strong>{nextAppt.start_time} - {nextAppt.end_time}</strong> • Ref: <code>{nextAppt.booking_reference}</code>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Link to={`/appointments/${nextAppt.id}`} className="btn btn-secondary btn-sm">
                <Eye size={15} />
                View Details
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* RECENT BOOKINGS TABLE */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Clock size={20} color="var(--primary)" />
              Recent Booking Activity
            </div>
            <div className="card-subtitle">Your 5 most recently created appointment bookings</div>
          </div>
          <Link to="/my-appointments" className="btn btn-secondary btn-sm">
            View All Appointments
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Calendar size={28} />
            </div>
            <h4>No Appointments Booked Yet</h4>
            <p>You haven't scheduled any consultations yet. Explore available slots and book your first session.</p>
            <Link to="/book" className="btn btn-primary">
              <CalendarPlus size={16} />
              Find Available Slot
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Service / Title</th>
                  <th>Appointment Date</th>
                  <th>Time Slot</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((appt) => (
                  <tr key={appt.id}>
                    <td>
                      <code style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {appt.booking_reference}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{appt.slot_title}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {appt.reason}
                      </div>
                    </td>
                    <td>{appt.slot_date}</td>
                    <td>{appt.start_time} - {appt.end_time}</td>
                    <td>
                      <span className={`status-badge ${appt.status}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        to={`/appointments/${appt.id}`} 
                        className="btn btn-secondary btn-sm"
                        title="View Full Details"
                      >
                        <Eye size={14} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

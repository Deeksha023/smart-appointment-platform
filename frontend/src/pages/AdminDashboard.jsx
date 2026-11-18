import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CalendarCheck2, 
  TrendingUp, 
  PlusCircle, 
  ArrowRight,
  Eye,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const AdminDashboard = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch administrator stats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const handleQuickStatusUpdate = async (bookingId, newStatus) => {
    try {
      const res = await api.updateBookingStatus(bookingId, newStatus, `Quick update from admin dashboard to ${newStatus}`);
      if (res.success) {
        showToast(`Booking marked as ${newStatus}.`, 'success');
        fetchAdminStats();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update booking status.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <Clock size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px' }} />
        <p>Loading enterprise analytics and dashboard metrics...</p>
      </div>
    );
  }

  const m = stats?.metrics || {
    total_users: 0,
    total_appointments: 0,
    confirmed_appointments: 0,
    cancelled_appointments: 0,
    completed_appointments: 0,
    total_slots: 0,
    available_slots: 0,
    booked_slots: 0
  };

  const recent = stats?.recent_bookings || [];
  const breakdown = stats?.status_breakdown || [];
  const totalStatusCount = (m.confirmed_appointments + m.completed_appointments + m.cancelled_appointments) || 1;

  return (
    <div>
      {/* ADMIN ACTION BANNER */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 28, 
        flexWrap: 'wrap', 
        gap: 16 
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Platform Overview & Operations
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Real-time control plane for appointment slot allocations, patient bookings, and platform capacity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/admin/slots" className="btn btn-secondary">
            <CalendarCheck2 size={16} />
            Slot Inventory
          </Link>
          <Link to="/admin/slots?create=1" className="btn btn-primary">
            <PlusCircle size={16} />
            Create Slots
          </Link>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap blue">
            <Users size={24} />
          </div>
          <div className="metric-data">
            <h3>{m.total_users}</h3>
            <p>Total Registered Users</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap green">
            <Calendar size={24} />
          </div>
          <div className="metric-data">
            <h3>{m.total_appointments}</h3>
            <p>Total Bookings</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap green">
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-data">
            <h3>{m.confirmed_appointments}</h3>
            <p>Confirmed Active</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap purple">
            <Clock size={24} />
          </div>
          <div className="metric-data">
            <h3>{m.completed_appointments}</h3>
            <p>Completed Visits</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap red">
            <XCircle size={24} />
          </div>
          <div className="metric-data">
            <h3>{m.cancelled_appointments}</h3>
            <p>Cancelled Sessions</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap amber">
            <CalendarCheck2 size={24} />
          </div>
          <div className="metric-data">
            <h3>{m.available_slots} / {m.total_slots}</h3>
            <p>Open Slots Available</p>
          </div>
        </div>
      </div>

      {/* CHARTS & DISTRIBUTION SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 28 }}>
        {/* Booking Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={20} color="var(--primary)" />
                Booking Status Distribution
              </div>
              <div className="card-subtitle">Breakdown of all registered platform appointments</div>
            </div>
          </div>

          <div style={{ padding: '10px 0' }}>
            {/* Visual Progress Bar */}
            <div style={{ 
              height: 24, 
              width: '100%', 
              borderRadius: 'var(--radius-full)', 
              overflow: 'hidden', 
              display: 'flex', 
              backgroundColor: '#e2e8f0',
              marginBottom: 20
            }}>
              <div 
                style={{ 
                  width: `${(m.confirmed_appointments / totalStatusCount) * 100}%`, 
                  backgroundColor: 'var(--success)',
                  transition: 'width 0.5s ease'
                }} 
                title={`Confirmed: ${m.confirmed_appointments}`}
              />
              <div 
                style={{ 
                  width: `${(m.completed_appointments / totalStatusCount) * 100}%`, 
                  backgroundColor: 'var(--completed)',
                  transition: 'width 0.5s ease'
                }} 
                title={`Completed: ${m.completed_appointments}`}
              />
              <div 
                style={{ 
                  width: `${(m.cancelled_appointments / totalStatusCount) * 100}%`, 
                  backgroundColor: 'var(--danger)',
                  transition: 'width 0.5s ease'
                }} 
                title={`Cancelled: ${m.cancelled_appointments}`}
              />
            </div>

            {/* Status Legend Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Confirmed Bookings</span>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {m.confirmed_appointments} ({Math.round((m.confirmed_appointments / totalStatusCount) * 100)}%)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--completed)' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Completed Bookings</span>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {m.completed_appointments} ({Math.round((m.completed_appointments / totalStatusCount) * 100)}%)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Cancelled Bookings</span>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {m.cancelled_appointments} ({Math.round((m.cancelled_appointments / totalStatusCount) * 100)}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slot Capacity Health */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <CalendarCheck2 size={20} color="var(--primary)" />
                Slot Inventory & Capacity Health
              </div>
              <div className="card-subtitle">Real-time availability of system consultation slots</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Slot Utilization Rate</span>
                <strong>
                  {m.total_slots > 0 ? Math.round((m.booked_slots / m.total_slots) * 100) : 0}% Booked
                </strong>
              </div>
              <div style={{ height: 12, width: '100%', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${m.total_slots > 0 ? (m.booked_slots / m.total_slots) * 100 : 0}%`, 
                    backgroundColor: 'var(--primary)',
                    borderRadius: 'var(--radius-full)'
                  }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Available Slots</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>{m.available_slots}</div>
                <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: 2 }}>Ready for booking</div>
              </div>

              <div style={{ background: '#eff6ff', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Booked Slots</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>{m.booked_slots}</div>
                <div style={{ fontSize: '0.74rem', color: '#1e40af', marginTop: 2 }}>Locked by clients</div>
              </div>
            </div>

            <Link to="/admin/slots" className="btn btn-secondary" style={{ width: '100%' }}>
              Manage All Slot Inventory
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      {/* RECENT BOOKINGS MONITOR */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Clock size={20} color="var(--primary)" />
              Recent Booking Operations
            </div>
            <div className="card-subtitle">Latest reservation actions requiring administrative oversight</div>
          </div>
          <Link to="/admin/bookings" className="btn btn-secondary btn-sm">
            View All Bookings Table
            <ArrowRight size={14} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <p>No booking activity recorded yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Client / User</th>
                  <th>Service / Slot</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <code style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {b.booking_reference}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.user_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.user_email}</div>
                    </td>
                    <td>{b.slot_title}</td>
                    <td>
                      <div>{b.slot_date}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{b.start_time} - {b.end_time}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${b.status}`}>{b.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <Link 
                          to={`/appointments/${b.id}`} 
                          className="btn btn-secondary btn-sm"
                          title="View Details"
                        >
                          <Eye size={13} />
                        </Link>
                        {b.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleQuickStatusUpdate(b.id, 'completed')}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--completed)' }}
                              title="Mark as Completed"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                            <button
                              onClick={() => handleQuickStatusUpdate(b.id, 'cancelled')}
                              className="btn btn-outline-danger btn-sm"
                              title="Cancel Booking"
                            >
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                      </div>
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

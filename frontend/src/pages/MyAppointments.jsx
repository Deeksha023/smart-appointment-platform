import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  XCircle, 
  Eye, 
  CalendarPlus, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const MyAppointments = () => {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Cancel Modal State
  const [cancellingAppt, setCancellingAppt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;

      const res = await api.getMyAppointments(params);
      if (res.success) {
        setAppointments(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Error loading appointments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  const handleCancelClick = (appt) => {
    setCancellingAppt(appt);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancellingAppt) return;
    setCancelLoading(true);
    try {
      const res = await api.cancelAppointment(
        cancellingAppt.id, 
        cancelReason.trim() || 'Cancelled by user request'
      );
      if (res.success) {
        showToast('Appointment cancelled. The slot has been made available again.', 'info');
        setCancellingAppt(null);
        fetchAppointments();
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel appointment.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Local text search filter
  const filteredAppointments = appointments.filter((appt) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      appt.booking_reference?.toLowerCase().includes(query) ||
      appt.slot_title?.toLowerCase().includes(query) ||
      appt.reason?.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      {/* CANCEL MODAL */}
      {cancellingAppt && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
                <AlertTriangle size={20} />
                Cancel Appointment
              </h3>
              <button className="modal-close-btn" onClick={() => setCancellingAppt(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 12 }}>
                Are you sure you want to cancel booking <strong>{cancellingAppt.booking_reference}</strong>?
              </p>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: '0.86rem' }}>
                <div><strong>Service:</strong> {cancellingAppt.slot_title}</div>
                <div><strong>Scheduled:</strong> {cancellingAppt.slot_date} at {cancellingAppt.start_time} - {cancellingAppt.end_time}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Cancellation (Optional):</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Rescheduled due to conflict, no longer needed..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setCancellingAppt(null)} 
                disabled={cancelLoading}
              >
                Keep Booking
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleConfirmCancel} 
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="filter-bar">
        <div className="filter-group">
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'confirmed', label: 'Confirmed / Upcoming' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: statusFilter === tab.id ? 'white' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: statusFilter === tab.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'var(--transition)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Picker Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.84rem' }}
            />
            {dateFilter && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDateFilter('')}
                title="Clear date filter"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search reference, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '34px', paddingRight: '12px', fontSize: '0.84rem' }}
          />
          <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: '#94a3b8' }} />
        </div>
      </div>

      {/* APPOINTMENTS LIST / TABLE */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Calendar size={20} color="var(--primary)" />
            Appointment History ({filteredAppointments.length})
          </div>
          <Link to="/book" className="btn btn-primary btn-sm">
            <CalendarPlus size={15} />
            Book New
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <Clock size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 8px' }} />
            <p>Loading your appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Calendar size={28} />
            </div>
            <h4>No Appointments Found</h4>
            <p>
              {searchQuery || dateFilter || statusFilter !== 'all'
                ? 'No appointments matched your selected filter criteria. Try adjusting your filters.'
                : "You don't have any appointments scheduled yet."}
            </p>
            <Link to="/book" className="btn btn-primary">
              <CalendarPlus size={16} />
              Book an Appointment
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Service Details</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => {
                  const canCancel = appt.status === 'confirmed';
                  return (
                    <tr key={appt.id}>
                      <td>
                        <code style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {appt.booking_reference}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{appt.slot_title}</div>
                        {appt.slot_description && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {appt.slot_description}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>📅 {appt.slot_date}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          ⏰ {appt.start_time} - {appt.end_time}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${appt.status}`}>
                          {appt.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {appt.reason}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <Link 
                            to={`/appointments/${appt.id}`} 
                            className="btn btn-secondary btn-sm"
                            title="View Full Details"
                          >
                            <Eye size={14} />
                            Details
                          </Link>

                          {canCancel && (
                            <button
                              onClick={() => handleCancelClick(appt)}
                              className="btn btn-outline-danger btn-sm"
                              title="Cancel this Appointment"
                            >
                              <XCircle size={14} />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Download, 
  RefreshCw,
  User,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const ManageBookings = () => {
  const { showToast } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Status Change Dialog
  const [activeBooking, setActiveBooking] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getAllBookings(params);
      if (res.success) {
        setBookings(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Error fetching bookings list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBookings();
  };

  const handleOpenStatusModal = (booking, newStatus) => {
    setActiveBooking(booking);
    setTargetStatus(newStatus);
    setStatusReason('');
  };

  const handleConfirmStatusChange = async () => {
    if (!activeBooking || !targetStatus) return;
    setSubmitting(true);
    try {
      const res = await api.updateBookingStatus(
        activeBooking.id, 
        targetStatus, 
        statusReason.trim() || `Admin updated status to ${targetStatus}`
      );
      if (res.success) {
        showToast(res.message || `Booking marked as ${targetStatus}.`, 'success');
        setActiveBooking(null);
        fetchBookings();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update booking status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Export feature
  const exportToCSV = () => {
    if (bookings.length === 0) {
      showToast('No booking records to export.', 'warning');
      return;
    }

    const headers = ['Booking Ref', 'User Name', 'User Email', 'User Phone', 'Service', 'Date', 'Start Time', 'End Time', 'Status', 'Reason'];
    const rows = bookings.map(b => [
      b.booking_reference,
      `"${b.user_name || ''}"`,
      b.user_email || '',
      b.user_phone || '',
      `"${b.slot_title || ''}"`,
      b.slot_date,
      b.start_time,
      b.end_time,
      b.status,
      `"${(b.reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smart_appointments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* STATUS CHANGE CONFIRMATION MODAL */}
      {activeBooking && targetStatus && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Change Booking Status</h3>
              <button className="modal-close-btn" onClick={() => setActiveBooking(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
                Are you sure you want to change status of booking <strong>{activeBooking.booking_reference}</strong> to{' '}
                <span className={`status-badge ${targetStatus}`}>{targetStatus}</span>?
              </p>

              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: '0.86rem' }}>
                <div><strong>Client:</strong> {activeBooking.user_name} ({activeBooking.user_email})</div>
                <div><strong>Service:</strong> {activeBooking.slot_title}</div>
                <div><strong>Scheduled:</strong> {activeBooking.slot_date} at {activeBooking.start_time} - {activeBooking.end_time}</div>
              </div>

              {targetStatus === 'cancelled' && (
                <div style={{ backgroundColor: 'var(--danger-bg)', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', fontSize: '0.84rem', marginBottom: 12 }}>
                  ℹ️ Note: If this slot is in the future, it will automatically be reopened and made available for other users to book.
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Administrative Note / Reason (Optional):</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Reason for status change..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveBooking(null)} disabled={submitting}>
                Dismiss
              </button>
              <button 
                className={`btn ${targetStatus === 'cancelled' ? 'btn-danger' : 'btn-primary'}`} 
                onClick={handleConfirmStatusChange} 
                disabled={submitting}
              >
                {submitting ? 'Updating...' : `Update to ${targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & EXPORT BAR */}
      <div className="filter-bar">
        <div className="filter-group">
          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' }
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

          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.84rem' }}
            />
            {dateFilter && (
              <button className="btn btn-secondary btn-sm" onClick={() => setDateFilter('')}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search bar & Export */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search user, ref, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '34px', paddingRight: '12px', fontSize: '0.84rem', width: '240px' }}
            />
            <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: '#94a3b8' }} />
          </form>

          <button onClick={exportToCSV} className="btn btn-secondary btn-sm" title="Download Bookings as CSV">
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* BOOKINGS TABLE */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Calendar size={20} color="var(--primary)" />
            Master Bookings Directory ({bookings.length})
          </div>
          <button onClick={fetchBookings} className="btn btn-secondary btn-sm" title="Refresh">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            <Clock size={28} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 10px' }} />
            <p>Loading bookings data...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Calendar size={28} />
            </div>
            <h4>No Bookings Found</h4>
            <p>No records matched your search and filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Client / Attendee</th>
                  <th>Service</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th style={{ textAlign: 'right' }}>Admin Operations</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <code style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {b.booking_reference}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.user_name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {b.user_email} {b.user_phone ? `• ${b.user_phone}` : ''}
                      </div>
                    </td>
                    <td>{b.slot_title}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{b.slot_date}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {b.start_time} - {b.end_time}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${b.status}`}>{b.status}</span>
                    </td>
                    <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.reason}
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

                        {/* Status changers */}
                        {b.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleOpenStatusModal(b, 'completed')}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--completed)' }}
                              title="Mark as Completed"
                            >
                              <CheckCircle2 size={13} />
                              Complete
                            </button>
                            <button
                              onClick={() => handleOpenStatusModal(b, 'cancelled')}
                              className="btn btn-outline-danger btn-sm"
                              title="Cancel Booking"
                            >
                              <XCircle size={13} />
                              Cancel
                            </button>
                          </>
                        )}

                        {b.status === 'cancelled' && (
                          <button
                            onClick={() => handleOpenStatusModal(b, 'confirmed')}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--success)' }}
                            title="Re-confirm booking"
                          >
                            <CheckCircle2 size={13} />
                            Re-activate
                          </button>
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

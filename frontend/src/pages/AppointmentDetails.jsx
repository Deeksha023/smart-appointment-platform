import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  AlertTriangle 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getAppointmentDetails(id);
      if (res.success) {
        setAppointment(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load appointment details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await api.cancelAppointment(id, cancelReason.trim() || 'Cancelled via appointment details');
      if (res.success) {
        showToast('Appointment cancelled successfully.', 'info');
        setShowCancelDialog(false);
        fetchDetails();
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel appointment.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <Clock size={28} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 10px' }} />
        <p>Loading appointment details...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={36} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
        <h3>Appointment Not Found</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          The requested appointment record does not exist or you lack authorization to view it.
        </p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    );
  }

  const isConfirmed = appointment.status === 'confirmed';

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      {/* Top back & actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button 
          onClick={() => navigate(isAdmin ? '/admin/bookings' : '/my-appointments')} 
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} />
          Back to List
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint} className="btn btn-secondary btn-sm" title="Print Confirmation Pass">
            <Printer size={15} />
            Print Receipt
          </button>
          {isConfirmed && (
            <button 
              onClick={() => setShowCancelDialog(true)} 
              className="btn btn-outline-danger btn-sm"
            >
              <XCircle size={15} />
              Cancel Appointment
            </button>
          )}
        </div>
      </div>

      {/* CANCEL MODAL */}
      {showCancelDialog && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'var(--danger)' }}>Confirm Cancellation</h3>
              <button className="modal-close-btn" onClick={() => setShowCancelDialog(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
                Are you sure you want to cancel this appointment? This action will reopen the slot for other users.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Cancellation:</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Optional reason for cancellation"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCancelDialog(false)} disabled={cancelling}>
                Dismiss
              </button>
              <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN RECEIPT CARD */}
      <div className="card" style={{ padding: '36px' }}>
        {/* Receipt Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: '24px', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
              Booking Confirmation Pass
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
              {appointment.slot_title}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Booking Reference: <code style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>{appointment.booking_reference}</code>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className={`status-badge ${appointment.status}`} style={{ fontSize: '0.88rem', padding: '6px 14px' }}>
              {appointment.status}
            </span>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Created: {appointment.created_at}
            </div>
          </div>
        </div>

        {/* Schedule & Timing Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 20, 
          backgroundColor: '#f8fafc', 
          padding: '20px', 
          borderRadius: 'var(--radius-md)',
          marginBottom: '28px',
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 600, fontSize: '0.82rem', marginBottom: 4 }}>
              <Calendar size={16} />
              APPOINTMENT DATE
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {appointment.slot_date}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 600, fontSize: '0.82rem', marginBottom: 4 }}>
              <Clock size={16} />
              RESERVED TIME SLOT
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {appointment.start_time} - {appointment.end_time}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 600, fontSize: '0.82rem', marginBottom: 4 }}>
              <FileText size={16} />
              SERVICE DURATION
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              45 Minutes
            </div>
          </div>
        </div>

        {/* User Information */}
        <div style={{ marginBottom: '28px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 14 }}>
            Client / Attendee Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
              <User size={16} color="#64748b" />
              <span>{appointment.user_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
              <Mail size={16} color="#64748b" />
              <span>{appointment.user_email}</span>
            </div>
            {appointment.user_phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
                <Phone size={16} color="#64748b" />
                <span>{appointment.user_phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reason & Notes */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
            Reason for Appointment
          </h4>
          <p style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: '#334155' }}>
            {appointment.reason}
          </p>
        </div>

        {appointment.notes && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
              Additional Notes
            </h4>
            <p style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', color: '#64748b' }}>
              {appointment.notes}
            </p>
          </div>
        )}

        {/* Cancellation Notice if Cancelled */}
        {appointment.status === 'cancelled' && (
          <div 
            style={{ 
              backgroundColor: 'var(--danger-bg)', 
              border: '1px solid #fecaca', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px',
              marginTop: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontWeight: 700, marginBottom: 4 }}>
              <AlertTriangle size={18} />
              Appointment Cancelled
            </div>
            <div style={{ fontSize: '0.88rem', color: '#991b1b' }}>
              <strong>Cancellation Reason:</strong> {appointment.cancellation_reason || 'No specific reason provided.'}
            </div>
            {appointment.cancelled_at && (
              <div style={{ fontSize: '0.76rem', color: '#b91c1c', marginTop: 4 }}>
                Cancelled on: {appointment.cancelled_at} {appointment.cancelled_by_name ? `by ${appointment.cancelled_by_name}` : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

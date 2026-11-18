import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const BookAppointment = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // State
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successBooking, setSuccessBooking] = useState(null);

  // Quick Date Chips (Next 7 days)
  const dateChips = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { dateStr, label };
  });

  // Fetch slots whenever selectedDate changes
  const fetchAvailableSlots = async (date) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await api.getSlots({ date, available_only: 1 });
      if (res.success) {
        setSlots(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Error fetching slots for selected date.', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchAvailableSlots(selectedDate);
  }, [selectedDate]);

  const handleSlotSelect = (slot) => {
    if (!slot.is_available || slot.is_past) return;
    setSelectedSlot(slot);
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      showToast('Please select an available time slot.', 'warning');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      showToast('Please provide a reason for the appointment (minimum 3 characters).', 'warning');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = async () => {
    setSubmitting(true);
    try {
      const res = await api.bookAppointment({
        slot_id: selectedSlot.id,
        reason: reason.trim(),
        notes: notes.trim()
      });

      if (res.success && res.data) {
        setSuccessBooking(res.data);
        setShowConfirmModal(false);
        showToast('Appointment booked successfully!', 'success');
        // Refresh slots for this date so the newly booked slot is immediately removed
        fetchAvailableSlots(selectedDate);
      }
    } catch (err) {
      showToast(err.message || 'Failed to book slot. It might have been taken by someone else.', 'error');
      setShowConfirmModal(false);
      // Re-fetch to reflect current state
      fetchAvailableSlots(selectedDate);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* SUCCESS MODAL */}
      {successBooking && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div 
              style={{ 
                width: 64, 
                height: 64, 
                borderRadius: '50%', 
                backgroundColor: 'var(--success-bg)', 
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
              Booking Confirmed!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
              Your appointment has been successfully scheduled and recorded.
            </p>

            <div 
              style={{ 
                background: '#f8fafc', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '16px', 
                textAlign: 'left',
                marginBottom: 24,
                fontSize: '0.88rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Booking Reference:</span>
                <strong style={{ color: 'var(--primary)', letterSpacing: '0.05em' }}>
                  {successBooking.booking_reference}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Service:</span>
                <strong>{successBooking.slot_title}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                <strong>{successBooking.slot_date} at {successBooking.start_time} - {successBooking.end_time}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reason:</span>
                <span style={{ fontWeight: 500 }}>{successBooking.reason}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setSuccessBooking(null);
                  setSelectedSlot(null);
                  setReason('');
                  setNotes('');
                }}
              >
                Book Another Slot
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/my-appointments')}
              >
                View My Appointments
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION SUMMARY MODAL */}
      {showConfirmModal && selectedSlot && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Appointment Details</h3>
              <button className="modal-close-btn" onClick={() => setShowConfirmModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                Please review your appointment summary before confirming:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: '#f8fafc', padding: 16, borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Service</span>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{selectedSlot.title}</h4>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Date & Time</span>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    📅 {selectedSlot.date} • ⏰ {selectedSlot.start_time} to {selectedSlot.end_time}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Reason for Consultation</span>
                  <div style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{reason}</div>
                </div>
                {notes && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Additional Notes</span>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{notes}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleConfirmBooking} disabled={submitting}>
                {submitting ? 'Confirming...' : 'Yes, Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: SELECT DATE */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">
              <CalendarIcon size={20} color="var(--primary)" />
              Step 1: Select Appointment Date
            </div>
            <div className="card-subtitle">Choose one of the upcoming days or pick a specific date</div>
          </div>
        </div>

        {/* Quick Date Chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {dateChips.map((chip) => (
            <button
              key={chip.dateStr}
              type="button"
              onClick={() => setSelectedDate(chip.dateStr)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: selectedDate === chip.dateStr ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: selectedDate === chip.dateStr ? 'var(--primary-light)' : 'white',
                color: selectedDate === chip.dateStr ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: '280px' }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Or pick a custom date:</label>
          <input
            type="date"
            className="form-control"
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* STEP 2: SELECT TIME SLOT */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">
              <Clock size={20} color="var(--primary)" />
              Step 2: Choose Available Time Slot
            </div>
            <div className="card-subtitle">
              Showing available slots for <strong>{selectedDate}</strong>
            </div>
          </div>
          {slots.length > 0 && (
            <span style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>
              ● {slots.length} Slots Available
            </span>
          )}
        </div>

        {loadingSlots ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            <Clock size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 8px' }} />
            <p>Loading available slots for {selectedDate}...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="empty-state-icon">
              <Clock size={28} />
            </div>
            <h4>No Slots Available for this Date</h4>
            <p>There are no open appointments remaining on {selectedDate}. Please select another date from the calendar above.</p>
          </div>
        ) : (
          <div className="slots-grid">
            {slots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <div
                  key={slot.id}
                  className={`slot-card ${slot.is_available ? 'available' : 'unavailable'} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSlotSelect(slot)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="slot-time">{slot.start_time} - {slot.end_time}</div>
                    {isSelected && (
                      <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                        <Check size={18} />
                      </span>
                    )}
                  </div>
                  <div className="slot-title">{slot.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span className="status-badge available" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                      Open
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>45 mins</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 3: DETAILS & CONFIRMATION */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Sparkles size={20} color="var(--primary)" />
              Step 3: Appointment Details
            </div>
            <div className="card-subtitle">Enter consultation reason and special requests</div>
          </div>
        </div>

        <form onSubmit={handleOpenConfirm}>
          <div className="form-group">
            <label className="form-label">
              Reason for Booking <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Discuss Q4 system architecture, internship technical assessment review, medical checkup..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes / Instructions (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Need screen-sharing link in advance, bring relevant project files"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {selectedSlot && (
            <div 
              style={{ 
                backgroundColor: 'var(--primary-light)', 
                border: '1px solid #bfdbfe', 
                borderRadius: 'var(--radius-md)', 
                padding: '12px 16px', 
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <Info size={20} color="var(--primary)" />
              <div style={{ fontSize: '0.88rem', color: '#1e3a8a' }}>
                Selected: <strong>{selectedSlot.title}</strong> on <strong>{selectedSlot.date}</strong> at <strong>{selectedSlot.start_time} - {selectedSlot.end_time}</strong>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedSlot || !reason.trim()}
              style={{ minWidth: '200px' }}
            >
              Review & Book Slot
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

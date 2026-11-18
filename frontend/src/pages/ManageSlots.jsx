import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Sparkles,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const ManageSlots = () => {
  const { showToast } = useToast();
  const location = useLocation();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [deletingSlot, setDeletingSlot] = useState(null);

  // Form states
  const [singleForm, setSingleForm] = useState({
    title: 'General Consultation',
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '09:45'
  });

  const [batchForm, setBatchForm] = useState({
    title: 'Standard Consultation',
    description: 'Scheduled batch session',
    date: new Date().toISOString().split('T')[0],
    start_hour: 9,
    end_hour: 17,
    duration_minutes: 45
  });

  const [submitting, setSubmitting] = useState(false);

  // Check if opened with ?create=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === '1') {
      setShowCreateModal(true);
    }
  }, [location.search]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const params = { include_past: 1 };
      if (selectedDate) params.date = selectedDate;
      if (availabilityFilter === 'available') params.available_only = 1;

      const res = await api.getSlots(params);
      if (res.success) {
        let result = res.data;
        if (availabilityFilter === 'booked') {
          result = result.filter(s => s.is_available === 0);
        }
        setSlots(result);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch slots.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedDate, availabilityFilter]);

  // Handle Single Slot Creation
  const handleSingleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createSlot(singleForm);
      if (res.success) {
        showToast('Appointment slot created successfully.', 'success');
        setShowCreateModal(false);
        fetchSlots();
      }
    } catch (err) {
      showToast(err.message || 'Failed to create slot.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Batch Slot Generation
  const handleBatchGenerate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const generatedSlots = [];
    let currentHour = parseInt(batchForm.start_hour, 10);
    let currentMinute = 0;
    const endTotalMinutes = parseInt(batchForm.end_hour, 10) * 60;

    while (currentHour * 60 + currentMinute + batchForm.duration_minutes <= endTotalMinutes) {
      const startMinTotal = currentHour * 60 + currentMinute;
      const endMinTotal = startMinTotal + batchForm.duration_minutes;

      const formatTime = (totalMin) => {
        const h = Math.floor(totalMin / 60).toString().padStart(2, '0');
        const m = (totalMin % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
      };

      generatedSlots.push({
        title: batchForm.title,
        description: batchForm.description,
        date: batchForm.date,
        start_time: formatTime(startMinTotal),
        end_time: formatTime(endMinTotal)
      });

      // advance by duration + 15 min break
      const nextTotal = endMinTotal + 15;
      currentHour = Math.floor(nextTotal / 60);
      currentMinute = nextTotal % 60;
    }

    if (generatedSlots.length === 0) {
      showToast('No slots could be generated with the given time range.', 'warning');
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.createSlot({ slots: generatedSlots });
      if (res.success) {
        showToast(res.message || `Generated ${generatedSlots.length} slots successfully!`, 'success');
        setShowBatchModal(false);
        fetchSlots();
      }
    } catch (err) {
      showToast(err.message || 'Batch creation failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Slot
  const handleUpdateSlot = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.updateSlot(editingSlot.id, editingSlot);
      if (res.success) {
        showToast('Slot updated successfully.', 'success');
        setEditingSlot(null);
        fetchSlots();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update slot.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Slot
  const handleConfirmDelete = async () => {
    if (!deletingSlot) return;
    setSubmitting(true);
    try {
      const res = await api.deleteSlot(deletingSlot.id);
      if (res.success) {
        showToast('Appointment slot deleted successfully.', 'success');
        setDeletingSlot(null);
        fetchSlots();
      }
    } catch (err) {
      showToast(err.message || 'Cannot delete slot: it is currently booked.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* ACTION BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Appointment Slot Management
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Schedule and configure booking slots, view capacity, and release or delete inactive slots.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowBatchModal(true)}>
            <Layers size={16} />
            Batch Slot Generator
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Create Single Slot
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-group">
          {/* Availability Tabs */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {[
              { id: 'all', label: 'All Slots' },
              { id: 'available', label: 'Open / Available' },
              { id: 'booked', label: 'Booked / Reserved' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAvailabilityFilter(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: availabilityFilter === tab.id ? 'white' : 'transparent',
                  color: availabilityFilter === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: availabilityFilter === tab.id ? 'var(--shadow-sm)' : 'none',
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
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.84rem' }}
            />
            {selectedDate && (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setSelectedDate('')}
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Showing <strong>{slots.length}</strong> slots
        </div>
      </div>

      {/* SLOTS TABLE */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            <Clock size={28} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 10px' }} />
            <p>Loading slots data...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Calendar size={28} />
            </div>
            <h4>No Appointment Slots Found</h4>
            <p>No slots found for the selected criteria. Create a single slot or use the batch generator.</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              Create Slot Now
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Slot ID</th>
                  <th>Service / Title</th>
                  <th>Date</th>
                  <th>Time Window</th>
                  <th>Availability</th>
                  <th>Active Bookings</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  const hasActiveBooking = slot.active_bookings_count > 0;
                  return (
                    <tr key={slot.id}>
                      <td>#{slot.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{slot.title}</div>
                        {slot.description && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{slot.description}</div>
                        )}
                      </td>
                      <td>{slot.date}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{slot.start_time} - {slot.end_time}</span>
                      </td>
                      <td>
                        {slot.is_available ? (
                          <span className="status-badge available">● Available</span>
                        ) : (
                          <span className="status-badge booked">Booked / Reserved</span>
                        )}
                      </td>
                      <td>
                        {hasActiveBooking ? (
                          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            {slot.active_bookings_count} Active
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => setEditingSlot({ ...slot })}
                            className="btn btn-secondary btn-sm"
                            title="Edit Slot"
                          >
                            <Edit size={13} />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingSlot(slot)}
                            className="btn btn-outline-danger btn-sm"
                            title={hasActiveBooking ? 'Cannot delete actively booked slot' : 'Delete Slot'}
                            style={{ opacity: hasActiveBooking ? 0.6 : 1 }}
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* CREATE SINGLE SLOT MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Appointment Slot</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSingleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Service Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Technical Code Review, General Consultation"
                    value={singleForm.title}
                    onChange={(e) => setSingleForm({ ...singleForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Brief description or requirements"
                    value={singleForm.description}
                    onChange={(e) => setSingleForm({ ...singleForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    min={new Date().toISOString().split('T')[0]}
                    value={singleForm.date}
                    onChange={(e) => setSingleForm({ ...singleForm, date: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Start Time (HH:MM)</label>
                    <input
                      type="time"
                      className="form-control"
                      value={singleForm.start_time}
                      onChange={(e) => setSingleForm({ ...singleForm, start_time: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Time (HH:MM)</label>
                    <input
                      type="time"
                      className="form-control"
                      value={singleForm.end_time}
                      onChange={(e) => setSingleForm({ ...singleForm, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH GENERATE MODAL */}
      {showBatchModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={20} color="var(--primary)" />
                Batch Slot Generator
              </h3>
              <button className="modal-close-btn" onClick={() => setShowBatchModal(false)}>✕</button>
            </div>
            <form onSubmit={handleBatchGenerate}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Automatically generate multiple consecutive consultation slots with a 15-minute inter-session buffer for a given day.
                </p>

                <div className="form-group">
                  <label className="form-label">Service Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={batchForm.title}
                    onChange={(e) => setBatchForm({ ...batchForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Date</label>
                  <input
                    type="date"
                    className="form-control"
                    min={new Date().toISOString().split('T')[0]}
                    value={batchForm.date}
                    onChange={(e) => setBatchForm({ ...batchForm, date: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Start Hour (24h)</label>
                    <select
                      className="form-control"
                      value={batchForm.start_hour}
                      onChange={(e) => setBatchForm({ ...batchForm, start_hour: e.target.value })}
                    >
                      {[8, 9, 10, 11, 12, 13, 14].map(h => (
                        <option key={h} value={h}>{h}:00</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Hour (24h)</label>
                    <select
                      className="form-control"
                      value={batchForm.end_hour}
                      onChange={(e) => setBatchForm({ ...batchForm, end_hour: e.target.value })}
                    >
                      {[15, 16, 17, 18, 19, 20].map(h => (
                        <option key={h} value={h}>{h}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Slot Duration</label>
                  <select
                    className="form-control"
                    value={batchForm.duration_minutes}
                    onChange={(e) => setBatchForm({ ...batchForm, duration_minutes: parseInt(e.target.value, 10) })}
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes (Standard)</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Generating...' : 'Generate Slots'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SLOT MODAL */}
      {editingSlot && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Appointment Slot #{editingSlot.id}</h3>
              <button className="modal-close-btn" onClick={() => setEditingSlot(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateSlot}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Service Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingSlot.title}
                    onChange={(e) => setEditingSlot({ ...editingSlot, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingSlot.description || ''}
                    onChange={(e) => setEditingSlot({ ...editingSlot, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editingSlot.date}
                    onChange={(e) => setEditingSlot({ ...editingSlot, date: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={editingSlot.start_time}
                      onChange={(e) => setEditingSlot({ ...editingSlot, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={editingSlot.end_time}
                      onChange={(e) => setEditingSlot({ ...editingSlot, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Availability Status</label>
                  <select
                    className="form-control"
                    value={editingSlot.is_available}
                    onChange={(e) => setEditingSlot({ ...editingSlot, is_available: parseInt(e.target.value, 10) })}
                  >
                    <option value={1}>Available (Open for booking)</option>
                    <option value={0}>Unavailable (Locked / Closed)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingSlot(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingSlot && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} />
                Delete Appointment Slot #{deletingSlot.id}
              </h3>
              <button className="modal-close-btn" onClick={() => setDeletingSlot(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: 14 }}>
                Are you sure you want to permanently delete this slot on <strong>{deletingSlot.date}</strong> at <strong>{deletingSlot.start_time} - {deletingSlot.end_time}</strong>?
              </p>
              {deletingSlot.active_bookings_count > 0 && (
                <div style={{ backgroundColor: 'var(--danger-bg)', padding: 12, borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', fontSize: '0.85rem' }}>
                  ⚠️ <strong>Warning:</strong> This slot has an active booking. The system will prevent deletion until the booking is cancelled or marked complete.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeletingSlot(null)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

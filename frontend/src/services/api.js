const API_BASE = '/api';

/**
 * Core HTTP client wrapper with automatic JWT token attachment.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('sap_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      error.message = 'Unable to connect to server. Please ensure the backend is running.';
    }
    throw error;
  }
}

export const api = {
  // Authentication
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  register: (userData) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  getMe: () => request('/auth/me', { method: 'GET' }),

  updateProfile: (profileData) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),

  changePassword: (passData) => request('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(passData),
  }),

  // Appointment Slots
  getSlots: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/slots${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getSlotDetails: (slotId) => request(`/slots/${slotId}`, { method: 'GET' }),

  createSlot: (slotData) => request('/slots', {
    method: 'POST',
    body: JSON.stringify(slotData),
  }),

  updateSlot: (slotId, slotData) => request(`/slots/${slotId}`, {
    method: 'PUT',
    body: JSON.stringify(slotData),
  }),

  deleteSlot: (slotId) => request(`/slots/${slotId}`, {
    method: 'DELETE',
  }),

  // Appointments
  bookAppointment: (bookingData) => request('/appointments', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  }),

  getMyAppointments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/appointments/my${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getAppointmentDetails: (appointmentId) => request(`/appointments/${appointmentId}`, { method: 'GET' }),

  cancelAppointment: (appointmentId, reason) => request(`/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),

  // User Dashboard Stats
  getUserStats: () => request('/user/stats', { method: 'GET' }),

  // Admin Module
  getAdminStats: () => request('/admin/stats', { method: 'GET' }),

  getAllBookings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/bookings${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  updateBookingStatus: (bookingId, status, reason = '') => request(`/admin/bookings/${bookingId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, reason }),
  }),

  getAllUsers: () => request('/admin/users', { method: 'GET' }),
};

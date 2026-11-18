import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';

// Auth Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// User Pages
import { UserDashboard } from './pages/UserDashboard';
import { BookAppointment } from './pages/BookAppointment';
import { MyAppointments } from './pages/MyAppointments';
import { AppointmentDetails } from './pages/AppointmentDetails';
import { Profile } from './pages/Profile';

// Admin Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { ManageSlots } from './pages/ManageSlots';
import { ManageBookings } from './pages/ManageBookings';
import { AdminUsers } from './pages/AdminUsers';

export const App = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb', marginBottom: 8 }}>
            Smart Appointment Platform
          </div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Initializing session...</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <Register />} 
      />

      {/* Authenticated Application Layout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* User Module */}
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/book" element={<BookAppointment />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/appointments/:id" element={<AppointmentDetails />} />
        <Route path="/profile" element={<Profile />} />

        {/* Administrator Module */}
        <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/slots" element={<ProtectedRoute adminOnly><ManageSlots /></ProtectedRoute>} />
        <Route path="/admin/bookings" element={<ProtectedRoute adminOnly><ManageBookings /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      </Route>

      {/* Fallback Redirection */}
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? (isAdmin ? "/admin/dashboard" : "/dashboard") : "/login"} replace />} 
      />
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? (isAdmin ? "/admin/dashboard" : "/dashboard") : "/login"} replace />} 
      />
    </Routes>
  );
};
export default App;

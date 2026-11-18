import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, User, Mail, Phone, Lock, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.name.length < 2) {
      showToast('Please enter your full name (minimum 2 characters).', 'warning');
      return;
    }

    if (!formData.email.trim()) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }

    if (formData.password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'warning');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role
      });
      showToast(`Welcome, ${user.name}! Account created successfully.`, 'success');
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <Calendar size={26} />
          </div>
          <h2>Create Your Account</h2>
          <p>Get started with Smart Appointment Platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Dr. John Doe / Alex Morgan"
                value={formData.name}
                onChange={handleChange}
                required
                style={{ paddingLeft: '38px' }}
              />
              <User size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="alex@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{ paddingLeft: '38px' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  placeholder="+1 (555) 012-3456"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ paddingLeft: '38px' }}
                />
                <Phone size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account Role</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: '10px 14px', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: formData.role === 'user' ? 'var(--primary-light)' : 'transparent',
                  borderColor: formData.role === 'user' ? 'var(--primary)' : 'var(--border-color)',
                  fontWeight: 500,
                  fontSize: '0.88rem'
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={formData.role === 'user'}
                  onChange={handleChange}
                />
                <User size={15} color="var(--primary)" />
                Standard User
              </label>

              <label 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: '10px 14px', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: formData.role === 'admin' ? 'var(--completed-bg)' : 'transparent',
                  borderColor: formData.role === 'admin' ? 'var(--completed)' : 'var(--border-color)',
                  fontWeight: 500,
                  fontSize: '0.88rem'
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={formData.role === 'admin'}
                  onChange={handleChange}
                />
                <Shield size={15} color="var(--completed)" />
                Administrator
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  placeholder="Min 6 chars"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={{ paddingLeft: '38px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-control"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  style={{ paddingLeft: '38px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Mail, Lock, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.name}!`, 'success');
      
      const destination = location.state?.from?.pathname || (user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (err) {
      showToast(err.message || 'Invalid credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Calendar size={26} />
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to your Smart Appointment account</p>
        </div>

        {/* DEMO ACCOUNTS QUICK-FILL */}
        <div className="demo-credentials-box">
          <p>Assessment Demo Credentials:</p>
          <div className="demo-btns">
            <button
              type="button"
              className="btn-chip"
              onClick={() => fillCredentials('admin@smartapp.com', 'Admin@123')}
            >
              <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
              Admin
            </button>
            <button
              type="button"
              className="btn-chip"
              onClick={() => fillCredentials('user@smartapp.com', 'User@123')}
            >
              <UserCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
              Alex (User)
            </button>
            <button
              type="button"
              className="btn-chip"
              onClick={() => fillCredentials('sarah@smartapp.com', 'User@123')}
            >
              <UserCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
              Sarah (User)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-control"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '38px' }}
              />
              <Mail 
                size={16} 
                style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '38px' }}
              />
              <Lock 
                size={16} 
                style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} 
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
          Don't have an account yet?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

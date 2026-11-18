import React, { useState } from 'react';
import { User, Lock, Mail, Phone, ShieldCheck, Check, KeyRound } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Profile = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  // Profile Form
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password Form
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [changingPass, setChangingPass] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim() || profileData.name.length < 2) {
      showToast('Name must be at least 2 characters long.', 'warning');
      return;
    }

    setUpdatingProfile(true);
    try {
      const res = await api.updateProfile(profileData);
      if (res.success && res.data) {
        updateUser(res.data.user);
        showToast('Profile information updated successfully!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordData.current_password || !passwordData.new_password) {
      showToast('Please provide both current and new password.', 'warning');
      return;
    }

    if (passwordData.new_password.length < 6) {
      showToast('New password must be at least 6 characters long.', 'warning');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setChangingPass(true);
    try {
      const res = await api.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      }
    } catch (err) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Profile & Account Settings
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
          Manage your personal identity, contact credentials, and security settings.
        </p>
      </div>

      {/* ACCOUNT SUMMARY BANNER */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div className="user-avatar" style={{ width: 64, height: 64, fontSize: '1.6rem' }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{user?.name}</h3>
            <span className={`user-role-tag ${user?.role}`}>
              {user?.role}
            </span>
          </div>
          <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {user?.email} {user?.phone ? `• ${user?.phone}` : ''}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-light)', marginTop: 4 }}>
            Account ID: #{user?.id} • Member Since: {user?.created_at?.split(' ')[0] || '2026'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* EDIT PROFILE FORM */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <User size={18} color="var(--primary)" />
                Personal Information
              </div>
              <div className="card-subtitle">Update your display name and contact phone number</div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (Read-Only)</label>
              <input
                type="email"
                className="form-control"
                value={user?.email || ''}
                disabled
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-control"
                placeholder="+1 (555) 012-3456"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={updatingProfile}
              style={{ width: '100%', marginTop: 8 }}
            >
              {updatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* CHANGE PASSWORD FORM */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <KeyRound size={18} color="var(--primary)" />
                Change Password
              </div>
              <div className="card-subtitle">Update your security passkey</div>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Current password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password (Min 6 chars)</label>
              <input
                type="password"
                className="form-control"
                placeholder="New password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Re-enter new password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={changingPass}
              style={{ width: '100%', marginTop: 8 }}
            >
              {changingPass ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

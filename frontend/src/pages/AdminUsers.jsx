import React, { useState, useEffect } from 'react';
import { Users, Search, Clock, Shield, User, Mail, Phone } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const AdminUsers = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getAllUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch registered users.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Registered Platform Users
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
          Manage user credentials, review individual booking frequencies, and inspect access roles.
        </p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {[
              { id: 'all', label: 'All Accounts' },
              { id: 'user', label: 'Standard Users' },
              { id: 'admin', label: 'Administrators' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: roleFilter === tab.id ? 'white' : 'transparent',
                  color: roleFilter === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: roleFilter === tab.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'var(--transition)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '0.84rem' }}
          />
          <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: '#94a3b8' }} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users size={20} color="var(--primary)" />
            User Accounts Directory ({filteredUsers.length})
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            <Clock size={28} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 10px' }} />
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p>No user accounts matched your search.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email & Phone</th>
                  <th>Role</th>
                  <th>Total Bookings</th>
                  <th>Active / Confirmed</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>
                    <td>
                      <div>{u.email}</div>
                      {u.phone && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u.phone}</div>}
                    </td>
                    <td>
                      <span className={`user-role-tag ${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <strong>{u.total_bookings || 0}</strong>
                    </td>
                    <td>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {u.active_bookings || 0} active
                      </span>
                    </td>
                    <td>{u.created_at?.split(' ')[0]}</td>
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

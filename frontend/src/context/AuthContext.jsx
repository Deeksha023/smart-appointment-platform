import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('sap_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('sap_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync / verify user session on mount
  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('sap_user', JSON.stringify(res.data.user));
          }
        } catch {
          // Token expired or invalid
          logout();
        }
      }
      setLoading(false);
    };

    verifySession();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.success && res.data) {
      const { user: userData, token: jwtToken } = res.data;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('sap_token', jwtToken);
      localStorage.setItem('sap_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.message || 'Login failed.');
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    if (res.success && res.data) {
      const { user: userData, token: jwtToken } = res.data;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('sap_token', jwtToken);
      localStorage.setItem('sap_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.message || 'Registration failed.');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('sap_token');
    localStorage.removeItem('sap_user');
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('sap_user', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
